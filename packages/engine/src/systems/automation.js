/**
 * Sistema de automatización: mejoras de un solo uso, cola global y FLOTA de robots (§2.7,
 * §4.38 ronda 27). Cada robot tiene target y filtros propios; el robot 1 conserva los "brazos"
 * (getParallelAutoSlots) y los demás procesan de a un contenedor.
 */

import {
  getContainerCost,
  getFleetSize,
  getParallelAutoSlots,
  getQueueMax,
  getEffectiveDigTime,
  getAutoSpeedMult,
  getAutoTrapDiscardChance,
  activeChallengeModifier,
} from '../economy.js';
import {
  isContainerUnlocked,
  rollContainerResult,
  applyContainerResult,
  proceduralContainer,
  isProceduralTierUnlocked,
} from './containers.js';
import { isProceduralContainerId, proceduralTierN, PROCEDURAL_CONTAINER_MAX_N } from '../procedural.js';
import { defaultRobotConfig } from '../state.js';
import { stallVendorTick } from './stall.js';

/**
 * Compra una mejora de automatización de un solo uso.
 * @param {import('../state.js').GameState} state
 * @param {Object} automation - definición de apps/game/src/data/automations.json
 * @param {import('../economy.js').EngineData} [data] - PLAN.md §4.32 (ronda 25): si se pasa y el
 *   desafío `manosVacias` está activo (`noAutomationPurchases`), la compra se rechaza. Opcional
 *   (mismo patrón que data.streak/data.traps): sin él, ninguna llamada previa a la ronda 25 cambia
 *   de comportamiento.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyAutomation(state, automation, data = {}) {
  if (activeChallengeModifier(state, data, 'noAutomationPurchases')) {
    return { ok: false, error: 'El desafío activo no permite comprar máquinas.' };
  }
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
 * Ajusta `state.robots` al tamaño real de la flota (PLAN.md §4.38): agrega configuraciones por
 * defecto si la flota creció (compra de hangarRobots / nivel de flotaFundadora) y trunca si se
 * achicó (prestigio resetea automationOwned). Los slots en curso de un robot truncado se
 * procesan con los filtros del robot 1 (guard en robotFiltersFor) — nunca se pierden.
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @returns {void}
 */
export function ensureFleet(state, data) {
  const fleetSize = getFleetSize(state, data);
  while (state.robots.length < fleetSize) state.robots.push(defaultRobotConfig());
  if (state.robots.length > fleetSize) state.robots.length = fleetSize;
}

/**
 * Filtros del robot que ocupa un slot. Un `robotIndex` fuera de la flota actual (slot persistido
 * antes de un prestigio que achicó la flota) cae al robot 1 en vez de crashear el tick.
 * @param {import('../state.js').GameState} state
 * @param {number} robotIndex
 * @returns {import('../state.js').RobotFilters | null}
 */
function robotFiltersFor(state, robotIndex) {
  const robot = state.robots[robotIndex] || state.robots[0];
  return robot ? robot.filters : null;
}

/**
 * Resuelve un containerId de automatización a su definición: los fijos salen de containers.json
 * y los procedurales (`bigbangPlus<n>`, R26.3) se reconstruyen desde el contenedor base
 * (`vertederoBigBang`) — nunca viven en `allContainers`. `null` si no existe (id huérfano de un
 * save viejo/manipulado: el tick lo descarta sin crashear, decisión de la ronda 14).
 * @param {string} containerId
 * @param {Array<Object>} allContainers
 * @returns {Object|null}
 */
function resolveAutoContainer(containerId, allContainers) {
  const fixed = allContainers.find((c) => c.id === containerId);
  if (fixed) return fixed;
  if (isProceduralContainerId(containerId)) {
    const base = allContainers.find((c) => c.id === 'vertederoBigBang');
    if (base) return proceduralContainer(proceduralTierN(containerId), base);
  }
  return null;
}

/**
 * Entre los contenedores desbloqueados y afordables, el de mayor costo (mejor $/contenedor).
 * Si `targetContainerId` fija un target (el del robot que compra, ronda 27), SOLO se considera
 * ese contenedor: si está desbloqueado pero no alcanza el dinero, el robot espera/ahorra (D5) —
 * sin fallback silencioso al modo Auto. R26.3: tanto el target como el modo Auto consideran los
 * tiers procedurales post-Big Bang desbloqueados.
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {import('../economy.js').EngineData} data
 * @param {string|null} [targetContainerId] - target del robot; null = modo Auto
 * @returns {Object|null}
 */
export function bestAffordableUnlockedContainer(state, allContainers, data, targetContainerId = null) {
  if (targetContainerId) {
    const target = resolveAutoContainer(targetContainerId, allContainers);
    if (!target) return null;
    if (target.isProcedural) {
      if (!isProceduralTierUnlocked(state, proceduralTierN(targetContainerId), data)) return null;
    } else if (!isContainerUnlocked(state, target, allContainers)) {
      return null;
    }
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
  // R26.3 (ronda 27): el modo Auto también compite con los tiers procedurales desbloqueados —
  // sin esto, la flota se estancaba en vertederoBigBang tras el primer Eco del Big Bang. El
  // loop corta en el primer tier bloqueado (desbloquear el n exige poseer el n-1, §4.37).
  const base = allContainers.find((c) => c.id === 'vertederoBigBang');
  if (base) {
    for (let n = 1; n <= PROCEDURAL_CONTAINER_MAX_N; n++) {
      if (!isProceduralTierUnlocked(state, n, data)) break;
      const candidate = proceduralContainer(n, base);
      const cost = getContainerCost(state, candidate, data);
      if (cost <= state.money && cost > bestCost) {
        best = candidate;
        bestCost = cost;
      }
    }
  }
  return best;
}

/**
 * Fija (o limpia) el contenedor objetivo de UN robot de la flota (ronda 27, PLAN.md §4.38).
 * @param {import('../state.js').GameState} state
 * @param {number} robotIndex - índice dentro de la flota real (0..getFleetSize-1)
 * @param {string|null} containerId - null vuelve al modo Auto (el más caro afordable)
 * @param {Array<Object>} allContainers - data de containers.json (allow-list de ids fijos)
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function setRobotTarget(state, robotIndex, containerId, allContainers, data) {
  ensureFleet(state, data);
  if (!Number.isInteger(robotIndex) || robotIndex < 0 || robotIndex >= state.robots.length) {
    return { ok: false, error: 'Ese robot no existe en la flota.' };
  }
  if (containerId === null) {
    state.robots[robotIndex].targetContainerId = null;
    return { ok: true };
  }
  const isValid =
    typeof containerId === 'string' &&
    (allContainers.some((c) => c.id === containerId) || isProceduralContainerId(containerId));
  if (!isValid) {
    return { ok: false, error: 'Contenedor inválido para el target del robot.' };
  }
  state.robots[robotIndex].targetContainerId = containerId;
  return { ok: true };
}

/**
 * Fija los filtros de UN robot de la flota (ronda 27, PLAN.md §4.39). El engine valida TODO el
 * input (la UI solo despacha): umbral finito >= 0 y categorías dentro del allow-list real.
 * @param {import('../state.js').GameState} state
 * @param {number} robotIndex
 * @param {{ descartarBajoValor: number, reservarCategorias: string[] }} filters
 * @param {string[]} validCategories - ids de rareza reales (data/items.json)
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function setRobotFilters(state, robotIndex, filters, validCategories, data) {
  ensureFleet(state, data);
  if (!Number.isInteger(robotIndex) || robotIndex < 0 || robotIndex >= state.robots.length) {
    return { ok: false, error: 'Ese robot no existe en la flota.' };
  }
  if (typeof filters !== 'object' || filters === null) {
    return { ok: false, error: 'Filtros inválidos.' };
  }
  if (!Number.isFinite(filters.descartarBajoValor) || filters.descartarBajoValor < 0) {
    return { ok: false, error: 'El umbral de descarte debe ser un número mayor o igual a 0.' };
  }
  if (
    !Array.isArray(filters.reservarCategorias) ||
    !filters.reservarCategorias.every((c) => typeof c === 'string' && validCategories.includes(c))
  ) {
    return { ok: false, error: 'Categorías de reserva inválidas.' };
  }
  state.robots[robotIndex].filters = {
    descartarBajoValor: filters.descartarBajoValor,
    reservarCategorias: [...filters.reservarCategorias],
  };
  return { ok: true };
}

/**
 * Avanza un tick de automatización: procesa los slots en curso de TODA la flota, llena los
 * brazos libres desde la cola global (cada robot con target solo toma SU contenedor; los Auto
 * toman la cabeza) y autocompra contenedores para mantener la cola llena, rotando entre los
 * targets de los robots (R27.2: la afordabilidad se chequea compra a compra — nunca doble gasto).
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
  ensureFleet(state, data);

  for (let i = state.autoProcessing.length - 1; i >= 0; i--) {
    const slot = state.autoProcessing[i];
    slot.remaining -= dtSeconds * getAutoSpeedMult(state, data);
    if (slot.remaining <= 0) {
      // DECISIÓN: el containerId viene de un save (input externo). Si referencia un contenedor
      // que ya no existe (save viejo tras rebalanceo, o import manipulado), NO se crashea el tick:
      // se descarta el slot en silencio. Sin este guard, `rollContainerResult(undefined)` lanzaba
      // TypeError cada segundo y dejaba la partida inutilizable (CLAUDE.md: nada de bloqueos).
      const container = resolveAutoContainer(slot.containerId, allContainers);
      if (container) {
        const result = rollContainerResult(state, container, true, itemsData, data, random, event, hour);
        // §4.43 (ronda 31): desde la trampa simultánea, un `result.isTrap` trae items no vacíos
        // (§4.42). El Escáner de Trampas (PLAN.md §4.7, ronda 15) ahora es una MEJORA sobre
        // "guarda todo, come el castigo": si dispara, conserva TODOS los items y descarta SOLO
        // la entry-trampa (sin castigo, sin cortar racha — el robot no tiene racha manual de
        // todos modos). Antes de esta ronda descartaba el contenedor ENTERO junto con su loot.
        if (result.isTrap && random() < getAutoTrapDiscardChance(state, data)) {
          const withoutTrap = { ...result, isTrap: false, items: result.items.filter((item) => !item.isTrap) };
          applyContainerResult(state, container, withoutTrap, true, data, robotFiltersFor(state, slot.robotIndex));
          state.trapsDiscarded++;
        } else {
          // §4.43: sin Escáner (o sin disparar), "guarda todo, come el castigo" — el camino
          // atómico de applyContainerResult acredita los items no-trampa Y aplica el castigo.
          applyContainerResult(state, container, result, true, data, robotFiltersFor(state, slot.robotIndex));
        }
      }
      state.autoProcessing.splice(i, 1); // el slot se consume exista o no el contenedor
    }
  }

  // §4.38: brazos por robot — el robot 1 tiene los de las máquinas, el resto procesa de a 1.
  const arms = state.robots.map((_, k) => (k === 0 ? getParallelAutoSlots(state, data) : 1));
  const used = state.robots.map(() => 0);
  for (const slot of state.autoProcessing) {
    if (used[slot.robotIndex] !== undefined) used[slot.robotIndex]++;
  }
  // DECISIÓN: los robots con target llenan primero (toman SU contenedor esté donde esté en la
  // cola) y los Auto después (toman la cabeza) — al revés, un Auto robaría el contenedor recién
  // comprado para un robot con target y lo dejaría esperando un ciclo entero de recompra.
  const fillOrder = [...state.robots.keys()].sort(
    (a, b) => Number(Boolean(state.robots[b].targetContainerId)) - Number(Boolean(state.robots[a].targetContainerId))
  );
  for (const k of fillOrder) {
    const target = state.robots[k].targetContainerId;
    while (used[k] < arms[k] && state.autoQueue.length > 0) {
      const queueIdx = target ? state.autoQueue.indexOf(target) : 0;
      if (queueIdx === -1) break; // su contenedor no está en la cola: el robot espera (D5)
      const nextId = state.autoQueue.splice(queueIdx, 1)[0];
      const container = resolveAutoContainer(nextId, allContainers);
      // Mismo motivo que arriba: un id huérfano en la cola se descarta sin encolar, no tumba el tick.
      if (!container) continue;
      // PLAN.md §11.2: el ritmo real de escarbado depende de Resistencia/Fuerza, no del digTime crudo.
      // isAuto=true (ronda 15, PLAN.md §4.7): suma la Fuerza extra de las máquinas del robot.
      const effectiveTime = getEffectiveDigTime(state, container, data, true);
      state.autoProcessing.push({ robotIndex: k, containerId: nextId, totalTime: effectiveTime, remaining: effectiveTime });
      used[k]++;
    }
  }

  const queueMax = getQueueMax(state, data);
  let bought = true;
  while (state.autoQueue.length < queueMax && bought) {
    bought = false;
    for (let k = 0; k < state.robots.length && state.autoQueue.length < queueMax; k++) {
      const pick = bestAffordableUnlockedContainer(state, allContainers, data, state.robots[k].targetContainerId);
      if (!pick) continue;
      const cost = getContainerCost(state, pick, data);
      if (state.money < cost) continue;
      state.money -= cost;
      state.ownedContainers[pick.id] = (state.ownedContainers[pick.id] || 0) + 1;
      state.autoQueue.push(pick.id);
      bought = true;
    }
  }
}
