/**
 * Sistema de prestigio: "Llaves de Ciudad" (§2.8) y prestigio profundo — especializaciones y
 * desafíos (PLAN.md §4.31/§4.32, ronda 25).
 */

import { prestigeKeysEarned, upgradeCost, getPrestigeStartMoney, getDeedsKeysBonusFlat } from '../economy.js';
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
  // PLAN.md §4.36 (ronda 26): `memoriaDeCiudades` del árbol de Escrituras suma Llaves flat por
  // prestigio, sobre el resultado literal de §4.3 (sobrevive mudanzas, a diferencia del resto).
  const keysEarned = prestigeKeysEarned(state.totalMoneyEarned) + getDeedsKeysBonusFlat(state, data);
  const startMoney = getPrestigeStartMoney(state, data);

  state.prestigeKeys += keysEarned;
  state.totalKeysEarned += keysEarned;
  // PLAN.md §4.35 (ronda 26): ventana de Llaves desde la última mudanza (o desde el inicio) —
  // `doGalaxyMove` la consume para pagar Escrituras y la resetea a 0.
  state.totalKeysEarnedRun += keysEarned;
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

// ---------------------------------------------------------------------------
// Mudanza de Galaxia — segunda capa de prestigio (PLAN.md §2.11/§4.34, ronda 26).
// ---------------------------------------------------------------------------

/** Prestigios necesarios para desbloquear la Mudanza de Galaxia (PLAN.md §4.34). */
export const GALAXY_MOVE_PRESTIGE_THRESHOLD = 10;

/**
 * @param {import('../state.js').GameState} state
 * @returns {boolean}
 */
export function canGalaxyMove(state) {
  return state.prestigeCount >= GALAXY_MOVE_PRESTIGE_THRESHOLD;
}

/**
 * Escrituras que se ganarían mudándose de galaxia ahora mismo (PLAN.md §4.35), para el preview
 * de UI. `totalKeysEarnedRun`/`prestigeCount` se leen ANTES de cualquier reset.
 * @param {import('../state.js').GameState} state
 * @returns {number}
 */
export function galaxyMoveDeedsPreview(state) {
  // AJUSTE (auditoría 26.D): dos contadores FINITOS y válidos (hasta ~1.8e308 cada uno) pueden
  // desbordar el producto a Infinity; sqrt(a×b) = sqrt(a)×sqrt(b) es matemáticamente idéntico y
  // su resultado máximo queda finito (~1.3e154 × 1.3e154 < Number.MAX_VALUE). El fallback solo
  // se usa si el producto desbordó, para no mover ni un ulp la fórmula literal de §4.35 en el
  // rango normal. Sin este guard, doGalaxyMove escribía `deeds: Infinity`, JSON.stringify lo
  // vuelve `null` y el PRÓXIMO boot rechazaba el save entero (wipe de la partida).
  const product = state.prestigeCount * state.totalKeysEarnedRun;
  const root = Number.isFinite(product)
    ? Math.sqrt(product)
    : Math.sqrt(state.prestigeCount) * Math.sqrt(state.totalKeysEarnedRun);
  return Math.max(1, Math.floor(root / 5));
}

/**
 * Ejecuta la Mudanza de Galaxia (PLAN.md §4.34): resetea todo lo que resetea un prestigio normal
 * y ADEMÁS `prestigeKeys`/`prestigeTreeLevels`/`prestigeCount`/`totalKeysEarnedRun` (a
 * diferencia de un prestigio, NO gana Llaves — las paga en Escrituras y las vacía). El desafío
 * activo se CANCELA sin evaluar su goal ni otorgar recompensa (a diferencia de `doPrestige`);
 * la especialización elegida también se limpia. El inventario del Puesto se liquida (nunca viaja
 * intacto a la próxima galaxia — "sin arbitraje entre galaxias"): se cuenta como vendido
 * (`stallSoldCount`) y se vacía; el dinero resultante es intrascendente porque `money` se
 * resetea en el mismo paso. Las Escrituras y su árbol (`deeds`/`deedsTreeLevels`) NUNCA se
 * tocan — sobreviven CADA mudanza, es el punto entero de esta capa.
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ok: true, deedsEarned: number } | { ok: false, error: string }}
 */
export function doGalaxyMove(state, data) {
  if (!canGalaxyMove(state)) {
    return { ok: false, error: `Hacen falta ${GALAXY_MOVE_PRESTIGE_THRESHOLD} prestigios para mudarse de galaxia.` };
  }
  const deedsEarned = galaxyMoveDeedsPreview(state);

  // R26.D: la mudanza liquida el inventario a venta instantánea — nunca se pierde, pero tampoco
  // viaja intacto (el dinero resultante no importa: se pisa con startMoney más abajo).
  state.stallSoldCount += state.inventory.length;
  state.inventory = [];

  // R26.D: un desafío activo se CANCELA sin recompensa (a diferencia de un prestigio normal, que
  // sí evalúa su goal vía resolveActiveChallengeGoal). La especialización también se limpia.
  state.activeChallenge = null;
  state.specialization = null;

  // Mismo reset de "run" que doPrestige.
  state.upgradeLevels = { luck: 0, digPower: 0, area: 0, capacity: 0 };
  state.ownedContainers = {};
  state.automationOwned = {};
  state.autoQueue = [];
  state.autoProcessing = [];
  state.autoTargetContainerId = null;

  // Reseteado ADEMÁS, exclusivo de la mudanza (nunca de un prestigio normal).
  state.prestigeKeys = 0;
  state.prestigeTreeLevels = {};
  state.prestigeCount = 0;
  state.totalKeysEarnedRun = 0;

  // getPrestigeStartMoney lee prestigeTreeLevels, ya vaciado arriba: siempre 0 tras una mudanza.
  const startMoney = getPrestigeStartMoney(state, data);
  state.money = startMoney;
  state.totalMoneyEarned = startMoney;

  // AJUSTE (auditoría 26.D): la acumulación se clampea a MAX_VALUE — un `deeds` previo
  // astronómico (finito, pasa validación) más lo ganado no debe desbordar a Infinity, que JSON
  // no serializa (mismo escenario de wipe que el guard de galaxyMoveDeedsPreview).
  state.deeds = Math.min(Number.MAX_VALUE, state.deeds + deedsEarned);
  state.galaxyMoveCount += 1;

  return { ok: true, deedsEarned };
}

/**
 * Costo en Escrituras de la próxima compra de un nodo del árbol de Escrituras — espejo de
 * `nextPrestigeNodeCost`, pero sobre `state.deedsTreeLevels`/`state.deeds` (PLAN.md §4.36).
 * @param {import('../state.js').GameState} state
 * @param {Object} node - definición de apps/game/src/data/deedsTree.json
 * @returns {number}
 */
export function nextDeedsNodeCost(state, node) {
  const level = state.deedsTreeLevels[node.id] || 0;
  return upgradeCost(node.costoBase, node.factorCrecimiento, level);
}

/**
 * Si un nodo del árbol de Escrituras está desbloqueado para comprar — espejo de
 * `isPrestigeNodeUnlocked`, pero sobre `state.deedsTreeLevels`.
 * @param {import('../state.js').GameState} state
 * @param {Object} node
 * @returns {boolean}
 */
export function isDeedsNodeUnlocked(state, node) {
  const requires = node.requires || [];
  return requires.every((requiredId) => (state.deedsTreeLevels[requiredId] || 0) >= 1);
}

/**
 * Compra un nivel de un nodo del árbol de Escrituras (se paga con Escrituras) — espejo de
 * `buyPrestigeNode`, pero sobre `state.deedsTreeLevels`/`state.deeds`. A diferencia del árbol de
 * prestigio, todos los nodos de `deedsTree.json` declaran `nivelMaximo` (PLAN.md §4.36: ninguno
 * es infinito).
 * @param {import('../state.js').GameState} state
 * @param {Object} node
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyDeedsNode(state, node) {
  if (!isDeedsNodeUnlocked(state, node)) return { ok: false, error: 'Faltan prerrequisitos para este nodo.' };
  const level = state.deedsTreeLevels[node.id] || 0;
  if (level >= node.nivelMaximo) return { ok: false, error: 'Nodo ya al nivel máximo.' };
  const cost = nextDeedsNodeCost(state, node);
  if (state.deeds < cost) return { ok: false, error: 'No alcanzan las Escrituras.' };
  state.deeds -= cost;
  state.deedsTreeLevels[node.id] = level + 1;
  return { ok: true };
}
