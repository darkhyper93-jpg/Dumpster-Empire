/**
 * Contenedores (antes "Tienda"): catálogo **meramente informativo** de contenedores con costo,
 * categorías, riesgo de trampa, comprados y Suerte recomendada (PLAN.md §5.4.1,
 * PUNTOS_A_MEJORAR_2.md §2). NO dispara escarbado: el flujo de escarbar (que en este juego es
 * también el de "comprar", pagando y revelando en el mismo gesto) vive 100% en la pantalla
 * Escarbar (`DigContainerPicker.js`). Esta vista solo lee estado; no despacha acciones.
 */

import {
  formatMoney,
  formatNumber,
  getContainerCost,
  isContainerUnlocked,
  getEffectiveTrapProbability,
  getLuck,
  getRecommendedLuck,
  getRecommendedDigPower,
  getRecommendedArea,
  getDigPowerMult,
  getAreaMult,
  getContainerLevel,
  getLevelValueMult,
  digsNeededForNextLevel,
  CONTAINER_LEVEL_MAX,
} from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';

export const ShopView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    const { allContainers, data, itemsData } = store.ctx;
    if (!allContainers.length) {
      container.innerHTML = '<p class="empty-state">No hay contenedores configurados.</p>';
      return;
    }

    const rarityNames = new Map(itemsData.rarities.map((r) => [r.id, r.name]));

    const cards = allContainers.map((c) => {
      const unlocked = isContainerUnlocked(state, c, allContainers);
      if (!unlocked) {
        return (
          `<article class="shop-card shop-card--locked">` +
          `<span class="shop-card-icon">${iconMarkup(c.icon, { size: 28 })}</span>` +
          `<h3>${c.name}</h3>` +
          `<p>Bloqueado. Comprá el contenedor anterior primero.</p>` +
          `</article>`
        );
      }
      const cost = getContainerCost(state, c, data);
      const costLabel = cost === 0 ? 'Gratis' : formatMoney(cost);
      const trapProb = getEffectiveTrapProbability(state, c, false, data);
      // PLAN.md §11.2: Suerte recomendada — punto de rentabilidad esperada positiva, calculado
      // por el engine (getRecommendedLuck), nunca aproximado acá.
      const recommendedLuck = getRecommendedLuck(state, c, itemsData, data);
      const currentLuck = getLuck(state, data);
      const luckReached = currentLuck >= recommendedLuck;
      // PLAN.md §11.2 (ronda 10): metas de Fuerza y Búsqueda — leídas del engine.
      const recDigPower = getRecommendedDigPower(state, c);
      const curDigPower = getDigPowerMult(state, data);
      const digPowerReached = curDigPower >= recDigPower;
      const recArea = getRecommendedArea(state, c);
      const curArea = getAreaMult(state, data);
      const areaReached = curArea >= recArea;
      // PLAN.md §11.3: nivel del contenedor y su bonus — leídos del engine, nunca recalculados.
      const level = getContainerLevel(state, c.id);
      const levelBonusPct = Math.round((getLevelValueMult(state, c) - 1) * 100);
      const levelProgress =
        level >= CONTAINER_LEVEL_MAX
          ? 'nivel máximo'
          : `${formatNumber(Number(state.containerLevelProgress[c.id]) || 0)}/` +
            `${formatNumber(digsNeededForNextLevel(c, level))} escarbados para el nivel ${level + 1}`;
      return (
        `<article class="shop-card">` +
        `<span class="shop-card-icon">${iconMarkup(c.icon, { size: 28 })}</span>` +
        `<h3>${c.name}</h3>` +
        `<p>Costo: ${costLabel}</p>` +
        `<p>Categorías: ${c.categorias.map((id) => rarityNames.get(id) || id).join(', ')}</p>` +
        `<p>Riesgo de trampa: ${Math.round(trapProb * 100)}%</p>` +
        `<p>Comprados: ${Number(state.ownedContainers[c.id]) || 0}</p>` +
        `<p class="shop-card-level">Nivel ${level}/${CONTAINER_LEVEL_MAX} (+${levelBonusPct}% valor) — ${levelProgress}</p>` +
        `<p class="shop-card-luck ${luckReached ? 'shop-card-luck--reached' : ''}">` +
        `Suerte recomendada: ${formatNumber(recommendedLuck)} ${luckReached ? '(alcanzada)' : `(tenés ${formatNumber(currentLuck)})`}` +
        `</p>` +
        `<p class="shop-card-luck ${digPowerReached ? 'shop-card-luck--reached' : ''}">` +
        `Fuerza recomendada: ×${recDigPower} ${digPowerReached ? '(alcanzada)' : `(tenés ×${curDigPower.toFixed(2)})`}` +
        `</p>` +
        `<p class="shop-card-luck ${areaReached ? 'shop-card-luck--reached' : ''}">` +
        `Búsqueda recomendada: ×${recArea} ${areaReached ? '(alcanzada)' : `(tenés ×${curArea.toFixed(2)})`}` +
        `</p>` +
        `</article>`
      );
    });

    container.innerHTML = `<div class="shop-grid">${cards.join('')}</div>`;
  },
};
