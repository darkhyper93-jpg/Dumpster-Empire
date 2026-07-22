/**
 * Panel de automatización: mejoras de un solo uso, estado de la cola/procesamiento
 * en curso y la mejora de Capacidad (controla el tamaño de la cola, ver QuickUpgrades.js).
 *
 * PLAN.md §11.1: la sección debe explicar qué hace cada máquina, cómo se encola y cómo
 * procesa el robot — antes era solo una lista de tarjetas sin contexto.
 *
 * Ronda 27 (PLAN.md §4.38/§4.39): la flota se muestra como una tarjeta por robot, cada una
 * con su selector de objetivo y sus filtros (umbral de descarte + categorías reservadas).
 * La UI solo despacha inputs crudos: el engine valida umbral/categorías/target y es el ÚNICO
 * que evalúa los filtros durante el procesamiento. El bloque `.automation-status` conserva
 * la cola global, la línea "Slots simultáneos" y el único `.automation-processing` (los e2e
 * de rondas 9 y 14 se apoyan en esos selectores/textos exactos).
 */

import {
  formatMoney,
  formatNumber,
  getQueueMax,
  getParallelAutoSlots,
  getFleetSize,
  nextUpgradeCost,
  hasAutoDig,
  isContainerUnlocked,
  getContainerCost,
  activeChallengeModifier,
  defaultRobotConfig,
  estimateDiscardShare,
  bestAffordableUnlockedContainer,
  hasProceduralContainersUnlocked,
  isProceduralTierUnlocked,
  proceduralContainer,
  resolveContainerById,
  PROCEDURAL_CONTAINER_MAX_N,
} from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { portraitMarkup } from '../icons/portraits.js';
import { upgradeEffectLabel } from './upgradeEffect.js';
import { t } from '../i18n/i18n.js';

/** Estado de presentación local (no persistido, mismo patrón que `lastSaleComment` de
 * StallView): qué <details> de filtros dejó abiertos el jugador, para que el re-render
 * de cada tick no se los cierre en la cara. */
const openFilterPanels = new Set();

/**
 * Config del robot `k` con fallback al shape por defecto: `ensureFleet` corre en el tick del
 * engine, así que justo después de comprar el Hangar la UI puede renderizar un robot que
 * todavía no existe en `state.robots`.
 * @param {import('@dumpster/engine').GameState} state
 * @param {number} k
 * @returns {import('@dumpster/engine').RobotConfig}
 */
function robotAt(state, k) {
  return state.robots[k] || defaultRobotConfig();
}

/**
 * Resuelve un id de target a su contenedor (fijo de la data o tier procedural reconstruido
 * en runtime — mismo criterio que DigContainerPicker). Nunca inventa datos: si el id no
 * cuadra con nada, devuelve null y la UI lo trata como modo Auto.
 * @param {string|null} targetId
 * @param {Array<object>} allContainers
 * @returns {object|null}
 */
function resolveTargetContainer(targetId, allContainers) {
  // AJUSTE (auditoría de release): la resolución id → contenedor (real o tier procedural) vive en
  // el engine; acá quedaba una tercera copia con su propio criterio de fallo.
  if (!targetId) return null;
  return resolveContainerById(targetId, allContainers);
}

/** Nombre visible de un contenedor, con el sufijo "+n" de los tiers procedurales. */
function containerDisplayName(container) {
  if (!container) return t('automation.unknownContainer');
  return container.isProcedural
    ? `${container.name}${t('shop.proceduralSuffix', { n: container.proceduralN })}`
    : container.name;
}

/**
 * Opciones del selector de objetivo: contenedores fijos desbloqueados + tiers procedurales
 * desbloqueados (poseídos y el próximo alcanzable). El engine re-valida el id al despachar.
 * @returns {Array<{ id: string, name: string }>}
 */
function targetOptionList(state, allContainers, data) {
  const options = allContainers
    .filter((c) => isContainerUnlocked(state, c, allContainers))
    .map((c) => ({ id: c.id, name: c.name }));
  if (hasProceduralContainersUnlocked(state, data)) {
    const bigBang = allContainers.find((c) => c.id === 'vertederoBigBang');
    for (let n = 1; bigBang && n <= PROCEDURAL_CONTAINER_MAX_N; n++) {
      if (!isProceduralTierUnlocked(state, n, data)) break;
      const tier = proceduralContainer(n, bigBang);
      options.push({ id: tier.id, name: containerDisplayName(tier) });
    }
  }
  return options;
}

/**
 * Tarjeta de un robot de la flota: objetivo, estado de sus slots y filtros.
 * @param {number} k - índice del robot (0 = el clasificador original, con brazos).
 */
function renderRobotCard(state, k, store, options) {
  const { data, allContainers, itemsData } = store.ctx;
  const robot = robotAt(state, k);
  const arms = k === 0 ? getParallelAutoSlots(state, data) : 1;
  const validTargetId = options.some((o) => o.id === robot.targetContainerId) ? robot.targetContainerId : null;

  const targetOptions =
    `<option value="auto" ${validTargetId ? '' : 'selected'}>${t('automation.targetAuto')}</option>` +
    options
      .map((o) => `<option value="${o.id}" ${o.id === validTargetId ? 'selected' : ''}>${o.name}</option>`)
      .join('');

  const targetContainer = resolveTargetContainer(validTargetId, allContainers);
  const targetCost = targetContainer ? getContainerCost(state, targetContainer, data) : 0;
  const waitingHint =
    targetContainer && targetCost > state.money
      ? `<p class="automation-target-waiting">${t('automation.waiting', {
          amount: formatMoney(targetCost - state.money),
          name: containerDisplayName(targetContainer),
        })}</p>`
      : '';

  const ownSlots = state.autoProcessing.filter((slot) => slot.robotIndex === k);
  const ownProcessing = ownSlots.length
    ? `<ul>${ownSlots
        .map((slot) => {
          const pct = Math.round(((slot.totalTime - slot.remaining) / slot.totalTime) * 100);
          const name = containerDisplayName(resolveTargetContainer(slot.containerId, allContainers));
          return `<li>${t('automation.processingItem', { name, pct })}</li>`;
        })
        .join('')}</ul>`
    : `<p class="robot-card-idle">${t('automation.robotIdle')}</p>`;

  return (
    `<article class="robot-card" data-robot-card="${k}">` +
    `<header class="robot-card-header">` +
    `<span class="robot-card-icon">${iconMarkup('robot-sorter', { size: 26 })}</span>` +
    `<h3>${t('automation.robotTitle', { num: k + 1 })}</h3>` +
    `<span class="robot-card-arms">${t('automation.robotArms', { count: arms, plural: arms === 1 ? '' : 's' })}</span>` +
    `</header>` +
    `<label class="automation-target">${t('automation.targetLabel')}` +
    `<select data-action="set-auto-target" data-robot="${k}">${targetOptions}</select>` +
    `</label>` +
    waitingHint +
    `<div class="robot-card-processing">${ownProcessing}</div>` +
    renderRobotFilters(state, k, robot, targetContainer, allContainers, itemsData, data) +
    `</article>`
  );
}

/**
 * Bloque plegable de filtros del robot (PLAN.md §4.39): umbral de descarte + categorías a
 * reservar para el Puesto. El % estimado de descarte sale de `estimateDiscardShare` del
 * engine — la UI nunca recalcula probabilidades por su cuenta.
 */
function renderRobotFilters(state, k, robot, targetContainer, allContainers, itemsData, data) {
  const filters = robot.filters;
  const estimateContainer =
    targetContainer || bestAffordableUnlockedContainer(state, allContainers, data);
  let estimateLine = '';
  if (filters.descartarBajoValor > 0 && estimateContainer) {
    const share = estimateDiscardShare(state, estimateContainer, filters, itemsData, data);
    estimateLine = `<p class="robot-filter-estimate">${t('automation.filterDiscardEstimate', {
      pct: Math.round(share.countShare * 100),
    })}</p>`;
  }

  const stallReady = Boolean(data.stall) && state.stallLevel >= 1;
  const reserveBlock = stallReady
    ? `<p class="robot-filter-reserve-label">${t('automation.filterReserveLabel')}</p>` +
      `<div class="robot-filter-reserve">${itemsData.rarities
        .map(
          (r) =>
            `<label class="robot-filter-category" style="--rarity-color:var(${r.colorToken})">` +
            `<input type="checkbox" data-action="toggle-robot-reserve" data-robot="${k}" data-categoria="${r.id}" ${
              filters.reservarCategorias.includes(r.id) ? 'checked' : ''
            } />` +
            `${r.name}</label>`
        )
        .join('')}</div>`
    : `<p class="robot-filter-reserve-locked">${t('automation.filterReserveLocked')}</p>`;

  return (
    `<details class="robot-filters" data-robot-details="${k}" ${openFilterPanels.has(k) ? 'open' : ''}>` +
    `<summary>${iconMarkup('filter-funnel', { size: 18 })} ${t('automation.filtersSummary')}</summary>` +
    `<label class="robot-filter-threshold">${t('automation.filterThresholdLabel')}` +
    `<input type="number" min="0" step="1" value="${filters.descartarBajoValor}" data-action="set-robot-filter-threshold" data-robot="${k}" />` +
    `</label>` +
    estimateLine +
    reserveBlock +
    `</details>`
  );
}

/** Bloque de flavor de Chispa (npcs.json): el pibe fanático de robots presenta la flota. */
function renderFleetNpc(npcs) {
  const chispa = npcs.find((n) => n.id === 'chispa');
  if (!chispa) return '';
  return (
    `<div class="stall-npc fleet-npc">` +
    `<span class="stall-npc-portrait">${portraitMarkup(chispa.portrait, { size: 48 })}</span>` +
    `<div class="stall-npc-text">` +
    `<h3>${chispa.name}</h3>` +
    `<p>${t('npc.chispa.fleetFlavor')}</p>` +
    `</div>` +
    `</div>`
  );
}

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
    // Marca propia (trampa #3 del plan): selects/inputs despachan en 'change', no en 'click' —
    // necesitan su propio listener con nombre de vista, nunca uno genérico.
    if (!container.dataset.boundChangeAutomation) {
      container.dataset.boundChangeAutomation = 'true';
      container.addEventListener('change', (evt) => {
        const sel = evt.target.closest('[data-action="set-auto-target"]');
        if (sel) {
          store.actions.setRobotTarget(Number(sel.dataset.robot) || 0, sel.value);
          return;
        }
        const thresholdInput = evt.target.closest('[data-action="set-robot-filter-threshold"]');
        if (thresholdInput) {
          const k = Number(thresholdInput.dataset.robot) || 0;
          const current = robotAt(store.getState(), k).filters;
          store.actions.setRobotFilters(k, {
            descartarBajoValor: Math.max(0, Number(thresholdInput.value) || 0),
            reservarCategorias: current.reservarCategorias,
          });
          return;
        }
        const reserveToggle = evt.target.closest('[data-action="toggle-robot-reserve"]');
        if (reserveToggle) {
          const k = Number(reserveToggle.dataset.robot) || 0;
          const checked = Array.from(
            container.querySelectorAll(`[data-action="toggle-robot-reserve"][data-robot="${k}"]`)
          )
            .filter((input) => input.checked)
            .map((input) => input.dataset.categoria);
          const current = robotAt(store.getState(), k).filters;
          store.actions.setRobotFilters(k, {
            descartarBajoValor: current.descartarBajoValor,
            reservarCategorias: checked,
          });
        }
      });
      // El evento 'toggle' de <details> NO burbujea: se captura para recordar qué paneles de
      // filtros están abiertos y no cerrarlos en cada re-render del tick.
      container.addEventListener(
        'toggle',
        (evt) => {
          const details = evt.target.closest?.('[data-robot-details]');
          if (!details) return;
          const k = Number(details.dataset.robotDetails) || 0;
          if (details.open) openFilterPanels.add(k);
          else openFilterPanels.delete(k);
        },
        true
      );
    }

    // Mismo guard que StallView con el umbral del Puesto: no pisar el input de filtro mientras
    // el jugador está escribiendo (el 'change' al desenfocar dispara el re-render que falta).
    const active = document.activeElement;
    if (container.contains(active) && active.dataset?.action === 'set-robot-filter-threshold') {
      return;
    }

    const { data, allContainers, npcs } = store.ctx;
    if (!data.automations.length) {
      container.innerHTML = `<p class="empty-state">${t('automation.empty')}</p>`;
      return;
    }

    const queueMax = getQueueMax(state, data);
    const parallelSlots = getParallelAutoSlots(state, data);
    const fleetSize = getFleetSize(state, data);
    // Parte C (ronda 9): el panel de estado depende de si el jugador ya tiene auto-escarbado.
    const autoDigActive = hasAutoDig(state, data);
    // AJUSTE (auditoría post-ronda 14): el nombre de la máquina que habilita la cola sale de la
    // data (efecto enablesAutoDig, el mismo criterio que usa hasAutoDig), no de un "Robot
    // Clasificador Básico" hardcodeado en el diccionario que mentiría si la data se renombra.
    const autoDigMachine = data.automations.find((a) => (a.effects || []).some((e) => e.type === 'enablesAutoDig'));
    const capacityUpgrade = data.upgrades.find((u) => u.id === 'capacity');
    const capacityCost = capacityUpgrade ? nextUpgradeCost(state, capacityUpgrade) : 0;
    const capacityCanAfford = state.money >= capacityCost;
    const capacityReason = capacityCanAfford ? '' : t('common.missingMoney', { amount: formatMoney(capacityCost - state.money) });

    const processingItems = state.autoProcessing
      .map((slot) => {
        const pct = Math.round(((slot.totalTime - slot.remaining) / slot.totalTime) * 100);
        const containerName = containerDisplayName(resolveTargetContainer(slot.containerId, allContainers));
        return `<li>${t('automation.processingItem', { name: containerName, pct })}</li>`;
      })
      .join('');

    // Ronda 25 (PLAN.md §4.32): desafío `manosVacias` activo bloquea toda compra de máquinas
    // nuevas (las ya compradas antes de elegirlo siguen activas — el modificador solo afecta
    // `buyAutomation`, nunca desactiva lo ya poseído).
    const blockedByChallenge = Boolean(activeChallengeModifier(state, data, 'noAutomationPurchases'));

    const automationCards = data.automations
      .map((a) => {
        const owned = Boolean(state.automationOwned[a.id]);
        const canAfford = state.money >= a.cost;
        const disabled = !canAfford || blockedByChallenge;
        const reason = blockedByChallenge
          ? t('automation.blockedByChallenge')
          : canAfford
          ? ''
          : t('common.missingMoney', { amount: formatMoney(a.cost - state.money) });
        const button = owned
          ? `<span class="badge">${t('automation.active')}</span>`
          : `<button type="button" data-action="buy-automation" data-id="${a.id}" ${disabled ? 'disabled' : ''} title="${reason}">${t(
              'automation.buyFor',
              { amount: formatMoney(a.cost) }
            )}</button>`;
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

    const options = autoDigActive ? targetOptionList(state, allContainers, data) : [];
    const fleetCards = autoDigActive
      ? Array.from({ length: fleetSize }, (_, k) => renderRobotCard(state, k, store, options)).join('')
      : '';

    container.innerHTML =
      `<section class="automation-explainer">` +
      `<p>${t('automation.explainer')}</p>` +
      `<p class="automation-explainer-hint">${t('automation.hint')}</p>` +
      `</section>` +
      `<section class="automation-status">` +
      (autoDigActive
        ? `<p>${t('automation.queue', { count: state.autoQueue.length, max: formatNumber(queueMax) })}</p>` +
          `<p>${t('automation.slots', { count: parallelSlots })}</p>` +
          `<p>${t('automation.fleetSize', { count: fleetSize, plural: fleetSize === 1 ? '' : 's' })}</p>` +
          // AJUSTE: un <p> no puede contener un <ul> (contenido de bloque) — el navegador cierra
          // el <p> antes del <ul> en silencio y parte la línea en 3 nodos hermanos, rompiendo
          // cualquier selector/test que busque el texto "Procesando" completo. <div> sí puede.
          `<div class="automation-processing">${t('automation.processingLabel')} ${
            processingItems ? `<ul>${processingItems}</ul>` : t('automation.nothingInProgress')
          }</div>`
        : `<p class="automation-callout">${t('automation.calloutInactive', { name: autoDigMachine ? autoDigMachine.name : '' })}</p>`) +
      (capacityUpgrade
        ? `<button type="button" data-action="buy-capacity" ${capacityCanAfford ? '' : 'disabled'} title="${capacityReason}">` +
          `${t('automation.expandCapacity', { level: Number(state.upgradeLevels.capacity) || 0, amount: formatMoney(capacityCost) })}` +
          `<span class="quick-upgrade-effect">${upgradeEffectLabel(capacityUpgrade)}</span></button>`
        : '') +
      `</section>` +
      (autoDigActive
        ? `<section class="fleet-section">` +
          `<h2 class="fleet-title">${t('automation.fleetTitle')}</h2>` +
          renderFleetNpc(npcs) +
          `<div class="fleet-grid">${fleetCards}</div>` +
          `</section>`
        : '') +
      `<div class="automation-grid">${automationCards}</div>`;
  },
};
