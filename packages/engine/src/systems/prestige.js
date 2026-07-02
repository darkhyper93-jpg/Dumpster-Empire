/**
 * Sistema de prestigio: "Llaves de Ciudad" (§2.8).
 */

import { prestigeKeysEarned, upgradeCost, getPrestigeStartMoney } from '../economy.js';

const PRESTIGE_MONEY_THRESHOLD = 1_000_000_000;

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
  if (level >= node.nivelMaximo) return { ok: false, error: 'Nodo ya al nivel máximo.' };
  const cost = nextPrestigeNodeCost(state, node);
  if (state.prestigeKeys < cost) return { ok: false, error: 'No alcanzan las Llaves de Ciudad.' };
  state.prestigeKeys -= cost;
  state.prestigeTreeLevels[node.id] = level + 1;
  return { ok: true };
}

/**
 * Ejecuta el prestigio: resetea dinero/contenedores/mejoras/automatización normales, conserva
 * Llaves de Ciudad, árbol de prestigio y logros.
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ok: true, keysEarned: number } | { ok: false, error: string }}
 */
export function doPrestige(state, data) {
  if (!canPrestige(state)) return { ok: false, error: 'Todavía no se alcanzó el umbral de prestigio.' };
  const keysEarned = prestigeKeysEarned(state.totalMoneyEarned);
  const startMoney = getPrestigeStartMoney(state, data);

  state.prestigeKeys += keysEarned;
  state.prestigeCount += 1;
  state.money = startMoney;
  state.totalMoneyEarned = startMoney;
  state.upgradeLevels = { luck: 0, digPower: 0, area: 0, capacity: 0 };
  state.ownedContainers = {};
  state.automationOwned = {};
  state.autoQueue = [];
  state.autoProcessing = [];

  return { ok: true, keysEarned };
}
