/**
 * Loop principal: rAF para lo visual, tick de producción por delta de tiempo real
 * (independiente del framerate y de que la pestaña esté en foco), autoguardado
 * cada 15s y en visibilitychange (PLAN.md §6.4, CLAUDE.md).
 */

const AUTOSAVE_INTERVAL_MS = 15000;
const LOGIC_TICK_INTERVAL_MS = 1000;

/**
 * @param {ReturnType<import('./store.js').createStore>} store
 * @param {{ renderTopbar: (state: Object) => void }} ui
 * @returns {() => void} detiene el loop
 */
export function startLoop(store, ui) {
  let lastLogicTime = Date.now();

  function logicTick() {
    const now = Date.now();
    const dtSeconds = (now - lastLogicTime) / 1000;
    lastLogicTime = now;
    store.actions.tickAutomation(dtSeconds);
    // Ronda 20 (PLAN.md §4.24): el timer de la Bóveda corre siempre, sin depender de que el
    // jugador tenga automatización comprada (a diferencia de tickAutomation).
    store.actions.tickDigTimer(dtSeconds);
  }
  const logicInterval = setInterval(logicTick, LOGIC_TICK_INTERVAL_MS);

  const autosaveInterval = setInterval(() => store.persist(), AUTOSAVE_INTERVAL_MS);

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') store.persist();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  function onBeforeUnload() {
    store.persist();
  }
  window.addEventListener('beforeunload', onBeforeUnload);

  let rafId = null;
  function visualFrame() {
    ui.renderTopbar(store.getState());
    rafId = requestAnimationFrame(visualFrame);
  }
  rafId = requestAnimationFrame(visualFrame);

  return function stopLoop() {
    clearInterval(logicInterval);
    clearInterval(autosaveInterval);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('beforeunload', onBeforeUnload);
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}
