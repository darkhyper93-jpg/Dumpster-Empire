/**
 * Sistema de progreso offline (§4.5). Estima una tasa de ganancia automática por segundo
 * (valor esperado, determinístico) y aplica la fórmula literal de economy.js sobre ella.
 */

import {
  addMoney,
  getLuck,
  getEffectiveTrapProbability,
  getSellMult,
  getDepthValueMult,
  getParallelAutoSlots,
  getOfflineFactor,
  getOfflineCapSeconds,
  getLevelRarityShift,
  getLevelValueMult,
  getEffectiveDigTime,
  getAutoSpeedMult,
  itemSaleValue,
  offlineEarnings,
} from '../economy.js';
import { categoryWeights } from '../rng.js';
import { bestAffordableUnlockedContainer, ensureFleet, hasAutoDig } from './automation.js';
import { applyOfflineStallSales } from './stall.js';

function averageItemValue(state, container, categoria, itemsData, data, luck) {
  const rarity = itemsData.rarities.find((r) => r.id === categoria);
  // PLAN.md §11.4: el pool de ítems es propio del contenedor, no una categoría global compartida.
  // R26.3 (ronda 27): los tiers procedurales no tienen pool propio en items.json — heredan el del
  // contenedor base vía `poolContainerId` (§4.37) y su multiplicador mecánico (13^n) compensa.
  const pool = (itemsData.containers[container.poolContainerId || container.id] || []).filter(
    (item) => item.categoria === categoria
  );
  if (!pool.length) return 0;
  const avgBase = pool.reduce((sum, item) => sum + item.valorBase, 0) / pool.length;
  return (
    itemSaleValue({
      valorBaseObjeto: avgBase,
      multiplicadorRareza: rarity.mult,
      suerte: luck,
      fluctuacionMercado: state.marketFluctuation,
      sellMult: getSellMult(state, categoria, data),
      depthValueMult: getDepthValueMult(state, data),
    }) * getLevelValueMult(state, container)
    // DECISIÓN (R26.3): NO se multiplica por getMechanicValueMult acá — la estimación offline
    // siempre fue conservadora respecto del roll online (nunca lo aplicó para ningún contenedor)
    // y cambiarlo movería la tasa de TODOS los contenedores con mecánica, fuera del alcance de
    // esta ronda. Para un tier procedural la tasa queda subestimada (usa el pool base sin el
    // ×13^n), pero finita y > 0 — antes directamente crasheaba (pool undefined).
  );
}

/**
 * Valor esperado (determinístico) de un ciclo completo de escarbado automático de un contenedor.
 * @param {import('../state.js').GameState} state
 * @param {Object} container
 * @param {{ containers: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @returns {number}
 */
export function expectedContainerValue(state, container, itemsData, data) {
  // DECISIÓN (ronda 31, PLAN.md §4.43): la trampa simultánea hace que un dig trampeado del robot
  // TAMBIÉN entregue loot online ("guarda todo, come el castigo"). Este estimador NO se ajustó
  // para reflejarlo: es una tasa AGREGADA (valor esperado por segundo), no una simulación de
  // digs individuales — no hay "conservar items, pagar castigo" que aplicar a un promedio. Se
  // mantiene conservador a propósito (mismo criterio ya documentado para getMechanicValueMult en
  // R26.3: subestima antes que sobreestimar el progreso offline) — sigue multiplicando por
  // `(1 - trapProb)` como si el loot trampeado se perdiera. Ajustarlo con precisión exigiría
  // modelar también el descuento del Escáner de Trampas (getAutoTrapDiscardChance) sin duplicar
  // el castigo que ya resta getTrapPenalty en otros formulas (fase9-balance.test.js). Dejado
  // fuera de alcance de esta ronda; el offline sigue pagando MENOS que el online real, nunca más.
  const luck = getLuck(state, data);
  const trapProb = getEffectiveTrapProbability(state, container, true, data);
  const levelShift = getLevelRarityShift(state, container);
  const weights = categoryWeights(container.categorias, luck, levelShift);
  const expectedValuePerSlot = Object.entries(weights).reduce(
    (sum, [categoria, weight]) => sum + weight * averageItemValue(state, container, categoria, itemsData, data, luck),
    0
  );
  return container.slots * expectedValuePerSlot * (1 - trapProb);
}

/**
 * §4.39 (ronda 27) — fracción esperada de ítems (y de VALOR) que el filtro `descartarBajoValor`
 * de un robot descartaría en un contenedor dado. Determinístico (mismo valor esperado que usa
 * expectedContainerValue): pondera cada categoría por su peso de rareza y evalúa el umbral ítem
 * por ítem del pool. La UI lo muestra como "descarta ~N%" y la estimación offline lo descuenta
 * de la tasa — sin esto, descartar barato GANARÍA más offline que online (exploit).
 * @param {import('../state.js').GameState} state
 * @param {Object} container
 * @param {import('../state.js').RobotFilters | null} filters
 * @param {{ items: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @returns {{ countShare: number, valueShare: number }} ambos 0..1
 */
export function estimateDiscardShare(state, container, filters, itemsData, data) {
  if (!filters || !(filters.descartarBajoValor > 0)) return { countShare: 0, valueShare: 0 };
  const luck = getLuck(state, data);
  const levelShift = getLevelRarityShift(state, container);
  const weights = categoryWeights(container.categorias, luck, levelShift);
  let countShare = 0;
  let totalValue = 0;
  let discardedValue = 0;
  for (const [categoria, weight] of Object.entries(weights)) {
    const rarity = itemsData.rarities.find((r) => r.id === categoria);
    const pool = (itemsData.containers[container.poolContainerId || container.id] || []).filter(
      (item) => item.categoria === categoria
    );
    if (!pool.length || !rarity) continue;
    for (const item of pool) {
      // Mismo valor final esperado que averageItemValue, pero ítem por ítem (sin promediar el
      // pool): el umbral corta por ítem, y promediar antes escondería cuáles caen debajo.
      const value =
        itemSaleValue({
          valorBaseObjeto: item.valorBase,
          multiplicadorRareza: rarity.mult,
          suerte: luck,
          fluctuacionMercado: state.marketFluctuation,
          sellMult: getSellMult(state, categoria, data),
          depthValueMult: getDepthValueMult(state, data),
        }) * getLevelValueMult(state, container);
      const share = weight / pool.length;
      totalValue += share * value;
      if (value < filters.descartarBajoValor) {
        countShare += share;
        discardedValue += share * value;
      }
    }
  }
  return { countShare, valueShare: totalValue > 0 ? discardedValue / totalValue : 0 };
}

/**
 * Estima la ganancia automática por segundo actual, para alimentar la fórmula de offline (§4.5).
 * §4.38 (ronda 27): suma la tasa de CADA robot de la flota — el robot 1 con sus brazos
 * (getParallelAutoSlots) y los demás con 1 — sobre el contenedor de su target (o el mejor
 * afordable en modo Auto), descontando la parte del valor que su filtro de descarte tiraría.
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {{ items: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @returns {number}
 */
export function estimateAutomationRatePerSecond(state, allContainers, itemsData, data) {
  if (!hasAutoDig(state, data)) return 0;
  ensureFleet(state, data);
  let rate = 0;
  for (let k = 0; k < state.robots.length; k++) {
    const robot = state.robots[k];
    const container = bestAffordableUnlockedContainer(state, allContainers, data, robot.targetContainerId);
    if (!container) continue;
    const arms = k === 0 ? getParallelAutoSlots(state, data) : 1;
    const { valueShare } = estimateDiscardShare(state, container, robot.filters, itemsData, data);
    // PLAN.md §11.2: el ritmo real de automatización respeta Resistencia/Fuerza (getEffectiveDigTime),
    // no el digTime crudo del contenedor.
    // AJUSTE (auditoría ronda 15): la tasa refleja las máquinas del robot (§4.7) igual que
    // automationTick — isAuto=true (Fuerza del robot acorta el tiempo efectivo) y getAutoSpeedMult
    // (el remaining decrece a dt × mult, así que el ciclo real dura tiempoEfectivo / mult). Sin
    // esto, las máquinas compradas no aportaban nada al progreso offline (§4.5): la estimación
    // usaba el ritmo manual y el robot "trabajaba más lento" con el juego cerrado que abierto.
    rate +=
      (expectedContainerValue(state, container, itemsData, data) /
        getEffectiveDigTime(state, container, data, true)) *
      getAutoSpeedMult(state, data) *
      arms *
      (1 - valueShare);
  }
  return rate;
}

/**
 * Calcula y aplica el progreso offline al volver a abrir el juego.
 * @param {import('../state.js').GameState} state
 * @param {number} segundosAusente
 * @param {Array<Object>} allContainers
 * @param {{ items: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ganancia: number, segundosEfectivos: number, stallEarnings: number }}
 */
export function applyOfflineProgress(state, segundosAusente, allContainers, itemsData, data) {
  const gananciaAutomaticaPorSegundo = estimateAutomationRatePerSecond(state, allContainers, itemsData, data);
  const result = offlineEarnings({
    gananciaAutomaticaPorSegundo,
    segundosAusente,
    factorOffline: getOfflineFactor(state, data),
    capSegundos: getOfflineCapSeconds(state, data),
  });
  // R23.3 (ronda 23): PRIMERO el robot vendedor sobre el inventario del Puesto YA persistido
  // (a fluctuación fija 1, PLAN.md §4.29), DESPUÉS la venta instantánea del loot offline nuevo
  // (ese loot nunca pasa por el inventario: el modal offline no gestiona captura).
  const stallEarnings = data.stall ? applyOfflineStallSales(state, data, result.segundosEfectivos) : 0;
  // §27.5.1 (Y1, ronda 27): la ganancia offline también entra por addMoney (clamp anti-Infinity);
  // el modal muestra el monto realmente acreditado, no el teórico.
  const ganancia = addMoney(state, result.ganancia);
  return { ...result, ganancia, stallEarnings };
}
