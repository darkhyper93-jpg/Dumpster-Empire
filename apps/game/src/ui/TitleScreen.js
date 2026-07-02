/**
 * Pantalla de inicio (PLAN.md §11.8/§11.9): logo, botón "Jugar" (entra a la pantalla de
 * escarbado) y acceso a Configuración (engranaje abajo a la derecha). No lee estado de
 * partida — es pura presentación, montada una sola vez antes de que la UI del juego exista.
 */

import { iconMarkup } from '../icons/icons.js';

export const TitleScreen = {
  /**
   * @param {HTMLElement} root - `#title-screen`, visible por defecto al arrancar.
   * @param {{ onPlay: () => void, onSettings: () => void }} callbacks
   */
  mount(root, { onPlay, onSettings }) {
    root.innerHTML =
      `<div class="title-logo">` +
      `<span class="title-logo-icon">${iconMarkup('dumpster', { size: 64 })}</span>` +
      `<h1 class="title-logo-text">DUMPSTER EMPIRE</h1>` +
      `</div>` +
      `<button type="button" id="title-play-btn" class="title-play-btn">Jugar</button>` +
      `<button type="button" id="title-settings-btn" class="icon-btn-circle title-settings-btn" title="Configuración">` +
      `${iconMarkup('settings', { size: 20 })}` +
      `</button>`;

    root.querySelector('#title-play-btn').addEventListener('click', onPlay);
    root.querySelector('#title-settings-btn').addEventListener('click', onSettings);
  },
};
