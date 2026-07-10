/**
 * Ajustes: sonido, sensibilidad de escarbado y reset con doble confirmación (PLAN.md §5.4.5,
 * §6.3). El export/import de guardado se sacó de acá (PLAN.md §11.1): Steam Cloud cubre la
 * persistencia y era ruido inútil para el jugador. `store.actions.exportSave/importSave` siguen
 * existiendo en el engine/store para uso interno (ej. sincronización con Steam Cloud, Fase 10)
 * — no se tocó `store.js`.
 *
 * AJUSTE (ronda 14, requisito #6): se sacó la sección "Créditos" de acá (atribución de
 * tipografía movida al comentario de apps/game/index.html, la licencia SIL OFL no la exige en
 * la UI) y se sumó el slider de sensibilidad de escarbado, calcado del de volumen.
 */

import { t } from '../i18n/i18n.js';

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
      // El volumen se despacha en 'input' (arrastre en vivo), no en 'click'. Mientras el slider
      // está enfocado, UIManager.renderTabContent NO re-renderiza (evita cortar el arrastre), así
      // que el % del label se actualiza a mano acá; el volumen real sí se aplica en cada 'input'
      // (store.setVolume → UIManager.render → setMasterVolume).
      container.addEventListener('input', (evt) => {
        const volumeSlider = evt.target.closest('[data-action="set-volume"]');
        if (volumeSlider) {
          store.actions.setVolume(Number(volumeSlider.value) / 100);
          const label = container.querySelector('[data-volume-label]');
          if (label) label.textContent = t('settings.volume', { pct: volumeSlider.value });
          return;
        }
        const sensitivitySlider = evt.target.closest('[data-action="set-sensitivity"]');
        if (sensitivitySlider) {
          store.actions.setDigSensitivity(Number(sensitivitySlider.value) / 100);
          const label = container.querySelector('[data-sensitivity-label]');
          if (label) label.textContent = t('settings.sensitivity', { pct: sensitivitySlider.value });
        }
      });
    }

    const volumePct = Math.round(state.volume * 100);
    const sensitivityPct = Math.round((Number(state.digSensitivity) || 1) * 100);
    container.innerHTML =
      `<section class="settings-block">` +
      `<button type="button" data-action="toggle-sound">${t('settings.sound', { state: state.soundOn ? t('settings.on') : t('settings.off') })}</button>` +
      `</section>` +
      `<section class="settings-block settings-volume">` +
      `<label class="settings-volume-label" for="volume-slider" data-volume-label>${t('settings.volume', { pct: volumePct })}</label>` +
      `<input class="settings-volume-slider" type="range" id="volume-slider" data-action="set-volume"` +
      ` min="0" max="100" step="1" value="${volumePct}" />` +
      `</section>` +
      `<section class="settings-block settings-volume">` +
      `<label class="settings-volume-label" for="sensitivity-slider" data-sensitivity-label>` +
      `${t('settings.sensitivity', { pct: sensitivityPct })}</label>` +
      `<input class="settings-volume-slider" type="range" id="sensitivity-slider" data-action="set-sensitivity"` +
      ` min="50" max="150" step="5" value="${sensitivityPct}" />` +
      `</section>` +
      `<section class="settings-block">` +
      `<button type="button" data-action="reset-game">${
        local.resetArmed ? t('settings.resetConfirm') : t('settings.resetButton')
      }</button>` +
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
