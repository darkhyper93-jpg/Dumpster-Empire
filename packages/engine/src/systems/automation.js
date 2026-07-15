/**
 * Sistema de automatización: mejoras de un solo uso, cola y procesamiento en paralelo (§2.7).
 */

import {
  getContainerCost,
  getParallelAutoSlots,
  getQueueMax,
  getEffectiveDigTime,
  getAutoSpeedMult,
  getAutoTrapDiscardChance,
  registerContainerDig,
} from '../economy.js';
import { isContainerUnlocked, rollContainerResult, applyContainerResult } from './containers.js';
import { stallVendorTick } from './stall.js';

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
 * Si `state.autoTargetContainerId` fija un target (ronda 14), el robot SOLO compra ese
 * contenedor: si está desbloqueado pero no alcanza el dinero, espera/ahorra (D5) — sin
 * fallback silencioso al modo Auto.
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {import('../economy.js').EngineData} data
 * @returns {Object|null}
 */
export function bestAffordableUnlockedContainer(state, allContainers, data) {
  if (state.autoTargetContainerId) {
    const target = allContainers.find((c) => c.id === state.autoTargetContainerId);
    if (!target) return null;
    if (!isContainerUnlocked(state, target, allContainers)) return null;
    if (getContainerCost(state, target, data) > state.money) return null;
    return target;
  }
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
 * Fija (o limpia) el contenedor objetivo del robot de automatización (ronda 14).
 * @param {import('../state.js').GameState} state
 * @param {string|null} containerId - null vuelve al modo Auto (el más caro afordable)
 * @param {Array<Object>} allContainers - data de containers.json (allow-list)
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function setAutoTarget(state, containerId, allContainers) {
  if (containerId === null) {
    state.autoTargetContainerId = null;
    return { ok: true };
  }
  if (typeof containerId !== 'string' || !allContainers.some((c) => c.id === containerId)) {
    return { ok: false, error: 'Contenedor inválido para el target del robot.' };
  }
  state.autoTargetContainerId = containerId;
  return { ok: true };
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
 * @param {{ containerId: string, valueMult: number, trapProbBonus: number } | null} [event] -
 *   evento de contenedor activo (§4.32, ronda 24), ver rollContainerResult.
 * @param {number} [hour] - hora local 0-23 (§4.33, ronda 24). Default 12 (día), ver getLuck.
 */
export function automationTick(state, dtSeconds, allContainers, itemsData, data, random = Math.random, event = null, hour = 12) {
  // PLAN.md §4.29 (ronda 23): el robot vendedor del Puesto es independiente del robot de
  // escarbado — un jugador puede tener uno sin el otro, así que su tick corre siempre (gateado
  // adentro por hasStallVendor/data.stall), ANTES del `return` temprano de abajo.
  if (data.stall) stallVendorTick(state, data, Date.now(), random);

  if (!hasAutoDig(state, data)) return;

  const parallelSlots = getParallelAutoSlots(state, data);
  for (let i = state.autoProcessing.length - 1; i >= 0; i--) {
    const slot = state.autoProcessing[i];
    slot.remaining -= dtSeconds * getAutoSpeedMult(state, data);
    if (slot.remaining <= 0) {
      const container = allContainers.find((c) => c.id === slot.containerId);
      // DECISIÓN: el containerId viene de un save (input externo). Si referencia un contenedor
      // que ya no existe (save viejo tras rebalanceo, o import manipulado), NO se crashea el tick:
      // se descarta el slot en silencio. Sin este guard, `rollContainerResult(undefined)` lanzaba
      // TypeError cada segundo y dejaba la partida inutilizable (CLAUDE.md: nada de bloqueos).
      if (container) {
        const result = rollContainerResult(state, container, true, itemsData, data, random, event, hour);
        // Ronda 15 (PLAN.md §4.7): el Escáner de Trampas descarta el contenedor trampeado — sin
        // castigo ni loot; el contenedor ya pagado se pierde y el escarbado cuenta para su nivel.
        if (result.isTrap && random() < getAutoTrapDiscardChance(state, data)) {
          registerContainerDig(state, container);
          state.trapsDiscarded++;
        } else {
          applyContainerResult(state, container, result, true, data);
        }
      }
      state.autoProcessing.splice(i, 1); // el slot se consume exista o no el contenedor
    }
  }

  while (state.autoProcessing.length < parallelSlots && state.autoQueue.length > 0) {
    const nextId = state.autoQueue.shift();
    const container = allContainers.find((c) => c.id === nextId);
    // Mismo motivo: un id huérfano en la cola se descarta sin encolar, no tumba el tick.
    if (!container) continue;
    // PLAN.md §11.2: el ritmo real de escarbado depende de Resistencia/Fuerza, no del digTime crudo.
    // isAuto=true (ronda 15, PLAN.md §4.7): suma la Fuerza extra de las máquinas del robot.
    const effectiveTime = getEffectiveDigTime(state, container, data, true);
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
