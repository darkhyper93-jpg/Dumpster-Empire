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
  getMechanicValueMult,
  getTrapPenalty,
  registerContainerDig,
  itemSaleValue,
} from '../economy.js';
import { rollCategory, rollItem, rollItemVariance, rollIsTrap, rollTrapGrade, refreshMarketFluctuation } from '../rng.js';

/**
 * @typedef {Object} DigResult
 * @property {boolean} isTrap
 * @property {'leve' | 'normal' | 'grave'} [trapGrade] - solo si isTrap y data.traps existía en
 *   el momento del roll (PLAN.md §4.21, ronda 20). Ausente = tratar como "normal" (compat).
 * @property {Array<{ id: string, icon: string, name: string, categoria: string, value: number, isFirstRareFind: boolean }>} items
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
  // PLAN.md §4.24 (ronda 20): los contenedores con mecánica propia (Bóveda a Contrarreloj,
  // Sótano Sin Luz) van al final del array pero gatean por prestigio 7/8 — la regla de cadena
  // de abajo ("poseer el contenedor anterior") los dejaría bloqueados hasta el prestigio 9
  // (vertederoBigBang, que va justo antes). fueraDeCadena los exime de esa regla; su único
  // desbloqueo es requiresPrestigeCount (ya evaluado arriba).
  if (container.fueraDeCadena) return true;
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
    // PLAN.md §4.21 (ronda 20): el grado es un roll SEGUNDO e independiente, nunca afecta la
    // probabilidad de trampa de arriba. `data.traps` es opcional a propósito (mismo patrón que
    // `data.streak` en getLuck, ronda 19): los llamadores previos a esta ronda no lo pasan, y
    // sin él no se consume un random() extra — el comportamiento y la secuencia de RNG de los
    // ~300 tests previos a la ronda 20 quedan bit a bit idénticos.
    if (data.traps) {
      return { isTrap: true, trapGrade: rollTrapGrade(data.traps.gradosProb, random), items: [], moneyDelta: 0 };
    }
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
  const rarest = container.categorias[container.categorias.length - 1];
  // Un contenedor multi-slot puede sacar el mismo ítem dos veces en el MISMO roll — solo la
  // primera lleva el flag. Esto funciona porque este loop corre ANTES de que applyContainerResult
  // incremente itemsFoundByItem (D7, PLAN.md §5.2 ronda 14).
  const seenInThisRoll = new Set();
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
      }) *
      levelValueMult *
      getMechanicValueMult(container);
    const alreadyFound =
      Boolean(state.itemsFoundByItem?.[container.id]?.[pick.id]) || seenInThisRoll.has(pick.id);
    const isFirstRareFind = categoria === rarest && !alreadyFound;
    seenInThisRoll.add(pick.id);
    items.push({ id: pick.id, icon: pick.icon, name: pick.name, categoria, value, isFirstRareFind });
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
    // PLAN.md §4.21 (ronda 20): el grado modula el castigo base de §11.2/§4.6 — leve no castiga
    // (solo se pierde el contenedor), normal es el castigo de siempre, grave lo duplica
    // (gravePenaltyMult de data/traps.json). Sin trapGrade (compat con llamadores previos a la
    // ronda 20) se comporta exactamente como "normal".
    const basePenalty = getTrapPenalty(state, container, data);
    let penalty;
    if (result.trapGrade === 'leve') {
      penalty = 0;
    } else if (result.trapGrade === 'grave') {
      penalty = basePenalty * (data.traps?.gravePenaltyMult ?? 2);
      state.gravesHit++;
    } else {
      penalty = basePenalty;
    }
    penalty = Math.min(state.money, penalty);
    state.money -= penalty;
    state.trapsHit++;
    // PLAN.md §4.20 (ronda 19): la racha es SOLO de escarbado manual — el robot ni la sube ni
    // la corta (contrato §3.5.1: los grados de trampa de la ronda 20 también la cortan).
    if (!isAuto) state.digStreak = 0;
    return { moneyDelta: 0, trapPenalty: penalty };
  }
  let total = 0;
  const fragmentCategories = ['antiques', 'art', 'relics', 'future'];
  for (const item of result.items) {
    total += item.value;
    state.itemsFoundCount++;
    state.itemsFoundByCategory[item.categoria] = (state.itemsFoundByCategory[item.categoria] || 0) + 1;
    // PLAN.md §11.5: el INDEX necesita el contador por ítem específico, no solo por categoría.
    // Ronda 16: la clave es el id estable del ítem (no el nombre) para que la colección
    // sobreviva a la traducción — ver PLAN.md §16.
    const byContainer = state.itemsFoundByItem[container.id] || (state.itemsFoundByItem[container.id] = {});
    byContainer[item.id] = (byContainer[item.id] || 0) + 1;
    if (fragmentCategories.includes(item.categoria)) {
      state.categoryFragments += 1 * getFragmentMult(state, data);
    }
  }
  state.money += total;
  state.totalMoneyEarned += total;
  if (isAuto) {
    state.autoProcessedCount++;
  } else {
    // PLAN.md §4.20 (ronda 19): +1 de racha por escarbado manual exitoso (sin trampa).
    state.digStreak++;
    state.bestDigStreak = Math.max(state.bestDigStreak, state.digStreak);
  }
  return { moneyDelta: total, trapPenalty: 0 };
}
