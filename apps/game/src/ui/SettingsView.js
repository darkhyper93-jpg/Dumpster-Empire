/**
 * Ajustes: sonido, export/import de guardado (base64 ida y vuelta) y reset con doble
 * confirmación (PLAN.md §5.4.5, §6.3). Guarda un pequeño estado local (módulo) para
 * no perder lo que el jugador escribió/generó cuando un tick de automatización dispara
 * un re-render de esta vista mientras está abierta.
 */

const local = {
  exportText: '',
  importText: '',
  importStatus: '',
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
      container.addEventListener('input', (evt) => {
        if (evt.target.id === 'import-input') local.importText = evt.target.value;
      });
    }

    // Los textareas se dejan vacíos en el template: `exportText`/`importText` pueden contener
    // texto pegado por el jugador (guardado importado), y no son seguros para interpolar en un
    // string de HTML (un `</textarea><script>...` rompería el layout y ejecutaría). Se asignan
    // después vía `.value`, que nunca parsea HTML.
    container.innerHTML =
      `<section class="settings-block">` +
      `<button type="button" data-action="toggle-sound">Sonido: ${state.soundOn ? 'Encendido' : 'Apagado'}</button>` +
      `</section>` +
      `<section class="settings-block">` +
      `<h3>Exportar guardado</h3>` +
      `<button type="button" data-action="export-save">Generar texto de guardado</button>` +
      `<textarea id="export-output" readonly rows="4"></textarea>` +
      `</section>` +
      `<section class="settings-block">` +
      `<h3>Importar guardado</h3>` +
      `<textarea id="import-input" rows="4" placeholder="Pegá acá tu guardado exportado"></textarea>` +
      `<button type="button" data-action="import-save">Importar</button>` +
      `<p id="import-status"></p>` +
      `</section>` +
      `<section class="settings-block">` +
      `<button type="button" data-action="reset-game">${
        local.resetArmed ? '¿Seguro? Tocá de nuevo para confirmar' : 'Reiniciar partida'
      }</button>` +
      `</section>`;

    container.querySelector('#export-output').value = local.exportText;
    container.querySelector('#import-input').value = local.importText;
    container.querySelector('#import-status').textContent = local.importStatus;
  },
};

function onClick(evt, container, store) {
  if (evt.target.closest('[data-action="toggle-sound"]')) {
    store.actions.toggleSound();
    return;
  }
  if (evt.target.closest('[data-action="export-save"]')) {
    local.exportText = store.actions.exportSave();
    SettingsView.render(container, store.getState(), store);
    return;
  }
  if (evt.target.closest('[data-action="import-save"]')) {
    const result = store.actions.importSave(local.importText.trim());
    local.importStatus = result.ok ? 'Guardado importado correctamente.' : `Error: ${result.error}`;
    if (!result.ok) SettingsView.render(container, store.getState(), store);
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
