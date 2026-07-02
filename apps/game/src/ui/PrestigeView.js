/**
 * Vista de Prestigio: preview de llaves a ganar, botón de prestigiar y árbol real de
 * nodos conectados (PLAN.md §11.7, mockup Stitch `expanded_prestige_tree`).
 *
 * El Agente 6 agregó dependencias reales (`requires`) a `prestigeTree.json` y las gatea en el
 * engine (`isPrestigeNodeUnlocked`/`buyPrestigeNode`). Esta vista deriva el layout del grafo
 * (rama/profundidad) directamente de `requires` — no hay una tabla estática de posiciones: si
 * el árbol de datos cambia de forma, el dibujo se recalcula solo.
 */

import { formatMoney, formatNumber, canPrestige, prestigeKeysPreview, nextPrestigeNodeCost, isPrestigeNodeUnlocked } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

/**
 * Deriva { branch, depth, parent } por nodo a partir de `requires` (cada nodo tiene 0 o 1
 * prerrequisito directo en la data actual). La raíz reparte una rama por hijo directo; cada
 * rama hereda la de su hijo-raíz para que las cadenas largas queden en una sola columna.
 * @param {Array<Object>} nodes
 * @returns {Object<string, { branch: number, depth: number, parent: string|null }>}
 */
function buildTreeLayout(nodes) {
  const root = nodes.find((n) => !n.requires.length);
  if (!root) return {};

  const childrenOf = new Map();
  for (const n of nodes) {
    const parent = n.requires[0] || null;
    if (parent) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(n.id);
    }
  }

  const rootChildren = childrenOf.get(root.id) || [];
  const branchOf = new Map([[root.id, Math.max(0, (rootChildren.length - 1) / 2)]]);
  const assignBranch = (id, branch) => {
    branchOf.set(id, branch);
    for (const childId of childrenOf.get(id) || []) assignBranch(childId, branch);
  };
  rootChildren.forEach((childId, i) => assignBranch(childId, i));

  const depthOf = new Map([[root.id, 0]]);
  const assignDepth = (id, depth) => {
    depthOf.set(id, depth);
    for (const childId of childrenOf.get(id) || []) assignDepth(childId, depth + 1);
  };
  assignDepth(root.id, 0);

  const layout = {};
  for (const n of nodes) {
    layout[n.id] = { branch: branchOf.get(n.id) ?? 0, depth: depthOf.get(n.id) ?? 0, parent: n.requires[0] || null };
  }
  return layout;
}

export const PrestigeView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.boundClick) {
      container.dataset.boundClick = 'true';
      container.addEventListener('click', (evt) => {
        const nodeBtn = evt.target.closest('[data-action="buy-node"]');
        if (nodeBtn && !nodeBtn.disabled) {
          store.actions.buyPrestigeNode(nodeBtn.dataset.id);
          return;
        }
        const prestigeBtn = evt.target.closest('[data-action="do-prestige"]');
        if (prestigeBtn && !prestigeBtn.disabled) {
          store.actions.doPrestige();
        }
      });
    }

    const { data } = store.ctx;
    if (!data.prestigeTree.length) {
      container.innerHTML = '<p class="empty-state">No hay árbol de prestigio configurado.</p>';
      return;
    }

    const eligible = canPrestige(state);
    const preview = prestigeKeysPreview(state);
    const treeLayout = buildTreeLayout(data.prestigeTree);
    const nodeById = new Map(data.prestigeTree.map((n) => [n.id, n]));

    const nodes = data.prestigeTree
      .map((node) => {
        const level = state.prestigeTreeLevels[node.id] || 0;
        const maxed = level >= node.nivelMaximo;
        const cost = maxed ? 0 : nextPrestigeNodeCost(state, node);
        const canAfford = state.prestigeKeys >= cost;
        const unlocked = isPrestigeNodeUnlocked(state, node);
        const layout = treeLayout[node.id] || { branch: 0, depth: 0, parent: null };
        let action;
        if (!unlocked) {
          const parentName = layout.parent ? nodeById.get(layout.parent)?.name || layout.parent : '';
          action = `<span class="badge badge--locked">Requiere: ${parentName}</span>`;
        } else if (maxed) {
          action = '<span class="badge">Máximo</span>';
        } else {
          action = `<button type="button" data-action="buy-node" data-id="${node.id}" ${canAfford ? '' : 'disabled'} title="${
            canAfford ? '' : `Te faltan ${formatNumber(cost - state.prestigeKeys)} llaves`
          }">Mejorar por ${formatNumber(cost)} llaves</button>`;
        }
        const stateClass = !unlocked
          ? 'prestige-node--locked'
          : maxed
          ? 'prestige-node--maxed'
          : level > 0
          ? 'prestige-node--active'
          : '';
        return (
          `<article class="prestige-node ${stateClass}" ` +
          `style="--branch:${layout.branch};--depth:${layout.depth}" data-parent="${layout.parent || ''}">` +
          `<span class="prestige-node-icon">${iconMarkup(unlocked ? node.icon : 'locked', { size: 26 })}</span>` +
          `<h3>${node.name} (${level}/${node.nivelMaximo})</h3>` +
          `<p>${node.desc}</p>` +
          action +
          `</article>`
        );
      })
      .join('');

    container.innerHTML =
      `<section class="prestige-summary">` +
      `<span class="prestige-summary-icon">${iconMarkup('key', { size: 22 })}</span>` +
      `<p>Llaves de Ciudad: ${formatNumber(state.prestigeKeys)}</p>` +
      `<p>Prestigios completados: ${state.prestigeCount}</p>` +
      `<p>Si prestigiás ahora ganás: ${formatNumber(preview)} llaves.</p>` +
      `<button type="button" class="prestige-btn-main" data-action="do-prestige" ${eligible ? '' : 'disabled'} title="${
        eligible ? '' : 'Necesitás $1.000.000.000 ganados en total para prestigiar.'
      }">Hacer Prestigio</button>` +
      `</section>` +
      `<div class="prestige-tree">${nodes}</div>`;
  },
};
