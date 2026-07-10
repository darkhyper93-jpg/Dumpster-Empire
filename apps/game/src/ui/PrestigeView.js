/**
 * Vista de Prestigio: preview de llaves a ganar, botón de prestigiar y árbol real de
 * nodos conectados (PLAN.md §11.7, mockup Stitch `expanded_prestige_tree`).
 *
 * El Agente 6 agregó dependencias reales (`requires`) a `prestigeTree.json` y las gatea en el
 * engine (`isPrestigeNodeUnlocked`/`buyPrestigeNode`). Esta vista deriva el layout del grafo
 * (rama/profundidad) directamente de `requires` — no hay una tabla estática de posiciones: si
 * el árbol de datos cambia de forma, el dibujo se recalcula solo.
 */

import { formatMoney, formatNumber, canPrestige, prestigeKeysPreview, nextPrestigeNodeCost, isPrestigeNodeUnlocked, PRESTIGE_MONEY_THRESHOLD } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { t } from '../i18n/i18n.js';

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
  // DECISIÓN: redondeo — `grid-column: calc(var(--branch) + 1)` exige un entero; con cantidad
  // par de hijos la mitad exacta daría x.5 (declaración inválida, el nodo caería a colocación
  // automática), así que la raíz se apoya en la columna central más cercana.
  const branchOf = new Map([[root.id, Math.round(Math.max(0, (rootChildren.length - 1) / 2))]]);
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
    // AJUSTE (ronda 6): marca propia (ver CollectionView) — la marca genérica compartida en
    // #tab-content dejaba sin listener a las vistas visitadas después de la primera.
    if (!container.dataset.boundClickPrestige) {
      container.dataset.boundClickPrestige = 'true';
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
      container.innerHTML = `<p class="empty-state">${t('prestige.empty')}</p>`;
      return;
    }

    const eligible = canPrestige(state);
    const preview = prestigeKeysPreview(state);
    const treeLayout = buildTreeLayout(data.prestigeTree);
    const nodeById = new Map(data.prestigeTree.map((n) => [n.id, n]));

    const nodes = data.prestigeTree
      .map((node) => {
        const level = Number(state.prestigeTreeLevels[node.id]) || 0;
        const maxed = level >= node.nivelMaximo;
        const cost = maxed ? 0 : nextPrestigeNodeCost(state, node);
        const canAfford = state.prestigeKeys >= cost;
        const unlocked = isPrestigeNodeUnlocked(state, node);
        const layout = treeLayout[node.id] || { branch: 0, depth: 0, parent: null };
        let action;
        if (!unlocked) {
          const parentName = layout.parent ? nodeById.get(layout.parent)?.name || layout.parent : '';
          action = `<span class="badge badge--locked">${t('prestige.requires', { name: parentName })}</span>`;
        } else if (maxed) {
          action = `<span class="badge">${t('prestige.maxed')}</span>`;
        } else {
          action = `<button type="button" data-action="buy-node" data-id="${node.id}" ${canAfford ? '' : 'disabled'} title="${
            canAfford ? '' : t('common.missingKeys', { amount: formatNumber(cost - state.prestigeKeys) })
          }">${t('prestige.upgradeFor', { amount: formatNumber(cost) })}</button>`;
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
      `<p>${t('prestige.keysLabel', { amount: formatNumber(state.prestigeKeys) })}</p>` +
      `<p>${t('prestige.completedCount', { count: Number(state.prestigeCount) || 0 })}</p>` +
      `<p>${t('prestige.previewGain', { amount: formatNumber(preview) })}</p>` +
      // AJUSTE (auditoría post-ronda 14): el umbral sale del engine (PRESTIGE_MONEY_THRESHOLD),
      // no de un "$1.000.000.000" hardcodeado en el diccionario que mentiría si el balance cambia.
      `<button type="button" class="prestige-btn-main" data-action="do-prestige" ${eligible ? '' : 'disabled'} title="${
        eligible ? '' : t('prestige.needMoney', { amount: formatMoney(PRESTIGE_MONEY_THRESHOLD, 0) })
      }">${t('prestige.doButton')}</button>` +
      `</section>` +
      `<div class="prestige-tree">${nodes}</div>`;
  },
};
