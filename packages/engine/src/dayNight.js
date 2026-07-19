/**
 * Ciclo día/noche (ROADMAPv4.md §4.33, ronda 24): funciones puras que reciben `hour` (0-23)
 * como parámetro — nunca leen `Date.now()`/`new Date()` internamente — para ser testeables sin
 * mock global y para que quien las llame decida el default neutro (ver economy.js/containers.js:
 * el default de `hour` en toda firma que lo acepta es 12, es decir "de día", precisamente para
 * que la suite de tests previa a esta ronda no se vuelva flaky según la hora real de CI — R24.2).
 * `data.dayNight` es opcional (mismo patrón que data.streak/data.traps/data.tools/data.stall):
 * sin él, los modificadores son neutros.
 */

/**
 * @param {number} hour - 0-23
 * @param {{ nightStartHour: number, nightEndHour: number }} dayNightData - data/dayNight.json
 * @returns {boolean}
 */
export function isNightHour(hour, dayNightData) {
  const { nightStartHour, nightEndHour } = dayNightData;
  // El tramo nocturno cruza medianoche (20:00-06:00): "hora >= inicio O hora < fin".
  return hour >= nightStartHour || hour < nightEndHour;
}

/**
 * §4.33 — modificadores de Suerte/probabilidad de trampa por hora del día.
 * @param {number} hour - 0-23
 * @param {{ nightStartHour: number, nightEndHour: number, nightLuckBonus: number, nightTrapProbBonus: number }} [dayNightData] - data/dayNight.json, opcional
 * @returns {{ luckBonus: number, trapProbBonus: number }}
 */
export function getDayNightModifiers(hour, dayNightData) {
  if (!dayNightData) return { luckBonus: 0, trapProbBonus: 0 };
  if (!isNightHour(hour, dayNightData)) return { luckBonus: 0, trapProbBonus: 0 };
  return { luckBonus: dayNightData.nightLuckBonus, trapProbBonus: dayNightData.nightTrapProbBonus };
}

/**
 * §4.40 (ronda 30) — franja horaria COSMÉTICA a la que pertenece una hora.
 *
 * DECISIÓN (usuario, 2026-07-19): las franjas son estéticas y NADA más — eligen qué modelo de
 * contenedor se dibuja y qué rótulo muestra el reloj del topbar. El día/noche jugable (§4.33,
 * binario, arriba) NO se toca: si estas franjas modularan Suerte/trampa habría que rebalancear
 * la economía entera y los e2e de la ronda 24. Por eso las entradas de `timeBands` solo llevan
 * `id` y `startHour`, y un test lo fija (ronda30-franjas.test.js).
 *
 * Pura como el resto del módulo: recibe `hour`, nunca lee el reloj.
 *
 * @param {number} hour - 0-23 (típicamente `new Date().getHours()`, resuelto por el llamador)
 * @param {{ timeBands?: Array<{ id: string, startHour: number }> }} [dayNightData] - data/dayNight.json
 * @returns {string|null} id de la franja, o `null` si la data no define franjas
 */
export function getTimeBand(hour, dayNightData) {
  const bands = dayNightData?.timeBands;
  if (!Array.isArray(bands) || bands.length === 0) return null;
  // Sin franjas válidas para esta hora caemos SIEMPRE en la primera (medianoche): una hora
  // hostil (NaN, '12', fuera de 0-23) no puede dejar la tarjeta sin imagen — regla dura 13.
  if (typeof hour !== 'number' || !Number.isFinite(hour) || hour < 0 || hour > 23) return bands[0].id;
  let current = bands[0];
  for (const band of bands) {
    if (band.startHour <= hour) current = band;
  }
  return current.id;
}
