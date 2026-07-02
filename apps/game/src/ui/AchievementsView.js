/**
 * Grid de logros: estado bloqueado/desbloqueado (PLAN.md §5.4.3). Cada condición
 * ya fue evaluada por el engine (`checkAchievements`); acá solo se lee `achievementsUnlocked`.
 */

import { formatMoney, formatNumber } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

export const AchievementsView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    const { achievementsData } = store.ctx;
    if (!achievementsData.length) {
      container.innerHTML = '<p class="empty-state">No hay logros configurados.</p>';
      return;
    }

    const cards = achievementsData
      .map((a) => {
        const unlocked = state.achievementsUnlocked.includes(a.id);
        // PLAN.md §11.6: la recompensa la declara achievements.json (reward.type/amount);
        // acá solo se muestra, el engine ya la aplicó una sola vez al desbloquear.
        const rewardLabel =
          a.reward.type === 'keys'
            ? `${formatNumber(a.reward.amount)} llave${a.reward.amount === 1 ? '' : 's'} de Ciudad`
            : formatMoney(a.reward.amount);
        return (
          `<article class="achievement-card ${unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'}">` +
          `<span class="achievement-card-icon">${iconMarkup(a.icon, { size: 26 })}</span>` +
          `<h3>${a.name}</h3>` +
          `<p class="achievement-card-reward">${iconMarkup(a.reward.type === 'keys' ? 'key' : 'money', { size: 16 })} ${rewardLabel}</p>` +
          `<span class="badge">${unlocked ? 'Reclamado' : 'Pendiente'}</span>` +
          `</article>`
        );
      })
      .join('');

    container.innerHTML = `<div class="achievements-grid">${cards}</div>`;
  },
};
