/**
 * Sistema de logros: condiciones data-driven (apps/game/src/data/achievements.json),
 * evaluadas genéricamente acá. Ningún logro está hardcodeado en el engine.
 */

const CONDITION_EVALUATORS = {
  totalMoneyEarnedAtLeast: (state, cond) => state.totalMoneyEarned >= cond.value,
  itemsFoundCountAtLeast: (state, cond) => state.itemsFoundCount >= cond.value,
  categoryFoundAtLeast: (state, cond) => (state.itemsFoundByCategory[cond.categoria] || 0) >= cond.value,
  prestigeCountAtLeast: (state, cond) => state.prestigeCount >= cond.value,
  trapsHitAtLeast: (state, cond) => state.trapsHit >= cond.value,
  autoProcessedCountAtLeast: (state, cond) => state.autoProcessedCount >= cond.value,
  allContainersOwned: (state, cond, ctx) => ctx.allContainers.every((c) => (state.ownedContainers[c.id] || 0) >= 1),
  allAutomationsOwned: (state, cond, ctx) => ctx.allAutomations.every((a) => state.automationOwned[a.id]),
  allUpgradeLevelsAtLeast: (state, cond) => Object.values(state.upgradeLevels).every((level) => level >= cond.value),
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
 * Revisa todos los logros no desbloqueados y desbloquea los que ya cumplen su condición.
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
      newlyUnlocked.push(achievement.id);
    }
  }
  return newlyUnlocked;
}
