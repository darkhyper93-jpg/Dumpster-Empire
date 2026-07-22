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

import { DIG_SENSITIVITY_MIN, DIG_SENSITIVITY_MAX, SUPPORTED_LANGUAGES } from '@dumpster/engine';
import { t } from '../i18n/i18n.js';

/**
 * Endónimos: cada idioma se nombra a sí mismo (así el jugador perdido en un idioma que no lee
 * encuentra el suyo). Ronda 33: el selector se DERIVA de `SUPPORTED_LANGUAGES`, así que sumar un
 * idioma al allow-list del engine lo hace aparecer acá solo. Un idioma sin endónimo cae a su
 * código en mayúsculas: nunca una opción vacía en el select.
 * @type {Object<string, string>}
 */
const LANGUAGE_ENDONYMS = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
};

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

/**
 * Aviso permanente de "el guardado anterior no se pudo leer" (auditoría de release). El texto
 * sale entero de `t()`; nunca se interpola el mensaje de error técnico del engine, que puede
 * contener valores del save y terminaría crudo en un sink de `innerHTML`.
 * @param {ReturnType<import('../store.js').createStore>} store
 * @returns {string} '' si no hay ninguna copia archivada (el caso normal)
 */
function renderRejectedSaveBlock(store) {
  if (!store.hasRejectedSaveBackup()) return '';
  return (
    `<section class="settings-block settings-save-warning">` +
    `<h3>${t('save.rejectedTitle')}</h3>` +
    `<p>${t('save.rejectedDetail')}</p>` +
    `</section>`
  );
}

export const SettingsView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    // AJUSTE (ronda 16): marca de bind con nombre de vista (boundSettings) — #tab-content es
    // compartido entre vistas y una marca genérica le robaría el listener a la próxima vista
    // que use la misma (ya pasó con los tabs del Índice, ver napkin/R-16.5).
    if (!container.dataset.boundSettings) {
      container.dataset.boundSettings = 'true';
      container.addEventListener('click', (evt) => onClick(evt, container, store));
      container.addEventListener('change', (evt) => {
        const select = evt.target.closest('[data-action="set-language"]');
        if (!select) return;
        // El guard de UIManager.renderTabContent NO re-renderiza mientras un SELECT tiene
        // foco (R-16.4): sin este blur, la vista quedaría en el idioma viejo hasta el
        // próximo click. Blur ANTES de despachar, siempre.
        select.blur();
        store.actions.setLanguage(select.value);
      });
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
      `<section class="settings-block">` +
      `<button type="button" data-action="toggle-vibration">${t('settings.vibration', { state: state.vibrationOn ? t('settings.on') : t('settings.off') })}</button>` +
      `</section>` +
      `<section class="settings-block settings-volume">` +
      `<label class="settings-volume-label" for="volume-slider" data-volume-label>${t('settings.volume', { pct: volumePct })}</label>` +
      `<input class="settings-volume-slider" type="range" id="volume-slider" data-action="set-volume"` +
      ` min="0" max="100" step="1" value="${volumePct}" />` +
      `</section>` +
      `<section class="settings-block settings-volume">` +
      `<label class="settings-volume-label" for="sensitivity-slider" data-sensitivity-label>` +
      `${t('settings.sensitivity', { pct: sensitivityPct })}</label>` +
      // El rango del slider sale del engine (DIG_SENSITIVITY_MIN/MAX), no de un 50/150 suelto:
      // si el rango de diseño cambia, cambia en un solo lugar (state.js) y la UI lo sigue.
      `<input class="settings-volume-slider" type="range" id="sensitivity-slider" data-action="set-sensitivity"` +
      ` min="${DIG_SENSITIVITY_MIN * 100}" max="${DIG_SENSITIVITY_MAX * 100}" step="5" value="${sensitivityPct}" />` +
      `</section>` +
      // Los labels de las opciones son endónimos fijos a propósito (cada idioma se nombra a sí
      // mismo): no pasan por t() porque no deben cambiar con el idioma activo.
      `<section class="settings-block">` +
      `<label class="settings-volume-label" for="language-select">${t('settings.language')}</label>` +
      `<select id="language-select" data-action="set-language">` +
      SUPPORTED_LANGUAGES.map(
        (lang) =>
          `<option value="${lang}"${state.language === lang ? ' selected' : ''}>${
            LANGUAGE_ENDONYMS[lang] || lang.toUpperCase()
          }</option>`
      ).join('') +
      `</select>` +
      `</section>` +
      `<section class="settings-block">` +
      `<button type="button" data-action="reset-game">${
        local.resetArmed ? t('settings.resetConfirm') : t('settings.resetButton')
      }</button>` +
      `</section>` +
      // AJUSTE (auditoría de release): estado de ERROR persistente. El toast del arranque dura
      // 3.5s; si el jugador estaba mirando para otro lado, este bloque le explica por qué su
      // partida "desapareció" y que la copia original sigue intacta. Solo aparece cuando hay una
      // copia archivada de verdad — en el caso normal la sección no existe.
      renderRejectedSaveBlock(store);
  },
};

function onClick(evt, container, store) {
  if (evt.target.closest('[data-action="toggle-sound"]')) {
    store.actions.toggleSound();
    return;
  }
  if (evt.target.closest('[data-action="toggle-vibration"]')) {
    store.actions.toggleVibration();
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
