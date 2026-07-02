/**
 * Sistema de mejoras repetibles (Suerte, Fuerza, Área, Capacidad).
 */

import { upgradeCost } from '../economy.js';

/**
 * Costo de la próxima compra de una mejora repetible.
 * @param {import('../state.js').GameState} state
 * @param {Object} upgrade - definición de apps/game/src/data/upgrades.json
 * @returns {number}
 */
export function nextUpgradeCost(state, upgrade) {
  const level = state.upgradeLevels[upgrade.id] || 0;
  return upgradeCost(upgrade.costoBase, upgrade.factorCrecimiento, level);
}

/**
 * Compra un nivel de una mejora repetible.
 * @param {import('../state.js').GameState} state
 * @param {Object} upgrade
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyUpgrade(state, upgrade) {
  const cost = nextUpgradeCost(state, upgrade);
  if (state.money < cost) return { ok: false, error: 'No alcanza el dinero para esta mejora.' };
  state.money -= cost;
  state.upgradeLevels[upgrade.id] = (state.upgradeLevels[upgrade.id] || 0) + 1;
  return { ok: true };
}
