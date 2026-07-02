/**
 * Barra superior: dinero y llaves de prestigio. Lectura pura de estado, sin cálculos propios.
 */

import { formatMoney, formatNumber } from '@dumpster/engine';

export const Topbar = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   */
  render(container, state) {
    const moneyEl = container.querySelector('#money');
    const keysEl = container.querySelector('#keys');
    if (moneyEl) moneyEl.textContent = `Dinero: ${formatMoney(state.money)}`;
    if (keysEl) keysEl.textContent = `Llaves: ${formatNumber(state.prestigeKeys)}`;
  },
};
