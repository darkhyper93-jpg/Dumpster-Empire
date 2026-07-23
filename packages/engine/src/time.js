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
 * Delta en SEGUNDOS de un tick de loop, nunca negativo. Gemelo de `clampedElapsedMs` para los
 * sistemas que avanzan por delta (no por timestamp persistido): `automationTick`, `tickDigTimer`.
 *
 * AUDITORÍA (2026-07-22): era el ÚNICO sistema temporal sin el clamp que este módulo existe para
 * dar (ver el encabezado: "un reloj de sistema puede retroceder"). Con el reloj hacia atrás entre
 * dos ticks (corrección NTP, resume de suspensión en Steam Deck, cambio manual de hora), el dt
 * negativo hacía CRECER `slot.remaining` por encima de `slot.totalTime` — la invariante que
 * `isValidAutoProcessing` exige. El autoguardado persistía ese estado y el siguiente arranque
 * rechazaba el save ENTERO: partida borrada sin que nadie atacara nada (napkin #2 "coherencia
 * entre campos: remaining <= totalTime" + #3 dirección 2 "escribir una acumulación sin clamp").
 *
 * NO lleva cota SUPERIOR a propósito: PLAN.md §6.4 exige que "la economía no dependa de que la
 * pestaña esté en foco", y una pestaña en segundo plano recibe `setInterval` estrangulado, así
 * que un dt legítimamente grande DEBE pagarse completo. El tope real de acumulación es el del
 * progreso offline (§4.5), no este.
 *
 * @param {number} dtSeconds - delta crudo entre dos ticks del loop
 * @returns {number} el mismo delta si es finito y positivo; 0 si retrocedió o no es finito.
 */
export function clampedDeltaSeconds(dtSeconds) {
  if (!Number.isFinite(dtSeconds)) return 0;
  return Math.max(0, dtSeconds);
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
