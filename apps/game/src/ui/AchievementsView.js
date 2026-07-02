/**
 * Grid de logros: estado bloqueado/desbloqueado (PLAN.md §5.4.3). Cada condición
 * ya fue evaluada por el engine (`checkAchievements`); acá solo se lee `achievementsUnlocked`.
 */

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
        return (
          `<article class="achievement-card ${unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'}">` +
          `<span class="achievement-card-icon">${iconMarkup(a.icon, { size: 26 })}</span>` +
          `<h3>${a.name}</h3>` +
          `<span class="badge">${unlocked ? 'Desbloqueado' : 'Bloqueado'}</span>` +
          `</article>`
        );
      })
      .join('');

    container.innerHTML = `<div class="achievements-grid">${cards}</div>`;
  },
};
