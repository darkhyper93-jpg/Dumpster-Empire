/**
 * Guard de boot (auditoría ronda 18): si el juego falla ANTES de llegar a `ready`, el jugador
 * ve un error explícito en vez de "Cargando…" eterno (CLAUDE.md: nunca una pantalla sin estado
 * de error). Cubre las dos fallas que ningún try/catch de main.js puede ver:
 *   1. El grafo de módulos no evalúa (archivo faltante en el paquete — el bug de empaquetado de
 *      la ronda 13 era esto —, error de sintaxis, CSP): main.js nunca corre → evento `error`.
 *   2. boot() rechaza después de su catch de loadData → evento `unhandledrejection`.
 *
 * DECISIÓN: módulo autocontenido en su PROPIO <script type="module"> (grafo separado del de
 * main.js: si el grafo del juego muere, este sigue vivo) y sin imports — ni i18n, porque i18n
 * puede ser justamente el módulo roto. Por eso el mensaje es bilingüe estático, como el
 * "Cargando… / Loading…" de index.html. El detalle (err.message, nunca el stack) se muestra
 * vía textContent (sin sink de HTML), igual que ya hace renderFatalError.
 */

const FATAL_MESSAGE = 'No se pudo cargar el juego. / The game failed to load.';

/**
 * @param {string} [detail] - mensaje del error original (sin stack), solo para diagnóstico.
 */
function showFatalBootError(detail) {
  const app = document.getElementById('app');
  // Solo actúa durante la carga: un error con el juego ya andando no debe taparlo con esta
  // pantalla (y si boot() llega a `ready` después de un falso positivo, lo pisa y se recupera).
  if (!app || app.dataset.state !== 'loading') return;
  app.dataset.state = 'error';
  const status = document.getElementById('boot-status');
  if (status) status.textContent = detail ? `${FATAL_MESSAGE} — ${detail}` : FATAL_MESSAGE;
}

window.addEventListener('error', (evt) => showFatalBootError(evt.message));
window.addEventListener('unhandledrejection', (evt) =>
  showFatalBootError(evt.reason instanceof Error ? evt.reason.message : String(evt.reason))
);
