/**
 * Grid de logros: estado bloqueado/desbloqueado (PLAN.md §5.4.3). Cada condición
 * ya fue evaluada por el engine (`checkAchievements`); acá solo se lee `achievementsUnlocked`.
 */

import { formatMoney, formatNumber } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { t } from '../i18n/i18n.js';

export const AchievementsView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    const { achievementsData } = store.ctx;
    if (!achievementsData.length) {
      container.innerHTML = `<p class="empty-state">${t('achievements.empty')}</p>`;
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

    container.innerHTML = `<div class="achievements-grid">${cards}</div>`;
  },
};
