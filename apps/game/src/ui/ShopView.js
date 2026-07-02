/**
 * Tienda de contenedores: grid de tarjetas con costo, categorías, riesgo de trampa
 * y botón de escarbar/comprar (PLAN.md §5.4.1). Comprar y escarbar son la misma
 * acción (`startManualDig`): igual que el prototipo, se paga y se revela en el
 * mismo gesto, no hay un paso de "comprar" separado de "escarbar" a mano.
 */

import {
  formatMoney,
  formatNumber,
  getContainerCost,
  isContainerUnlocked,
  getEffectiveTrapProbability,
  getLuck,
  getRecommendedLuck,
} from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

export const ShopView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.boundClick) {
      container.dataset.boundClick = 'true';
      container.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-action="dig-container"]');
        if (!btn || btn.disabled) return;
        store.actions.startManualDig(btn.dataset.containerId);
      });
    }

    const { allContainers, data, itemsData } = store.ctx;
    if (!allContainers.length) {
      container.innerHTML = '<p class="empty-state">No hay contenedores configurados.</p>';
      return;
    }

    const pendingDig = store.getPendingDig();
    const cards = allContainers.map((c) => {
      const unlocked = isContainerUnlocked(state, c, allContainers);
      if (!unlocked) {
        return (
          `<article class="shop-card shop-card--locked">` +
          `<span class="shop-card-icon">${iconMarkup(c.icon, { size: 28 })}</span>` +
          `<h3>${c.name}</h3>` +
          `<p>Bloqueado. Comprá el contenedor anterior primero.</p>` +
          `</article>`
        );
      }
      const cost = getContainerCost(state, c, data);
      const canAfford = state.money >= cost;
      const trapProb = getEffectiveTrapProbability(state, c, false, data);
      const disabled = !canAfford || Boolean(pendingDig);
      const reason = pendingDig
        ? 'Terminá o abandoná el escarbado actual primero.'
        : canAfford
        ? ''
        : `Te faltan ${formatMoney(cost - state.money)}`;
      const label = cost === 0 ? 'Escarbar (gratis)' : `Escarbar por ${formatMoney(cost)}`;
      // PLAN.md §11.2: Suerte recomendada — punto de rentabilidad esperada positiva, calculado
      // por el engine (getRecommendedLuck), nunca aproximado acá.
      const recommendedLuck = getRecommendedLuck(state, c, itemsData, data);
      const currentLuck = getLuck(state, data);
      const luckReached = currentLuck >= recommendedLuck;
      return (
        `<article class="shop-card">` +
        `<span class="shop-card-icon">${iconMarkup(c.icon, { size: 28 })}</span>` +
        `<h3>${c.name}</h3>` +
        `<p>Categorías: ${c.categorias.join(', ')}</p>` +
        `<p>Riesgo de trampa: ${Math.round(trapProb * 100)}%</p>` +
        `<p>Comprados: ${Number(state.ownedContainers[c.id]) || 0}</p>` +
        `<p class="shop-card-luck ${luckReached ? 'shop-card-luck--reached' : ''}">` +
        `Suerte recomendada: ${formatNumber(recommendedLuck)} ${luckReached ? '(alcanzada)' : `(tenés ${formatNumber(currentLuck)})`}` +
        `</p>` +
        `<button type="button" data-action="dig-container" data-container-id="${c.id}" ${disabled ? 'disabled' : ''} title="${reason}">${label}</button>` +
        `</article>`
      );
    });

    container.innerHTML = `<div class="shop-grid">${cards.join('')}</div>`;
  },
};
