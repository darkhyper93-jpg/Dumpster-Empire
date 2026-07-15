/**
 * Sección de misiones diarias de Chispa (ROADMAPv4.md §4.30/§4.31, ronda 24). Vive dentro de
 * StallView (si el Puesto está desbloqueado) o de AchievementsView (si no) — decisión de espacio
 * documentada en el roadmap. No reimplementa ninguna fórmula: progreso/recompensa ya vienen
 * calculados por el engine en `state.dailyMissions`.
 */

import { formatMoney } from '@dumpster/engine';
import { portraitMarkup } from '../icons/portraits.js';
import { t } from '../i18n/i18n.js';

/**
 * Descripción de una misión. `params.categoria`/`params.containerId` son strings libres del save
 * (validados solo por tipo, no allow-list) — se resuelven SIEMPRE contra la data real antes de
 * interpolar, con fallback seguro, nunca crudos en innerHTML (napkin #8, mismo patrón que
 * StallView.renderOrders con `order.categoria`).
 * @param {import('@dumpster/engine').DailyMission} mission
 * @param {{ rarities: Array<Object> }} itemsData
 * @param {Array<Object>} allContainers
 * @returns {string}
 */
function missionDescription(mission, itemsData, allContainers) {
  switch (mission.type) {
    case 'findCategoryCount': {
      const rarity = itemsData.rarities.find((r) => r.id === mission.params.categoria);
      return t('missions.desc.findCategoryCount', {
        n: mission.target,
        categoria: rarity ? rarity.name : t('collection.hiddenName'),
      });
    }
    case 'digContainerCount': {
      const container = allContainers.find((c) => c.id === mission.params.containerId);
      return t('missions.desc.digContainerCount', {
        n: mission.target,
        contenedor: container ? container.name : t('collection.hiddenName'),
      });
    }
    case 'streakReach':
      return t('missions.desc.streakReach', { n: mission.target });
    case 'sellAtStallCount':
      return t('missions.desc.sellAtStallCount', { n: mission.target });
    case 'fulfillOrders':
      return t('missions.desc.fulfillOrders', { n: mission.target });
    case 'moneyEarnedToday':
      return t('missions.desc.moneyEarnedToday', { monto: formatMoney(mission.target) });
    default:
      return t('collection.hiddenName');
  }
}

function rewardLabel(mission) {
  if (mission.reward.type === 'money') return t('missions.rewardMoney', { amount: formatMoney(mission.reward.amount) });
  return t('missions.rewardKeys', { amount: mission.reward.amount, plural: mission.reward.amount === 1 ? '' : 's' });
}

/**
 * @param {import('@dumpster/engine').DailyMission} mission
 * @param {number} index - posición en `state.dailyMissions`, usada por el click delegado (nunca
 *   se interpola `mission.id` crudo en un atributo — mismo criterio que `data-index` en StallView).
 */
function missionCard(mission, index, itemsData, allContainers) {
  const done = mission.progress >= mission.target;
  return (
    `<article class="mission-card ${mission.claimed ? 'mission-card--claimed' : ''}">` +
    `<span class="badge mission-card-difficulty">${t(`missions.difficulty.${mission.difficulty}`)}</span>` +
    `<p class="mission-card-desc">${missionDescription(mission, itemsData, allContainers)}</p>` +
    `<p class="mission-card-progress">${t('missions.progress', { progress: Math.min(mission.progress, mission.target), target: mission.target })}</p>` +
    `<p class="mission-card-reward">${rewardLabel(mission)}</p>` +
    (mission.claimed
      ? `<span class="badge">${t('missions.claimed')}</span>`
      : `<button type="button" data-action="claim-mission" data-index="${index}" ${done ? '' : 'disabled'}>${t('missions.claim')}</button>`) +
    `</article>`
  );
}

export const MissionsSection = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.boundClickMissions) {
      container.dataset.boundClickMissions = 'true';
      container.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-action="claim-mission"]');
        if (!btn || btn.disabled) return;
        const index = Number(btn.dataset.index);
        const mission = store.getState().dailyMissions[index];
        if (mission) store.actions.claimMission(mission.id);
      });
    }

    const { itemsData, allContainers } = store.ctx;
    const missions = state.dailyMissions;
    container.innerHTML =
      `<div class="missions-npc">` +
      `<span class="missions-npc-portrait">${portraitMarkup('portrait-chispa', { size: 48 })}</span>` +
      `<div class="missions-npc-text"><h3>${t('missions.title')}</h3><p>${t('missions.intro')}</p></div>` +
      `</div>` +
      (missions.length
        ? `<div class="missions-grid">${missions.map((m, i) => missionCard(m, i, itemsData, allContainers)).join('')}</div>`
        : `<p class="empty-state">${t('missions.empty')}</p>`);
  },
};
