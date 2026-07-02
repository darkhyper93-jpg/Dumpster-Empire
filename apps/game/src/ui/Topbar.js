/**
 * Barra superior: dinero y llaves de prestigio. Lectura pura de estado, sin cálculos propios.
 * El contador de dinero usa tween (PLAN.md §5.2: nunca debe saltar de golpe, 300-500ms).
 */

import { formatMoney, formatNumber } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { tweenNumberText } from '../fx/tween.js';

export const Topbar = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   */
  render(container, state) {
    const moneyEl = container.querySelector('#money');
    const keysEl = container.querySelector('#keys');
    const settingsBtn = container.querySelector('#settings-btn');

    if (moneyEl) {
      if (!moneyEl.dataset.iconReady) {
        moneyEl.dataset.iconReady = 'true';
        moneyEl.innerHTML = `${iconMarkup('money')}<span id="money-value"></span>`;
      }
      tweenNumberText(moneyEl.querySelector('#money-value'), state.money, formatMoney);
    }
    if (keysEl) {
      if (!keysEl.dataset.iconReady) {
        keysEl.dataset.iconReady = 'true';
        keysEl.innerHTML = `${iconMarkup('keys')}<span id="keys-value"></span>`;
      }
      tweenNumberText(keysEl.querySelector('#keys-value'), state.prestigeKeys, formatNumber, { roll: false });
    }
    if (settingsBtn && !settingsBtn.dataset.iconReady) {
      settingsBtn.dataset.iconReady = 'true';
      settingsBtn.innerHTML = `${iconMarkup('settings')}<span class="sr-only">Ajustes</span>`;
    }
  },
};
