/**
 * Historia liviana (roadmap ROADMAPv4.md §3.2, ronda 23.C): viñetas de NPC que se muestran UNA
 * vez, condicionadas al mismo motor genérico que los logros (`CONDITION_EVALUATORS`,
 * achievements.js) — sin recompensa, solo `state.storySeen` para no repetir.
 */

import { CONDITION_EVALUATORS } from './achievements.js';

/**
 * Revisa todos los hitos de historia no vistos, marca los que ya cumplen su condición.
 * @param {import('../state.js').GameState} state
 * @param {Array<{ id: string, npcId: string, cond: Object, textKey: string }>} storyData
 * @param {Object} ctx - mismo shape de contexto que checkAchievements (allContainers/allAutomations/etc.)
 * @returns {Array<{ id: string, npcId: string, cond: Object, textKey: string }>} hitos recién vistos en esta revisión
 */
export function checkStory(state, storyData, ctx) {
  const newlySeen = [];
  for (const milestone of storyData) {
    if (state.storySeen.includes(milestone.id)) continue;
    const evaluator = CONDITION_EVALUATORS[milestone.cond.type];
    if (!evaluator) throw new Error(`Tipo de condición de historia desconocido: ${milestone.cond.type}`);
    if (evaluator(state, milestone.cond, ctx)) {
      state.storySeen.push(milestone.id);
      newlySeen.push(milestone);
    }
  }
  return newlySeen;
}
