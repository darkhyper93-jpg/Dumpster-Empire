/**
 * Tutorial mínimo (PLAN.md §7): tooltip guiado para las primeras 3 acciones
 * (escarbar el tacho gratis, comprar la primera mejora, comprar el primer contenedor
 * de pago). El progreso se guarda en `state.tutorialStep`, así que se muestra una sola vez.
 */

import { t } from '../i18n/i18n.js';

const STEP_KEYS = ['tutorial.step0', 'tutorial.step1', 'tutorial.step2'];

export class Tutorial {
  /**
   * @param {HTMLElement} root
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  constructor(root, store) {
    this.root = root;
    root.addEventListener('click', (evt) => {
      if (evt.target.closest('[data-action="skip-tutorial"]')) {
        store.actions.skipTutorial();
      }
    });
  }

  /** @param {import('@dumpster/engine').GameState} state */
  render(state) {
    // Lookup defensivo: un tutorialStep fuera de rango o fraccionario (save manipulado) caía en
    // STEP_KEYS[x] === undefined y renderizaba "undefined" en pantalla; sin clave, se oculta.
    const stepKey = STEP_KEYS[state.tutorialStep];
    if (!stepKey) {
      this.root.hidden = true;
      this.root.innerHTML = '';
      return;
    }
    this.root.hidden = false;
    this.root.innerHTML =
      `<p>${t(stepKey)}</p>` +
      `<button type="button" data-action="skip-tutorial">${t('tutorial.skip')}</button>`;
  }
}
