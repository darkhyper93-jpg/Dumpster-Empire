/**
 * Pantalla de inicio (ROADMAPv4.md ronda 32): fondo full-bleed a pantalla completa
 * (assets/title-bg.webp, origen reference/ui/Fondorenovadoinicio.png) con los controles reales
 * — JUGAR, engranaje, marco dorado — puestos por layout responsive (`clamp()`/flex), NO
 * calcados por píxeles sobre el arte. `#title-screen` es `position: fixed; inset: 0` (layout.css)
 * así que cubre el viewport completo incluso en fullscreen ancho, sin los bordes vacíos que
 * dejaba la columna de 720px de `#app`. No lee estado de partida — es pura presentación, montada
 * una sola vez antes de que la UI del juego exista.
 *
 * Estados del fondo (atributo `data-bg` en `#title-screen`, estilos en layout.css):
 *  - "loading": respaldo visible (madera + logo SVG + botón centrado, la pantalla previa).
 *  - "ready": arte visible; el botón NO se mueve, ya está en su posición final por layout desde
 *    el arranque.
 *  - "error": el respaldo queda como pantalla definitiva; el juego sigue siendo jugable.
 *
 * DECISIÓN (ronda 32): el arte trae un emblema "DUMPSTER EMPIRE" horneado, pero en `cover` se
 * recorta y queda ilegible en proporciones angostas (celular en portrait) — a diferencia de
 * rondas previas, acá el logo DOM (`.title-logo`) queda SIEMPRE visible (nunca `.sr-only`), con
 * un scrim (`.title-top-scrim`, layout.css) detrás para que no compita con el emblema horneado.
 */

import { iconMarkup } from '../icons/icons.js';
import { t } from '../i18n/i18n.js';

export const TitleScreen = {
  /**
   * @param {HTMLElement} root - `#title-screen`, visible por defecto al arrancar.
   * @param {{ onPlay: () => void, onSettings: () => void }} callbacks
   */
  mount(root, { onPlay, onSettings }) {
    root.dataset.bg = 'loading';
    root.innerHTML =
      `<img class="title-bg" src="assets/title-bg.webp" alt="" aria-hidden="true" />` +
      `<div class="title-frame" aria-hidden="true"></div>` +
      `<div class="title-top-scrim" aria-hidden="true"></div>` +
      `<div class="title-logo">` +
      `<span class="title-logo-icon">${iconMarkup('dumpster', { size: 64 })}</span>` +
      `<h1 class="title-logo-text">DUMPSTER EMPIRE</h1>` +
      `</div>` +
      `<button type="button" id="title-play-btn" class="title-play-btn">${t('titleScreen.play')}</button>` +
      `<button type="button" id="title-settings-btn" class="icon-btn-circle title-settings-btn" title="${t('titleScreen.settings')}">` +
      `${iconMarkup('settings', { size: 20 })}` +
      `</button>`;

    const bg = root.querySelector('.title-bg');
    /**
     * Único punto que muta el estado del fondo (estilos del arte en layout.css, atributo
     * `data-bg`). El logo DOM queda visible en los tres estados (ver DECISIÓN arriba).
     * @param {'loading' | 'ready' | 'error'} state
     */
    const setBgState = (state) => {
      root.dataset.bg = state;
    };
    // `complete` cubre el caso de imagen ya cacheada (los eventos pueden haber disparado antes
    // de llegar acá porque innerHTML inicia la carga en cuanto se parsea).
    if (bg.complete && bg.naturalWidth > 0) {
      setBgState('ready');
    } else {
      bg.addEventListener('load', () => setBgState('ready'), { once: true });
      bg.addEventListener('error', () => setBgState('error'), { once: true });
    }

    root.querySelector('#title-play-btn').addEventListener('click', onPlay);
    root.querySelector('#title-settings-btn').addEventListener('click', onSettings);
  },
};
