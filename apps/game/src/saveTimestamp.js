/**
 * Extracción segura del `lastSavedAt` de un texto de guardado, para que `resolveInitialSaveText`
 * (main.js) compare localStorage vs archivo de Electron sin confiar en un save aún no validado.
 *
 * AUDITORÍA (ronda 18): Number.isFinite y no `typeof === 'number'` — JSON.parse no produce NaN,
 * pero un literal desbordado (`1e999`) SÍ parsea a Infinity y ganaba toda reconciliación.
 * Gemelo CommonJS en apps/desktop/saveTimestamp.js (ver la nota de por qué están duplicados).
 *
 * @param {unknown} text - contenido crudo del save (JSON serializado) o null/ausente.
 * @returns {number} `lastSavedAt` si es un número finito, o -1 si no parsea/no lo tiene.
 */
export function extractLastSavedAt(text) {
  if (typeof text !== 'string' || text.length === 0) return -1;
  try {
    const parsed = JSON.parse(text);
    return Number.isFinite(parsed.lastSavedAt) ? parsed.lastSavedAt : -1;
  } catch {
    return -1;
  }
}
