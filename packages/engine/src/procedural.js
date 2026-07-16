/**
 * Constantes y helpers de los tiers procedurales post-Big Bang (PLAN.md §4.37, ronda 26.B).
 * Módulo hoja SIN dependencias (ni de state.js ni de economy.js) para que save.js (validación
 * de referencias en autoQueue/autoProcessing) y systems/containers.js (factory de tiers) lo
 * importen sin crear un ciclo.
 */

// AJUSTE (PLAN.md §4.37): tope duro de n. Con costoInicial=1e18 (vertederoBigBang) y ×15^n,
// n=25 llega a ~2.5e47 (sufijo QaDc, 1e45 — packages/engine/src/format.js) y recién n=26 cruza
// a QiDc (1e48). Se fija el tope en 25 para que el costo/valor de ningún tier se quede sin
// sufijo definido ni acumule una cantidad de dígitos absurda antes del sufijo.
export const PROCEDURAL_CONTAINER_MAX_N = 25;

// Ids válidos: `bigbangPlus` + entero 1-99 SIN cero a la izquierda (rechaza `bigbangPlus01`,
// `bigbangPlus1e2`, `bigbangPlus-1`; el tope real de n lo aplica isProceduralContainerId además
// del patrón, así que `bigbangPlus999` también se rechaza aunque calce el patrón de dígitos).
const PROCEDURAL_ID_PATTERN = /^bigbangPlus([1-9][0-9]?)$/;

/**
 * ¿`id` es un id de tier procedural válido? Exige patrón correcto Y `n` dentro del tope
 * (roadmap §26.B: "extender sanitizeContainerRefs/store con tests de ids hostiles").
 * @param {string} id
 * @param {number} [maxN]
 * @returns {boolean}
 */
export function isProceduralContainerId(id, maxN = PROCEDURAL_CONTAINER_MAX_N) {
  if (typeof id !== 'string') return false;
  const match = PROCEDURAL_ID_PATTERN.exec(id);
  if (!match) return false;
  const n = Number(match[1]);
  return n >= 1 && n <= maxN;
}

/**
 * Extrae `n` de un id de tier procedural válido.
 * @param {string} id
 * @returns {number | null} null si `id` no es un id procedural válido.
 */
export function proceduralTierN(id) {
  if (!isProceduralContainerId(id)) return null;
  return Number(PROCEDURAL_ID_PATTERN.exec(id)[1]);
}

/**
 * Id de tier procedural para un `n` dado.
 * @param {number} n
 * @returns {string}
 */
export function proceduralContainerId(n) {
  return `bigbangPlus${n}`;
}
