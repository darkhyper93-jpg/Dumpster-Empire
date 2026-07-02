/**
 * Modal corto y celebratorio al desbloquear una categoría nueva de objeto (PLAN.md §5.2):
 * "no bloqueante, auto-cierra en 3s o con tap". El engine no emite un evento dedicado de
 * "categoría desbloqueada"; se infiere de los logros `categoryFoundAtLeast` (a14-a19 en
 * achievements.json, uno por categoría desde electrónica hasta futurista — encontrar el
 * primer objeto de una categoría nueva es, en los hechos, desbloquearla).
 */

import { iconMarkup } from '../icons/icons.js';
import { playCelebration } from '../fx/audio.js';

const AUTO_CLOSE_MS = 3000;
let closeTimer = null;

export const CategoryUnlockModal = {
  /**
   * @param {HTMLElement} container - overlay raíz (`#category-modal`, hidden por defecto).
   * @param {{ name: string, icon: string }} achievement
   */
  show(container, achievement) {
    clearTimeout(closeTimer);
    container.innerHTML =
      `<div class="modal-card category-modal-card">` +
      `<span class="category-modal-icon">${iconMarkup(achievement.icon, { size: 40 })}</span>` +
      `<h2>¡Categoría nueva!</h2>` +
      `<p>${achievement.name}</p>` +
      `</div>`;
    container.hidden = false;
    playCelebration();

    const close = () => {
      container.hidden = true;
      container.innerHTML = '';
    };
    container.addEventListener('click', close, { once: true });
    closeTimer = setTimeout(close, AUTO_CLOSE_MS);
  },
};
