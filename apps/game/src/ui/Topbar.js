/**
 * Barra superior: dinero y llaves de prestigio. Lectura pura de estado, sin cálculos propios.
 * El contador de dinero usa tween (PLAN.md §5.2: nunca debe saltar de golpe, 300-500ms).
 */

import { formatMoney, formatNumber, isNightHour, getTimeBand } from '@dumpster/engine';
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
      const now = new Date();
      const hour = now.getHours();
      const night = isNightHour(hour, dayNightData);
      const band = getTimeBand(hour, dayNightData);
      // Ronda 30: además del sol/luna, el reloj con la hora y el nombre de la franja (pedido del
      // usuario: "quiero ver qué hora es y a qué hora se hace de día/tarde/noche").
      const clock = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const bandLabel = band ? t(`dayNight.band.${band}`) : '';
      // Esta función corre en CADA frame del rAF (loop.js). Reescribir el innerHTML 60 veces por
      // segundo tira a la basura el árbol del SVG y hace parpadear el texto, así que solo se
      // toca el DOM cuando la firma cambia (una vez por minuto, o al cambiar de idioma/franja).
      const signature = `${night}|${band}|${clock}|${bandLabel}`;
      if (dayNightEl.dataset.clockSignature !== signature) {
        dayNightEl.dataset.clockSignature = signature;
        dayNightEl.innerHTML =
          iconMarkup(night ? 'moon-night' : 'sun-day', { size: 18 }) +
          `<span class="topbar-clock"><span class="topbar-clock-time">${clock}</span>` +
          `<span class="topbar-clock-band">${bandLabel}</span></span>`;
        dayNightEl.title = night
          ? t('dayNight.nightTooltip', { luck: dayNightData.nightLuckBonus, pct: Math.round(dayNightData.nightTrapProbBonus * 100) })
          : t('dayNight.dayTooltip');
      }
    }
  },
};
