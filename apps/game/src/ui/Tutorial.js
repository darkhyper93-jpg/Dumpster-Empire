/**
 * Tutorial mínimo (PLAN.md §7): tooltip guiado para las primeras 3 acciones
 * (escarbar el tacho gratis, comprar la primera mejora, comprar el primer contenedor
 * de pago). El progreso se guarda en `state.tutorialStep`, así que se muestra una sola vez.
 */

const STEPS = [
  'Escarbá el Tacho de Vereda (gratis) arrastrando sobre el contenedor para empezar.',
  'Comprá tu primera mejora de Suerte, Fuerza o Área en el panel de mejoras rápidas.',
  'Comprá tu primer contenedor de pago en la pestaña Tienda.',
];

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
    if (state.tutorialStep >= STEPS.length) {
      this.root.hidden = true;
      this.root.innerHTML = '';
      return;
    }
    this.root.hidden = false;
    this.root.innerHTML =
      `<p>${STEPS[state.tutorialStep]}</p>` + `<button type="button" data-action="skip-tutorial">Saltar tutorial</button>`;
  }
}
