/**
 * Sistema de prestigio: "Llaves de Ciudad" (§2.8) y prestigio profundo — especializaciones y
 * desafíos (PLAN.md §4.31/§4.32, ronda 25).
 */

import { prestigeKeysEarned, upgradeCost, getPrestigeStartMoney } from '../economy.js';
import { CONDITION_EVALUATORS } from './achievements.js';

// AJUSTE (auditoría post-ronda 14): exportado para que la UI (PrestigeView) muestre el umbral
// real en el tooltip de "Hacer Prestigio" en vez de un "$1.000.000.000" hardcodeado en el
// diccionario i18n que mentiría si el balance cambia. Es el mismo umbral de PLAN.md §4.3.
export const PRESTIGE_MONEY_THRESHOLD = 1_000_000_000;

/**
 * @param {import('../state.js').GameState} state
 * @returns {boolean}
 */
export function canPrestige(state) {
  return state.totalMoneyEarned >= PRESTIGE_MONEY_THRESHOLD;
}

/**
 * Llaves de Ciudad que se obtendrían si se prestigiara ahora mismo (para el preview de UI).
 * @param {import('../state.js').GameState} state
 * @returns {number}
 */
export function prestigeKeysPreview(state) {
  return prestigeKeysEarned(state.totalMoneyEarned);
}

/**
 * Costo en Llaves de Ciudad de la próxima compra de un nodo del árbol de prestigio.
 * @param {import('../state.js').GameState} state
 * @param {Object} node - definición de apps/game/src/data/prestigeTree.json
 * @returns {number}
 */
export function nextPrestigeNodeCost(state, node) {
  const level = state.prestigeTreeLevels[node.id] || 0;
  return upgradeCost(node.costoBase, node.factorCrecimiento, level);
}

/**
 * Si un nodo del árbol de prestigio está desbloqueado para comprar (PLAN.md §11.7): todos sus
 * `requires` deben tener al menos 1 nivel comprado. Árbol real, no una lista plana.
 * @param {import('../state.js').GameState} state
 * @param {Object} node - definición de apps/game/src/data/prestigeTree.json
 * @returns {boolean}
 */
export function isPrestigeNodeUnlocked(state, node) {
  const requires = node.requires || [];
  return requires.every((requiredId) => (state.prestigeTreeLevels[requiredId] || 0) >= 1);
}

/**
 * Compra un nivel de un nodo del árbol de prestigio (se paga con Llaves de Ciudad). Gatea por
 * los prerrequisitos declarados en `requires` (PLAN.md §11.7).
 * @param {import('../state.js').GameState} state
 * @param {Object} node
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyPrestigeNode(state, node) {
  if (!isPrestigeNodeUnlocked(state, node)) return { ok: false, error: 'Faltan prerrequisitos para este nodo.' };
  const level = state.prestigeTreeLevels[node.id] || 0;
  // PLAN.md §4.33 (ronda 25): `nivelMaximo` es opcional — un nodo infinito lo omite, y
  // `level >= undefined` siempre da `false`, así que nunca topea sin ningún cambio de código.
  if (level >= node.nivelMaximo) return { ok: false, error: 'Nodo ya al nivel máximo.' };
  const cost = nextPrestigeNodeCost(state, node);
  if (state.prestigeKeys < cost) return { ok: false, error: 'No alcanzan las Llaves de Ciudad.' };
  state.prestigeKeys -= cost;
  state.prestigeTreeLevels[node.id] = level + 1;
  return { ok: true };
}

/**
 * Evalúa el goal del desafío activo de la run SALIENTE (antes de resetearla) y, si se cumple,
 * otorga su recompensa permanente una sola vez (PLAN.md §4.32, ronda 25). Reusa
 * `CONDITION_EVALUATORS` (mismo motor que logros/historia/misiones, roadmap §3.2): el `ctx` que
 * pasan logros/historia no hace falta acá porque los dos goal types de esta ronda
 * (`totalMoneyEarnedAtLeast`/`always`) no lo usan.
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @returns {void}
 */
function resolveActiveChallengeGoal(state, data) {
  if (!state.activeChallenge || !data.challenges) return;
  const challenge = data.challenges.find((c) => c.id === state.activeChallenge);
  if (!challenge) return;
  if (state.challengesCompleted.includes(challenge.id)) return;
  const evaluator = CONDITION_EVALUATORS[challenge.goal.type];
  if (evaluator && evaluator(state, challenge.goal)) {
    state.challengesCompleted.push(challenge.id);
  }
}

/**
 * Aplica la elección de especialización/desafío para la PRÓXIMA run (PLAN.md §4.31/§4.32,
 * ronda 25) — se llama DESPUÉS del reset, así que sobrevive a él (R25.1). Son EXCLUYENTES: elegir
 * una limpia la otra. `null`/id desconocido en `data` deja ambas en null ("Sin especialización").
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @param {{ type: 'specialization' | 'challenge', id: string } | null} [choice]
 * @returns {void}
 */
function applyPrestigeChoice(state, data, choice) {
  state.specialization = null;
  state.activeChallenge = null;
  if (!choice) return;
  if (choice.type === 'specialization' && data.specializations?.some((s) => s.id === choice.id)) {
    state.specialization = choice.id;
    state.specializationsUsed += 1;
  } else if (choice.type === 'challenge' && data.challenges?.some((c) => c.id === choice.id)) {
    state.activeChallenge = choice.id;
  }
}

/**
 * Ejecuta el prestigio: resetea dinero/contenedores/mejoras/automatización normales, conserva
 * Llaves de Ciudad, árbol de prestigio y logros. Ronda 25 (PLAN.md §4.31/§4.32): antes del reset,
 * evalúa el goal del desafío saliente; después del reset, aplica la especialización/desafío
 * elegido para la run que arranca.
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @param {{ type: 'specialization' | 'challenge', id: string } | null} [choice] - elección para
 *   la PRÓXIMA run; `null`/omitido = "Sin especialización".
 * @returns {{ ok: true, keysEarned: number } | { ok: false, error: string }}
 */
export function doPrestige(state, data, choice = null) {
  if (!canPrestige(state)) return { ok: false, error: 'Todavía no se alcanzó el umbral de prestigio.' };
  resolveActiveChallengeGoal(state, data);
  const keysEarned = prestigeKeysEarned(state.totalMoneyEarned);
  const startMoney = getPrestigeStartMoney(state, data);

  state.prestigeKeys += keysEarned;
  state.totalKeysEarned += keysEarned;
  state.prestigeCount += 1;
  state.money = startMoney;
  state.totalMoneyEarned = startMoney;
  state.upgradeLevels = { luck: 0, digPower: 0, area: 0, capacity: 0 };
  state.ownedContainers = {};
  state.automationOwned = {};
  state.autoQueue = [];
  state.autoProcessing = [];
  // DECISIÓN (ronda 14, D6): un target apuntando a un contenedor re-bloqueado por el prestigio
  // dejaría al robot idle sin explicación; vuelve a modo Auto igual que el resto de automatización.
  state.autoTargetContainerId = null;
  applyPrestigeChoice(state, data, choice);

  return { ok: true, keysEarned };
}
