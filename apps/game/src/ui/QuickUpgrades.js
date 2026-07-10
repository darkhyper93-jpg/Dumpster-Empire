/**
 * Mejoras rápidas siempre visibles: Suerte, Fuerza de Escarbado, Área de Búsqueda
 * (PLAN.md §5.1). La Capacidad (4ta mejora repetible) vive en AutomationView porque
 * es la que controla el tamaño de la cola de automatización, no una stat de escarbado
 * manual (DECISIÓN de ubicación, ver HANDOFF.md).
 */

import { formatMoney, nextUpgradeCost } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { upgradeEffectLabel } from './upgradeEffect.js';
import { t } from '../i18n/i18n.js';

const QUICK_UPGRADE_IDS = ['luck', 'digPower', 'area'];

export const QuickUpgrades = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.boundClick) {
      container.dataset.boundClick = 'true';
      container.addEventListener('click', (evt) => {
        const btn = evt.target.closest('[data-upgrade]');
        if (!btn || btn.disabled) return;
        store.actions.buyUpgrade(btn.dataset.upgrade);
      });
    }

    const { data } = store.ctx;
    if (!data.upgrades.length) {
      container.textContent = t('quickUpgrades.empty');
      return;
    }

    const html = QUICK_UPGRADE_IDS.map((id) => {
      const upgrade = data.upgrades.find((u) => u.id === id);
      if (!upgrade) return '';
      const level = state.upgradeLevels[id] || 0;
      const cost = nextUpgradeCost(state, upgrade);
      const canAfford = state.money >= cost;
      const missing = canAfford ? '' : t('common.missingMoney', { amount: formatMoney(cost - state.money) });
      return (
        `<button type="button" class="quick-upgrade-btn" data-upgrade="${upgrade.id}" ${canAfford ? '' : 'disabled'} title="${missing}">` +
        `<span class="quick-upgrade-icon-circle">${iconMarkup(upgrade.icon, { size: 22 })}</span>` +
        `<span class="quick-upgrade-label">${t('quickUpgrades.levelLabel', { label: upgrade.label, level })}</span>` +
        `<span class="quick-upgrade-effect">${upgradeEffectLabel(upgrade)}</span>` +
        `<span class="quick-upgrade-cost">${formatMoney(cost)}</span>` +
        `</button>`
      );
    }).join('');

    container.innerHTML = html;
  },
};
