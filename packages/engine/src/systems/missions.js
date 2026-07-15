/**
 * Misiones diarias (ROADMAPv4.md §4.30/§4.31, ronda 24): 3 por día (fácil/media/difícil),
 * generadas data-driven (data/missions.json) SOLO sobre contenido alcanzable. El progreso se
 * calcula por DELTA contra un snapshot tomado al rollear, sobre contadores YA existentes del
 * estado (roadmap §24.3: "nada de tracking paralelo") — EXCEPCIÓN `streakReach`: la racha sube
 * y baja, así que el progreso es el MÁXIMO observado desde el roll (nunca un delta).
 */

import { localDayStamp } from '../time.js';
import { getTotalContainerDigs, getMissionRewardBaseValue } from '../economy.js';

/** Allow-list de tipos de misión — save.js la reusa para validar un save/import (napkin #8). */
export const MISSION_TYPES = [
  'findCategoryCount',
  'digContainerCount',
  'streakReach',
  'sellAtStallCount',
  'fulfillOrders',
  'moneyEarnedToday',
];

/** Allow-list de dificultades — save.js la reusa para validar. */
export const MISSION_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Valor actual del contador "existente" que respalda el progreso de una misión (todo tipo salvo
 * `streakReach`, que se trata aparte en `updateMissionsProgress`).
 * @param {import('../state.js').GameState} state
 * @param {{ type: string, params: Object }} mission
 * @param {Array<Object>} allContainers
 * @returns {number}
 */
function counterValue(state, mission, allContainers) {
  switch (mission.type) {
    case 'findCategoryCount':
      return state.itemsFoundByCategory[mission.params.categoria] || 0;
    case 'digContainerCount': {
      const container = allContainers.find((c) => c.id === mission.params.containerId);
      return container ? getTotalContainerDigs(state, container) : 0;
    }
    case 'sellAtStallCount':
      return state.stallSoldCount;
    case 'fulfillOrders':
      return state.ordersFulfilledCount;
    case 'moneyEarnedToday':
      return state.totalMoneyEarned;
    default:
      return 0;
  }
}

/**
 * Recalcula `progress` de todas las misiones activas (no reclamadas) contra los contadores
 * actuales. Se llama tras cualquier acción que pueda moverlos (escarbar, vender en el puesto,
 * cumplir un pedido, tick de automatización) — mismo patrón que `checkAchievements`/`checkStory`.
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @returns {void}
 */
export function updateMissionsProgress(state, allContainers) {
  for (const mission of state.dailyMissions) {
    if (mission.claimed) continue;
    if (mission.type === 'streakReach') {
      // EXCEPCIÓN (roadmap §24.3): la racha sube y baja: el progreso es el máximo observado.
      mission.progress = Math.min(mission.target, Math.max(mission.progress, state.digStreak));
      continue;
    }
    const current = counterValue(state, mission, allContainers);
    const delta = Math.max(0, current - mission.snapshot);
    mission.progress = Math.min(mission.target, delta);
  }
}

function ownedCategories(state, allContainers) {
  const set = new Set();
  for (const c of allContainers) {
    if ((state.ownedContainers[c.id] || 0) >= 1) {
      for (const categoria of c.categorias) set.add(categoria);
    }
  }
  return [...set];
}

function ownedContainerIds(state, allContainers) {
  return allContainers.filter((c) => (state.ownedContainers[c.id] || 0) >= 1).map((c) => c.id);
}

/**
 * Arma una misión a partir de una plantilla de data/missions.json ya elegida.
 * @param {import('../state.js').GameState} state
 * @param {Object} tpl - una entrada de `data.missions.types`
 * @param {Array<string>} cats - categorías poseídas (para findCategoryCount)
 * @param {Array<string>} containerIds - contenedores poseídos (para digContainerCount)
 * @param {number} rewardBaseValue - V (getMissionRewardBaseValue), fijado al momento del roll
 * @param {Array<Object>} allContainers
 * @param {Object} data - data.missions
 * @param {() => number} random
 * @returns {import('../state.js').DailyMission}
 */
function buildMission(state, tpl, cats, containerIds, rewardBaseValue, allContainers, data, random) {
  const id = `mission-${tpl.type}-${Math.floor(random() * 1e9)}`;
  const params = {};
  let target = tpl.n || 0;
  if (tpl.type === 'findCategoryCount') {
    params.categoria = cats[Math.floor(random() * cats.length)];
  } else if (tpl.type === 'digContainerCount') {
    params.containerId = containerIds[Math.floor(random() * containerIds.length)];
  } else if (tpl.type === 'moneyEarnedToday') {
    // AJUSTE (ronda 24, fix): rewardBaseValue (V) es 0 sin ningún contenedor poseído — un
    // `target` de 0 pasaría el `> 0` de validateDeepContent como NaN/negativo lo haría, pero acá
    // el problema es peor: 0 rompe la validación (`target > 0` exige > 0 estricto) y tira TODO
    // el save inválido al deserializar (napkin: nunca dejar que un campo derivado llegue a un
    // valor límite no contemplado). Mínimo 1, mismo criterio que las recompensas de abajo.
    target = Math.max(1, Math.ceil(data.rewardMoneyMultHard * rewardBaseValue));
  }
  const reward =
    tpl.difficulty === 'easy'
      ? { type: 'money', amount: Math.max(1, Math.round(data.rewardMoneyMultEasy * rewardBaseValue)) }
      : tpl.difficulty === 'medium'
        ? { type: 'money', amount: Math.max(1, Math.round(data.rewardMoneyMultMedium * rewardBaseValue)) }
        : { type: 'keys', amount: Math.min(data.rewardKeysCap, 1 + Math.floor(state.prestigeCount / 3)) };
  const snapshot = counterValue(state, { type: tpl.type, params }, allContainers);
  return {
    id,
    type: tpl.type,
    difficulty: tpl.difficulty,
    params,
    target,
    progress: 0,
    claimed: false,
    snapshot,
    reward,
  };
}

/**
 * Rollea las 3 misiones del día (una por dificultad), SOLO sobre plantillas alcanzables:
 * `requiresStall` exige `stallLevel >= 1`; `findCategoryCount`/`digContainerCount` exigen al
 * menos una categoría/contenedor poseído. Si ninguna plantilla de una dificultad es alcanzable
 * todavía (early game sin ningún contenedor comprado), esa dificultad se omite — el jugador
 * arranca con menos de 3 misiones hasta tener contenido; nunca se fabrica una misión imposible.
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {{ containers: Object<string, Array<Object>> }} itemsData
 * @param {{ missions?: Object }} data
 * @param {() => number} [random]
 * @returns {import('../state.js').DailyMission[]}
 */
export function rollThreeMissions(state, allContainers, itemsData, data, random = Math.random) {
  const missionsData = data.missions;
  const cats = ownedCategories(state, allContainers);
  const containerIds = ownedContainerIds(state, allContainers);
  const rewardBaseValue = getMissionRewardBaseValue(state, allContainers, itemsData);
  const missions = [];
  for (const difficulty of MISSION_DIFFICULTIES) {
    const templates = missionsData.types.filter((tpl) => {
      if (tpl.difficulty !== difficulty) return false;
      if (tpl.requiresStall && state.stallLevel < 1) return false;
      if (tpl.type === 'findCategoryCount' && !cats.length) return false;
      if (tpl.type === 'digContainerCount' && !containerIds.length) return false;
      return true;
    });
    if (!templates.length) continue;
    const tpl = templates[Math.floor(random() * templates.length)];
    missions.push(buildMission(state, tpl, cats, containerIds, rewardBaseValue, allContainers, missionsData, random));
  }
  return missions;
}

/**
 * Rerollea las misiones diarias si corresponde (§4.30, reloj seguro §3.3): al cambiar el día
 * local Y solo si el reloj avanzó (`now > missionsRolledAt`) — con el reloj hacia atrás no
 * rerollea nunca. El progreso no reclamado se pierde: es diario, por diseño.
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {{ containers: Object<string, Array<Object>> }} itemsData
 * @param {{ missions?: Object }} data
 * @param {number} [now]
 * @param {() => number} [random]
 * @returns {void}
 */
export function rerollDailyMissionsIfNeeded(state, allContainers, itemsData, data, now = Date.now(), random = Math.random) {
  if (!data.missions) return;
  if (now <= state.missionsRolledAt) return;
  const dayChanged = localDayStamp(now) !== localDayStamp(state.missionsRolledAt);
  if (!dayChanged && state.dailyMissions.length > 0) return;
  state.dailyMissions = rollThreeMissions(state, allContainers, itemsData, data, random);
  state.missionsRolledAt = now;
}

/**
 * Reclama la recompensa de una misión ya cumplida (progress >= target).
 * @param {import('../state.js').GameState} state
 * @param {string} missionId
 * @returns {{ ok: true, reward: { type: 'money'|'keys', amount: number } } | { ok: false, error: string }}
 */
export function claimMission(state, missionId) {
  const mission = state.dailyMissions.find((m) => m.id === missionId);
  if (!mission) return { ok: false, error: 'Misión desconocida.' };
  if (mission.claimed) return { ok: false, error: 'Misión ya reclamada.' };
  if (mission.progress < mission.target) return { ok: false, error: 'Todavía no se cumplió la misión.' };
  mission.claimed = true;
  state.missionsCompletedCount++;
  if (mission.reward.type === 'money') {
    state.money += mission.reward.amount;
    state.totalMoneyEarned += mission.reward.amount;
  } else {
    state.prestigeKeys += mission.reward.amount;
  }
  return { ok: true, reward: mission.reward };
}
