/**
 * Sistema de logros: condiciones data-driven (apps/game/src/data/achievements.json),
 * evaluadas genéricamente acá. Ningún logro está hardcodeado en el engine.
 */

import { addMoney, addKeys, getFleetSize, isSetComplete } from '../economy.js';
import { hasAutoDig } from './automation.js';

// Exportado (ronda 23.C, roadmap §3.2): "un solo motor de condiciones para logros, historia y
// misiones" — systems/story.js lo reusa en vez de duplicar la lista de evaluadores.
export const CONDITION_EVALUATORS = {
  totalMoneyEarnedAtLeast: (state, cond) => state.totalMoneyEarned >= cond.value,
  itemsFoundCountAtLeast: (state, cond) => state.itemsFoundCount >= cond.value,
  categoryFoundAtLeast: (state, cond) => (state.itemsFoundByCategory[cond.categoria] || 0) >= cond.value,
  prestigeCountAtLeast: (state, cond) => state.prestigeCount >= cond.value,
  trapsHitAtLeast: (state, cond) => state.trapsHit >= cond.value,
  autoProcessedCountAtLeast: (state, cond) => state.autoProcessedCount >= cond.value,
  allContainersOwned: (state, cond, ctx) => ctx.allContainers.every((c) => (state.ownedContainers[c.id] || 0) >= 1),
  allAutomationsOwned: (state, cond, ctx) => ctx.allAutomations.every((a) => state.automationOwned[a.id]),
  allUpgradeLevelsAtLeast: (state, cond) => Object.values(state.upgradeLevels).every((level) => level >= cond.value),
  trapsDiscardedAtLeast: (state, cond) => state.trapsDiscarded >= cond.value,
  containerOwnedAtLeast: (state, cond) => (state.ownedContainers[cond.containerId] || 0) >= cond.value,
  // Ronda 19 (PLAN.md §4.20): evalúa la racha MÁXIMA histórica, no la actual — así el logro
  // queda ganado para siempre aunque la racha se corte después con una trampa.
  digStreakAtLeast: (state, cond) => state.bestDigStreak >= cond.value,
  // Ronda 20 (PLAN.md §4.21, §4.23): trampas graves sobrevividas y las 4 herramientas.
  gravesHitAtLeast: (state, cond) => state.gravesHit >= cond.value,
  // ctx.allTools ausente (llamador previo a la ronda 20) nunca desbloquea este logro — un
  // `.every()` sobre array vacío daría "true" (falso positivo instantáneo), no un no-op.
  allToolsOwned: (state, cond, ctx) =>
    Boolean(ctx.allTools?.length) && ctx.allTools.every((tool) => state.toolsOwned[tool.id]),
  // Ronda 22 (PLAN.md §4.26): cantidad de legendarios ya encontrados.
  legendariesFoundAtLeast: (state, cond) => state.legendariesFound.length >= cond.value,
  // Ronda 22 (PLAN.md §4.25): cantidad de contenedores con el pool completo. ctx.itemsData
  // ausente (llamador previo a la ronda 22) nunca desbloquea este logro, mismo criterio que
  // allToolsOwned con ctx.allTools ausente.
  setsCompletedAtLeast: (state, cond, ctx) =>
    Boolean(ctx.itemsData) &&
    ctx.allContainers.filter((c) => isSetComplete(state, c, ctx.itemsData)).length >= cond.value,
  // Ronda 23.B (PLAN.md §2.9, roadmap §3.1/§3.2): mismo motor de condiciones para logros e
  // historia liviana — pedidos cumplidos, nivel del Puesto y "al menos un ítem guardado" (esta
  // última se evalúa en vivo contra `inventory.length`: un logro nunca se re-bloquea una vez
  // desbloqueado, así que capturar 1 ítem y venderlo después no le hace perder el logro).
  ordersFulfilledAtLeast: (state, cond) => state.ordersFulfilledCount >= cond.value,
  stallLevelAtLeast: (state, cond) => state.stallLevel >= cond.value,
  stallInventoryAtLeast: (state, cond) => state.inventory.length >= cond.value,
  // Ronda 24 (PLAN.md §4.30/§4.32): misiones diarias reclamadas y eventos de contenedor
  // aprovechados.
  missionsCompletedAtLeast: (state, cond) => state.missionsCompletedCount >= cond.value,
  eventsUsedAtLeast: (state, cond) => state.eventsUsedCount >= cond.value,
  // Ronda 25 (PLAN.md §4.32): goal genérico "sin más condición que cumplirse el evento" —
  // usado por el goal de los desafíos `campoMinado`/`pulsoDebil` (alcanzar el prestigio ya
  // implica que se sobrevivió toda la run con el modificador activo).
  always: () => true,
  // Ronda 25 (PLAN.md §4.33): CUALQUIERA de los nodos infinitos del árbol llega a nivel N
  // (los 3 son intercambiables para este logro — el jugador elige a cuál apostarle las Llaves).
  anyPrestigeNodeLevelAtLeast: (state, cond) =>
    cond.nodeIds.some((nodeId) => (state.prestigeTreeLevels[nodeId] || 0) >= cond.value),
  specializationsUsedAtLeast: (state, cond) => state.specializationsUsed >= cond.value,
  challengesCompletedAtLeast: (state, cond) => state.challengesCompleted.length >= cond.value,
  // Ronda 26.C (PLAN.md §2.10/§4.34): cantidad de Mudanzas de Galaxia realizadas.
  galaxyMoveCountAtLeast: (state, cond) => state.galaxyMoveCount >= cond.value,
  // Ronda 27 (PLAN.md §4.38): "N robots ACTIVOS" — el tamaño de flota configurado solo cuenta si
  // hay un robot escarbando de verdad (hasAutoDig). ctx.data ausente (llamador previo a esta
  // ronda, o resolveActiveChallengeGoal, que evalúa goals sin ctx) nunca desbloquea este logro —
  // mismo criterio defensivo que allToolsOwned/setsCompletedAtLeast.
  fleetSizeAtLeast: (state, cond, ctx) =>
    Boolean(ctx?.data) && hasAutoDig(state, ctx.data) && getFleetSize(state, ctx.data) >= cond.value,
  // Ronda 27 (PLAN.md §4.39): contenedores procesados con algún filtro activo.
  filteredProcessedCountAtLeast: (state, cond) => state.filteredProcessedCount >= cond.value,
};

/**
 * Evalúa la condición de un logro contra el estado actual.
 * @param {import('../state.js').GameState} state
 * @param {Object} achievement
 * @param {{ allContainers: Array<Object>, allAutomations: Array<Object> }} ctx
 * @returns {boolean}
 */
function evaluateCondition(state, achievement, ctx) {
  const evaluator = CONDITION_EVALUATORS[achievement.cond.type];
  if (!evaluator) throw new Error(`Tipo de condición de logro desconocido: ${achievement.cond.type}`);
  return evaluator(state, achievement.cond, ctx);
}

/**
 * Otorga la recompensa declarada de un logro (PLAN.md §11.6). Se llama una sola vez, en el
 * momento exacto del desbloqueo — nunca se reaplica en revisiones posteriores.
 * @param {import('../state.js').GameState} state
 * @param {Object} achievement
 * @returns {void}
 */
function applyAchievementReward(state, achievement) {
  const reward = achievement.reward;
  if (!reward) return;
  if (reward.type === 'money') {
    // §27.5.1 (Y1, ronda 27): toda ganancia entra por addMoney (clamp anti-Infinity).
    addMoney(state, reward.amount);
  } else if (reward.type === 'keys') {
    // AJUSTE (auditoría de release, napkin #8): entra por addKeys (clamp anti-Infinity), igual
    // que las ganancias de dinero pasan por addMoney.
    addKeys(state, reward.amount);
  } else {
    throw new Error(`Tipo de recompensa de logro desconocido: ${reward.type}`);
  }
}

/**
 * Revisa todos los logros no desbloqueados, desbloquea los que ya cumplen su condición y
 * les otorga su recompensa (§11.6) una sola vez.
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} achievementsData
 * @param {{ allContainers: Array<Object>, allAutomations: Array<Object> }} ctx
 * @returns {string[]} ids de los logros recién desbloqueados en esta revisión
 */
export function checkAchievements(state, achievementsData, ctx) {
  const newlyUnlocked = [];
  for (const achievement of achievementsData) {
    if (state.achievementsUnlocked.includes(achievement.id)) continue;
    if (evaluateCondition(state, achievement, ctx)) {
      state.achievementsUnlocked.push(achievement.id);
      applyAchievementReward(state, achievement);
      newlyUnlocked.push(achievement.id);
    }
  }
  return newlyUnlocked;
}
