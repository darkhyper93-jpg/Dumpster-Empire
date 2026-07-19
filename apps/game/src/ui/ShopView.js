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
  hasProceduralContainersUnlocked,
  nextProceduralTier,
  proceduralContainer,
  PROCEDURAL_CONTAINER_MAX_N,
  getTimeBand,
} from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { containerBannerMarkup, bindContainerBannerFallback } from './containerImage.js';
import { t } from '../i18n/i18n.js';

/**
 * Ronda 23.C (PLAN.md §2.9/§4.27): tarjeta de compra del Puesto de Chatarra, único botón que
 * dispara una acción real desde esta vista (el resto es informativo — escarbar es "comprar").
 * @param {import('@dumpster/engine').GameState} state
 * @param {import('@dumpster/engine').EngineData} data
 * @returns {string}
 */
function renderStallCard(state, data) {
  if (!data.stall) return '';
  if (state.stallLevel >= 1) {
    return (
      `<article class="shop-card">` +
      `<span class="shop-card-icon">${iconMarkup('stall-chatarra', { size: 28 })}</span>` +
      `<h3>${t('shop.stallCard')}</h3>` +
      `<p>${t('shop.stallOwned')}</p>` +
      `</article>`
    );
  }
  const canAfford = state.money >= data.stall.stallCost;
  return (
    `<article class="shop-card">` +
    `<span class="shop-card-icon">${iconMarkup('stall-chatarra', { size: 28 })}</span>` +
    `<h3>${t('shop.stallCard')}</h3>` +
    `<p>${t('shop.stallDesc')}</p>` +
    `<button type="button" data-action="buy-stall" ${canAfford ? '' : 'disabled'} title="${
      canAfford ? '' : t('common.missingMoney', { amount: formatMoney(data.stall.stallCost - state.money) })
    }">${t('shop.stallBuyFor', { amount: formatMoney(data.stall.stallCost) })}</button>` +
    `</article>`
  );
}

/**
 * Tarjeta informativa del próximo tier procedural post-Big Bang (PLAN.md §4.37/§4.39, ronda
 * 26.C) — SOLO informativa, igual que el resto de la Tienda: comprar es escarbar (dispara desde
 * `DigContainerPicker`, no acá). Ausente si `ecoDelBigBang` no está comprado (mismo criterio
 * opcional que `renderStallCard`/`data.stall`).
 * @param {import('@dumpster/engine').GameState} state
 * @param {import('@dumpster/engine').EngineData} data
 * @param {Array<Object>} allContainers
 * @returns {string}
 */
function renderProceduralCard(state, data, allContainers) {
  if (!hasProceduralContainersUnlocked(state, data)) return '';
  const bigBang = allContainers.find((c) => c.id === 'vertederoBigBang');
  if (!bigBang) return '';
  const n = nextProceduralTier(state);
  // Contrato §3.5.8: los tiers procedurales REUSAN la imagen de vertederoBigBang — nunca se
  // genera un asset por tier (serían infinitos).
  const banner = containerBannerMarkup('vertederoBigBang', null);
  const cardClass = `shop-card${banner ? ' shop-card--has-banner' : ''}`;
  if (n > PROCEDURAL_CONTAINER_MAX_N) {
    return (
      `<article class="${cardClass}">` +
      banner +
      `<span class="shop-card-icon">${iconMarkup(bigBang.icon, { size: 28 })}</span>` +
      `<h3>${bigBang.name}</h3>` +
      `<p>${t('shop.proceduralAllOwned')}</p>` +
      `</article>`
    );
  }
  const tier = proceduralContainer(n, bigBang);
  const cost = getContainerCost(state, tier, data);
  return (
    `<article class="${cardClass}">` +
    banner +
    `<span class="shop-card-icon">${iconMarkup(bigBang.icon, { size: 28 })}</span>` +
    `<h3>${tier.name}${t('shop.proceduralSuffix', { n })}</h3>` +
    `<p>${t('shop.cost', { label: formatMoney(cost) })}</p>` +
    `<p>${t('shop.owned', { count: Number(state.ownedContainers[tier.id]) || 0 })}</p>` +
    `</article>`
  );
}

export const ShopView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    // Marca propia (ver CollectionView/AutomationView): #tab-content se reusa entre vistas. Antes
    // de la ronda 23.C esta vista era 100% informativa (sin binding); la tarjeta del Puesto suma
    // el primer botón con acción real.
    if (!container.dataset.boundClickShop) {
      container.dataset.boundClickShop = 'true';
      container.addEventListener('click', (evt) => {
        const buyBtn = evt.target.closest('[data-action="buy-stall"]');
        if (buyBtn && !buyBtn.disabled) store.actions.buyStall();
      });
    }

    const { allContainers, data, itemsData } = store.ctx;
    const stallCard = renderStallCard(state, data);
    if (!allContainers.length) {
      container.innerHTML = stallCard || `<p class="empty-state">${t('common.emptyContainers')}</p>`;
      return;
    }

    const rarityNames = new Map(itemsData.rarities.map((r) => [r.id, r.name]));
    // Ronda 30 (§4.40): la franja sale de la hora REAL del sistema, igual que el indicador
    // día/noche del Topbar — es presentación pura, nunca estado persistido.
    const band = getTimeBand(new Date().getHours(), data.dayNight);

    const cards = allContainers.map((c) => {
      const unlocked = isContainerUnlocked(state, c, allContainers);
      if (!unlocked) {
        // PLAN.md §2.6 (ronda 11): la razón del bloqueo importa — prestigio vs. progresión.
        const needsPrestige = c.requiresPrestigeCount && state.prestigeCount < c.requiresPrestigeCount;
        const reason = needsPrestige
          ? t('shop.unlocksAtPrestige', { count: c.requiresPrestigeCount })
          : t('shop.lockedDefault');
        // El banner de un contenedor bloqueado va en escala de grises (CSS): se ve QUÉ es sin
        // regalar la sensación de tenerlo.
        const lockedBanner = containerBannerMarkup(c.id, band, 'container-banner--locked');
        return (
          `<article class="shop-card shop-card--locked${lockedBanner ? ' shop-card--has-banner' : ''}">` +
          lockedBanner +
          `<span class="shop-card-icon">${iconMarkup(c.icon, { size: 28 })}</span>` +
          `<h3>${c.name}</h3>` +
          `<p>${reason}</p>` +
          `</article>`
        );
      }
      const cost = getContainerCost(state, c, data);
      const costLabel = cost === 0 ? t('common.free') : formatMoney(cost);
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
          ? t('shop.maxLevel')
          : t('shop.levelProgress', {
              cur: formatNumber(Number(state.containerLevelProgress[c.id]) || 0),
              needed: formatNumber(digsNeededForNextLevel(c, level)),
              next: level + 1,
            });
      const banner = containerBannerMarkup(c.id, band);
      return (
        `<article class="shop-card${banner ? ' shop-card--has-banner' : ''}">` +
        banner +
        `<span class="shop-card-icon">${iconMarkup(c.icon, { size: 28 })}</span>` +
        `<h3>${c.name}</h3>` +
        `<p>${t('shop.cost', { label: costLabel })}</p>` +
        `<p>${t('shop.categories', { list: c.categorias.map((id) => rarityNames.get(id) || id).join(', ') })}</p>` +
        `<p>${t('shop.trapRisk', { pct: Math.round(trapProb * 100) })}</p>` +
        `<p>${t('shop.owned', { count: Number(state.ownedContainers[c.id]) || 0 })}</p>` +
        `<p class="shop-card-level">${t('shop.levelLine', { level, max: CONTAINER_LEVEL_MAX, pct: levelBonusPct, progress: levelProgress })}</p>` +
        `<p class="shop-card-luck ${luckReached ? 'shop-card-luck--reached' : ''}">` +
        `${t('shop.luckLine', {
          rec: formatNumber(recommendedLuck),
          status: luckReached ? t('shop.reached') : t('shop.haveLuck', { cur: formatNumber(currentLuck) }),
        })}` +
        `</p>` +
        `<p class="shop-card-luck ${digPowerReached ? 'shop-card-luck--reached' : ''}">` +
        `${t('shop.digPowerLine', {
          rec: recDigPower,
          status: digPowerReached ? t('shop.reached') : t('shop.haveMult', { cur: curDigPower.toFixed(2) }),
        })}` +
        `</p>` +
        `<p class="shop-card-luck ${areaReached ? 'shop-card-luck--reached' : ''}">` +
        `${t('shop.areaLine', {
          rec: recArea,
          status: areaReached ? t('shop.reached') : t('shop.haveMult', { cur: curArea.toFixed(2) }),
        })}` +
        `</p>` +
        `</article>`
      );
    });

    const proceduralCard = renderProceduralCard(state, data, allContainers);
    container.innerHTML = `<div class="shop-grid">${stallCard}${cards.join('')}${proceduralCard}</div>`;
    bindContainerBannerFallback(container, 'shop-card--has-banner');
  },
};
