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
    if (state.tutorialStep >= STEP_KEYS.length) {
      this.root.hidden = true;
      this.root.innerHTML = '';
      return;
    }
    this.root.hidden = false;
    this.root.innerHTML =
      `<p>${t(STEP_KEYS[state.tutorialStep])}</p>` +
      `<button type="button" data-action="skip-tutorial">${t('tutorial.skip')}</button>`;
  }
}
