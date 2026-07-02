/**
 * Panel de automatización: mejoras de un solo uso, estado de la cola/procesamiento
 * en curso y la mejora de Capacidad (controla el tamaño de la cola, ver QuickUpgrades.js).
 *
 * PLAN.md §11.1: la sección debe explicar qué hace cada máquina, cómo se encola y cómo
 * procesa el robot — antes era solo una lista de tarjetas sin contexto.
 */

import { formatMoney, formatNumber, getQueueMax, getParallelAutoSlots, nextUpgradeCost } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

export const AutomationView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.boundClick) {
      container.dataset.boundClick = 'true';
      container.addEventListener('click', (evt) => {
        const buyBtn = evt.target.closest('[data-action="buy-automation"]');
        if (buyBtn && !buyBtn.disabled) {
          store.actions.buyAutomation(buyBtn.dataset.id);
          return;
        }
        const capBtn = evt.target.closest('[data-action="buy-capacity"]');
        if (capBtn && !capBtn.disabled) {
          store.actions.buyUpgrade('capacity');
        }
      });
    }

    const { data, allContainers } = store.ctx;
    if (!data.automations.length) {
      container.innerHTML = '<p class="empty-state">No hay automatizaciones configuradas.</p>';
      return;
    }

    const queueMax = getQueueMax(state, data);
    const parallelSlots = getParallelAutoSlots(state, data);
    const capacityUpgrade = data.upgrades.find((u) => u.id === 'capacity');
    const capacityCost = capacityUpgrade ? nextUpgradeCost(state, capacityUpgrade) : 0;
    const capacityCanAfford = state.money >= capacityCost;
    const capacityReason = capacityCanAfford ? '' : `Te faltan ${formatMoney(capacityCost - state.money)}`;

    const processingItems = state.autoProcessing
      .map((slot) => {
        const pct = Math.round(((slot.totalTime - slot.remaining) / slot.totalTime) * 100);
        const containerName = allContainers.find((c) => c.id === slot.containerId)?.name || 'Contenedor desconocido';
        return `<li>${containerName}: ${pct}%</li>`;
      })
      .join('');

    const automationCards = data.automations
      .map((a) => {
        const owned = Boolean(state.automationOwned[a.id]);
        const canAfford = state.money >= a.cost;
        const button = owned
          ? '<span class="badge">Activo</span>'
          : `<button type="button" data-action="buy-automation" data-id="${a.id}" ${canAfford ? '' : 'disabled'} title="${
              canAfford ? '' : `Te faltan ${formatMoney(a.cost - state.money)}`
            }">Comprar por ${formatMoney(a.cost)}</button>`;
        return (
          `<article class="automation-card ${owned ? 'automation-card--owned' : ''}">` +
          `<span class="automation-card-icon">${iconMarkup(a.icon, { size: 28 })}</span>` +
          `<h3>${a.name}</h3>` +
          `<p>${a.desc}</p>` +
          button +
          `</article>`
        );
      })
      .join('');

    container.innerHTML =
      `<section class="automation-explainer">` +
      `<p>Cada máquina que comprás abajo hace un trabajo fijo: junta contenedores solo, sin que` +
      ` los tengas que escarbar a mano. Al comprar una automatización nueva, se van sumando` +
      ` contenedores a la <strong>cola</strong> de forma automática; el <strong>robot</strong>` +
      ` toma contenedores de esa cola y los procesa uno por uno (o varios a la vez, según cuántos` +
      ` "slots simultáneos" tengas), hasta agotarla. Ampliá la cola con la mejora de Capacidad de` +
      ` abajo si se te llena seguido.</p>` +
      `<p class="automation-explainer-hint">Los botones grises no son un error: significan que` +
      ` todavía no te alcanza el dinero. El texto al pasar el mouse (o mantener tocado) te dice` +
      ` cuánto te falta.</p>` +
      `</section>` +
      `<section class="automation-status">` +
      `<p>Cola: ${state.autoQueue.length} / ${formatNumber(queueMax)}</p>` +
      `<p>Slots simultáneos: ${parallelSlots}</p>` +
      `<p>Procesando: ${processingItems ? `<ul>${processingItems}</ul>` : 'Nada en curso.'}</p>` +
      (capacityUpgrade
        ? `<button type="button" data-action="buy-capacity" ${capacityCanAfford ? '' : 'disabled'} title="${capacityReason}">` +
          `Ampliar Capacidad (nivel ${Number(state.upgradeLevels.capacity) || 0}) por ${formatMoney(capacityCost)}</button>`
        : '') +
      `</section>` +
      `<div class="automation-grid">${automationCards}</div>`;
  },
};
