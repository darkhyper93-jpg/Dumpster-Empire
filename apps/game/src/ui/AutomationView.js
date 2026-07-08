/**
 * Panel de automatización: mejoras de un solo uso, estado de la cola/procesamiento
 * en curso y la mejora de Capacidad (controla el tamaño de la cola, ver QuickUpgrades.js).
 *
 * PLAN.md §11.1: la sección debe explicar qué hace cada máquina, cómo se encola y cómo
 * procesa el robot — antes era solo una lista de tarjetas sin contexto.
 */

import { formatMoney, formatNumber, getQueueMax, getParallelAutoSlots, nextUpgradeCost, hasAutoDig } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

export const AutomationView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    // AJUSTE (ronda 6): marca propia (ver CollectionView) — la marca genérica compartida en
    // #tab-content dejaba sin listener a las vistas visitadas después de la primera.
    if (!container.dataset.boundClickAutomation) {
      container.dataset.boundClickAutomation = 'true';
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
    // Parte C (ronda 9): el panel de estado depende de si el jugador ya tiene auto-escarbado.
    const autoDigActive = hasAutoDig(state, data);
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
      `<p>Acá no se encola nada a mano: el <strong>Robot Clasificador Básico</strong> es el que` +
      ` trabaja. Cuando lo tenés, él solo <strong>compra contenedores con tu dinero</strong>` +
      ` (siempre el más caro que tengas desbloqueado y te alcance), los suma a la` +
      ` <strong>cola</strong> y los procesa — a cambio, con más riesgo de trampa que escarbar a` +
      ` mano. Las demás máquinas lo potencian: Carrito y Cinta Transportadora agrandan la cola` +
      ` (igual que la mejora de Capacidad de abajo) y la Red de Drones suma un segundo robot en` +
      ` paralelo.</p>` +
      `<p class="automation-explainer-hint">Los botones grises no son un error: significan que` +
      ` todavía no te alcanza el dinero. El texto al pasar el mouse (o mantener tocado) te dice` +
      ` cuánto te falta.</p>` +
      `</section>` +
      `<section class="automation-status">` +
      (autoDigActive
        ? `<p>Cola: ${state.autoQueue.length} / ${formatNumber(queueMax)}</p>` +
          `<p>Slots simultáneos: ${parallelSlots}</p>` +
          `<p>Procesando: ${processingItems ? `<ul>${processingItems}</ul>` : 'Nada en curso.'}</p>`
        : `<p class="automation-callout">La cola está <strong>inactiva</strong>: comprá el` +
          ` <strong>Robot Clasificador Básico</strong> (abajo) y se va a llenar y procesar sola` +
          ` con tu dinero. No hay nada que encolar a mano.</p>`) +
      (capacityUpgrade
        ? `<button type="button" data-action="buy-capacity" ${capacityCanAfford ? '' : 'disabled'} title="${capacityReason}">` +
          `Ampliar Capacidad (nivel ${Number(state.upgradeLevels.capacity) || 0}) por ${formatMoney(capacityCost)}</button>`
        : '') +
      `</section>` +
      `<div class="automation-grid">${automationCards}</div>`;
  },
};
