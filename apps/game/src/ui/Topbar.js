/**
 * Barra superior: dinero y llaves de prestigio. Lectura pura de estado, sin cálculos propios.
 * El contador de dinero usa tween (PLAN.md §5.2: nunca debe saltar de golpe, 300-500ms).
 */

import { formatMoney, formatNumber, isNightHour } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { tweenNumberText } from '../fx/tween.js';
import { t } from '../i18n/i18n.js';

export const Topbar = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {{ nightStartHour: number, nightEndHour: number, nightLuckBonus: number, nightTrapProbBonus: number }} [dayNightData] -
   *   ronda 24 (PLAN.md §4.33): indicador luna/sol, puramente derivado de la hora REAL del
   *   sistema (nunca de `state`) — se recalcula en cada frame vía el rAF que ya llama a esta
   *   función (loop.js), sin necesitar notify() del store.
   */
  render(container, state, dayNightData) {
    const moneyEl = container.querySelector('#money');
    const keysEl = container.querySelector('#keys');
    const settingsBtn = container.querySelector('#settings-btn');
    const statsBtn = container.querySelector('#stats-btn');
    const dayNightEl = container.querySelector('#daynight-indicator');

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
      settingsBtn.innerHTML = `${iconMarkup('settings')}<span class="sr-only">${t('topbar.settings')}</span>`;
    }
    if (statsBtn && !statsBtn.dataset.iconReady) {
      statsBtn.dataset.iconReady = 'true';
      statsBtn.innerHTML = `${iconMarkup('stats')}<span class="sr-only">${t('topbar.stats')}</span>`;
    }
    if (dayNightEl && dayNightData) {
      const hour = new Date().getHours();
      const night = isNightHour(hour, dayNightData);
      dayNightEl.innerHTML = iconMarkup(night ? 'moon-night' : 'sun-day', { size: 18 });
      dayNightEl.title = night
        ? t('dayNight.nightTooltip', { luck: dayNightData.nightLuckBonus, pct: Math.round(dayNightData.nightTrapProbBonus * 100) })
        : t('dayNight.dayTooltip');
    }
  },
};
