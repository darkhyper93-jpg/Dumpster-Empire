/**
 * Store del juego: única fuente de verdad del lado UI. Envuelve el estado del engine,
 * expone acciones que despachan al engine y notifica a los suscriptores tras cada cambio.
 * No reimplementa ninguna fórmula: todo cálculo de economía pasa por @dumpster/engine.
 */

import {
  freshState,
  getRevealThreshold,
  getAreaMult,
  getEffectiveTrapProbability,
  serializeState,
  deserializeState,
  exportSave as engineExportSave,
  importSave as engineImportSave,
  isContainerUnlocked,
  buyContainer as engineBuyContainer,
  rollContainerResult,
  applyContainerResult,
  buyUpgrade as engineBuyUpgrade,
  buyAutomation as engineBuyAutomation,
  automationTick,
  hasAutoDig,
  buyPrestigeNode as engineBuyPrestigeNode,
  doPrestige as engineDoPrestige,
  checkAchievements,
  applyOfflineProgress,
} from '@dumpster/engine';

const SAVE_KEY = 'dumpsterEmpireSave';
// AJUSTE: no calculamos offline por debajo de este piso para no mostrar un modal por
// recargas de página instantáneas (F5) donde no pasó tiempo real relevante.
const OFFLINE_MIN_SECONDS = 5;

/**
 * @typedef {Object} StoreContext
 * @property {{ upgrades: Array<Object>, automations: Array<Object>, prestigeTree: Array<Object> }} data
 * @property {{ rarities: Array<Object>, containers: Object<string, Array<Object>> }} itemsData
 * @property {Array<Object>} allContainers
 * @property {Array<Object>} achievementsData
 */

/**
 * @param {StoreContext} ctx
 */
export function createStore(ctx) {
  const { data, itemsData, allContainers, achievementsData } = ctx;

  let state = loadState();
  let pendingDig = null;
  let offlineSummary = null;
  let newAchievements = [];
  const listeners = new Set();

  function loadState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const result = deserializeState(raw);
    return result.ok ? result.state : freshState();
  }

  function persist() {
    localStorage.setItem(SAVE_KEY, serializeState(state));
  }

  function notify() {
    for (const fn of listeners) fn(state);
  }

  function runAchievements() {
    const unlockedIds = checkAchievements(state, achievementsData, {
      allContainers,
      allAutomations: data.automations,
    });
    if (unlockedIds.length) {
      newAchievements.push(...unlockedIds.map((id) => achievementsData.find((a) => a.id === id)));
    }
  }

  // Progreso offline al abrir, antes de que nadie se suscriba (el primer render lo consume).
  const secondsAway = Math.max(0, (Date.now() - state.lastSavedAt) / 1000);
  if (secondsAway >= OFFLINE_MIN_SECONDS) {
    const result = applyOfflineProgress(state, secondsAway, allContainers, itemsData, data);
    if (result.ganancia > 0) offlineSummary = result;
  }
  runAchievements();

  const actions = {
    buyUpgrade(upgradeId) {
      const upgrade = data.upgrades.find((u) => u.id === upgradeId);
      if (!upgrade) return { ok: false, error: 'Mejora desconocida.' };
      const result = engineBuyUpgrade(state, upgrade);
      if (result.ok) {
        if (state.tutorialStep === 1) state.tutorialStep = 2;
        runAchievements();
        persist();
        notify();
      }
      return result;
    },

    startManualDig(containerId) {
      if (pendingDig) return { ok: false, error: 'Ya hay un escarbado en curso.' };
      const container = allContainers.find((c) => c.id === containerId);
      if (!container) return { ok: false, error: 'Contenedor desconocido.' };
      if (!isContainerUnlocked(state, container, allContainers)) {
        return { ok: false, error: 'Contenedor bloqueado.' };
      }
      const result = engineBuyContainer(state, container, data);
      if (!result.ok) return result;
      const digResult = rollContainerResult(state, container, false, itemsData, data);
      pendingDig = {
        container,
        result: digResult,
        revealThreshold: getRevealThreshold(state, data),
        areaMult: getAreaMult(state, data),
        trapProb: getEffectiveTrapProbability(state, container, false, data),
      };
      if (state.tutorialStep === 2 && container.costoInicial > 0) state.tutorialStep = 3;
      persist();
      notify();
      return { ok: true };
    },

    finishManualDig() {
      if (!pendingDig) return { ok: false, error: 'No hay escarbado en curso.' };
      const { container, result } = pendingDig;
      applyContainerResult(state, container, result, false, data);
      if (state.tutorialStep === 0) state.tutorialStep = 1;
      pendingDig = null;
      runAchievements();
      persist();
      notify();
      return { ok: true };
    },

    abandonManualDig() {
      if (!pendingDig) return { ok: false, error: 'No hay escarbado en curso.' };
      pendingDig = null;
      notify();
      return { ok: true };
    },

    buyAutomation(automationId) {
      const automation = data.automations.find((a) => a.id === automationId);
      if (!automation) return { ok: false, error: 'Automatización desconocida.' };
      const result = engineBuyAutomation(state, automation);
      if (result.ok) {
        runAchievements();
        persist();
        notify();
      }
      return result;
    },

    buyPrestigeNode(nodeId) {
      const node = data.prestigeTree.find((n) => n.id === nodeId);
      if (!node) return { ok: false, error: 'Nodo desconocido.' };
      const result = engineBuyPrestigeNode(state, node);
      if (result.ok) {
        persist();
        notify();
      }
      return result;
    },

    doPrestige() {
      const result = engineDoPrestige(state, data);
      if (result.ok) {
        pendingDig = null;
        runAchievements();
        persist();
        notify();
      }
      return result;
    },

    exportSave() {
      return engineExportSave(state);
    },

    importSave(text) {
      const result = engineImportSave(text);
      if (result.ok) {
        state = result.state;
        pendingDig = null;
        runAchievements();
        persist();
        notify();
      }
      return result;
    },

    resetGame() {
      state = freshState();
      pendingDig = null;
      persist();
      notify();
      return { ok: true };
    },

    toggleSound() {
      state.soundOn = !state.soundOn;
      persist();
      notify();
    },

    skipTutorial() {
      state.tutorialStep = 3;
      persist();
      notify();
    },

    /**
     * Tick de producción automática por delta de tiempo real (no por frame). Ver loop.js.
     * @param {number} dtSeconds
     */
    tickAutomation(dtSeconds) {
      if (!hasAutoDig(state, data)) return;
      automationTick(state, dtSeconds, allContainers, itemsData, data);
      runAchievements();
      notify();
    },
  };

  return {
    ctx,
    getState: () => state,
    getPendingDig: () => pendingDig,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    persist,
    consumeOfflineSummary() {
      const summary = offlineSummary;
      offlineSummary = null;
      return summary;
    },
    consumeNewAchievements() {
      const list = newAchievements;
      newAchievements = [];
      return list;
    },
    actions,
  };
}
