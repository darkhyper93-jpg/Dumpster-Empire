/**
 * INDEX de recompensas por contenedor (PLAN.md §11.5): lista todos los ítems posibles de un
 * contenedor; los no encontrados aparecen ocultos (silueta/"???"), los encontrados se revelan
 * con ícono, nombre, probabilidad (%), valor y cantidad obtenida. Todo dato numérico sale del
 * engine (`categoryWeights`, `getLuck`, `getLevelRarityShift`) o de `state.itemsFoundByItem` —
 * esta vista no reimplementa ninguna fórmula, solo deriva el % por ítem a partir del % por
 * categoría que ya expone el engine (ver agentes/HANDOFF.md, bloque del Agente 6).
 */

import { getLuck, getLevelRarityShift, categoryWeights, formatMoney } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

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
      container.innerHTML = '<p class="empty-state">No hay contenedores configurados.</p>';
      return;
    }

    if (!selectedContainerId || !allContainers.some((c) => c.id === selectedContainerId)) {
      selectedContainerId = allContainers[0].id;
    }
    const selected = allContainers.find((c) => c.id === selectedContainerId);

    const tabs = allContainers
      .map(
        (c) =>
          `<button type="button" class="index-container-tab ${c.id === selectedContainerId ? 'is-active' : ''}" ` +
          `data-select-container="${c.id}">${iconMarkup(c.icon, { size: 18 })}<span>${c.name}</span></button>`
      )
      .join('');

    container.innerHTML = `<div class="index-container-tabs">${tabs}</div><div class="index-grid" id="index-grid"></div>`;

    const grid = container.querySelector('#index-grid');
    const pool = itemsData.containers[selected.id] || [];
    if (!pool.length) {
      grid.innerHTML = '<p class="empty-state">Este contenedor no tiene recompensas configuradas.</p>';
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
        const foundCount = Number(foundInContainer[item.name]) || 0;
        const rarity = itemsData.rarities.find((r) => r.id === item.categoria);
        const categoriaWeight = weights[item.categoria] || 0;
        const itemProb = countByCategoria[item.categoria] ? categoriaWeight / countByCategoria[item.categoria] : 0;
        if (foundCount <= 0) {
          return (
            `<article class="index-card index-card--hidden">` +
            `<span class="index-card-icon">${iconMarkup('locked', { size: 26 })}</span>` +
            `<h3>???</h3>` +
            `<p>Todavía no encontraste este objeto.</p>` +
            `</article>`
          );
        }
        return (
          `<article class="index-card" style="--rarity-color:var(${rarity ? rarity.colorToken : '--amber'})">` +
          `<span class="index-card-icon">${iconMarkup(item.icon, { size: 26 })}</span>` +
          `<h3>${item.name}</h3>` +
          `<p>Probabilidad: ${(itemProb * 100).toFixed(1)}%</p>` +
          `<p>Valor base: ${formatMoney(item.valorBase)}</p>` +
          `<p>Encontrado: ${foundCount}</p>` +
          `</article>`
        );
      })
      .join('');

    grid.innerHTML = cards;
  },
};
