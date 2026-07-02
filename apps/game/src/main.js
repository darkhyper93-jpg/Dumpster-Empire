/**
 * Punto de entrada: carga la data JSON, inicializa el store (engine + save + offline),
 * monta la UI y arranca el loop. El engine no importa esta data directo (DECISIÓN del
 * Agente 1, ver HANDOFF.md): acá se hace fetch() de los 6 archivos y se arman los
 * paquetes `data`/`itemsData` que se pasan a cada llamada de @dumpster/engine.
 */

import { createStore } from './store.js';
import { startLoop } from './loop.js';
import { UIManager } from './ui/UIManager.js';
import { TitleScreen } from './ui/TitleScreen.js';

const DATA_FILES = {
  items: './data/items.json',
  containers: './data/containers.json',
  upgrades: './data/upgrades.json',
  automations: './data/automations.json',
  prestigeTree: './data/prestigeTree.json',
  achievements: './data/achievements.json',
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
      if (!response.ok) throw new Error(`No se pudo cargar ${path} (HTTP ${response.status}).`);
      return [key, await response.json()];
    })
  );
  return Object.fromEntries(entries);
}

function renderFatalError(app, message) {
  const status = app.querySelector('#boot-status');
  status.textContent = `No se pudo iniciar Dumpster Empire: ${message}`;
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
  };
  const itemsData = loaded.items;
  const allContainers = loaded.containers;
  const achievementsData = loaded.achievements;

  const store = createStore({ data, itemsData, allContainers, achievementsData });
  const ui = new UIManager(app, store);
  startLoop(store, ui);

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
