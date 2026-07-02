/**
 * Vista de Prestigio: preview de llaves a ganar, botón de prestigiar y árbol real de
 * nodos conectados (PLAN.md §2.8/§5.4.4, mockup Stitch `expanded_prestige_tree`).
 *
 * DECISIÓN: `prestigeTree.json` (Agente 1) no define dependencias reales entre nodos —
 * cualquiera se puede comprar en cualquier orden, la única restricción es tener Llaves
 * suficientes (economía intacta, no se toca). El "árbol" que pide PLAN.md §5.4 es una
 * agrupación **visual** en 5 ramas temáticas desde una raíz común, puramente de
 * presentación: agrupa los 12 nodos por lo que mejoran (riqueza, suerte, escarbado,
 * automatización, especiales) y dibuja conectores CSS entre padre/hijo. No gatea la
 * compra — mostrar el árbol no cambia qué se puede comprar, solo cómo se ve.
 */

import { formatMoney, formatNumber, canPrestige, prestigeKeysPreview, nextPrestigeNodeCost } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

/** id de nodo -> { branch: 0-4, depth: 0 (raíz) en adelante, parent: id|null } */
const TREE_LAYOUT = {
  capitalInicial: { branch: 2, depth: 0, parent: null },
  tasadorExperto: { branch: 0, depth: 1, parent: 'capitalInicial' },
  negociador: { branch: 0, depth: 2, parent: 'tasadorExperto' },
  suerteAncestral: { branch: 1, depth: 1, parent: 'capitalInicial' },
  instintoCarronero: { branch: 1, depth: 2, parent: 'suerteAncestral' },
  brazosDeAcero: { branch: 2, depth: 1, parent: 'capitalInicial' },
  visionPeriferica: { branch: 2, depth: 2, parent: 'brazosDeAcero' },
  flotaAmpliada: { branch: 3, depth: 1, parent: 'capitalInicial' },
  vigilanciaNocturna: { branch: 3, depth: 2, parent: 'flotaAmpliada' },
  guardiaPermanente: { branch: 3, depth: 3, parent: 'vigilanciaNocturna' },
  coleccionista: { branch: 4, depth: 1, parent: 'capitalInicial' },
  portalEstable: { branch: 4, depth: 2, parent: 'coleccionista' },
};

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

    const nodes = data.prestigeTree
      .map((node) => {
        const level = state.prestigeTreeLevels[node.id] || 0;
        const maxed = level >= node.nivelMaximo;
        const cost = maxed ? 0 : nextPrestigeNodeCost(state, node);
        const canAfford = state.prestigeKeys >= cost;
        const layout = TREE_LAYOUT[node.id] || { branch: 0, depth: 0, parent: null };
        const action = maxed
          ? '<span class="badge">Máximo</span>'
          : `<button type="button" data-action="buy-node" data-id="${node.id}" ${canAfford ? '' : 'disabled'} title="${
              canAfford ? '' : `Te faltan ${formatNumber(cost - state.prestigeKeys)} llaves`
            }">Mejorar por ${formatNumber(cost)} llaves</button>`;
        return (
          `<article class="prestige-node ${maxed ? 'prestige-node--maxed' : ''} ${level > 0 ? 'prestige-node--active' : ''}" ` +
          `style="--branch:${layout.branch};--depth:${layout.depth}" data-parent="${layout.parent || ''}">` +
          `<span class="prestige-node-icon">${iconMarkup(node.icon, { size: 26 })}</span>` +
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
