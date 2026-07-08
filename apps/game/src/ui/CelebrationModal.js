/**
 * Celebraciones centradas (PLAN.md §5.2, ronda 12): logro desbloqueado (con recompensa),
 * contenedor nuevo y jackpot. Overlay sobre todo con backdrop que atenúa el juego; se cierra
 * SOLO con la cruz (sin auto-cierre ni click en backdrop, pedido del usuario). Si llegan
 * varias, se encolan y se muestran una tras otra. Reemplaza al CategoryUnlockModal y al toast
 * de logros. El juego sigue corriendo detrás; acá no se muta estado.
 */

import { formatMoney, formatNumber } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { playCelebration, playContainerFanfare, playJackpot } from '../fx/audio.js';

/**
 * @typedef {(
 *   { type: 'achievement', achievement: { name: string, icon: string, reward?: { type: string, amount: number } } } |
 *   { type: 'containerUnlock', container: { name: string, icon: string } } |
 *   { type: 'jackpot', item: { name: string, icon: string, value: number } }
 * )} Celebration
 */

const queue = [];
let showing = false;

function rewardLabel(reward) {
  if (!reward) return '';
  return reward.type === 'keys'
    ? `${formatNumber(reward.amount)} Llaves de Ciudad`
    : formatMoney(reward.amount);
}

function contentFor(celebration) {
  if (celebration.type === 'achievement') {
    const { achievement } = celebration;
    playCelebration();
    return (
      `<span class="celebration-icon">${iconMarkup(achievement.icon, { size: 44 })}</span>` +
      `<h2>¡Logro desbloqueado!</h2>` +
      `<p class="celebration-name">${achievement.name}</p>` +
      (achievement.reward ? `<p class="celebration-reward">Recompensa: ${rewardLabel(achievement.reward)}</p>` : '')
    );
  }
  if (celebration.type === 'containerUnlock') {
    const { container } = celebration;
    playContainerFanfare();
    return (
      `<span class="celebration-icon">${iconMarkup(container.icon, { size: 44 })}</span>` +
      `<h2>¡Contenedor nuevo!</h2>` +
      `<p class="celebration-name">${container.name}</p>` +
      `<p class="celebration-reward">Ya está disponible para escarbar.</p>`
    );
  }
  const { item } = celebration;
  playJackpot();
  return (
    `<span class="celebration-icon celebration-icon--jackpot">${iconMarkup(item.icon, { size: 44 })}</span>` +
    `<h2>¡Hallazgo excepcional!</h2>` +
    `<p class="celebration-name">${item.name}</p>` +
    `<p class="celebration-reward">${formatMoney(item.value)}</p>`
  );
}

export const CelebrationModal = {
  /**
   * Encola una celebración; si no hay ninguna en pantalla, la muestra ya.
   * @param {HTMLElement} container - overlay raíz (`#celebration-modal`, hidden por defecto).
   * @param {Celebration} celebration
   */
  push(container, celebration) {
    queue.push(celebration);
    if (!showing) this.showNext(container);
  },

  /** @param {HTMLElement} container */
  showNext(container) {
    const celebration = queue.shift();
    if (!celebration) {
      showing = false;
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    showing = true;
    container.innerHTML =
      `<div class="modal-card celebration-card" role="dialog" aria-modal="true">` +
      `<button type="button" class="celebration-close" data-action="close-celebration" aria-label="Cerrar">` +
      `${iconMarkup('close-x', { size: 20 })}` +
      `</button>` +
      contentFor(celebration) +
      `</div>`;
    container.hidden = false;
    container.querySelector('[data-action="close-celebration"]').addEventListener(
      'click',
      () => this.showNext(container),
      { once: true }
    );
  },
};
