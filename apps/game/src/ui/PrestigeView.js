/**
 * Vista de Prestigio: preview de llaves a ganar, botón de prestigiar y árbol de
 * mejoras permanentes (PLAN.md §2.8/§5.4.4). El árbol "bonito" con nodos conectados
 * visualmente queda para el Agente 3; acá es una lista funcional mínima.
 */

import { formatMoney, formatNumber, canPrestige, prestigeKeysPreview, nextPrestigeNodeCost } from '@dumpster/engine';

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
        const action = maxed
          ? '<span class="badge">Máximo</span>'
          : `<button type="button" data-action="buy-node" data-id="${node.id}" ${canAfford ? '' : 'disabled'} title="${
              canAfford ? '' : `Te faltan ${formatNumber(cost - state.prestigeKeys)} llaves`
            }">Mejorar por ${formatNumber(cost)} llaves</button>`;
        return (
          `<article class="prestige-node ${maxed ? 'prestige-node--maxed' : ''}">` +
          `<h3>${node.name} (${level}/${node.nivelMaximo})</h3>` +
          `<p>${node.desc}</p>` +
          action +
          `</article>`
        );
      })
      .join('');

    container.innerHTML =
      `<section class="prestige-summary">` +
      `<p>Llaves de Ciudad: ${formatNumber(state.prestigeKeys)}</p>` +
      `<p>Prestigios completados: ${state.prestigeCount}</p>` +
      `<p>Si prestigiás ahora ganás: ${formatNumber(preview)} llaves.</p>` +
      `<button type="button" data-action="do-prestige" ${eligible ? '' : 'disabled'} title="${
        eligible ? '' : 'Necesitás $1.000.000.000 ganados en total para prestigiar.'
      }">Prestigiar</button>` +
      `</section>` +
      `<div class="prestige-tree">${nodes}</div>`;
  },
};
