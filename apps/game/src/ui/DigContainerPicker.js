/**
 * Selector rápido de contenedor en la pantalla de escarbado (home, PLAN.md §11.8/§11.9,
 * agentes/rework-escarbado-y-landing-prompt.md). Reemplaza el botón único hardcodeado
 * "Escarbar el Tacho de Vereda (gratis)" por una lista compacta de los contenedores YA
 * desbloqueados (icono + costo + acción). Los contenedores bloqueados y el detalle de
 * "Suerte recomendada"/"Comprados" quedan para la Tienda (pestaña aparte) — acá el objetivo
 * es "elegí y escarbá ya", no explorar el catálogo completo.
 */

import { formatMoney, getContainerCost, isContainerUnlocked, getContainerLevel } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

export const DigContainerPicker = {
  /**
   * @param {HTMLElement} container - `#dig-empty`
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.boundClick) {
      container.dataset.boundClick = 'true';
      container.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-start-dig]');
        if (!btn || btn.disabled) return;
        store.actions.startManualDig(btn.dataset.startDig);
      });
    }

    const { allContainers, data } = store.ctx;
    const unlocked = allContainers.filter((c) => isContainerUnlocked(state, c, allContainers));
    if (!unlocked.length) {
      container.innerHTML = '<p class="empty-state">No hay contenedores disponibles todavía.</p>';
      return;
    }

    const cards = unlocked.map((c) => {
      const cost = getContainerCost(state, c, data);
      const canAfford = state.money >= cost;
      const label = cost === 0 ? 'Gratis' : formatMoney(cost);
      const reason = canAfford ? '' : `Te faltan ${formatMoney(cost - state.money)}`;
      return (
        `<button type="button" class="dig-picker-card" data-start-dig="${c.id}" ${canAfford ? '' : 'disabled'} title="${reason}">` +
        `<span class="dig-picker-card-icon">${iconMarkup(c.icon, { size: 26 })}</span>` +
        `<span class="dig-picker-card-name">${c.name}</span>` +
        `<span class="dig-picker-card-cost">${label}</span>` +
        `<span class="dig-picker-card-level">Nv. ${getContainerLevel(state, c.id)}</span>` +
        `</button>`
      );
    });

    container.innerHTML =
      `<p class="dig-picker-prompt">Elegí un contenedor para escarbar.</p>` +
      `<div class="dig-picker-list">${cards.join('')}</div>`;
  },
};
