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
