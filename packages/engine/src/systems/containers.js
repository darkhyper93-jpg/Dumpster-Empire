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
  getSetBonus,
  getStallCapacity,
  getTrapPenalty,
  registerContainerDig,
  itemSaleValue,
} from '../economy.js';
import {
  rollCategory,
  rollItem,
  rollItemVariance,
  rollIsTrap,
  rollTrapGrade,
  rollLegendary,
  refreshMarketFluctuation,
} from '../rng.js';

/**
 * @typedef {Object} DigResult
 * @property {boolean} isTrap
 * @property {'leve' | 'normal' | 'grave'} [trapGrade] - solo si isTrap y data.traps existía en
 *   el momento del roll (PLAN.md §4.21, ronda 20). Ausente = tratar como "normal" (compat).
 * @property {Array<{ id: string, icon: string, name: string, categoria: string, value: number, baseValue: number, isFirstRareFind: boolean, isLegendary?: boolean }>} items
 *   `baseValue` (ronda 23, PLAN.md §4.27): el mismo cálculo que `value` pero con fluctuación de
 *   mercado 1 — es lo que persiste el Puesto de Chatarra al capturar un ítem (ver applyContainerResult).
 * @property {number} moneyDelta
 * @property {boolean} [usedEvent] - true si el roll se benefició de un evento de contenedor
 *   activo (§4.32, ronda 24). Ausente en el camino de trampa (nunca aplica ahí).
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
 * @param {{ containerId: string, valueMult: number, trapProbBonus: number } | null} [event] -
 *   evento de contenedor activo (§4.32, ronda 24), ya resuelto por el llamador (store.js) contra
 *   `container.id` — pasa `null` si no hay evento o si es de OTRO contenedor. Transitorio: nunca
 *   se lee de `state` (el evento no se persiste, ver systems/events.js).
 * @param {number} [hour] - hora local 0-23 para el ciclo día/noche (§4.33). Default 12 (día):
 *   ver getLuck/getEffectiveTrapProbability — solo store.js pasa la hora real.
 * @returns {DigResult}
 */
export function rollContainerResult(state, container, isAuto, itemsData, data, random = Math.random, event = null, hour = 12) {
  const { marketFluctuation, marketFluctuationAt } = refreshMarketFluctuation(
    state.marketFluctuation,
    state.marketFluctuationAt,
    Date.now(),
    random
  );
  state.marketFluctuation = marketFluctuation;
  state.marketFluctuationAt = marketFluctuationAt;

  const eventMult = event && event.containerId === container.id ? event.valueMult : 1;
  const eventTrapBonus = event && event.containerId === container.id ? event.trapProbBonus : 0;

  const trapProb = Math.min(1, getEffectiveTrapProbability(state, container, isAuto, data, hour) + eventTrapBonus);
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

  const luck = getLuck(state, data, hour);
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
    // §4.32 (ronda 24): el multiplicador del evento (Dorado ×3 / En Llamas ×4) es parte del
    // "valor" que la fórmula literal de PLAN.md §4 no contempla — se aplica encima, igual que
    // los demás multiplicadores de mecánica/set, y a AMBOS (value y baseValue) para que un ítem
    // capturado durante el evento conserve el bonus si se vende después desde el Puesto.
    const itemMultipliers = levelValueMult * getMechanicValueMult(container) * getSetBonus(state, container, itemsData, data) * eventMult;
    const value =
      itemSaleValue({
        valorBaseObjeto: pick.valorBase * variance,
        multiplicadorRareza: rarity.mult,
        suerte: luck,
        fluctuacionMercado: state.marketFluctuation,
        sellMult: getSellMult(state, categoria, data),
        depthValueMult,
      }) * itemMultipliers;
    // PLAN.md §4.27 (ronda 23): el MISMO cálculo con fluctuación 1 — es lo que persiste el
    // Puesto de Chatarra al capturar el ítem, para no aplicar la fluctuación dos veces al vender.
    const baseValue =
      itemSaleValue({
        valorBaseObjeto: pick.valorBase * variance,
        multiplicadorRareza: rarity.mult,
        suerte: luck,
        fluctuacionMercado: 1,
        sellMult: getSellMult(state, categoria, data),
        depthValueMult,
      }) * itemMultipliers;
    const alreadyFound =
      Boolean(state.itemsFoundByItem?.[container.id]?.[pick.id]) || seenInThisRoll.has(pick.id);
    const isFirstRareFind = categoria === rarest && !alreadyFound;
    seenInThisRoll.add(pick.id);
    items.push({ id: pick.id, icon: pick.icon, name: pick.name, categoria, value, baseValue, isFirstRareFind });
  }

  // PLAN.md §4.26 (ronda 22): roll de legendario, SOLO escarbado manual y SOLO si no cayó
  // trampa (ya se retornó arriba en ese caso). El roll de legendaryChance siempre se consume
  // desde `random` cuando corresponde intentarlo (secuencia de RNG estable), pero la sustitución
  // del slot 1 solo ocurre si hay un legendario elegible (categoría coincide y no se posee aún).
  if (!isAuto && data.legendaries && rollLegendary(data.legendaries.legendaryChance, random)) {
    const slot1 = items[0];
    const candidate = data.legendaries.items.find(
      (l) => l.categoria === slot1.categoria && !state.legendariesFound.includes(l.id)
    );
    if (candidate) {
      const rarity = itemsData.rarities.find((r) => r.id === candidate.categoria);
      const legendaryMultipliers = levelValueMult * getMechanicValueMult(container) * getSetBonus(state, container, itemsData, data);
      const value =
        itemSaleValue({
          valorBaseObjeto: candidate.valorBase,
          multiplicadorRareza: rarity.mult,
          suerte: luck,
          fluctuacionMercado: state.marketFluctuation,
          sellMult: getSellMult(state, candidate.categoria, data),
          depthValueMult,
        }) * legendaryMultipliers;
      items[0] = {
        id: candidate.id,
        icon: candidate.icon,
        name: candidate.name,
        categoria: candidate.categoria,
        value,
        // baseValue: nunca se usa (contrato §3.5.3: los legendarios NUNCA se capturan al
        // inventario del Puesto), pero se calcula igual para que la forma del ítem sea uniforme.
        baseValue: value,
        isFirstRareFind: false,
        isLegendary: true,
      };
    }
  }

  const moneyDelta = items.reduce((sum, item) => sum + item.value, 0);
  // §4.32 (ronda 24): "evento aprovechado" — este escarbado se resolvió con éxito (no trampa)
  // mientras un evento de contenedor estaba activo sobre ESTE contenedor.
  return { isTrap: false, items, moneyDelta, usedEvent: eventMult !== 1 };
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
  // §4.32 (ronda 24): contador de "evento aprovechado" para el logro correspondiente.
  if (result.usedEvent) state.eventsUsedCount++;
  let total = 0;
  const fragmentCategories = ['antiques', 'art', 'relics', 'future'];
  // PLAN.md §2.9 (ronda 23): captura del Puesto de Chatarra. `data.stall` opcional (patrón
  // data.streak/data.traps/data.tools): sin él, o sin puesto comprado, o en pausa
  // (keepThreshold 0), el camino es EXACTAMENTE el de siempre (R23.2, snapshot idéntico).
  const captureEnabled = Boolean(data.stall) && state.stallLevel >= 1 && state.keepThreshold > 0;
  const capacity = captureEnabled ? getStallCapacity(state, data) : 0;
  for (const item of result.items) {
    // PLAN.md §4.26 (ronda 22, contrato §3.5.3): los legendarios están FUERA de los pools
    // normales — nunca entran a itemsFoundByItem/itemsFoundCount/itemsFoundByCategory (la
    // vitrina, `legendariesFound`, es su única persistencia, sin duplicados) NI al inventario
    // del Puesto: se venden SIEMPRE instantáneo.
    if (item.isLegendary) {
      if (!state.legendariesFound.includes(item.id)) state.legendariesFound.push(item.id);
      total += item.value;
      continue;
    }
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
    const captureEligible = captureEnabled && item.value >= state.keepThreshold && state.inventory.length < capacity;
    if (captureEligible) {
      state.inventory.push({ itemId: item.id, containerId: container.id, categoria: item.categoria, baseValue: item.baseValue });
    } else {
      total += item.value;
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
