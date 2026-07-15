/**
 * Grid de logros: estado bloqueado/desbloqueado (PLAN.md §5.4.3). Cada condición
 * ya fue evaluada por el engine (`checkAchievements`); acá solo se lee `achievementsUnlocked`.
 */

import { formatMoney, formatNumber } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { t } from '../i18n/i18n.js';
import { MissionsSection } from './MissionsSection.js';

export const AchievementsView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    const { achievementsData, data } = store.ctx;
    // Ronda 24 (roadmap §24.3): sin Puesto desbloqueado, las misiones de Chispa viven acá (con
    // Puesto, StallView las muestra) — decisión de espacio del roadmap, nunca las dos a la vez.
    const stallUnlocked = Boolean(data.stall) && state.stallLevel >= 1;
    const missionsSlot = stallUnlocked ? '' : `<section class="achievements-missions" id="achievements-missions-slot"></section>`;
    if (!achievementsData.length) {
      container.innerHTML = `<p class="empty-state">${t('achievements.empty')}</p>` + missionsSlot;
      if (!stallUnlocked) MissionsSection.render(container.querySelector('#achievements-missions-slot'), state, store);
      return;
    }

    const cards = achievementsData
      .map((a) => {
        const unlocked = state.achievementsUnlocked.includes(a.id);
        // Ronda 19 (PLAN.md §5.4): los logros ocultos ("hidden": true) muestran "???" + ícono
        // genérico hasta desbloquearse — no delatan la condición sorpresa por adelantado.
        const isHiddenSecret = Boolean(a.hidden) && !unlocked;
        // PLAN.md §11.6: la recompensa la declara achievements.json (reward.type/amount);
        // acá solo se muestra, el engine ya la aplicó una sola vez al desbloquear.
        const rewardLabel =
          a.reward.type === 'keys'
            ? t('achievements.rewardKeys', { amount: formatNumber(a.reward.amount), plural: a.reward.amount === 1 ? '' : 's' })
            : formatMoney(a.reward.amount);
        return (
          `<article class="achievement-card ${unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'}">` +
          `<span class="achievement-card-icon">${iconMarkup(isHiddenSecret ? 'locked' : a.icon, { size: 26 })}</span>` +
          `<h3>${isHiddenSecret ? t('collection.hiddenName') : a.name}</h3>` +
          `<p class="achievement-card-reward">${iconMarkup(a.reward.type === 'keys' ? 'key' : 'money', { size: 16 })} ${
            isHiddenSecret ? t('collection.hiddenName') : rewardLabel
          }</p>` +
          `<span class="badge">${unlocked ? t('achievements.claimed') : t('achievements.pending')}</span>` +
          `</article>`
        );
      })
      .join('');

    container.innerHTML = `<div class="achievements-grid">${cards}</div>` + missionsSlot;
    if (!stallUnlocked) MissionsSection.render(container.querySelector('#achievements-missions-slot'), state, store);
  },
};
