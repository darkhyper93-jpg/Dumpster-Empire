/**
 * Sistema de contenedores: compra, roll de resultado y aplicación (dinero, ítems, trampas).
 * Mutaciones puras: reciben el estado y lo mutan/devuelven, sin tocar el DOM.
 */

import {
  getContainerCost,
  getEffectiveTrapProbability,
  getLuck,
  getSellMult,
  getDepthValueMult,
  getFragmentMult,
  getLevelRarityShift,
  getLevelValueMult,
  getTrapPenalty,
  registerContainerDig,
  itemSaleValue,
} from '../economy.js';
import { rollCategory, rollItem, rollItemVariance, rollIsTrap, refreshMarketFluctuation } from '../rng.js';

/**
 * @typedef {Object} DigResult
 * @property {boolean} isTrap
 * @property {Array<{ icon: string, name: string, categoria: string, value: number }>} items
 * @property {number} moneyDelta
 */

/**
 * Determina si un contenedor está desbloqueado para el estado actual.
 * @param {import('../state.js').GameState} state
 * @param {Object} container
 * @param {Array<Object>} allContainers - lista completa en orden de desbloqueo
 * @returns {boolean}
 */
export function isContainerUnlocked(state, container, allContainers) {
  if (container.requiresPrestigeCount && state.prestigeCount < container.requiresPrestigeCount) return false;
  if (container.requiresAutomationId && !state.automationOwned[container.requiresAutomationId]) return false;
  const index = allContainers.findIndex((c) => c.id === container.id);
  if (index <= 0) return true;
  const previous = allContainers[index - 1];
  return (state.ownedContainers[previous.id] || 0) >= 1;
}

/**
 * Compra una unidad de un contenedor (descuenta dinero, incrementa cantidad comprada).
 * @param {import('../state.js').GameState} state
 * @param {Object} container
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyContainer(state, container, data) {
  const cost = getContainerCost(state, container, data);
  if (state.money < cost) return { ok: false, error: 'No alcanza el dinero para este contenedor.' };
  state.money -= cost;
  state.ownedContainers[container.id] = (state.ownedContainers[container.id] || 0) + 1;
  return { ok: true };
}

/**
 * Tira el resultado de escarbar un contenedor: trampa o lista de ítems con su valor final.
 * @param {import('../state.js').GameState} state
 * @param {Object} container
 * @param {boolean} isAuto
 * @param {{ containers: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @param {() => number} [random]
 * @returns {DigResult}
 */
export function rollContainerResult(state, container, isAuto, itemsData, data, random = Math.random) {
  const { marketFluctuation, marketFluctuationAt } = refreshMarketFluctuation(
    state.marketFluctuation,
    state.marketFluctuationAt,
    Date.now(),
    random
  );
  state.marketFluctuation = marketFluctuation;
  state.marketFluctuationAt = marketFluctuationAt;

  const trapProb = getEffectiveTrapProbability(state, container, isAuto, data);
  if (rollIsTrap(trapProb, random)) {
    return { isTrap: true, items: [], moneyDelta: 0 };
  }

  const luck = getLuck(state, data);
  const depthValueMult = getDepthValueMult(state, data);
  // PLAN.md §11.3: a mayor nivel del contenedor, más probabilidad de la categoría rara propia.
  const levelShift = getLevelRarityShift(state, container);
  // PLAN.md §11.3 (ronda 9): a mayor nivel del contenedor, más valen sus ítems.
  const levelValueMult = getLevelValueMult(state, container);
  const containerPool = itemsData.containers[container.id];
  const items = [];
  for (let i = 0; i < container.slots; i++) {
    const categoria = rollCategory(container.categorias, luck, levelShift, random);
    const rarity = itemsData.rarities.find((r) => r.id === categoria);
    // PLAN.md §11.4: el pool de ítems es propio del contenedor, nunca compartido con otro.
    const pool = containerPool.filter((item) => item.categoria === categoria);
    const pick = rollItem(pool, random);
    const variance = rollItemVariance(random);
    const value =
      itemSaleValue({
        valorBaseObjeto: pick.valorBase * variance,
        multiplicadorRareza: rarity.mult,
        suerte: luck,
        fluctuacionMercado: state.marketFluctuation,
        sellMult: getSellMult(state, categoria, data),
        depthValueMult,
      }) * levelValueMult;
    items.push({ icon: pick.icon, name: pick.name, categoria, value });
  }
  const moneyDelta = items.reduce((sum, item) => sum + item.value, 0);
  return { isTrap: false, items, moneyDelta };
}

/**
 * Aplica un DigResult ya calculado al estado: dinero, contadores de ítems, fragmentos, trampas.
 * @param {import('../state.js').GameState} state
 * @param {Object} container
 * @param {DigResult} result
 * @param {boolean} isAuto
 * @param {import('../economy.js').EngineData} data
 * @returns {{ moneyDelta: number, trapPenalty: number }}
 */
export function applyContainerResult(state, container, result, isAuto, data) {
  // PLAN.md §11.3: cada escarbado (trampa o no) cuenta para el nivel propio del contenedor.
  registerContainerDig(state, container);

  if (result.isTrap) {
    // PLAN.md §11.2/§4.6: el castigo escala con el tier del contenedor, suavizado por Suerte.
    const penalty = Math.min(state.money, getTrapPenalty(state, container, data));
    state.money -= penalty;
    state.trapsHit++;
    return { moneyDelta: 0, trapPenalty: penalty };
  }
  let total = 0;
  const fragmentCategories = ['antiques', 'art', 'relics', 'future'];
  for (const item of result.items) {
    total += item.value;
    state.itemsFoundCount++;
    state.itemsFoundByCategory[item.categoria] = (state.itemsFoundByCategory[item.categoria] || 0) + 1;
    // PLAN.md §11.5: el INDEX necesita el contador por ítem específico, no solo por categoría.
    const byContainer = state.itemsFoundByItem[container.id] || (state.itemsFoundByItem[container.id] = {});
    byContainer[item.name] = (byContainer[item.name] || 0) + 1;
    if (fragmentCategories.includes(item.categoria)) {
      state.categoryFragments += 1 * getFragmentMult(state, data);
    }
  }
  state.money += total;
  state.totalMoneyEarned += total;
  if (isAuto) state.autoProcessedCount++;
  return { moneyDelta: total, trapPenalty: 0 };
}
