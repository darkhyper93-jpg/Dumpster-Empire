/**
 * Modal "mientras no estabas" (PLAN.md §4.5): no bloqueante, con highlights de lo que
 * los robots probablemente encontraron. El engine solo agrega el monto total
 * (`applyOfflineProgress` no trackea ítems individuales — ver HANDOFF.md, Agente 2), así
 * que el highlight de categorías se arma acá llamando a la función pública
 * `bestAffordableUnlockedContainer` del engine (sin reimplementar economía) para saber
 * qué contenedor estaba trabajando y de qué categorías vienen los objetos "probables".
 */

import { formatMoney, bestAffordableUnlockedContainer } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { tweenNumberText } from '../fx/tween.js';

export const OfflineModal = {
  /**
   * @param {HTMLElement} container - overlay raíz (`#offline-modal`, hidden por defecto).
   * @param {{ ganancia: number, segundosEfectivos: number }} summary
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  show(container, summary, store) {
    const { allContainers, data, itemsData } = store.ctx;
    const state = store.getState();
    const minutes = Math.max(1, Math.round(summary.segundosEfectivos / 60));
    const container_ = bestAffordableUnlockedContainer(state, allContainers, data);
    const categorias = container_ ? container_.categorias : [];

    const highlightIcons = categorias
      .map((categoriaId) => {
        const pool = itemsData.categories[categoriaId];
        if (!pool || !pool.length) return '';
        const rarity = itemsData.rarities.find((r) => r.id === categoriaId);
        const sample = pool[0];
        return (
          `<span class="offline-highlight-icon" title="${sample.name}" style="color:var(${
            rarity ? rarity.colorToken : '--amber'
          })">${iconMarkup(sample.icon, { size: 28 })}</span>`
        );
      })
      .join('');

    container.innerHTML =
      `<div class="modal-card offline-modal-card">` +
      `<h2>Mientras no estabas...</h2>` +
      `<p>Tus robots trabajaron ${minutes} min y encontraron:</p>` +
      `<p class="offline-money" id="offline-money-value">$0</p>` +
      (highlightIcons ? `<div class="offline-highlights">${highlightIcons}</div>` : '') +
      `<button type="button" data-action="close-offline">Genial</button>` +
      `</div>`;

    container.hidden = false;
    tweenNumberText(container.querySelector('#offline-money-value'), summary.ganancia, formatMoney, {
      durationMs: 800,
    });

    const close = () => {
      container.hidden = true;
      container.innerHTML = '';
    };
    container.querySelector('[data-action="close-offline"]').addEventListener('click', close);
    container.addEventListener(
      'click',
      (evt) => {
        if (evt.target === container) close();
      },
      { once: true }
    );
  },
};
