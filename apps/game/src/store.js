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
  getAreaRate,
  getDigRate,
  getEffectiveTrapProbability,
  serializeState,
  deserializeState,
  exportSave as engineExportSave,
  importSave as engineImportSave,
  isContainerUnlocked,
  buyContainer as engineBuyContainer,
  rollContainerResult,
  creditDugItem,
  springTrap,
  getContainerLevel,
  getLevelValueMult,
  buyUpgrade as engineBuyUpgrade,
  buyAutomation as engineBuyAutomation,
  automationTick,
  hasAutoDig,
  setRobotTarget as engineSetRobotTarget,
  setRobotFilters as engineSetRobotFilters,
  setMantenerStockPedidos as engineSetMantenerStockPedidos,
  buyPrestigeNode as engineBuyPrestigeNode,
  doPrestige as engineDoPrestige,
  doGalaxyMove as engineDoGalaxyMove,
  buyDeedsNode as engineBuyDeedsNode,
  resolveContainerById,
  ownedCategories as engineOwnedCategories,
  isProceduralTierUnlocked,
  nextProceduralTier,
  checkAchievements,
  applyOfflineProgress,
  buyTool as engineBuyTool,
  equipTool as engineEquipTool,
  registerContainerDig,
  getToolRadiusMult,
  getToolRhythmMult,
  buyStall as engineBuyStall,
  upgradeStall as engineUpgradeStall,
  setKeepThreshold as engineSetKeepThreshold,
  sellInventoryItem as engineSellInventoryItem,
  sellAllInventory as engineSellAllInventory,
  rotateStallOrders as engineRotateStallOrders,
  checkStory,
  rerollDailyMissionsIfNeeded,
  updateMissionsProgress,
  claimMission as engineClaimMission,
  tryTriggerContainerEvent,
  isEventExpired,
} from '@dumpster/engine';

export const SAVE_KEY = 'dumpsterEmpireSave';
// AJUSTE (auditoría de release): copia del ÚLTIMO guardado rechazado. Hasta acá, un save que no
// pasaba la validación se reemplazaba por una partida nueva en silencio y el primer `persist()`
// (autoguardado a los 15s) lo pisaba: la partida quedaba irrecuperable, sin un solo mensaje. Eso
// viola CLAUDE.md ("rechazar con un mensaje claro y NUNCA corromper la partida en curso") y era
// el amplificador que convertía cualquier bug de validación en pérdida total — como el de
// `params.categoria` del prototipo que esta misma auditoría encontró. Archivar es barato: una
// clave aparte que solo se escribe al rechazar, más el aviso que la UI muestra.
export const SAVE_BACKUP_KEY = 'dumpsterEmpireSave.rejected';
// AJUSTE: no calculamos offline por debajo de este piso para no mostrar un modal por
// recargas de página instantáneas (F5) donde no pasó tiempo real relevante.
const OFFLINE_MIN_SECONDS = 5;
// AJUSTE (auditoría de release): el guardado a ESCRITORIO (archivo userData + Steam Cloud, vía
// IPC) se debouncea. `revealDugEntry` persiste por CADA objeto destapado (§4.42): un escarbado de
// 8 objetos disparaba 8 escrituras de archivo + 8 subidas a Steam Cloud en pocos segundos. El
// `localStorage` NO se debouncea (es barato y es la red de seguridad: resolveInitialSaveText lo
// reconcilia contra el archivo al bootear, así que un flush de escritorio demorado nunca pierde
// progreso real). Se fuerza el flush al cerrar (onBeforeQuit) y en visibilitychange.
const DESKTOP_SAVE_DEBOUNCE_MS = 2000;

/**
 * @typedef {Object} StoreContext
 * @property {{ upgrades: Array<Object>, automations: Array<Object>, prestigeTree: Array<Object> }} data
 * @property {{ rarities: Array<Object>, containers: Object<string, Array<Object>> }} itemsData
 * @property {Array<Object>} allContainers
 * @property {Array<Object>} achievementsData
 * @property {Array<{id:string,npcId:string,cond:Object,textKey:string}>} [storyData] - historia
 *   liviana (ronda 23.C, data/story.json). Opcional: sin ella, checkStory nunca desbloquea nada.
 * @property {string | null} [initialSaveText] - guardado ya reconciliado con Steam Cloud, si
 *   `apps/game/src/main.js` corre dentro de Electron (ver `window.dumpsterDesktop`). En modo
 *   web se omite y se lee de `localStorage` como siempre.
 */

/**
 * @param {StoreContext} ctx
 */
export function createStore(ctx) {
  const { data, itemsData, allContainers, achievementsData, storyData = [] } = ctx;
  // DECISIÓN (Agente 10): el store nunca importa `steam.js` ni sabe que Electron existe — solo
  // reenvía a `globalThis.dumpsterDesktop`, el puente que expone `apps/desktop/preload.js` vía
  // contextBridge. En modo web ese global no existe y todo se comporta como antes (localStorage).
  const desktopBridge = typeof globalThis !== 'undefined' ? globalThis.dumpsterDesktop : undefined;

  // Ids de contenedores que existen en la data actual. Se pasan a deserializeState/importSave para
  // limpiar referencias huérfanas en autoQueue/autoProcessing de saves viejos (post-rebalanceo) o
  // manipulados, antes de que lleguen a automationTick.
  const containerIds = new Set(allContainers.map((c) => c.id));

  // Ronda 26.C (PLAN.md §4.37/§4.39): los tiers procedurales NUNCA están en `allContainers`
  // (contrato §3.5.6) — se reconstruyen en runtime a partir de `vertederoBigBang` + `n`.
  // AJUSTE (auditoría de release): la RESOLUCIÓN del id vive ahora en el engine
  // (`resolveContainerById`), que era la misma lógica escrita en tres lugares de la UI; acá queda
  // solo lo que el store agrega: si ese contenedor está desbloqueado para ESTE estado.
  /**
   * @param {string} containerId
   * @returns {{ container: Object, unlocked: boolean } | null} `null` si el id no existe (ni
   *   real ni procedural válido).
   */
  function resolveDigContainer(containerId) {
    const container = resolveContainerById(containerId, allContainers);
    if (!container) return null;
    const unlocked = container.isProcedural
      ? isProceduralTierUnlocked(state, container.proceduralN, data)
      : isContainerUnlocked(state, container, allContainers);
    return { container, unlocked };
  }

  // Ronda 22 (PLAN.md §4.26): ids de legendarios que existen en la data actual — un save.js
  // manipulado (o de una data renombrada) puede traer ids que ya no existen en legendaries.json;
  // se filtran acá al cargar (patrón sanitizeContainerRefs), nunca dentro del engine.
  const legendaryIds = new Set((data.legendaries?.items || []).map((l) => l.id));
  function sanitizeLegendariesFound() {
    state.legendariesFound = state.legendariesFound.filter((id) => legendaryIds.has(id));
  }

  // Ronda 25 (PLAN.md §4.31/§4.32): save.js solo valida que specialization/activeChallenge sean
  // string|null (agnóstico de datos de balance, mismo patrón que legendariesFound/containerIds);
  // acá se sanea contra la data REAL de specializations.json/challenges.json al cargar.
  const specializationIds = new Set((data.specializations || []).map((s) => s.id));
  const challengeIds = new Set((data.challenges || []).map((c) => c.id));
  function sanitizeSpecializationAndChallenge() {
    if (state.specialization !== null && !specializationIds.has(state.specialization)) {
      state.specialization = null;
    }
    if (state.activeChallenge !== null && !challengeIds.has(state.activeChallenge)) {
      state.activeChallenge = null;
    }
  }

  // Ronda 16: mapa `containerId -> { nombreEspañol -> id }` construido desde la data TODAVÍA en
  // español (antes de cualquier applyDataLanguage) — lo usa la migración v6->v7 de itemsFoundByItem
  // para remapear claves de saves viejos sin perder la colección.
  const itemNameToId = {};
  for (const [containerId, pool] of Object.entries(itemsData.containers)) {
    itemNameToId[containerId] = Object.fromEntries(pool.map((it) => [it.name, it.id]));
  }

  // Declarado ANTES de `loadState()`: es `let` (TDZ), y loadState lo asigna al rechazar un save.
  /** @type {string | null} motivo del rechazo del guardado al bootear; lo consume la UI una vez. */
  let loadError = null;
  let state = loadState();
  sanitizeLegendariesFound();
  sanitizeSpecializationAndChallenge();
  let pendingDig = null;
  let offlineSummary = null;
  let newAchievements = [];
  let newContainerUnlocks = [];
  // Ronda 23.C (roadmap §3.2): viñetas de historia recién vistas en esta revisión, mismo patrón
  // consume-queue que newAchievements/newContainerUnlocks — la UI las saca una vez por render.
  let newStoryVignettes = [];
  // PLAN.md §4.24 (ronda 20): la Bóveda a Contrarreloj expira sola si no se completa a tiempo —
  // se pierde SIN castigo (registerContainerDig ya cuenta el intento para el nivel). Cola tipo
  // consumeNewAchievements/consumeNewContainerUnlocks para que la UI dispare su propio toast.
  let timedDigExpirations = [];
  // §4.32 (ronda 24): el evento de contenedor (Dorado/En Llamas) es TRANSITORIO por diseño —
  // decisión del roadmap para eliminar todo exploit de reloj — así que vive SOLO acá, nunca en
  // `state` (mismo criterio que `pendingDig`). Se pierde al recargar la página; `state.lastEventAt`
  // (persistido) evita que eso regale un evento instantáneo al reabrir.
  let activeEvent = null;

  /**
   * @param {string} containerId
   * @returns {{ containerId: string, valueMult: number, trapProbBonus: number } | null}
   */
  function eventEffectFor(containerId) {
    return activeEvent && activeEvent.containerId === containerId ? activeEvent : null;
  }

  /** Ronda 24 (PLAN.md §4.30): reroll diario + recalcula progreso de todas las misiones activas. */
  function runMissions() {
    rerollDailyMissionsIfNeeded(state, allContainers, itemsData, data);
    updateMissionsProgress(state, allContainers);
  }
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

  // Ronda 23.C (roadmap §3.2): mismo motor de condiciones que los logros — checkStory marca
  // state.storySeen y devuelve los hitos recién vistos para que la UI dispare la viñeta.
  function runStory() {
    const seen = checkStory(state, storyData, { allContainers, allAutomations: data.automations, itemsData });
    if (seen.length) newStoryVignettes.push(...seen);
  }

  // Ronda 23.C (PLAN.md §4.28): categorías de los contenedores que el jugador POSEE (nunca las
  // que existen en la data pero todavía no compró) — rotateStallOrders nunca pide lo inalcanzable.
  // AJUSTE (auditoría de release): era una copia literal del `ownedCategories` de
  // systems/missions.js. Se consume el del engine: una sola implementación de la regla, y el
  // store deja de tener lógica de negocio propia (frontera engine↔UI de CLAUDE.md).
  const ownedCategories = () => engineOwnedCategories(state, allContainers);

  const listeners = new Set();

  function loadState() {
    const raw = ctx.initialSaveText !== undefined ? ctx.initialSaveText : localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const result = deserializeState(raw, containerIds, itemNameToId, data.prestigeTree);
    if (result.ok) return result.state;
    // AJUSTE (auditoría de release): el save rechazado se ARCHIVA antes de que el primer persist()
    // lo pise, y el motivo viaja a la UI (consumeLoadError) para que el jugador vea un aviso en
    // vez de encontrarse una partida nueva sin explicación. No se intenta "reparar" nada: la
    // partida en curso arranca limpia, que es el comportamiento seguro de siempre.
    try {
      localStorage.setItem(SAVE_BACKUP_KEY, raw);
    } catch {
      // Sin espacio para la copia: el aviso igual se muestra (es lo único accionable desde acá).
    }
    loadError = result.error;
    return freshState();
  }

  // Estado del debounce de escritorio (ver DESKTOP_SAVE_DEBOUNCE_MS). `pendingDesktopText` guarda
  // el ÚLTIMO texto a escribir; el timer lo publica una sola vez por ventana, colapsando ráfagas.
  let desktopSaveTimer = null;
  let pendingDesktopText = null;

  /** Publica ya el guardado de escritorio pendiente (si hay), cancelando el timer del debounce. */
  function flushDesktopSave() {
    if (desktopSaveTimer !== null) {
      clearTimeout(desktopSaveTimer);
      desktopSaveTimer = null;
    }
    if (pendingDesktopText !== null) {
      // Fire-and-forget: Electron guarda a archivo (userData) para que Steam Cloud lo tome
      // (PLAN.md §6.3). No bloquea ni puede corromper el estado en curso si falla.
      desktopBridge?.saveGame(pendingDesktopText);
      pendingDesktopText = null;
    }
  }

  function persist() {
    const text = serializeState(state);
    // §27.5.5 (ronda 27): localStorage.setItem puede lanzar (QuotaExceededError, modo privado
    // de Safari, storage deshabilitado). El juego degrada en silencio a "sin autoguardado web"
    // en vez de reventar la acción del jugador que disparó el persist — en Electron el guardado
    // real sigue siendo el archivo (Steam Cloud), que no pasa por localStorage.
    try {
      localStorage.setItem(SAVE_KEY, text);
    } catch {
      // Silencio deliberado: no hay acción del jugador que pueda arreglarlo desde acá, y
      // spamear un toast por tick de autoguardado sería peor que jugar sin persistencia web.
    }
    // AJUSTE (auditoría de release): la escritura de escritorio se debouncea (colapsa ráfagas de
    // revealDugEntry). En web `desktopBridge` no existe y esto es un no-op; el `localStorage` de
    // arriba ya persistió inmediato en ambos modos.
    if (desktopBridge) {
      pendingDesktopText = text;
      if (desktopSaveTimer === null) {
        desktopSaveTimer = setTimeout(flushDesktopSave, DESKTOP_SAVE_DEBOUNCE_MS);
      }
    }
  }

  function notify() {
    for (const fn of listeners) fn(state);
  }

  function runAchievements() {
    const unlockedIds = checkAchievements(state, achievementsData, {
      allContainers,
      allAutomations: data.automations,
      allTools: data.tools || [],
      itemsData,
      // Ronda 27: el evaluador fleetSizeAtLeast necesita la EngineData completa (getFleetSize).
      data,
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
    // §27.5.3 (ronda 27): el robot vendedor pudo vender inventario aunque la flota no haya
    // generado nada (jugador sin auto-escarbado) — ese dinero también merece su modal.
    if (result.ganancia > 0 || result.stallEarnings > 0) offlineSummary = result;
  }
  runAchievements();
  runStory();
  runMissions();

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
      // Ronda 26.C: `containerId` puede ser un tier procedural (`bigbangPlus<n>`, nunca en
      // `allContainers` — contrato §3.5.6); resolveDigContainer lo reconstruye en runtime.
      const resolved = resolveDigContainer(containerId);
      if (!resolved) return { ok: false, error: 'Contenedor desconocido.' };
      const { container, unlocked } = resolved;
      if (!unlocked) {
        return { ok: false, error: 'Contenedor bloqueado.' };
      }
      const result = engineBuyContainer(state, container, data);
      if (!result.ok) return result;
      detectContainerUnlocks(); // comprar el anterior puede desbloquear el siguiente.
      const digResult = rollContainerResult(
        state,
        container,
        false,
        itemsData,
        data,
        Math.random,
        eventEffectFor(container.id),
        new Date().getHours()
      );
      // DECISIÓN (ronda 5): el escarbado manual ya no usa getRevealThreshold — se completa al
      // destapar TODOS los objetos (ver digRevealModel.js), no por % de área. La fórmula sigue
      // en el engine (contrato de PLAN.md §4, usada por sus tests); la UI dejó de consumirla.
      pendingDig = {
        container,
        result: digResult,
        // AJUSTE (ronda 31, PLAN.md §4.42/§4.43): crédito por-ítem — ya NO se acredita nada acá.
        // Cada entry (item o trampa) se resuelve en `revealDugEntry` en el momento en que el
        // jugador la destapa; `revealedIndexes` es el guard de "ya acreditado" (§4.42: el
        // repintado por focus/visibilitychange del canvas NO debe re-acreditar, R31.8).
        revealedIndexes: new Set(),
        creditedMoney: 0,
        // PLAN.md §4.23 (ronda 20): la herramienta equipada SOLO modifica el pincel manual
        // (radio/ritmo) — nunca getLuck ni itemSaleValue (contrato del engine, ver economy.js).
        // AJUSTE (ronda 31, PLAN.md §4.42): el pincel manual usa areaRate (Área contra la
        // areaRecomendada del contenedor) en vez del getAreaMult crudo — hasta esta ronda el
        // Área no tenía ninguna mecánica real, solo un cartel en la Tienda.
        areaMult: getAreaRate(state, container, data) * getToolRadiusMult(state, data),
        // AJUSTE (agentes/rework-escarbado-y-landing-prompt.md): el ritmo de escarbado (Resistencia
        // del contenedor vs. Fuerza del jugador, ya calculado por el engine para automatización/
        // offline) también viaja al canvas manual — la resistencia achica el pincel del gesto.
        digRate: getDigRate(state, container, data) * getToolRhythmMult(state, data),
        // Ronda 24 (PLAN.md §4.33): el riesgo MOSTRADO usa la misma hora real que el roll de
        // arriba — mostrar un % de día mientras se tira con el bonus/castigo de noche sería un
        // dato mentiroso en pantalla.
        trapProb: getEffectiveTrapProbability(state, container, false, data, new Date().getHours()),
        // PLAN.md §4.24 (ronda 20): límite DURO de tiempo solo para contenedores `mode: "timed"`
        // (Bóveda a Contrarreloj) — `container.digTime` en segundos, decrementado por delta real
        // del loop (tickDigTimer), nunca por setTimeout (R20.3).
        timeRemaining: container.mode === 'timed' ? container.digTime : null,
      };
      if (state.tutorialStep === 2 && container.costoInicial > 0) state.tutorialStep = 3;
      persist();
      notify();
      return { ok: true };
    },

    /**
     * §4.42 (ronda 31) — acredita UNA entry (item o trampa) en el momento en que el jugador la
     * destapa. El canvas (DigCanvas.onObjectRevealed) despacha esto por cada objeto revelado;
     * NUNCA calcula economía, solo avisa el índice. Guard de índice ya acreditado (R31.8): el
     * repintado de DigCanvas por `focus`/`visibilitychange` NUNCA vuelve a llamar acá porque no
     * dispara `onObjectRevealed` — pero el guard queda igual, a prueba de un doble-click del
     * dueño (defensa en profundidad, mismo criterio que `startManualDig` con `pendingDig`).
     * @param {number} index - índice de la entry en `pendingDig.result.items`.
     * @returns {{ ok: true, item?: Object, moneyDelta?: number, trapSprung?: boolean } | { ok: false, error: string }}
     */
    revealDugEntry(index) {
      if (!pendingDig) return { ok: false, error: 'No hay escarbado en curso.' };
      if (pendingDig.revealedIndexes.has(index)) return { ok: false, error: 'Entry ya acreditada.' };
      const entry = pendingDig.result.items[index];
      if (!entry) return { ok: false, error: 'Entry desconocida.' };
      pendingDig.revealedIndexes.add(index);
      const { container, result } = pendingDig;

      if (entry.isTrap) {
        // §4.42: saltar la trampa CORTA el escarbado — los items aún no destapados se pierden
        // (ya no están en pendingDig al ponerlo en null), los ya destapados quedan acreditados
        // (creditDugItem ya los aplicó a state.money/inventory arriba, en llamadas previas).
        const { trapPenalty } = springTrap(state, container, result, data, false);
        registerContainerDig(state, container);
        pendingDig = null;
        runAchievements();
        runMissions();
        detectContainerUnlocks();
        persist();
        notify();
        return { ok: true, trapSprung: true, trapPenalty };
      }

      const { moneyDelta } = creditDugItem(state, container, entry, false, data);
      pendingDig.creditedMoney += moneyDelta;
      persist();
      notify();
      return { ok: true, item: entry, moneyDelta };
    },

    /**
     * Se alcanza SOLO si el escarbado se completó SIN destapar la trampa (todas las entries ya
     * fueron acreditadas una por una vía `revealDugEntry`). Ya NO acredita items — solo cierra
     * el ciclo: nivel del contenedor, +1 de racha (§4.20), logros/misiones y el toast de level-up.
     */
    finishManualDig() {
      if (!pendingDig) return { ok: false, error: 'No hay escarbado en curso.' };
      const { container } = pendingDig;
      const levelBefore = getContainerLevel(state, container.id);
      registerContainerDig(state, container);
      const levelAfter = getContainerLevel(state, container.id);
      // PLAN.md §4.20 (ronda 19): +1 de racha por escarbado manual exitoso (sin trampa).
      state.digStreak++;
      state.bestDigStreak = Math.max(state.bestDigStreak, state.digStreak);
      if (state.tutorialStep === 0) state.tutorialStep = 1;
      pendingDig = null;
      runAchievements();
      runMissions();
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

    /**
     * §4.42 (ronda 31, R31.9): abandonar deja de ser gratis-sin-consecuencia. Los items ya
     * destapados (vía revealDugEntry) quedan acreditados — DECISIÓN: es una salida SIN
     * penalización que conserva el loot parcial (lo que pidió el usuario). No dispara la trampa,
     * no hay castigo, y la racha queda como está (ni +1 ni 0: el dig no se completó limpio, pero
     * tampoco cortó por trampa). El contenedor SÍ registra el intento para su nivel (ya se
     * compró y se consumió) — antes de esta ronda no lo hacía.
     */
    abandonManualDig() {
      if (!pendingDig) return { ok: false, error: 'No hay escarbado en curso.' };
      registerContainerDig(state, pendingDig.container);
      pendingDig = null;
      persist();
      notify();
      return { ok: true };
    },

    /**
     * Cuenta atrás del límite DURO de la Bóveda a Contrarreloj (PLAN.md §4.24, mode: "timed"):
     * por delta real del loop (R20.3, nunca `setTimeout`). Al llegar a 0 el contenedor se pierde
     * SIN castigo de dinero — `registerContainerDig` ya cuenta el intento para el nivel, igual
     * que cualquier escarbado resuelto.
     * @param {number} dtSeconds
     */
    tickDigTimer(dtSeconds) {
      if (!pendingDig || pendingDig.timeRemaining === null) return;
      pendingDig.timeRemaining = Math.max(0, pendingDig.timeRemaining - dtSeconds);
      if (pendingDig.timeRemaining <= 0) {
        registerContainerDig(state, pendingDig.container);
        timedDigExpirations.push({ containerName: pendingDig.container.name });
        pendingDig = null;
        persist();
      }
      notify();
    },

    /**
     * Compra una herramienta de escarbado (PLAN.md §4.23, ronda 20). No la equipa.
     * @param {string} toolId
     */
    buyTool(toolId) {
      const tool = (data.tools || []).find((t) => t.id === toolId);
      if (!tool) return { ok: false, error: 'Herramienta desconocida.' };
      const result = engineBuyTool(state, tool);
      if (result.ok) {
        runAchievements();
        persist();
        notify();
      }
      return result;
    },

    /**
     * Equipa una herramienta ya poseída (PLAN.md §4.23, ronda 20). Solo modifica el pincel del
     * escarbado manual (radio/ritmo) — nunca economía.
     * @param {string} toolId
     */
    equipTool(toolId) {
      const result = engineEquipTool(state, toolId);
      if (result.ok) {
        persist();
        notify();
      }
      return result;
    },

    /** Compra el Puesto de Chatarra (PLAN.md §2.9/§4.27, ronda 23.C). */
    buyStall() {
      const result = engineBuyStall(state, data);
      if (result.ok) {
        runAchievements();
        runStory();
        persist();
        notify();
      }
      return result;
    },

    /** Sube un nivel el Puesto de Chatarra (PLAN.md §4.27, ronda 23.C). */
    upgradeStall() {
      const result = engineUpgradeStall(state, data);
      if (result.ok) {
        runAchievements();
        runStory();
        persist();
        notify();
      }
      return result;
    },

    /**
     * Fija el umbral de captura del Puesto ("guardá lo que valga $X o más", PLAN.md §2.9).
     * @param {number} threshold
     */
    setKeepThreshold(threshold) {
      const result = engineSetKeepThreshold(state, threshold);
      if (result.ok) {
        persist();
        notify();
      }
      return result;
    },

    /**
     * Venta manual de un ítem del inventario del Puesto (PLAN.md §4.27/§4.28, ronda 23.C):
     * refresca la fluctuación, paga el mult de pedido si corresponde, y repone pedidos a 2
     * activos (PLAN.md §4.28: "el llamador invoca rotateStallOrders tras cada venta").
     * @param {number} inventoryIndex
     */
    sellInventoryItem(inventoryIndex) {
      const result = engineSellInventoryItem(state, inventoryIndex, data);
      if (result.ok) {
        engineRotateStallOrders(state, data, ownedCategories());
        runAchievements();
        runStory();
        runMissions();
        persist();
        notify();
      }
      return result;
    },

    /**
     * Venta de TODO el inventario del Puesto en un clic (ronda "features", 2026-07-22). Corre
     * exactamente el mismo cierre que la venta individual (rotar pedidos, logros, historia,
     * misiones, persistir, notificar): es un lote de la misma venta, no una economía aparte.
     * @returns {{ ok: true, count: number, moneyDelta: number } | { ok: false, error: string }}
     */
    sellAllInventory() {
      const result = engineSellAllInventory(state, data);
      if (result.ok) {
        engineRotateStallOrders(state, data, ownedCategories());
        runAchievements();
        runStory();
        runMissions();
        persist();
        notify();
      }
      return result;
    },

    /**
     * Reclama la recompensa de una misión diaria ya cumplida (PLAN.md §4.30/§4.31, ronda 24).
     * @param {string} missionId
     */
    claimMission(missionId) {
      const result = engineClaimMission(state, missionId);
      if (result.ok) {
        runAchievements();
        persist();
        notify();
      }
      return result;
    },

    buyAutomation(automationId) {
      const automation = data.automations.find((a) => a.id === automationId);
      if (!automation) return { ok: false, error: 'Automatización desconocida.' };
      const result = engineBuyAutomation(state, automation, data);
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

    /**
     * Ejecuta el prestigio (PLAN.md §4.31/§4.32, ronda 25): `choice` es la especialización o
     * desafío elegido para la PRÓXIMA run (`null`/omitido = "Sin especialización").
     * @param {{ type: 'specialization'|'challenge', id: string } | null} [choice]
     */
    doPrestige(choice = null) {
      const result = engineDoPrestige(state, data, choice);
      if (result.ok) {
        pendingDig = null;
        runAchievements();
        detectContainerUnlocks();
        persist();
        notify();
      }
      return result;
    },

    /** Ejecuta la Mudanza de Galaxia (PLAN.md §2.10/§4.34, ronda 26.A/26.C). */
    doGalaxyMove() {
      const result = engineDoGalaxyMove(state, data);
      if (result.ok) {
        pendingDig = null;
        runAchievements();
        runStory();
        detectContainerUnlocks();
        persist();
        notify();
      }
      return result;
    },

    /** Compra un nivel de un nodo del árbol de Escrituras (PLAN.md §4.36, ronda 26.A/26.C). */
    buyDeedsNode(nodeId) {
      const node = (data.deedsTree || []).find((n) => n.id === nodeId);
      if (!node) return { ok: false, error: 'Nodo desconocido.' };
      const result = engineBuyDeedsNode(state, node);
      if (result.ok) {
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
      const result = engineImportSave(text, containerIds, itemNameToId, data.prestigeTree);
      if (result.ok) {
        state = result.state;
        sanitizeLegendariesFound();
        sanitizeSpecializationAndChallenge();
        pendingDig = null;
        runAchievements();
        runStory();
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

    /** Toggle de vibración táctil (trampa/hallazgo máximo), ronda 19 — mismo patrón que toggleSound. */
    toggleVibration() {
      state.vibrationOn = !state.vibrationOn;
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
     * Fija (o limpia) el contenedor objetivo de UN robot de la flota (ronda 27, PLAN.md §4.38).
     * @param {number} robotIndex - índice dentro de la flota real (0..getFleetSize-1)
     * @param {string|null} containerId - 'auto'/'' o null vuelven al modo Auto
     * @returns {{ ok: true } | { ok: false, error: string }}
     */
    setRobotTarget(robotIndex, containerId) {
      const normalized = containerId === 'auto' || containerId === '' ? null : containerId;
      const result = engineSetRobotTarget(state, robotIndex, normalized, allContainers, data);
      if (result.ok) {
        persist();
        notify();
      }
      return result;
    },

    /**
     * Fija los filtros de UN robot de la flota (ronda 27, PLAN.md §4.39). El engine valida el
     * umbral y las categorías contra la data real (la UI solo despacha el input crudo).
     * @param {number} robotIndex
     * @param {{ descartarBajoValor: number, reservarCategorias: string[] }} filters
     * @returns {{ ok: true } | { ok: false, error: string }}
     */
    setRobotFilters(robotIndex, filters) {
      const validCategories = itemsData.rarities.map((r) => r.id);
      const result = engineSetRobotFilters(state, robotIndex, filters, validCategories, data);
      if (result.ok) {
        runAchievements();
        persist();
        notify();
      }
      return result;
    },

    /**
     * Enciende/apaga la reserva de stock para pedidos del robot vendedor (ronda 27, §4.39).
     * @param {boolean} value
     * @returns {{ ok: true } | { ok: false, error: string }}
     */
    setMantenerStockPedidos(value) {
      const result = engineSetMantenerStockPedidos(state, value);
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
     * AJUSTE (ronda 23.C): antes retornaba temprano sin llamar al engine si `!hasAutoDig`, lo que
     * dejaba mudo al robot vendedor del Puesto para un jugador sin auto-escarbado (el propio
     * `automationTick` del engine ya llama a `stallVendorTick` ANTES de su early-return interno,
     * PLAN.md §4.29 — pero acá ni se lo invocaba). Ahora `automationTick` corre siempre; el resto
     * del tick (logros/historia/notify) solo si hay algo activo que automatizar (auto-escarbado o
     * Puesto comprado), para no re-renderizar cada segundo sin motivo.
     * @param {number} dtSeconds
     */
    tickAutomation(dtSeconds) {
      const now = Date.now();
      const hour = new Date(now).getHours();
      // §4.32 (ronda 24): el evento expira solo (transitorio, nunca en state); si no hay uno
      // activo, se intenta disparar un nuevo (gateado por cooldown/data.events adentro).
      if (isEventExpired(activeEvent, now)) activeEvent = null;
      if (!activeEvent && data.events) {
        activeEvent = tryTriggerContainerEvent(state, allContainers, data, dtSeconds, now, Math.random);
      }
      automationTick(state, dtSeconds, allContainers, itemsData, data, Math.random, activeEvent, hour);
      const stallActive = Boolean(data.stall) && state.stallLevel >= 1;
      if (stallActive) engineRotateStallOrders(state, data, ownedCategories());
      runMissions();
      // Ronda 24: con un evento activo se notifica SIEMPRE (countdown/glow en vivo, §4.32),
      // incluso sin automatización ni puesto — mismo criterio que la excepción de arriba, para
      // no re-renderizar cada segundo sin motivo cuando no hay nada visible que cambie por sí solo.
      if (!hasAutoDig(state, data) && !stallActive && !activeEvent) return;
      runAchievements();
      runStory();
      detectContainerUnlocks();
      notify();
    },
  };

  return {
    ctx,
    getState: () => state,
    getPendingDig: () => pendingDig,
    /** @returns {{ containerId: string, kind: 'golden'|'fire', valueMult: number, trapProbBonus: number, expiresAt: number } | null} */
    getActiveEvent: () => activeEvent,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    persist,
    // AJUSTE (auditoría de release): fuerza la escritura de escritorio pendiente del debounce.
    // Lo llaman el cierre (onBeforeQuit) y visibilitychange, para que Steam Cloud/archivo queden
    // frescos al salir aunque el timer del debounce no haya disparado todavía.
    flushDesktopSave,
    /**
     * AJUSTE (auditoría de release): motivo por el que el guardado se rechazó al bootear, una
     * sola vez (mismo patrón consume-queue que el resto). `null` en el caso normal. La copia
     * intacta del save rechazado queda en `SAVE_BACKUP_KEY`.
     * @returns {string | null}
     */
    consumeLoadError() {
      const error = loadError;
      loadError = null;
      return error;
    },
    /** ¿Hay una copia archivada de un guardado rechazado? (lo muestra Ajustes). */
    hasRejectedSaveBackup() {
      try {
        return localStorage.getItem(SAVE_BACKUP_KEY) !== null;
      } catch {
        return false;
      }
    },
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
    consumeNewStoryVignettes() {
      const list = newStoryVignettes;
      newStoryVignettes = [];
      return list;
    },
    consumeTimedDigExpirations() {
      const list = timedDigExpirations;
      timedDigExpirations = [];
      return list;
    },
    actions,
  };
}
