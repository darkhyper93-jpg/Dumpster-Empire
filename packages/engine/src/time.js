/**
 * Relojes seguros (ROADMAPv4 §3.3): helpers puros compartidos por todo sistema con reloj
 * (energía, pedidos, misiones, eventos, día/noche). Nada de `Date.now()` crudo restado a un
 * campo de save: `JSON.parse` puede devolver `Infinity` (`1e999`) y un reloj de sistema puede
 * retroceder — ningún sistema temporal debe regenerar/avanzar en esos casos.
 */

/**
 * Milisegundos transcurridos entre `since` y `now`, nunca negativo. Devuelve 0 si cualquiera
 * de los dos operandos no es un número finito (save manipulado) o si el reloj retrocedió
 * (`now < since`).
 * @param {number} now - epoch ms
 * @param {number} since - epoch ms
 * @returns {number}
 */
export function clampedElapsedMs(now, since) {
  if (!Number.isFinite(now) || !Number.isFinite(since)) return 0;
  return Math.max(0, now - since);
}

/**
 * Fecha local (zona horaria del sistema) en formato `YYYY-MM-DD`, para sistemas que resetean
 * una vez por día (misiones diarias, ronda 23).
 * @param {number} now - epoch ms
 * @returns {string}
 */
export function localDayStamp(now) {
  const d = new Date(now);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
