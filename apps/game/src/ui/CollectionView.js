/**
 * INDEX de recompensas por contenedor (PLAN.md §11.5): lista todos los ítems posibles de un
 * contenedor; los no encontrados aparecen ocultos (silueta/"???"), los encontrados se revelan
 * con ícono, nombre, probabilidad (%), valor y cantidad obtenida. Todo dato numérico sale del
 * engine (`categoryWeights`, `getLuck`, `getLevelRarityShift`) o de `state.itemsFoundByItem` —
 * esta vista no reimplementa ninguna fórmula, solo deriva el % por ítem a partir del % por
 * categoría que ya expone el engine (ver agentes/HANDOFF.md, bloque del Agente 6).
 */

import { getLuck, getLevelRarityShift, categoryWeights, formatMoney, isSetComplete } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { getObjectArtMarkup } from '../icons/objectArt.js';
import { t } from '../i18n/i18n.js';
import { getCollectionCompletion } from '../collectionProgress.js';

/** Estado de presentación local (qué contenedor está seleccionado), no persistido. */
let selectedContainerId = null;

export const CollectionView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    // AJUSTE (ronda 6): marca propia de esta vista, NO la genérica `boundClick` — las tres
    // vistas de #tab-content (Índice/Automatización/Prestigio) comparten el mismo elemento y
    // con una marca única la primera visitada "robaba" el bind: las otras quedaban sin listener
    // (bug reportado: los tabs del Índice no respondían).
    if (!container.dataset.boundClickIndex) {
      container.dataset.boundClickIndex = 'true';
      container.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-select-container]');
        if (!btn) return;
        selectedContainerId = btn.dataset.selectContainer;
        this.render(container, store.getState(), store);
      });
    }

    const { allContainers, itemsData, data } = store.ctx;
    if (!allContainers.length) {
      container.innerHTML = `<p class="empty-state">${t('common.emptyContainers')}</p>`;
      return;
    }

    if (!selectedContainerId || !allContainers.some((c) => c.id === selectedContainerId)) {
      selectedContainerId = allContainers[0].id;
    }
    const selected = allContainers.find((c) => c.id === selectedContainerId);

    const { globalPct, perContainerPct } = getCollectionCompletion(state, allContainers, itemsData);

    const tabs = allContainers
      .map(
        (c) =>
          `<button type="button" class="index-container-tab ${c.id === selectedContainerId ? 'is-active' : ''}" ` +
          `data-select-container="${c.id}">${iconMarkup(c.icon, { size: 18 })}<span>${c.name}</span>` +
          `<span class="index-container-tab-pct">${Math.round((perContainerPct[c.id] || 0) * 100)}%</span></button>`
      )
      .join('');

    // Ronda 22 (PLAN.md §4.25): badge de set completo del contenedor seleccionado. El % que se
    // muestra sale de la data (data.collectionSets.setBonusPercent), nunca hardcodeado en la UI.
    const setBonusPercent = data.collectionSets?.setBonusPercent;
    const setBadge =
      setBonusPercent && isSetComplete(state, selected, itemsData)
        ? `<p class="index-set-badge">${t('collection.setCompleteBadge', { pct: Math.round(setBonusPercent * 100) })}</p>`
        : '';

    // FIX (2026-07-22, auditoría del fix de scroll de herramientas): la tira de pestañas mide
    // ~4900px con todos los contenedores y nace DENTRO de este `innerHTML`, así que cada render la
    // destruía y la recreaba con `scrollLeft = 0` — hasta tocar una pestaña de la propia tira te
    // devolvía al principio y dejaba la elegida fuera de pantalla. Se conserva la posición a
    // través de la reescritura (misma solución que ToolsSection, ver su comentario).
    const tabsScrollLeft = container.querySelector('.index-container-tabs')?.scrollLeft ?? 0;
    container.innerHTML =
      `<p class="index-completion-global">${t('collection.completionGlobal', { pct: Math.round(globalPct * 100) })}</p>` +
      `<div class="index-container-tabs">${tabs}</div>` +
      setBadge +
      `<div class="index-grid" id="index-grid"></div>` +
      renderShowcase(state, data, itemsData);
    if (tabsScrollLeft > 0) container.querySelector('.index-container-tabs').scrollLeft = tabsScrollLeft;

    const grid = container.querySelector('#index-grid');
    const pool = itemsData.containers[selected.id] || [];
    if (!pool.length) {
      grid.innerHTML = `<p class="empty-state">${t('collection.emptyPool')}</p>`;
      return;
    }

    const luck = getLuck(state, data);
    const levelShift = getLevelRarityShift(state, selected);
    const weights = categoryWeights(selected.categorias, luck, levelShift);
    const countByCategoria = {};
    for (const item of pool) countByCategoria[item.categoria] = (countByCategoria[item.categoria] || 0) + 1;

    const foundInContainer = state.itemsFoundByItem[selected.id] || {};

    const cards = pool
      .map((item) => {
        const foundCount = Number(foundInContainer[item.id]) || 0;
        const rarity = itemsData.rarities.find((r) => r.id === item.categoria);
        const categoriaWeight = weights[item.categoria] || 0;
        const itemProb = countByCategoria[item.categoria] ? categoriaWeight / countByCategoria[item.categoria] : 0;
        if (foundCount <= 0) {
          return (
            `<article class="index-card index-card--hidden">` +
            `<span class="index-card-icon">${iconMarkup('locked', { size: 26 })}</span>` +
            `<h3>${t('collection.hiddenName')}</h3>` +
            `<p>${t('collection.notFound')}</p>` +
            `</article>`
          );
        }
        return (
          `<article class="index-card" style="--rarity-color:var(${rarity ? rarity.colorToken : '--amber'})">` +
          `<span class="index-card-icon">${iconMarkup(item.icon, { size: 26 })}</span>` +
          `<h3>${item.name}</h3>` +
          `<p>${t('collection.probability', { pct: (itemProb * 100).toFixed(1) })}</p>` +
          `<p>${t('collection.baseValue', { amount: formatMoney(item.valorBase) })}</p>` +
          `<p>${t('collection.foundCount', { count: foundCount })}</p>` +
          `</article>`
        );
      })
      .join('');

    grid.innerHTML = cards;
  },
};

/**
 * Nombre de pantalla de una rareza, resuelto SIEMPRE contra la data (mismo criterio defensivo
 * que renderOrders de StallView: un id que no existe cae al nombre oculto, nunca se interpola
 * crudo). `legendary.categoria` sale de data, pero la función se usa también sobre ids que
 * podrían venir de un pool desconocido.
 * @param {{ rarities: Array<{id:string,name:string}> }} itemsData
 * @param {string} categoriaId
 * @returns {string}
 */
function rarityName(itemsData, categoriaId) {
  const rarity = itemsData.rarities.find((r) => r.id === categoriaId);
  return rarity ? rarity.name : t('collection.hiddenName');
}

/**
 * Ronda 22 (PLAN.md §4.26): sección Vitrina al final del INDEX — grilla de pedestales, uno por
 * legendario (`data.legendaries.items`). Los no encontrados quedan como silueta "???"; los
 * encontrados se revelan con ícono (bloom de rareza alta vía CSS), nombre y valor.
 *
 * Ronda "features" (2026-07-22): la Vitrina es GLOBAL — se dibuja debajo de la grilla del
 * contenedor seleccionado, así que el jugador la leía como "los legendarios del Tacho de
 * Vereda" (reporte del usuario). Ahora lo dice explícitamente y cada pedestal declara su
 * RAREZA, que es lo que realmente lo ata a unos contenedores y no a otros: el roll de
 * legendario (systems/containers.js) solo dispara si la rareza del ítem hallado coincide.
 * @param {import('@dumpster/engine').GameState} state
 * @param {import('@dumpster/engine').EngineData & { legendaries?: { items: Array<Object> } }} data
 * @param {{ rarities: Array<{id:string,name:string,colorToken:string}> }} itemsData
 * @returns {string}
 */
function renderShowcase(state, data, itemsData) {
  const legendaries = data.legendaries?.items || [];
  if (!legendaries.length) return '';
  const found = new Set(state.legendariesFound);
  const cards = legendaries
    .map((legendary) => {
      const rarity = itemsData.rarities.find((r) => r.id === legendary.categoria);
      const styleAttr = ` style="--rarity-color:var(${rarity ? rarity.colorToken : '--amber'})"`;
      const fromLine = `<p class="showcase-card-from">${t('collection.showcaseFrom', {
        categoria: rarityName(itemsData, legendary.categoria),
      })}</p>`;
      if (!found.has(legendary.id)) {
        return (
          `<article class="showcase-card showcase-card--hidden"${styleAttr}>` +
          `<span class="showcase-card-icon">${iconMarkup('locked', { size: 30 })}</span>` +
          `<h3>${t('collection.showcaseHiddenName')}</h3>` +
          fromLine +
          `<p>${t('collection.showcaseNotFound')}</p>` +
          `</article>`
        );
      }
      // Ronda 29.C: el pedestal exhibe el ARTE ilustrado a 96px (el tamaño nativo del viewBox de
      // objectArt), no el ícono de 24px. DECISIÓN: el arte grande vive solo acá — el resto del
      // INDEX conserva los íconos chicos porque su grilla es de densidad alta (decenas de ítems
      // por contenedor) y a 96px dejaría de ser una tabla consultable. La vitrina son 8 piezas.
      // Si un legendario no tuviera arte registrado, cae al ícono de siempre (fallback del §5.5).
      const art = getObjectArtMarkup(legendary.icon, { size: 96 });
      const figure = art
        ? `<span class="showcase-card-art">${art}</span>`
        : `<span class="showcase-card-icon">${iconMarkup(legendary.icon, { size: 30 })}</span>`;
      return (
        `<article class="showcase-card"${styleAttr}>` +
        figure +
        `<h3>${legendary.name}</h3>` +
        fromLine +
        `<p>${t('collection.baseValue', { amount: formatMoney(legendary.valorBase) })}</p>` +
        `</article>`
      );
    })
    .join('');
  return (
    `<section class="showcase-section">` +
    `<h2 class="showcase-title">${t('collection.showcaseTitle')}</h2>` +
    `<p class="showcase-global-hint">${t('collection.showcaseGlobalHint')}</p>` +
    `<p class="showcase-count">${t('collection.showcaseCount', { count: found.size, total: legendaries.length })}</p>` +
    `<div class="showcase-grid">${cards}</div>` +
    `</section>`
  );
}
