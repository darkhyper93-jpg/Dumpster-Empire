/**
 * Eventos de contenedor: Dorado / En Llamas (ROADMAPv4.md §4.32, ronda 24). El evento activo es
 * estado TRANSITORIO — decisión explícita del roadmap: "elimina todo exploit de reloj" — así que
 * NO se persiste (nunca vive en `GameState`; store.js lo guarda en una variable local, igual que
 * `pendingDig`). Lo único persistido es `state.lastEventAt` (el cooldown), para que reabrir el
 * juego no regale un evento instantáneo.
 * `data.events` es opcional (mismo patrón que data.stall/data.streak/data.traps): sin él, nunca
 * se dispara ningún evento.
 */

import { clampedElapsedMs } from '../time.js';

/**
 * @typedef {Object} ContainerEvent
 * @property {string} containerId
 * @property {'golden' | 'fire'} kind
 * @property {number} valueMult
 * @property {number} trapProbBonus
 * @property {number} expiresAt - epoch ms
 */

/**
 * Intenta disparar un evento nuevo este tick (§4.32): solo si no hay cooldown activo, sobre un
 * contenedor poseído al azar, con probabilidad `dtSeconds / 600` (esperanza ~10 min de juego
 * activo). Muta `state.lastEventAt` SOLO cuando dispara (reloj clampeado, §3.3: con el reloj
 * hacia atrás, `clampedElapsedMs` da 0 y el cooldown nunca se cumple de más).
 * @param {import('../state.js').GameState} state
 * @param {Array<Object>} allContainers
 * @param {{ events?: { cooldownMs: number, durationMs: number, goldenProbability: number, goldenValueMult: number, fireValueMult: number, fireTrapProbBonus: number } }} data
 * @param {number} dtSeconds
 * @param {number} [now]
 * @param {() => number} [random]
 * @returns {ContainerEvent | null}
 */
export function tryTriggerContainerEvent(state, allContainers, data, dtSeconds, now = Date.now(), random = Math.random) {
  if (!data.events) return null;
  const owned = allContainers.filter((c) => (state.ownedContainers[c.id] || 0) >= 1);
  if (!owned.length) return null;
  if (clampedElapsedMs(now, state.lastEventAt) < data.events.cooldownMs) return null;
  if (random() >= dtSeconds / 600) return null;
  const container = owned[Math.floor(random() * owned.length)];
  const isGolden = random() < data.events.goldenProbability;
  state.lastEventAt = now;
  return {
    containerId: container.id,
    kind: isGolden ? 'golden' : 'fire',
    valueMult: isGolden ? data.events.goldenValueMult : data.events.fireValueMult,
    trapProbBonus: isGolden ? 0 : data.events.fireTrapProbBonus,
    expiresAt: now + data.events.durationMs,
  };
}

/**
 * @param {ContainerEvent | null} event
 * @param {number} [now]
 * @returns {boolean} true si no hay evento, o si ya expiró.
 */
export function isEventExpired(event, now = Date.now()) {
  return !event || now >= event.expiresAt;
}
