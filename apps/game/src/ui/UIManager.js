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
import { DigContainerPicker } from './DigContainerPicker.js';
import { ShopView } from './ShopView.js';
import { AutomationView } from './AutomationView.js';
import { AchievementsView } from './AchievementsView.js';
import { PrestigeView } from './PrestigeView.js';
import { CollectionView } from './CollectionView.js';
import { SettingsView } from './SettingsView.js';
import { Toast } from './Toast.js';
import { Tutorial } from './Tutorial.js';
import { OfflineModal } from './OfflineModal.js';
import { CelebrationModal } from './CelebrationModal.js';
import { iconMarkup } from '../icons/icons.js';
import { setEnabled as setSoundEnabled, setVolume as setMasterVolume, playFindPop, playTrapThud } from '../fx/audio.js';
import { spawnFindPop, triggerRarityGlow, triggerTrapShake } from '../fx/particles.js';

const TAB_VIEWS = {
  tienda: ShopView,
  automatizacion: AutomationView,
  logros: AchievementsView,
  prestigio: PrestigeView,
  index: CollectionView,
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
    // PLAN.md §11.8/§11.9: la pantalla de escarbado es la home — ya no está pegada a la Tienda.
    this.activeTab = 'escarbar';
    this.mountedDig = null;

    this.shellEl = root.querySelector('.game-shell');
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
    this.celebrationModalEl = root.querySelector('#celebration-modal');

    this.toast = new Toast(root.querySelector('#toast-container'));
    this.tutorial = new Tutorial(root.querySelector('#tutorial-overlay'), store);
    this.digCanvas = new DigCanvas(
      this.digCanvasHost,
      {
        onProgress: (frac) => this.updateDigProgress(frac),
        onComplete: () => this.handleDigComplete(),
        onObjectRevealed: (entry, posPct) => this.playObjectRevealFeedback(entry, posPct),
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
    // El click de "elegir contenedor" lo bindea DigContainerPicker.render() sobre #dig-empty
    // (mismo patrón que ShopView/QuickUpgrades: delegación bindeada una sola vez por vista).
  }

  /** Captura el resultado antes de que `finishManualDig` lo descarte, para disparar el juice. */
  handleDigComplete() {
    const pending = this.store.getPendingDig();
    const result = pending ? pending.result : null;
    const res = this.store.actions.finishManualDig();
    if (result) this.playDigFeedback(result);
    if (res && res.ok && res.levelUp) {
      this.toast.push(
        `${res.levelUp.containerName} subió a nivel ${res.levelUp.level}: +${res.levelUp.bonusPct}% de valor`
      );
    }
    if (result && !result.isTrap) {
      for (const item of result.items.filter((i) => i.isJackpot)) {
        CelebrationModal.push(this.celebrationModalEl, { type: 'jackpot', item });
      }
    }
  }

  /**
   * Juice por-objeto (ronda 5): pop de sonido + destello sobre la posición del objeto recién
   * destapado. La trampa no tiene pop propio — su feedback (thud + shake) llega al completarse
   * el escarbado vía playDigFeedback, como siempre.
   * @param {{name:string, categoria?:string, isTrap:boolean}} entry
   * @param {{xPct:number, yPct:number}} posPct
   */
  playObjectRevealFeedback(entry, posPct) {
    if (entry.isTrap) return;
    const { itemsData } = this.store.ctx;
    const rarityIndex = Math.max(0, itemsData.rarities.findIndex((r) => r.id === entry.categoria));
    const colorToken = rarityIndex > 0 ? itemsData.rarities[rarityIndex].colorToken : '--amber';
    playFindPop(rarityIndex);
    spawnFindPop(this.digCanvasHost, colorToken, rarityIndex, posPct);
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
    // AJUSTE (ronda 5): con progreso por-objeto (revelados/total) la vieja ventana 0.03-0.97
    // nunca se daba en contenedores de 1 objeto (trampa). Abandonar está disponible durante
    // todo el escarbado (el costo ya se pagó al iniciarlo) y se oculta recién al completar.
    this.digAbandonBtn.hidden = fraction >= 1;
  }

  /** @param {import('@dumpster/engine').GameState} state - solo usado por el rAF del loop */
  renderTopbar(state) {
    Topbar.render(this.topbarEl, state);
  }

  render(state) {
    setSoundEnabled(state.soundOn);
    setMasterVolume(state.volume);
    this.renderTopbar(state);
    // PLAN.md §11.9 / PUNTOS_A_MEJORAR_2.md §3: la visibilidad de dig-area/quick-upgrades por
    // pantalla la decide el CSS según el breakpoint, leyendo `data-active-tab` en `.game-shell`.
    // En mobile solo se ven en la home de escarbado; en desktop (≥1024px) quedan siempre visibles
    // (sidebar izquierdo con nav+lista · escarbado al centro · mejoras a la derecha, paneles fijos).
    this.shellEl.dataset.activeTab = this.activeTab;
    QuickUpgrades.render(this.quickUpgradesEl, state, this.store);
    this.renderDigArea(state);
    this.renderTabContent(state);
    this.tutorial.render(state);

    const offline = this.store.consumeOfflineSummary();
    if (offline && offline.ganancia > 0) {
      OfflineModal.show(this.offlineModalEl, offline, this.store);
    }

    for (const achievement of this.store.consumeNewAchievements()) {
      CelebrationModal.push(this.celebrationModalEl, { type: 'achievement', achievement });
    }
    for (const container of this.store.consumeNewContainerUnlocks()) {
      CelebrationModal.push(this.celebrationModalEl, { type: 'containerUnlock', container });
    }
  }

  renderDigArea(state) {
    const pending = this.store.getPendingDig();
    if (pending) {
      this.digEmptyEl.hidden = true;
      this.digActiveEl.hidden = false;
      this.digContainerTitle.textContent = pending.container.name;
      const trapPct = Math.round(pending.trapProb * 100);
      // Feedback de "cuánto falta" (CLAUDE.md): si el ritmo está por debajo de lo normal, se lo
      // decimos al jugador en vez de dejar que el arrastre lento se sienta como un bug.
      const rateHint = pending.digRate < 0.99 ? ` · Ritmo de escarbado: ${Math.round(pending.digRate * 100)}% (subí Fuerza)` : '';
      this.digTrapHint.textContent = `Riesgo de trampa: ${trapPct}%${rateHint}`;
      if (this.mountedDig !== pending) {
        this.mountedDig = pending;
        this.digCanvas.start(pending.result, pending.areaMult, pending.digRate);
        this.updateDigProgress(0);
      }
    } else {
      this.digActiveEl.hidden = true;
      this.digEmptyEl.hidden = false;
      DigContainerPicker.render(this.digEmptyEl, state, this.store);
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

    // 'escarbar' es la home (dig-area + mejoras rápidas, ver render()); no tiene vista propia
    // en #tab-content — PLAN.md §11.9: las demás pestañas no muestran el prompt de escarbado.
    if (this.activeTab === 'escarbar') {
      this.tabContentEl.hidden = true;
      this.tabContentEl.innerHTML = '';
      return;
    }
    this.tabContentEl.hidden = false;

    const view = TAB_VIEWS[this.activeTab];
    if (!view) {
      this.tabContentEl.innerHTML = '<p class="empty-state">Vista desconocida.</p>';
      return;
    }
    view.render(this.tabContentEl, state, this.store);
  }
}
