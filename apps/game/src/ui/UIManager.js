/**
 * Orquesta todas las vistas: se suscribe al store y re-renderiza en cada cambio.
 * Cablea el DigCanvas (compra + revelado manual) y el tabbar. Ninguna vista mutila
 * el estado directo; todas despachan acciones al store (que despacha al engine).
 */

import { formatMoney } from '@dumpster/engine';
import { DigCanvas } from '../dig/DigCanvas.js';
import { Topbar } from './Topbar.js';
import { QuickUpgrades } from './QuickUpgrades.js';
import { ShopView } from './ShopView.js';
import { AutomationView } from './AutomationView.js';
import { AchievementsView } from './AchievementsView.js';
import { PrestigeView } from './PrestigeView.js';
import { SettingsView } from './SettingsView.js';
import { Toast } from './Toast.js';
import { Tutorial } from './Tutorial.js';

const TAB_VIEWS = {
  tienda: ShopView,
  automatizacion: AutomationView,
  logros: AchievementsView,
  prestigio: PrestigeView,
  ajustes: SettingsView,
};

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
    this.digEmptyEl = root.querySelector('#dig-empty');
    this.digActiveEl = root.querySelector('#dig-active');
    this.digCanvasHost = root.querySelector('#dig-canvas-host');
    this.digProgressFill = root.querySelector('#dig-progress-fill');
    this.digTrapHint = root.querySelector('#dig-trap-hint');
    this.digAbandonBtn = root.querySelector('#dig-abandon-btn');
    this.digContainerTitle = root.querySelector('#dig-container-title');
    this.tabbarEl = root.querySelector('#tabbar');
    this.tabContentEl = root.querySelector('#tab-content');

    this.toast = new Toast(root.querySelector('#toast-container'));
    this.tutorial = new Tutorial(root.querySelector('#tutorial-overlay'), store);
    this.digCanvas = new DigCanvas(this.digCanvasHost, {
      onProgress: (frac) => this.updateDigProgress(frac),
      onThresholdReached: () => this.store.actions.finishManualDig(),
    });

    this.bindStaticEvents();
    store.subscribe((state) => this.render(state));
    this.render(store.getState());
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

  updateDigProgress(fraction) {
    this.digProgressFill.style.width = `${Math.round(fraction * 100)}%`;
    this.digAbandonBtn.hidden = !(fraction > 0.03 && fraction < 0.97);
  }

  /** @param {import('@dumpster/engine').GameState} state - solo usado por el rAF del loop */
  renderTopbar(state) {
    Topbar.render(this.topbarEl, state);
  }

  render(state) {
    this.renderTopbar(state);
    QuickUpgrades.render(this.quickUpgradesEl, state, this.store);
    this.renderDigArea(state);
    this.renderTabContent(state);
    this.tutorial.render(state);

    const offline = this.store.consumeOfflineSummary();
    if (offline && offline.ganancia > 0) {
      const minutes = Math.max(1, Math.round(offline.segundosEfectivos / 60));
      this.toast.push(`Mientras no estabas ganaste ${formatMoney(offline.ganancia)} en ${minutes} min de robots trabajando.`);
    }

    for (const achievement of this.store.consumeNewAchievements()) {
      this.toast.push(`Logro desbloqueado: ${achievement.name}`);
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
