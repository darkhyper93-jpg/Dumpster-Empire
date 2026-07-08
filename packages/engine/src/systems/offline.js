/**
 * Sistema de progreso offline (§4.5). Estima una tasa de ganancia automática por segundo
 * (valor esperado, determinístico) y aplica la fórmula literal de economy.js sobre ella.
 */

import {
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
  itemSaleValue,
  offlineEarnings,
} from '../economy.js';
import { categoryWeights } from '../rng.js';
import { bestAffordableUnlockedContainer, hasAutoDig } from './automation.js';

function averageItemValue(state, container, categoria, itemsData, data, luck) {
  const rarity = itemsData.rarities.find((r) => r.id === categoria);
  // PLAN.md §11.4: el pool de ítems es propio del contenedor, no una categoría global compartida.
  const pool = itemsData.containers[container.id].filter((item) => item.categoria === categoria);
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
 * Estima la ganancia automática por segundo actual, para alimentar la fórmula de offline (§4.5).
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {{ items: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @returns {number}
 */
export function estimateAutomationRatePerSecond(state, allContainers, itemsData, data) {
  if (!hasAutoDig(state, data)) return 0;
  const container = bestAffordableUnlockedContainer(state, allContainers, data);
  if (!container) return 0;
  const parallelSlots = getParallelAutoSlots(state, data);
  // PLAN.md §11.2: el ritmo real de automatización respeta Resistencia/Fuerza (getEffectiveDigTime),
  // no el digTime crudo del contenedor.
  return (expectedContainerValue(state, container, itemsData, data) / getEffectiveDigTime(state, container, data)) * parallelSlots;
}

/**
 * Calcula y aplica el progreso offline al volver a abrir el juego.
 * @param {import('../state.js').GameState} state
 * @param {number} segundosAusente
 * @param {Array<Object>} allContainers
 * @param {{ items: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ganancia: number, segundosEfectivos: number }}
 */
export function applyOfflineProgress(state, segundosAusente, allContainers, itemsData, data) {
  const gananciaAutomaticaPorSegundo = estimateAutomationRatePerSecond(state, allContainers, itemsData, data);
  const result = offlineEarnings({
    gananciaAutomaticaPorSegundo,
    segundosAusente,
    factorOffline: getOfflineFactor(state, data),
    capSegundos: getOfflineCapSeconds(state, data),
  });
  state.money += result.ganancia;
  state.totalMoneyEarned += result.ganancia;
  return result;
}
