/**
 * Store del juego: única fuente de verdad del lado UI. Envuelve el estado del engine,
 * expone acciones que despachan al engine y notifica a los suscriptores tras cada cambio.
 * No reimplementa ninguna fórmula: todo cálculo de economía pasa por @dumpster/engine.
 */

import {
  freshState,
  DIG_SENSITIVITY_MIN,
  DIG_SENSITIVITY_MAX,
  SUPPORTED_LANGUAGES,
  getAreaMult,
  getDigRate,
  getEffectiveTrapProbability,
  serializeState,
  deserializeState,
  exportSave as engineExportSave,
  importSave as engineImportSave,
  isContainerUnlocked,
  buyContainer as engineBuyContainer,
  rollContainerResult,
  applyContainerResult,
  getContainerLevel,
  getLevelValueMult,
  buyUpgrade as engineBuyUpgrade,
  buyAutomation as engineBuyAutomation,
  automationTick,
  hasAutoDig,
  setAutoTarget as engineSetAutoTarget,
  buyPrestigeNode as engineBuyPrestigeNode,
  doPrestige as engineDoPrestige,
  checkAchievements,
  applyOfflineProgress,
} from '@dumpster/engine';

export const SAVE_KEY = 'dumpsterEmpireSave';
// AJUSTE: no calculamos offline por debajo de este piso para no mostrar un modal por
// recargas de página instantáneas (F5) donde no pasó tiempo real relevante.
const OFFLINE_MIN_SECONDS = 5;

/**
 * @typedef {Object} StoreContext
 * @property {{ upgrades: Array<Object>, automations: Array<Object>, prestigeTree: Array<Object> }} data
 * @property {{ rarities: Array<Object>, containers: Object<string, Array<Object>> }} itemsData
 * @property {Array<Object>} allContainers
 * @property {Array<Object>} achievementsData
 * @property {string | null} [initialSaveText] - guardado ya reconciliado con Steam Cloud, si
 *   `apps/game/src/main.js` corre dentro de Electron (ver `window.dumpsterDesktop`). En modo
 *   web se omite y se lee de `localStorage` como siempre.
 */

/**
 * @param {StoreContext} ctx
 */
export function createStore(ctx) {
  const { data, itemsData, allContainers, achievementsData } = ctx;
  // DECISIÓN (Agente 10): el store nunca importa `steam.js` ni sabe que Electron existe — solo
  // reenvía a `globalThis.dumpsterDesktop`, el puente que expone `apps/desktop/preload.js` vía
  // contextBridge. En modo web ese global no existe y todo se comporta como antes (localStorage).
  const desktopBridge = typeof globalThis !== 'undefined' ? globalThis.dumpsterDesktop : undefined;

  // Ids de contenedores que existen en la data actual. Se pasan a deserializeState/importSave para
  // limpiar referencias huérfanas en autoQueue/autoProcessing de saves viejos (post-rebalanceo) o
  // manipulados, antes de que lleguen a automationTick.
  const containerIds = new Set(allContainers.map((c) => c.id));

  // Ronda 16: mapa `containerId -> { nombreEspañol -> id }` construido desde la data TODAVÍA en
  // español (antes de cualquier applyDataLanguage) — lo usa la migración v6->v7 de itemsFoundByItem
  // para remapear claves de saves viejos sin perder la colección.
  const itemNameToId = {};
  for (const [containerId, pool] of Object.entries(itemsData.containers)) {
    itemNameToId[containerId] = Object.fromEntries(pool.map((it) => [it.name, it.id]));
  }

  let state = loadState();
  let pendingDig = null;
  let offlineSummary = null;
  let newAchievements = [];
  let newContainerUnlocks = [];
  /** Ids desbloqueados según el estado actual (baseline para detectar novedades). */
  const unlockedIdsNow = () =>
    new Set(allContainers.filter((c) => isContainerUnlocked(state, c, allContainers)).map((c) => c.id));
  let knownUnlocked = unlockedIdsNow();

  // PLAN.md §5.2 (ronda 12): cualquier acción que pueda desbloquear un contenedor (comprar el
  // anterior, comprar redDrones, prestigiar) pasa por acá; la diferencia se celebra en la UI.
  function detectContainerUnlocks() {
    const current = unlockedIdsNow();
    for (const id of current) {
      if (!knownUnlocked.has(id)) {
        newContainerUnlocks.push(allContainers.find((c) => c.id === id));
      }
    }
    knownUnlocked = current;
  }
  const listeners = new Set();

  function loadState() {
    const raw = ctx.initialSaveText !== undefined ? ctx.initialSaveText : localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const result = deserializeState(raw, containerIds, itemNameToId);
    return result.ok ? result.state : freshState();
  }

  function persist() {
    const text = serializeState(state);
    localStorage.setItem(SAVE_KEY, text);
    // Fire-and-forget: además de localStorage, Electron guarda a archivo (userData) para que
    // Steam Cloud lo tome (PLAN.md §6.3, tarea 4 del Agente 10). No bloquea ni puede corromper
    // el estado en curso si falla (el store nunca espera esta promesa).
    desktopBridge?.saveGame(text);
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
      // Espeja cada logro del engine a un logro de Steam (misma API Name, ver steam.js).
      for (const id of unlockedIds) desktopBridge?.setAchievement(id);
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
      detectContainerUnlocks(); // comprar el anterior puede desbloquear el siguiente.
      const digResult = rollContainerResult(state, container, false, itemsData, data);
      // DECISIÓN (ronda 5): el escarbado manual ya no usa getRevealThreshold — se completa al
      // destapar TODOS los objetos (ver digRevealModel.js), no por % de área. La fórmula sigue
      // en el engine (contrato de PLAN.md §4, usada por sus tests); la UI dejó de consumirla.
      pendingDig = {
        container,
        result: digResult,
        areaMult: getAreaMult(state, data),
        // AJUSTE (agentes/rework-escarbado-y-landing-prompt.md): el ritmo de escarbado (Resistencia
        // del contenedor vs. Fuerza del jugador, ya calculado por el engine para automatización/
        // offline) también viaja al canvas manual — la resistencia achica el pincel del gesto.
        digRate: getDigRate(state, container, data),
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
      const levelBefore = getContainerLevel(state, container.id);
      applyContainerResult(state, container, result, false, data);
      const levelAfter = getContainerLevel(state, container.id);
      if (state.tutorialStep === 0) state.tutorialStep = 1;
      pendingDig = null;
      runAchievements();
      detectContainerUnlocks();
      persist();
      notify();
      return {
        ok: true,
        // PLAN.md §11.3 (ronda 9): solo el escarbado manual notifica el level-up (la
        // automatización sube niveles en silencio para no spamear toasts).
        levelUp:
          levelAfter > levelBefore
            ? {
                containerName: container.name,
                level: levelAfter,
                bonusPct: Math.round((getLevelValueMult(state, container) - 1) * 100),
              }
            : null,
      };
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
        detectContainerUnlocks();
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
        detectContainerUnlocks();
        persist();
        notify();
      }
      return result;
    },

    exportSave() {
      return engineExportSave(state);
    },

    importSave(text) {
      const result = engineImportSave(text, containerIds, itemNameToId);
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
      // DECISIÓN (ronda 16): resetear la partida no cambia el idioma de la UI — freshState()
      // trae 'es' fijo, así que se copia el language del estado saliente.
      const language = state.language;
      state = freshState();
      state.language = language;
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

    /**
     * Ajusta el volumen maestro de SFX (PUNTOS_A_MEJORAR_2.md §5). Se clampa 0..1 y se persiste
     * en el save junto a `soundOn`. La capa de audio (fx/audio.js) es la que lo aplica al mixer.
     * @param {number} value - 0..1
     */
    setVolume(value) {
      state.volume = Math.max(0, Math.min(1, value));
      persist();
      notify();
    },

    /**
     * Cambia el idioma de la UI (ronda 16). Mismo allow-list que valida save.js: un valor
     * fuera de SUPPORTED_LANGUAGES se ignora en silencio (nunca entra al estado un idioma
     * que el save rechazaría al recargar). La aplicación visual (diccionario + overlay de
     * data) la hace el sync de UIManager.render al ver el state.language nuevo.
     * @param {string} lang - 'es' | 'en'
     */
    setLanguage(lang) {
      if (!SUPPORTED_LANGUAGES.includes(lang)) return;
      state.language = lang;
      persist();
      notify();
    },

    skipTutorial() {
      state.tutorialStep = 3;
      persist();
      notify();
    },

    /**
     * Fija (o limpia) el contenedor objetivo del robot de automatización (ronda 14).
     * @param {string|null} containerId - 'auto'/'' o null vuelven al modo Auto
     * @returns {{ ok: true } | { ok: false, error: string }}
     */
    setAutoTarget(containerId) {
      const normalized = containerId === 'auto' || containerId === '' ? null : containerId;
      const result = engineSetAutoTarget(state, normalized, allContainers);
      if (result.ok) {
        persist();
        notify();
      }
      return result;
    },

    /**
     * Sensibilidad del pincel de escarbado (mouse/touch), persistida en el save (ronda 14).
     * @param {number} value - DIG_SENSITIVITY_MIN..DIG_SENSITIVITY_MAX
     */
    setDigSensitivity(value) {
      state.digSensitivity = Math.min(DIG_SENSITIVITY_MAX, Math.max(DIG_SENSITIVITY_MIN, Number(value) || 1));
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
      detectContainerUnlocks();
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
    consumeNewContainerUnlocks() {
      const list = newContainerUnlocks;
      newContainerUnlocks = [];
      return list;
    },
    actions,
  };
}
