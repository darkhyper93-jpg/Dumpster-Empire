/**
 * Estadísticas (PLAN.md §5.4, ronda 19; movida a vista propia del header en la ronda 21):
 * deriva TODO de `state`/data existentes — no hay contador paralelo nuevo en el engine.
 */

import { formatMoney, formatNumber, getContainerLevel, CONTAINER_LEVEL_MAX } from '@dumpster/engine';
import { t } from '../i18n/i18n.js';
import { getCollectionCompletion } from '../collectionProgress.js';

export const StatsView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    const { allContainers, itemsData } = store.ctx;
    if (!allContainers.length) {
      container.innerHTML = `<p class="empty-state">${t('common.emptyContainers')}</p>`;
      return;
    }
    const { globalPct } = getCollectionCompletion(state, allContainers, itemsData);
    const containersMaxed = allContainers.filter((c) => getContainerLevel(state, c.id) >= CONTAINER_LEVEL_MAX).length;
    const rows = [
      t('stats.itemsFound', { count: formatNumber(state.itemsFoundCount) }),
      t('stats.trapsHit', { count: formatNumber(state.trapsHit) }),
      t('stats.totalMoneyEarned', { amount: formatMoney(state.totalMoneyEarned) }),
      t('stats.autoProcessed', { count: formatNumber(state.autoProcessedCount) }),
      t('stats.bestStreak', { count: formatNumber(state.bestDigStreak) }),
      t('stats.completion', { pct: Math.round(globalPct * 100) }),
      t('stats.maxLevelContainers', { count: containersMaxed, total: allContainers.length }),
    ];
    container.innerHTML =
      `<section class="settings-block settings-stats">` +
      `<h3>${t('stats.title')}</h3>` +
      rows.map((row) => `<p>${row}</p>`).join('') +
      `</section>`;
  },
};
