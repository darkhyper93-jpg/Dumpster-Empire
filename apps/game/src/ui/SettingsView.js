/**
 * Ajustes: sonido y reset con doble confirmación (PLAN.md §5.4.5, §6.3). El export/import de
 * guardado se sacó de acá (PLAN.md §11.1): Steam Cloud cubre la persistencia y era ruido inútil
 * para el jugador. `store.actions.exportSave/importSave` siguen existiendo en el engine/store
 * para uso interno (ej. sincronización con Steam Cloud, Fase 10) — no se tocó `store.js`.
 */

const local = {
  resetArmed: false,
};
let resetTimer = null;

function armReset() {
  local.resetArmed = true;
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    local.resetArmed = false;
  }, 5000);
}

export const SettingsView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.bound) {
      container.dataset.bound = 'true';
      container.addEventListener('click', (evt) => onClick(evt, container, store));
    }

    container.innerHTML =
      `<section class="settings-block">` +
      `<button type="button" data-action="toggle-sound">Sonido: ${state.soundOn ? 'Encendido' : 'Apagado'}</button>` +
      `</section>` +
      `<section class="settings-block">` +
      `<button type="button" data-action="reset-game">${
        local.resetArmed ? '¿Seguro? Tocá de nuevo para confirmar' : 'Reiniciar partida'
      }</button>` +
      `</section>` +
      `<section class="settings-block settings-credits">` +
      `<h3>Créditos</h3>` +
      `<p>Tipografía: <strong>Plus Jakarta Sans</strong> por Tokotype, bajo` +
      ` <strong>SIL Open Font License 1.1</strong> (no requiere atribución obligatoria; se acredita igual acá).</p>` +
      `<p>Íconos: registro SVG original de este proyecto (sin librería de terceros).</p>` +
      `<p>Sonido: sintetizado con la Web Audio API (sin archivos de audio de terceros).</p>` +
      `</section>`;
  },
};

function onClick(evt, container, store) {
  if (evt.target.closest('[data-action="toggle-sound"]')) {
    store.actions.toggleSound();
    return;
  }
  if (evt.target.closest('[data-action="reset-game"]')) {
    if (local.resetArmed) {
      local.resetArmed = false;
      clearTimeout(resetTimer);
      store.actions.resetGame();
    } else {
      armReset();
      SettingsView.render(container, store.getState(), store);
    }
  }
}
