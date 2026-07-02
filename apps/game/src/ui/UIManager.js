/**
 * Orquesta todas las vistas: se suscribe al store y re-renderiza en cada cambio.
 * Cablea el DigCanvas (compra + revelado manual), el tabbar y el feedback de "juice"
 * (PLAN.md §5.2): sonido/partícula/glow al hallar, shake+flash al caer en trampa,
 * modal de offline con highlights y modal celebratorio al desbloquear categoría.
 * Ninguna vista muta el estado directo; todas despachan acciones al store.
 */

import { DigCanvas } from '../dig/DigCanvas.js';
import { Topbar } from './Topbar.js';
import { QuickUpgrades } from './QuickUpgrades.js';
import { ShopView } from './ShopView.js';
import { AutomationView } from './AutomationView.js';
import { AchievementsView } from './AchievementsView.js';
import { PrestigeView } from './PrestigeView.js';
import { CollectionView } from './CollectionView.js';
import { SettingsView } from './SettingsView.js';
import { Toast } from './Toast.js';
import { Tutorial } from './Tutorial.js';
import { OfflineModal } from './OfflineModal.js';
import { CategoryUnlockModal } from './CategoryUnlockModal.js';
import { iconMarkup } from '../icons/icons.js';
import { setEnabled as setSoundEnabled, playFindPop, playTrapThud } from '../fx/audio.js';
import { spawnFindPop, triggerRarityGlow, triggerTrapShake } from '../fx/particles.js';

const TAB_VIEWS = {
  tienda: ShopView,
  automatizacion: AutomationView,
  logros: AchievementsView,
  prestigio: PrestigeView,
  index: CollectionView,
  ajustes: SettingsView,
};

// Logros "primer objeto de la categoría" (achievements.json a14-a19): encontrar el primer
// objeto de una categoría nueva es, en los hechos, desbloquearla (el engine no emite un
// evento dedicado de "categoría desbloqueada" — ver CategoryUnlockModal.js).
const CATEGORY_UNLOCK_ACHIEVEMENT_IDS = new Set(['a14', 'a15', 'a16', 'a17', 'a18', 'a19']);

export class UIManager {
  /**
   * @param {HTMLElement} root
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  constructor(root, store) {
    this.root = root;
    this.store = store;
    this.activeTab = 'tienda';
    this.mountedDig = null;

    this.topbarEl = root.querySelector('#topbar');
    this.quickUpgradesEl = root.querySelector('#quick-upgrades');
    this.digAreaEl = root.querySelector('#dig-area');
    this.digEmptyEl = root.querySelector('#dig-empty');
    this.digActiveEl = root.querySelector('#dig-active');
    this.digCanvasHost = root.querySelector('#dig-canvas-host');
    this.digRarityGlowEl = root.querySelector('#dig-rarity-glow');
    this.digProgressFill = root.querySelector('#dig-progress-fill');
    this.digTrapHint = root.querySelector('#dig-trap-hint');
    this.digAbandonBtn = root.querySelector('#dig-abandon-btn');
    this.digContainerTitle = root.querySelector('#dig-container-title');
    this.tabbarEl = root.querySelector('#tabbar');
    this.tabContentEl = root.querySelector('#tab-content');
    this.offlineModalEl = root.querySelector('#offline-modal');
    this.categoryModalEl = root.querySelector('#category-modal');

    this.toast = new Toast(root.querySelector('#toast-container'));
    this.tutorial = new Tutorial(root.querySelector('#tutorial-overlay'), store);
    this.digCanvas = new DigCanvas(
      this.digCanvasHost,
      {
        onProgress: (frac) => this.updateDigProgress(frac),
        onThresholdReached: () => this.handleDigComplete(),
      },
      store.ctx.itemsData.rarities
    );

    this.injectTabIcons();
    this.bindStaticEvents();
    store.subscribe((state) => this.render(state));
    this.render(store.getState());
  }

  injectTabIcons() {
    for (const btn of this.tabbarEl.querySelectorAll('[data-tab]')) {
      const label = btn.textContent;
      btn.innerHTML = `${iconMarkup(`tab-${btn.dataset.tab}`, { size: 20 })}<span>${label}</span>`;
    }
  }

  bindStaticEvents() {
    this.tabbarEl.addEventListener('click', (evt) => {
      const btn = evt.target.closest('[data-tab]');
      if (!btn) return;
      this.activeTab = btn.dataset.tab;
      this.render(this.store.getState());
    });

    const settingsBtn = this.root.querySelector('#settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.activeTab = 'ajustes';
        this.render(this.store.getState());
      });
    }

    this.digAbandonBtn.addEventListener('click', () => this.store.actions.abandonManualDig());
    this.digEmptyEl.addEventListener('click', (evt) => {
      const btn = evt.target.closest('[data-start-dig]');
      if (!btn || btn.disabled) return;
      this.store.actions.startManualDig(btn.dataset.startDig);
    });
  }

  /** Captura el resultado antes de que `finishManualDig` lo descarte, para disparar el juice. */
  handleDigComplete() {
    const pending = this.store.getPendingDig();
    const result = pending ? pending.result : null;
    this.store.actions.finishManualDig();
    if (result) this.playDigFeedback(result);
  }

  /** @param {import('@dumpster/engine').DigResult} result */
  playDigFeedback(result) {
    const { itemsData } = this.store.ctx;
    if (result.isTrap) {
      playTrapThud();
      triggerTrapShake(this.root);
      return;
    }
    let bestRarityIndex = 0;
    let bestColorToken = '--amber';
    for (const item of result.items) {
      const rarityIndex = itemsData.rarities.findIndex((r) => r.id === item.categoria);
      if (rarityIndex > bestRarityIndex) {
        bestRarityIndex = rarityIndex;
        bestColorToken = itemsData.rarities[rarityIndex].colorToken;
      }
    }
    playFindPop(bestRarityIndex);
    spawnFindPop(this.digActiveEl, bestColorToken, bestRarityIndex);
    triggerRarityGlow(this.digRarityGlowEl, bestColorToken, 0.3 + bestRarityIndex * 0.1);
  }

  updateDigProgress(fraction) {
    this.digProgressFill.style.width = `${Math.round(fraction * 100)}%`;
    this.digAbandonBtn.hidden = !(fraction > 0.03 && fraction < 0.97);
  }

  /** @param {import('@dumpster/engine').GameState} state - solo usado por el rAF del loop */
  renderTopbar(state) {
    Topbar.render(this.topbarEl, state);
  }

  render(state) {
    setSoundEnabled(state.soundOn);
    this.renderTopbar(state);
    // PLAN.md §11.9: la pantalla de escarbado (prompt de contenedor + mejoras rápidas) solo se
    // muestra en la Tienda; el resto de las pestañas son secciones distintas.
    const showDigScreen = this.activeTab === 'tienda';
    this.digAreaEl.hidden = !showDigScreen;
    this.quickUpgradesEl.hidden = !showDigScreen;
    QuickUpgrades.render(this.quickUpgradesEl, state, this.store);
    this.renderDigArea(state);
    this.renderTabContent(state);
    this.tutorial.render(state);

    const offline = this.store.consumeOfflineSummary();
    if (offline && offline.ganancia > 0) {
      OfflineModal.show(this.offlineModalEl, offline, this.store);
    }

    for (const achievement of this.store.consumeNewAchievements()) {
      if (CATEGORY_UNLOCK_ACHIEVEMENT_IDS.has(achievement.id)) {
        CategoryUnlockModal.show(this.categoryModalEl, achievement);
      } else {
        this.toast.push(`Logro desbloqueado: ${achievement.name}`);
      }
    }
  }

  renderDigArea(state) {
    const pending = this.store.getPendingDig();
    if (pending) {
      this.digEmptyEl.hidden = true;
      this.digActiveEl.hidden = false;
      this.digContainerTitle.textContent = pending.container.name;
      this.digTrapHint.textContent = `Riesgo de trampa: ${Math.round(pending.trapProb * 100)}%`;
      if (this.mountedDig !== pending) {
        this.mountedDig = pending;
        this.digCanvas.start(pending.result, pending.revealThreshold, pending.areaMult);
        this.updateDigProgress(0);
      }
    } else {
      this.digActiveEl.hidden = true;
      this.digEmptyEl.hidden = false;
      if (this.mountedDig !== null) {
        this.mountedDig = null;
        this.digCanvas.stop();
      }
    }
  }

  renderTabContent(state) {
    // No interrumpir mientras el jugador está escribiendo (ej. import de guardado).
    const active = document.activeElement;
    if (this.tabContentEl.contains(active) && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
      return;
    }

    for (const btn of this.tabbarEl.querySelectorAll('[data-tab]')) {
      btn.classList.toggle('is-active', btn.dataset.tab === this.activeTab);
    }

    const view = TAB_VIEWS[this.activeTab];
    if (!view) {
      this.tabContentEl.innerHTML = '<p class="empty-state">Vista desconocida.</p>';
      return;
    }
    view.render(this.tabContentEl, state, this.store);
  }
}
