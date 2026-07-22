/**
 * Pestaña Puesto (PLAN.md §2.9/§4.27-§4.29/§4.30, roadmap ronda 23.C): bloqueada hasta comprar
 * el Puesto en la Tienda (ShopView.js gana esa tarjeta); activa muestra a Doña Rita, la
 * cotización del día, el inventario capturado, el umbral de captura (con presets del engine,
 * nunca calculados acá) y los pedidos de Salomón. No reimplementa ninguna fórmula: todo precio/
 * capacidad/preset sale de `@dumpster/engine`.
 */

import {
  formatMoney,
  getStallCapacity,
  getStallUpgradeCost,
  getStallSalePrice,
  getStallThresholdPresets,
  hasStallVendor,
  clampedElapsedMs,
} from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { portraitMarkup } from '../icons/portraits.js';
import { t } from '../i18n/i18n.js';
import { MissionsSection } from './MissionsSection.js';

/** Último comentario de Rita al vender (presentación local, no persistido — mismo patrón que
 * `selectedContainerId` de CollectionView). */
let lastSaleComment = '';

/**
 * Definición de data del ítem de una entrada del inventario del Puesto.
 *
 * AUDITORÍA (release, napkin #7): `entry.containerId` es un string LIBRE del save (isValidInventory
 * solo exige `typeof === 'string'`). Con `itemsData.containers[entry.containerId]` pelado, un
 * `'constructor'`/`'__proto__'`/`'toString'` resolvía contra `Object.prototype` y devolvía algo
 * truthy SIN `.find` — el `|| []` nunca actuaba y la vista tiraba `TypeError` en cada render:
 * pestaña Puesto en blanco, permanente e irrecuperable (PoC en Chromium). `Object.hasOwn` + el
 * chequeo de array cierran las dos puertas; un id desconocido cae al nombre oculto seguro, como
 * ya hacía el resto de la vista.
 * @param {{ containers: Object<string, Array<Object>> }} itemsData
 * @param {{ containerId: string, itemId: string }} entry
 * @returns {Object|null}
 */
function findItemDef(itemsData, entry) {
  const pool = Object.hasOwn(itemsData.containers, entry.containerId)
    ? itemsData.containers[entry.containerId]
    : null;
  if (!Array.isArray(pool)) return null;
  return pool.find((i) => i.id === entry.itemId) || null;
}

function ritaCommentFor(npcs, categoria) {
  const rita = npcs.find((n) => n.id === 'rita');
  if (!rita) return '';
  const group = rita.saleCategoryGroups?.[categoria];
  const key = group ? rita.saleComments?.[group] : null;
  return key ? t(key) : '';
}

function renderLocked() {
  return (
    `<div class="stall-locked">` +
    `<span class="stall-locked-icon">${iconMarkup('stall-chatarra', { size: 48 })}</span>` +
    `<p class="empty-state">${t('stall.lockedTeaser')}</p>` +
    `</div>`
  );
}

function renderQuote(state) {
  const pct = Math.round((state.marketFluctuation - 1) * 100);
  const up = pct >= 0;
  return (
    `<p class="stall-quote ${up ? 'stall-quote--up' : 'stall-quote--down'}">` +
    `${t('stall.quote', { arrow: up ? '▲' : '▼', pct: Math.abs(pct) })}` +
    `</p>`
  );
}

function renderNpc(npcs) {
  const rita = npcs.find((n) => n.id === 'rita');
  if (!rita) return '';
  return (
    `<div class="stall-npc">` +
    `<span class="stall-npc-portrait">${portraitMarkup(rita.portrait, { size: 56 })}</span>` +
    `<div class="stall-npc-text">` +
    `<h3>${rita.name}</h3>` +
    `<p>${lastSaleComment || t('npc.rita.storyIntro')}</p>` +
    `</div>` +
    `</div>`
  );
}

function renderThreshold(state, allContainers, itemsData, data) {
  const presets = getStallThresholdPresets(state, allContainers, itemsData, data);
  const presetButtons = presets
    .map(
      (value) =>
        `<button type="button" data-action="set-threshold-preset" data-value="${Math.round(value)}">${formatMoney(
          Math.round(value)
        )}</button>`
    )
    .join('');
  return (
    `<div class="stall-threshold">` +
    `<label class="stall-threshold-label">${t('stall.thresholdLabel')}` +
    `<input type="number" min="0" step="1" value="${state.keepThreshold}" data-action="set-threshold" />` +
    `</label>` +
    (presetButtons ? `<div class="stall-threshold-presets">${presetButtons}</div>` : '') +
    `<p class="stall-threshold-hint">${state.keepThreshold > 0 ? t('stall.thresholdActive', { amount: formatMoney(state.keepThreshold) }) : t('stall.thresholdPaused')}</p>` +
    `</div>`
  );
}

function renderLevel(state, data) {
  const maxed = state.stallLevel >= data.stall.stallNivelMax;
  const cost = maxed ? 0 : getStallUpgradeCost(state, data);
  const canAfford = state.money >= cost;
  return (
    `<div class="stall-level">` +
    `<p>${t('stall.levelLine', { level: state.stallLevel, max: data.stall.stallNivelMax, capacity: getStallCapacity(state, data) })}</p>` +
    (maxed
      ? `<span class="badge">${t('stall.levelMaxed')}</span>`
      : `<button type="button" data-action="upgrade-stall" ${canAfford ? '' : 'disabled'} title="${
          canAfford ? '' : t('common.missingMoney', { amount: formatMoney(cost - state.money) })
        }">${t('stall.upgradeFor', { amount: formatMoney(cost) })}</button>`) +
    `</div>`
  );
}

/**
 * Toggle "mantener stock para pedidos" del robot vendedor (ronda 27, PLAN.md §4.39): solo
 * visible con el vendedor comprado. El engine decide qué NO vender; acá solo se despacha el
 * booleano crudo del checkbox.
 */
function renderVendorToggle(state, data) {
  if (!hasStallVendor(state, data)) return '';
  return (
    `<div class="stall-keep-stock">` +
    `<label class="stall-keep-stock-label">` +
    `<input type="checkbox" data-action="toggle-keep-stock" ${state.mantenerStockPedidos ? 'checked' : ''} />` +
    `${t('stall.keepStockToggle')}</label>` +
    `<p class="stall-keep-stock-hint">${t('stall.keepStockHint')}</p>` +
    `</div>`
  );
}

function renderInventory(state, itemsData) {
  if (!state.inventory.length) {
    return `<p class="empty-state">${t('stall.inventoryEmpty')}</p>`;
  }
  const cards = state.inventory
    .map((entry, index) => {
      const def = findItemDef(itemsData, entry);
      const rarity = itemsData.rarities.find((r) => r.id === entry.categoria);
      return (
        `<article class="shop-card" style="--rarity-color:var(${rarity ? rarity.colorToken : '--amber'})">` +
        `<span class="shop-card-icon">${iconMarkup(def ? def.icon : 'locked', { size: 26 })}</span>` +
        `<h3>${def ? def.name : t('collection.hiddenName')}</h3>` +
        `<p class="stall-item-price" data-price-index="${index}"></p>` +
        `<button type="button" data-action="sell-item" data-index="${index}">${t('stall.sell')}</button>` +
        `</article>`
      );
    })
    .join('');
  return `<div class="shop-grid stall-inventory-grid">${cards}</div>`;
}

function renderOrders(state, data, npcs, itemsData) {
  const salomon = npcs.find((n) => n.id === 'salomon');
  if (!state.stallOrders.length) return '';
  const remainingMs = data.stall.orderRotationMs - clampedElapsedMs(Date.now(), state.ordersRotatedAt);
  const remainingMin = Math.max(0, Math.ceil(remainingMs / 60000));
  const cards = state.stallOrders
    .map((order) => {
      const rarity = itemsData.rarities.find((r) => r.id === order.categoria);
      // AUDITORÍA (ronda 23.E, napkin #8): `order.categoria` es un string libre del save (validado
      // solo por tipo, no allow-list). Se resuelve SIEMPRE contra la data de rarezas; un id
      // desconocido (save manipulado/hostil) cae al nombre oculto seguro, nunca se interpola crudo
      // en innerHTML — misma defensa que renderInventory usa para un ítem sin def.
      const categoriaNombre = rarity ? rarity.name : t('collection.hiddenName');
      return (
        `<article class="stall-order-card">` +
        `<h3>${t('stall.orderCategory', { categoria: categoriaNombre })}</h3>` +
        `<p>${t('stall.orderProgress', { progress: order.progress, cantidad: order.cantidad })}</p>` +
        `<p>${t('stall.orderReward', { pct: Math.round((order.mult - 1) * 100) })}</p>` +
        `<p class="stall-order-time">${t('stall.orderTime', { minutes: remainingMin })}</p>` +
        `</article>`
      );
    })
    .join('');
  return (
    `<section class="stall-orders">` +
    `<h2>${t('stall.ordersTitle', { name: salomon ? salomon.name : '' })}</h2>` +
    `<div class="stall-orders-grid">${cards}</div>` +
    `</section>`
  );
}

export const StallView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    // Marca propia (ver CollectionView/AutomationView): #tab-content se reusa entre vistas.
    if (!container.dataset.boundClickStall) {
      container.dataset.boundClickStall = 'true';
      container.addEventListener('click', (evt) => {
        const upgradeBtn = evt.target.closest('[data-action="upgrade-stall"]');
        if (upgradeBtn && !upgradeBtn.disabled) {
          store.actions.upgradeStall();
          return;
        }
        const sellBtn = evt.target.closest('[data-action="sell-item"]');
        if (sellBtn) {
          const index = Number(sellBtn.dataset.index);
          const soldEntry = store.getState().inventory[index];
          const result = store.actions.sellInventoryItem(index);
          if (result.ok && soldEntry) {
            lastSaleComment = ritaCommentFor(store.ctx.npcs, soldEntry.categoria);
          }
          return;
        }
        const presetBtn = evt.target.closest('[data-action="set-threshold-preset"]');
        if (presetBtn) {
          store.actions.setKeepThreshold(Number(presetBtn.dataset.value) || 0);
        }
      });
    }
    if (!container.dataset.boundChangeStall) {
      container.dataset.boundChangeStall = 'true';
      container.addEventListener('change', (evt) => {
        const input = evt.target.closest('[data-action="set-threshold"]');
        if (input) {
          store.actions.setKeepThreshold(Math.max(0, Number(input.value) || 0));
          return;
        }
        const keepStock = evt.target.closest('[data-action="toggle-keep-stock"]');
        if (keepStock) store.actions.setMantenerStockPedidos(keepStock.checked);
      });
    }

    const { data, itemsData, allContainers, npcs } = store.ctx;
    if (!data.stall || state.stallLevel < 1) {
      container.innerHTML = renderLocked();
      return;
    }

    // No interrumpir mientras el jugador escribe el umbral (mismo guard que UIManager.renderTabContent).
    const active = document.activeElement;
    if (container.contains(active) && active.dataset?.action === 'set-threshold') {
      // Solo refresca el precio/inventario en vivo, sin pisar el input enfocado.
      updateInventoryPrices(container, state, data);
      return;
    }

    container.innerHTML =
      renderNpc(npcs) +
      renderQuote(state) +
      renderThreshold(state, allContainers, itemsData, data) +
      renderLevel(state, data) +
      renderVendorToggle(state, data) +
      `<h2>${t('stall.inventoryTitle')}</h2>` +
      renderInventory(state, itemsData) +
      renderOrders(state, data, npcs, itemsData) +
      // Ronda 24 (roadmap §24.3): con el Puesto desbloqueado, las misiones de Chispa viven acá
      // (si no, AchievementsView las muestra) — decisión de espacio del roadmap.
      `<section class="stall-missions" id="stall-missions-slot"></section>`;

    updateInventoryPrices(container, state, data);
    MissionsSection.render(container.querySelector('#stall-missions-slot'), state, store);
  },
};

/** Los precios usan `data.stall` real (renderInventory no lo tiene a mano por firma, ver arriba). */
function updateInventoryPrices(container, state, data) {
  for (const el of container.querySelectorAll('[data-price-index]')) {
    const index = Number(el.dataset.priceIndex);
    const entry = state.inventory[index];
    if (!entry) continue;
    el.textContent = formatMoney(getStallSalePrice(state, entry, data, state.marketFluctuation));
  }
}
