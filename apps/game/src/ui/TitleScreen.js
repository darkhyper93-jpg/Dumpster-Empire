/**
 * Pantalla de inicio (ROADMAPv4.md ronda 32): fondo full-bleed a pantalla completa
 * (assets/title-bg.png = reference/ui/Fondorenovadoinicio.png TAL CUAL, sin recomprimir ni
 * retocar — el arte ya trae logo, marco, placa JUGAR vacía y ruedita horneados) con el texto
 * JUGAR (traducible) y el hitbox del engranaje CALCADOS píxel a píxel sobre el arte — mismo
 * patrón de la ronda 19 (`--title-art-scale`, layout.css), pedido explícito del usuario:
 * "TODO IDÉNTICO" a `NuevaPantallaInicio.webp`, que es el mismo render CON el texto horneado.
 * `#title-screen` es `position: fixed; inset: 0` (layout.css) así que cubre el viewport completo
 * incluso en fullscreen ancho, sin los bordes vacíos que dejaba la columna de 720px de `#app`
 * (eso sí es nuevo de esta ronda — el resto vuelve al lenguaje visual de siempre). No lee estado
 * de partida — es pura presentación, montada una sola vez antes de que la UI del juego exista.
 *
 * Estados del fondo (atributo `data-bg` en `#title-screen`, estilos en layout.css):
 *  - "loading": respaldo visible (madera + logo SVG + botón centrado por flex, sin calco).
 *  - "ready": arte visible; el logo de respaldo pasa a modo solo-lectores-de-pantalla (el
 *    emblema ya está pintado en el arte) y JUGAR/engranaje se anclan sobre el arte.
 *  - "error": el respaldo queda como pantalla definitiva; el juego sigue siendo jugable.
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
      `<img class="title-bg" src="assets/title-bg.png" alt="" aria-hidden="true" />` +
      `<div class="title-logo">` +
      `<span class="title-logo-icon">${iconMarkup('dumpster', { size: 64 })}</span>` +
      `<h1 class="title-logo-text">DUMPSTER EMPIRE</h1>` +
      `</div>` +
      `<button type="button" id="title-play-btn" class="title-play-btn">${t('titleScreen.play')}</button>` +
      `<button type="button" id="title-settings-btn" class="icon-btn-circle title-settings-btn" title="${t('titleScreen.settings')}">` +
      `${iconMarkup('settings', { size: 20 })}` +
      `</button>`;

    const bg = root.querySelector('.title-bg');
    const logo = root.querySelector('.title-logo');
    /**
     * Único punto que muta el estado del fondo: sincroniza `data-bg` (estilos del arte y del
     * calco de JUGAR/engranaje, layout.css) con la clase `.sr-only` del logo de respaldo
     * (components.css) — con el arte listo el emblema ya está pintado en el fondo y el logo
     * queda solo para lectores de pantalla.
     * @param {'loading' | 'ready' | 'error'} state
     */
    const setBgState = (state) => {
      root.dataset.bg = state;
      logo.classList.toggle('sr-only', state === 'ready');
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
