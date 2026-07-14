/**
 * Punto de entrada: carga la data JSON, inicializa el store (engine + save + offline),
 * monta la UI y arranca el loop. El engine no importa esta data directo (DECISIÓN del
 * Agente 1, ver HANDOFF.md): acá se hace fetch() de los 6 archivos y se arman los
 * paquetes `data`/`itemsData` que se pasan a cada llamada de @dumpster/engine.
 */

import { createStore, SAVE_KEY } from './store.js';
import { startLoop } from './loop.js';
import { UIManager } from './ui/UIManager.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { setLanguage, resolveInitialLanguage, t } from './i18n/i18n.js';
import { initDataLocalization, applyDataLanguage } from './i18n/dataI18n.js';
import { extractLastSavedAt } from './saveTimestamp.js';

const DATA_FILES = {
  items: './data/items.json',
  containers: './data/containers.json',
  upgrades: './data/upgrades.json',
  automations: './data/automations.json',
  prestigeTree: './data/prestigeTree.json',
  achievements: './data/achievements.json',
  streak: './data/streak.json',
  traps: './data/traps.json',
  tools: './data/tools.json',
  collectionSets: './data/collectionSets.json',
  legendaries: './data/legendaries.json',
};

async function loadData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => {
      // AJUSTE: `fetch()` resuelve rutas relativas contra la URL del documento (`/apps/game/`),
      // no contra la de este módulo (`/apps/game/src/main.js`) — a diferencia de un `import`.
      // Sin `import.meta.url` acá, `./data/items.json` pedía `/apps/game/data/items.json` (404)
      // en vez de `/apps/game/src/data/items.json`. Detectado con el smoke test de Playwright.
      const url = new URL(path, import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(t('boot.loadFailed', { path, status: response.status }));
      return [key, await response.json()];
    })
  );
  return Object.fromEntries(entries);
}

function renderFatalError(app, message) {
  const status = app.querySelector('#boot-status');
  status.textContent = t('boot.fatalError', { message });
}

/**
 * Fuera de Electron, `undefined` hace que `createStore` lea `localStorage` como siempre (ver
 * `store.js`). Dentro de Electron, `apps/desktop/main.js` ya reconcilió userData vs. Steam
 * Cloud (PLAN.md §6.3) — acá solo falta comparar contra `localStorage` del propio renderer
 * (que puede ser más nueva si, por ejemplo, el archivo de Steam Cloud todavía no se sincronizó)
 * y quedarse con la más reciente por `lastSavedAt`, nunca pisando en silencio la más avanzada.
 * @returns {Promise<string | undefined>}
 */
async function resolveInitialSaveText() {
  const bridge = globalThis.dumpsterDesktop;
  if (!bridge) return undefined;
  const fileText = await bridge.loadGame();
  const localText = localStorage.getItem(SAVE_KEY);
  return extractLastSavedAt(localText) > extractLastSavedAt(fileText) ? localText : fileText;
}

async function boot() {
  const app = document.getElementById('app');
  app.dataset.state = 'loading';

  let loaded;
  try {
    loaded = await loadData();
  } catch (err) {
    app.dataset.state = 'error';
    renderFatalError(app, err.message);
    return;
  }

  const data = {
    upgrades: loaded.upgrades,
    automations: loaded.automations,
    prestigeTree: loaded.prestigeTree,
    streak: loaded.streak,
    traps: loaded.traps,
    tools: loaded.tools,
    collectionSets: loaded.collectionSets,
    legendaries: loaded.legendaries,
  };
  const itemsData = loaded.items;
  const allContainers = loaded.containers;
  const achievementsData = loaded.achievements;
  const initialSaveText = await resolveInitialSaveText();

  const store = createStore({ data, itemsData, allContainers, achievementsData, initialSaveText });
  // Partida nueva: si no había save, el idioma inicial sale del navegador (es-* → es, resto en).
  // Con save existente manda su state.language (ya validado por el engine contra el allow-list).
  if (!initialSaveText && !localStorage.getItem(SAVE_KEY)) {
    store.actions.setLanguage(resolveInitialLanguage(globalThis.navigator?.language));
  }
  // Orden duro (R-16.3): initDataLocalization va DESPUÉS de createStore (el store construyó
  // itemNameToId con los nombres todavía en español) y ANTES del primer applyDataLanguage.
  initDataLocalization(loaded);
  setLanguage(store.getState().language);
  applyDataLanguage(loaded, store.getState().language);
  document.documentElement.lang = store.getState().language;
  const ui = new UIManager(app, store, loaded);
  startLoop(store, ui);

  // Electron fuerza un autoguardado antes de cerrar de verdad (`before-quit` en
  // apps/desktop/main.js); en modo web `globalThis.dumpsterDesktop` no existe y esto no hace nada.
  globalThis.dumpsterDesktop?.onBeforeQuit(() => {
    store.persist();
    globalThis.dumpsterDesktop.confirmQuit();
  });

  // PLAN.md §11.8/§11.9: el juego arranca en la pantalla de inicio; "Jugar" entra al escarbado,
  // el engranaje entra directo a Configuración.
  const titleScreen = app.querySelector('#title-screen');
  const gameShell = app.querySelector('.game-shell');
  const enterGame = () => {
    titleScreen.hidden = true;
    gameShell.hidden = false;
  };
  TitleScreen.mount(titleScreen, {
    onPlay: enterGame,
    onSettings: () => {
      enterGame();
      ui.activeTab = 'ajustes';
      ui.render(store.getState());
    },
  });
  titleScreen.hidden = false;

  app.dataset.state = 'ready';
}

boot();
