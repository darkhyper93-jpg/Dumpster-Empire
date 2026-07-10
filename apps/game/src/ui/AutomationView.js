/**
 * Panel de automatización: mejoras de un solo uso, estado de la cola/procesamiento
 * en curso y la mejora de Capacidad (controla el tamaño de la cola, ver QuickUpgrades.js).
 *
 * PLAN.md §11.1: la sección debe explicar qué hace cada máquina, cómo se encola y cómo
 * procesa el robot — antes era solo una lista de tarjetas sin contexto.
 */

import {
  formatMoney,
  formatNumber,
  getQueueMax,
  getParallelAutoSlots,
  nextUpgradeCost,
  hasAutoDig,
  isContainerUnlocked,
  getContainerCost,
} from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { upgradeEffectLabel } from './upgradeEffect.js';
import { t } from '../i18n/i18n.js';

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
    // Marca propia (trampa #3 del plan): el <select> del target del robot despacha en 'change',
    // no en 'click' — necesita su propio listener con nombre de vista, nunca uno genérico.
    if (!container.dataset.boundChangeAutomation) {
      container.dataset.boundChangeAutomation = 'true';
      container.addEventListener('change', (evt) => {
        const sel = evt.target.closest('[data-action="set-auto-target"]');
        if (sel) store.actions.setAutoTarget(sel.value);
      });
    }

    const { data, allContainers } = store.ctx;
    if (!data.automations.length) {
      container.innerHTML = `<p class="empty-state">${t('automation.empty')}</p>`;
      return;
    }

    const queueMax = getQueueMax(state, data);
    const parallelSlots = getParallelAutoSlots(state, data);
    // Parte C (ronda 9): el panel de estado depende de si el jugador ya tiene auto-escarbado.
    const autoDigActive = hasAutoDig(state, data);
    const capacityUpgrade = data.upgrades.find((u) => u.id === 'capacity');
    const capacityCost = capacityUpgrade ? nextUpgradeCost(state, capacityUpgrade) : 0;
    const capacityCanAfford = state.money >= capacityCost;
    const capacityReason = capacityCanAfford ? '' : t('common.missingMoney', { amount: formatMoney(capacityCost - state.money) });

    // Selector de target (requisito #3 del plan): el jugador elige qué contenedor compra/
    // automatiza el robot; "auto" es el modo por defecto (el más caro que le alcance).
    const unlockedContainers = allContainers.filter((c) => isContainerUnlocked(state, c, allContainers));
    const validTargetId =
      state.autoTargetContainerId && unlockedContainers.some((c) => c.id === state.autoTargetContainerId)
        ? state.autoTargetContainerId
        : null;
    const targetOptions =
      `<option value="auto" ${validTargetId ? '' : 'selected'}>${t('automation.targetAuto')}</option>` +
      unlockedContainers
        .map((c) => `<option value="${c.id}" ${c.id === validTargetId ? 'selected' : ''}>${c.name}</option>`)
        .join('');
    const targetContainer = validTargetId ? allContainers.find((c) => c.id === validTargetId) : null;
    const targetCost = targetContainer ? getContainerCost(state, targetContainer, data) : 0;
    const waitingHint =
      targetContainer && targetCost > state.money
        ? `<p class="automation-target-waiting">${t('automation.waiting', {
            amount: formatMoney(targetCost - state.money),
            name: targetContainer.name,
          })}</p>`
        : '';

    const processingItems = state.autoProcessing
      .map((slot) => {
        const pct = Math.round(((slot.totalTime - slot.remaining) / slot.totalTime) * 100);
        const containerName = allContainers.find((c) => c.id === slot.containerId)?.name || t('automation.unknownContainer');
        return `<li>${t('automation.processingItem', { name: containerName, pct })}</li>`;
      })
      .join('');

    const automationCards = data.automations
      .map((a) => {
        const owned = Boolean(state.automationOwned[a.id]);
        const canAfford = state.money >= a.cost;
        const button = owned
          ? `<span class="badge">${t('automation.active')}</span>`
          : `<button type="button" data-action="buy-automation" data-id="${a.id}" ${canAfford ? '' : 'disabled'} title="${
              canAfford ? '' : t('common.missingMoney', { amount: formatMoney(a.cost - state.money) })
            }">${t('automation.buyFor', { amount: formatMoney(a.cost) })}</button>`;
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
      `<p>${t('automation.explainer')}</p>` +
      `<p class="automation-explainer-hint">${t('automation.hint')}</p>` +
      `</section>` +
      `<section class="automation-status">` +
      (autoDigActive
        ? `<p>${t('automation.queue', { count: state.autoQueue.length, max: formatNumber(queueMax) })}</p>` +
          `<p>${t('automation.slots', { count: parallelSlots })}</p>` +
          // AJUSTE: un <p> no puede contener un <ul> (contenido de bloque) — el navegador cierra
          // el <p> antes del <ul> en silencio y parte la línea en 3 nodos hermanos, rompiendo
          // cualquier selector/test que busque el texto "Procesando" completo. <div> sí puede.
          `<div class="automation-processing">${t('automation.processingLabel')} ${
            processingItems ? `<ul>${processingItems}</ul>` : t('automation.nothingInProgress')
          }</div>` +
          `<label class="automation-target">${t('automation.targetLabel')}` +
          `<select data-action="set-auto-target">${targetOptions}</select>` +
          `</label>` +
          waitingHint
        : `<p class="automation-callout">${t('automation.calloutInactive')}</p>`) +
      (capacityUpgrade
        ? `<button type="button" data-action="buy-capacity" ${capacityCanAfford ? '' : 'disabled'} title="${capacityReason}">` +
          `${t('automation.expandCapacity', { level: Number(state.upgradeLevels.capacity) || 0, amount: formatMoney(capacityCost) })}` +
          `<span class="quick-upgrade-effect">${upgradeEffectLabel(capacityUpgrade)}</span></button>`
        : '') +
      `</section>` +
      `<div class="automation-grid">${automationCards}</div>`;
  },
};
