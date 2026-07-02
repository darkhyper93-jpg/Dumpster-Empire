/**
 * Notificaciones cortas no bloqueantes (logros, resumen offline, errores de acción).
 * Auto-cierran solas; ver PLAN.md §5.2 (modal celebratorio auto-cierra en 3s).
 */

const VISIBLE_MS = 3500;
const FADE_MS = 300;

export class Toast {
  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container;
  }

  /** @param {string} message */
  push(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--visible'));
    setTimeout(() => {
      el.classList.remove('toast--visible');
      setTimeout(() => el.remove(), FADE_MS);
    }, VISIBLE_MS);
  }
}
