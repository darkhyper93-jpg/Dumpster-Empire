/**
 * Extracción segura del `lastSavedAt` de un texto de guardado, para la reconciliación
 * local-vs-nube de saveFile.js. Aislado en su propio módulo para poder cubrirlo con tests
 * sin arrancar el runtime de Electron (mismo patrón que pathGuard.js).
 *
 * AUDITORÍA (ronda 18): Number.isFinite y no `typeof === 'number'` — JSON.parse no produce
 * NaN, pero un literal desbordado (`1e999`) SÍ parsea a Infinity, y un save corrupto con ese
 * timestamp ganaba la reconciliación para siempre, pisando el archivo local bueno en cada
 * boot (PLAN.md §6.3: nunca pisar en silencio una partida más avanzada).
 *
 * Existe un gemelo ESM en apps/game/src/saveTimestamp.js (misma semántica) porque el proceso
 * principal es CommonJS y el juego es ESM buildless de navegador: no pueden compartir módulo
 * sin introducir un paso de build o tocar el importmap (reglas duras de CLAUDE.md).
 *
 * @param {unknown} text - contenido crudo del save (JSON serializado) o null/ausente.
 * @returns {number} `lastSavedAt` si es un número finito, o -1 si no parsea/no lo tiene.
 */
function extractTimestamp(text) {
  if (typeof text !== 'string' || text.length === 0) return -1;
  try {
    const parsed = JSON.parse(text);
    return Number.isFinite(parsed.lastSavedAt) ? parsed.lastSavedAt : -1;
  } catch {
    return -1;
  }
}

module.exports = { extractTimestamp };
