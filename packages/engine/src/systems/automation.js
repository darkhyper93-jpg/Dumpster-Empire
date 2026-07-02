/**
 * Sistema de automatización: mejoras de un solo uso, cola y procesamiento en paralelo (§2.7).
 */

import { getContainerCost, getParallelAutoSlots, getQueueMax, getEffectiveDigTime } from '../economy.js';
import { isContainerUnlocked, rollContainerResult, applyContainerResult } from './containers.js';

/**
 * Compra una mejora de automatización de un solo uso.
 * @param {import('../state.js').GameState} state
 * @param {Object} automation - definición de apps/game/src/data/automations.json
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyAutomation(state, automation) {
  if (state.automationOwned[automation.id]) return { ok: false, error: 'Ya comprada.' };
  if (state.money < automation.cost) return { ok: false, error: 'No alcanza el dinero para esta automatización.' };
  state.money -= automation.cost;
  state.automationOwned[automation.id] = true;
  return { ok: true };
}

export function hasAutoDig(state, data) {
  return data.automations.some(
    (a) => state.automationOwned[a.id] && (a.effects || []).some((e) => e.type === 'enablesAutoDig')
  );
}

/**
 * Entre los contenedores desbloqueados y afordables, el de mayor costo (mejor $/contenedor).
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {import('../economy.js').EngineData} data
 * @returns {Object|null}
 */
export function bestAffordableUnlockedContainer(state, allContainers, data) {
  let best = null;
  let bestCost = -Infinity;
  for (const container of allContainers) {
    if (!isContainerUnlocked(state, container, allContainers)) continue;
    const cost = getContainerCost(state, container, data);
    if (cost <= state.money && cost > bestCost) {
      best = container;
      bestCost = cost;
    }
  }
  return best;
}

/**
 * Avanza un tick de automatización: procesa slots en curso, llena slots libres desde la cola,
 * y autocompra contenedores para mantener la cola llena.
 * @param {import('../state.js').GameState} state
 * @param {number} dtSeconds
 * @param {Array<Object>} allContainers
 * @param {{ items: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {import('../economy.js').EngineData} data
 * @param {() => number} [random]
 */
export function automationTick(state, dtSeconds, allContainers, itemsData, data, random = Math.random) {
  if (!hasAutoDig(state, data)) return;

  const parallelSlots = getParallelAutoSlots(state, data);
  for (let i = state.autoProcessing.length - 1; i >= 0; i--) {
    const slot = state.autoProcessing[i];
    slot.remaining -= dtSeconds;
    if (slot.remaining <= 0) {
      const container = allContainers.find((c) => c.id === slot.containerId);
      const result = rollContainerResult(state, container, true, itemsData, data, random);
      applyContainerResult(state, container, result, true, data);
      state.autoProcessing.splice(i, 1);
    }
  }

  while (state.autoProcessing.length < parallelSlots && state.autoQueue.length > 0) {
    const nextId = state.autoQueue.shift();
    const container = allContainers.find((c) => c.id === nextId);
    // PLAN.md §11.2: el ritmo real de escarbado depende de Resistencia/Fuerza, no del digTime crudo.
    const effectiveTime = getEffectiveDigTime(state, container, data);
    state.autoProcessing.push({ containerId: nextId, totalTime: effectiveTime, remaining: effectiveTime });
  }

  const queueMax = getQueueMax(state, data);
  while (state.autoQueue.length < queueMax) {
    const pick = bestAffordableUnlockedContainer(state, allContainers, data);
    if (!pick) break;
    const cost = getContainerCost(state, pick, data);
    if (state.money < cost) break;
    state.money -= cost;
    state.ownedContainers[pick.id] = (state.ownedContainers[pick.id] || 0) + 1;
    state.autoQueue.push(pick.id);
  }
}
