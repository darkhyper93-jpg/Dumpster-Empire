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
import { StallView } from './StallView.js';
import { SettingsView } from './SettingsView.js';
import { StatsView } from './StatsView.js';
import { ToolsSection } from './ToolsSection.js';
import { Toast } from './Toast.js';
import { Tutorial } from './Tutorial.js';
import { OfflineModal } from './OfflineModal.js';
import { CelebrationModal } from './CelebrationModal.js';
import { iconMarkup } from '../icons/icons.js';
import { setEnabled as setSoundEnabled, setVolume as setMasterVolume, playFindPop, playTrapThud } from '../fx/audio.js';
import { spawnFindPop, triggerRarityGlow, triggerTrapShake } from '../fx/particles.js';
import { t, getLanguage, setLanguage } from '../i18n/i18n.js';
import { applyDataLanguage } from '../i18n/dataI18n.js';

const TAB_VIEWS = {
  tienda: ShopView,
  automatizacion: AutomationView,
  logros: AchievementsView,
  prestigio: PrestigeView,
  index: CollectionView,
  puesto: StallView,
  ajustes: SettingsView,
  estadisticas: StatsView,
};

export class UIManager {
  /**
   * @param {HTMLElement} root
   * @param {ReturnType<import('../store.js').createStore>} store
   * @param {import('../i18n/dataI18n.js').LoadedData} [loaded] - la data cargada por main.js.
   *   DECISIÓN (ronda 16): se pasa por constructor (lo mínimo) porque el sync de idioma de
   *   render() necesita re-aplicar el overlay sobre el MISMO objeto que localizó main.js.
   */
  constructor(root, store, loaded) {
    this.root = root;
    this.store = store;
    this.loaded = loaded || null;
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
    this.digStreakPillEl = root.querySelector('#dig-streak-pill');
    this.lastRenderedStreak = 0;
    // Ronda 20 (PLAN.md §4.24): timer de la Bóveda a Contrarreloj y máscara del Sótano Sin Luz.
    this.digTimedTimerEl = root.querySelector('#dig-timed-timer');
    this.digDarkMaskEl = root.querySelector('#dig-dark-mask');
    // Ronda 21: las herramientas de escarbado se mudan de Ajustes a la vista Escarbar.
    this.digToolsSectionEl = root.querySelector('#dig-tools-section');
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
      store.ctx.itemsData.rarities,
      store.ctx.data.traps
    );

    this.injectTabIcons();
    this.bindStaticEvents();
    store.subscribe((state) => this.render(state));
    this.render(store.getState());
  }

  injectTabIcons() {
    for (const btn of this.tabbarEl.querySelectorAll('[data-tab]')) {
      const label = t(`tabs.${btn.dataset.tab}`);
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

    // Ronda 21: Estadísticas pasa de subvista de Ajustes a vista propia abierta desde el header.
    const statsBtn = this.root.querySelector('#stats-btn');
    if (statsBtn) {
      statsBtn.addEventListener('click', () => {
        this.activeTab = 'estadisticas';
        this.render(this.store.getState());
      });
    }

    this.digAbandonBtn.textContent = t('dig.abandon');
    this.digAbandonBtn.addEventListener('click', () => this.store.actions.abandonManualDig());

    // Ronda 20 (PLAN.md §4.24, Sótano Sin Luz): máscara puramente visual que sigue el puntero
    // sobre la tarjeta de escarbado — nunca decide nada del modelo de revelado (napkin), solo
    // recorta con CSS `mask`/`clip-path` lo que se ve. Se actualiza en cada gesto, activa o no.
    this.digCanvasHost.addEventListener('pointermove', (evt) => this.updateDarkMaskPosition(evt));
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
        t('uiManager.levelUp', { name: res.levelUp.containerName, level: res.levelUp.level, pct: res.levelUp.bonusPct })
      );
    }
    if (result && !result.isTrap) {
      // D3/D7 (ronda 14): solo el escarbado manual celebra, y solo la 1ra vez que se encuentra
      // ESE ítem de la categoría más rara — el robot nunca dispara este modal.
      for (const item of result.items.filter((i) => i.isFirstRareFind)) {
        CelebrationModal.push(this.celebrationModalEl, { type: 'firstFind', item });
      }
      // PLAN.md §4.26 (ronda 22): celebración especial de legendario, con su propia partícula
      // dorada y sonido (juice obligatorio, CLAUDE.md §5.2) — nunca junto al firstFind del mismo
      // ítem (el legendario reemplazó el slot 1 antes de llegar acá, así que es mutuamente
      // excluyente con isFirstRareFind por construcción del engine).
      for (const item of result.items.filter((i) => i.isLegendary)) {
        CelebrationModal.push(this.celebrationModalEl, { type: 'legendary', item });
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
    const vibrationOn = this.store.getState().vibrationOn;
    if (result.isTrap) {
      playTrapThud();
      triggerTrapShake(this.root);
      // PLAN.md §5.4 (ronda 19): vibración táctil en trampa. `navigator.vibrate` no existe en
      // Electron/desktop ni en algunos navegadores — optional chaining lo vuelve no-op silencioso.
      if (vibrationOn) globalThis.navigator?.vibrate?.(80);
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
    // Vibración corta en hallazgo de la categoría más rara del contenedor (PLAN.md §5.4).
    if (vibrationOn && bestRarityIndex === itemsData.rarities.length - 1) {
      globalThis.navigator?.vibrate?.(30);
    }
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
    Topbar.render(this.topbarEl, state, this.store.ctx.data.dayNight);
  }

  /**
   * Re-renderiza los textos que se escriben UNA sola vez fuera del ciclo de render (ronda 16):
   * las etiquetas de los tabs, el botón de abandonar escarbado y los nodos bind-once del Topbar
   * (se les borra `dataset.iconReady` para que el próximo Topbar.render los reconstruya con el
   * idioma nuevo). Todo lo demás se re-renderiza solo en el render en curso.
   */
  refreshStaticTexts() {
    this.injectTabIcons();
    this.digAbandonBtn.textContent = t('dig.abandon');
    this.digCanvas.refreshTexts();
    for (const el of this.topbarEl.querySelectorAll('[data-icon-ready]')) {
      delete el.dataset.iconReady;
    }
    // Ronda 30: el reloj del topbar se repinta solo cuando su firma cambia; al cambiar de idioma
    // hay que invalidarla a mano o el nombre de la franja se queda en el idioma anterior.
    for (const el of this.topbarEl.querySelectorAll('[data-clock-signature]')) {
      delete el.dataset.clockSignature;
    }
  }

  render(state) {
    setSoundEnabled(state.soundOn);
    setMasterVolume(state.volume);
    this.digCanvas.setSensitivity(state.digSensitivity);
    // Ronda 16: sync de idioma (mismo patrón que el sync de audio/sensibilidad de arriba —
    // el estado manda y la capa de presentación lo sigue en cada render). Cubre el selector
    // de Ajustes y también un save importado con otro idioma (R-16.10).
    if (this.loaded && getLanguage() !== state.language) {
      setLanguage(state.language);
      applyDataLanguage(this.loaded, state.language);
      document.documentElement.lang = state.language;
      this.refreshStaticTexts();
    }
    // Ronda 15 (R5 del roadmap): toast cuando el robot descarta un contenedor trampeado (nodo
    // Escáner de Trampas). Solo se compara contra el render anterior del MISMO objeto de estado:
    // en el primer render y cada vez que el store lo reemplaza (importSave/resetGame devuelven
    // un objeto nuevo) se re-basea sin toast — un save que ya traía trapsDiscarded > 0 no debe
    // disparar el toast al bootear ni al importarse (AJUSTE: auditoría ronda 15).
    if (this.lastTrapsState === state && state.trapsDiscarded > this.lastTrapsDiscarded) {
      this.toast.push(t('automation.trapDiscarded'));
    }
    this.lastTrapsState = state;
    this.lastTrapsDiscarded = state.trapsDiscarded;
    this.renderTopbar(state);
    // PLAN.md §11.9 / PUNTOS_A_MEJORAR_2.md §3: la visibilidad de dig-area/quick-upgrades por
    // pantalla la decide el CSS según el breakpoint, leyendo `data-active-tab` en `.game-shell`.
    // En mobile solo se ven en la home de escarbado; en desktop (≥1024px) quedan siempre visibles
    // (sidebar izquierdo con nav+lista · escarbado al centro · mejoras a la derecha, paneles fijos).
    this.shellEl.dataset.activeTab = this.activeTab;
    QuickUpgrades.render(this.quickUpgradesEl, state, this.store);
    this.renderDigStreak(state);
    this.renderDigArea(state);
    ToolsSection.render(this.digToolsSectionEl, state, this.store);
    this.renderTabContent(state);
    this.tutorial.render(state);

    const offline = this.store.consumeOfflineSummary();
    // §27.5.3 (ronda 27): también se abre cuando SOLO facturó el robot vendedor (ganancia de
    // flota 0) — el store ya filtra el caso todo-cero, pero este gate duplicado lo tapaba.
    if (offline && (offline.ganancia > 0 || offline.stallEarnings > 0)) {
      OfflineModal.show(this.offlineModalEl, offline, this.store);
    }

    for (const achievement of this.store.consumeNewAchievements()) {
      CelebrationModal.push(this.celebrationModalEl, { type: 'achievement', achievement });
    }
    for (const container of this.store.consumeNewContainerUnlocks()) {
      CelebrationModal.push(this.celebrationModalEl, { type: 'containerUnlock', container });
    }
    // Ronda 23.C (roadmap §3.2): viñetas de historia liviana — mismo patrón consume-queue que
    // logros/desbloqueos, resueltas contra `this.loaded.npcs` (el store no conoce npcs.json).
    for (const milestone of this.store.consumeNewStoryVignettes()) {
      const npc = this.loaded?.npcs.find((n) => n.id === milestone.npcId);
      if (npc) CelebrationModal.push(this.celebrationModalEl, { type: 'story', npc, textKey: milestone.textKey });
    }
    // PLAN.md §4.24 (ronda 20): la Bóveda a Contrarreloj expiró sola (tickDigTimer, store.js) —
    // se pierde SIN castigo, solo avisamos con un toast (mismo patrón que el descarte del robot).
    for (const expiration of this.store.consumeTimedDigExpirations()) {
      this.toast.push(t('dig.timedExpired', { name: expiration.containerName }));
    }
  }

  /**
   * Racha de escarbado manual (PLAN.md §4.20, ronda 19): visible desde racha >= 2, con un pop
   * de juice (PLAN.md §5.2) cada vez que sube respecto del render anterior.
   * @param {import('@dumpster/engine').GameState} state
   */
  renderDigStreak(state) {
    const streak = state.digStreak;
    this.digStreakPillEl.hidden = streak < 2;
    if (streak >= 2) {
      this.digStreakPillEl.textContent = t('dig.streak', { count: streak });
      if (streak > this.lastRenderedStreak) {
        this.digStreakPillEl.classList.remove('dig-streak-pill--pop');
        // eslint-disable-next-line no-unused-expressions
        this.digStreakPillEl.offsetWidth; // reinicia la animación CSS si ya estaba corriendo.
        this.digStreakPillEl.classList.add('dig-streak-pill--pop');
      }
    }
    this.lastRenderedStreak = streak;
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
      const rateHint = pending.digRate < 0.99 ? t('dig.rateHint', { pct: Math.round(pending.digRate * 100) }) : '';
      this.digTrapHint.textContent = t('dig.trapRiskLine', { pct: trapPct, hint: rateHint });
      this.renderTimedTimer(pending);
      this.digDarkMaskEl.hidden = pending.container.mode !== 'dark';
      if (this.mountedDig !== pending) {
        this.mountedDig = pending;
        this.digCanvas.start(pending.result, pending.areaMult, pending.digRate);
        this.updateDigProgress(0);
      }
    } else {
      this.digActiveEl.hidden = true;
      this.digEmptyEl.hidden = false;
      DigContainerPicker.render(this.digEmptyEl, state, this.store);
      this.digTimedTimerEl.hidden = true;
      this.digDarkMaskEl.hidden = true;
      if (this.mountedDig !== null) {
        this.mountedDig = null;
        this.digCanvas.stop();
      }
    }
  }

  /**
   * Timer duro de la Bóveda a Contrarreloj (PLAN.md §4.24, `mode: "timed"`): `pending.timeRemaining`
   * lo decrementa `store.actions.tickDigTimer` por delta real del loop (R20.3, nunca setTimeout).
   * @param {{timeRemaining: number|null}} pending
   */
  renderTimedTimer(pending) {
    if (pending.timeRemaining === null) {
      this.digTimedTimerEl.hidden = true;
      return;
    }
    this.digTimedTimerEl.hidden = false;
    this.digTimedTimerEl.textContent = t('dig.timedRemaining', { seconds: Math.ceil(pending.timeRemaining) });
  }

  /**
   * Máscara de oscuridad del Sótano Sin Luz (PLAN.md §4.24, `mode: "dark"`): puramente visual
   * (radial-gradient CSS que sigue el puntero/dedo), nunca decide nada del modelo de revelado —
   * el jugador puede rascar a ciegas fuera del radio visible.
   * @param {PointerEvent} evt
   */
  updateDarkMaskPosition(evt) {
    if (this.digDarkMaskEl.hidden) return;
    const rect = this.digCanvasHost.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    this.digDarkMaskEl.style.setProperty('--mask-x', `${x}px`);
    this.digDarkMaskEl.style.setProperty('--mask-y', `${y}px`);
  }

  renderTabContent(state) {
    // No interrumpir mientras el jugador está escribiendo (ej. import de guardado).
    const active = document.activeElement;
    // El guard de SELECT (riesgo #1 de RONDA14-PLAN.md §7): sin él, el dropdown del target del
    // robot se cierra solo cada segundo porque automationTick notifica en cada tick.
    if (
      this.tabContentEl.contains(active) &&
      (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.tagName === 'SELECT')
    ) {
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
      this.tabContentEl.innerHTML = `<p class="empty-state">${t('uiManager.unknownView')}</p>`;
      return;
    }
    view.render(this.tabContentEl, state, this.store);
  }
}
