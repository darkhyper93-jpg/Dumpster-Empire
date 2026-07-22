/**
 * Proceso principal de Electron: crea la ventana, carga `apps/game` (buildless, servido
 * offline vía un protocolo custom para que `fetch()`/import maps resuelvan igual que en
 * `npm run dev`), y fuerza el autoguardado antes de cerrar (PLAN.md §6.3).
 *
 * DECISIÓN: en vez de `loadFile()` directo (que serviría con origen `file://` y bloquea
 * `fetch()` entre archivos locales por CORS de origen opaco), registramos el esquema
 * `dumpster://` como privilegiado (`supportFetchAPI`, `corsEnabled`) y lo mapeamos a
 * `ROOT_DIR` — la misma raíz que `npx serve .` usa en modo web (DESARROLLO.md §4), así el
 * import map `../../packages/engine/src/index.js` de `apps/game/index.html` resuelve idéntico
 * en Electron que en el navegador, sin tocar `apps/game`.
 */
const { app, BrowserWindow, protocol, net, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { initSteam, setAchievement, shutdownSteam } = require('./steam.js');
const { readSaveFile, writeSaveFile } = require('./saveFile.js');
const { resolveSafePath } = require('./pathGuard.js');

const ROOT_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..', '..');

const GAME_URL = 'dumpster://app/apps/game/index.html';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'dumpster',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

let mainWindow = null;
let quitReady = false;
// AUDITORÍA (release): margen máximo que se espera la confirmación de guardado del renderer antes
// de forzar el cierre. Sin esto, si `boot()` falla ANTES de registrar `onBeforeQuit` (data
// corrupta) o el renderer queda colgado, la ventana nunca cerraba — había que matarla por el
// Administrador de tareas. El autoguardado cada 15s + el de visibilitychange acotan lo que se
// pierde en el peor caso.
const QUIT_FALLBACK_MS = 3000;

function registerGameProtocol() {
  protocol.handle('dumpster', (request) => {
    const url = new URL(request.url);
    const decodedPath = decodeURIComponent(url.pathname);
    // Nunca servir nada fuera de ROOT_DIR (path traversal vía `../` o hermano con nombre-prefijo).
    // El guard vive en pathGuard.js para poder cubrirlo con tests (ver apps/desktop/tests).
    const filePath = resolveSafePath(ROOT_DIR, decodedPath);
    if (!filePath) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 640,
    backgroundColor: '#191208',
    autoHideMenuBar: true,
    // Ícono de ventana/barra de tareas en dev (Win/Linux); el ejecutable empaquetado usa el
    // ícono que electron-builder genera desde build/icon.png (buildResources).
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  // AUDITORÍA (ronda 18, checklist de seguridad de Electron): el juego no abre ventanas ni
  // navega jamás — cualquier intento (window.open / cambio de location inyectados si algún día
  // se comprometiera el renderer) se bloquea de plano, en vez de abrir un browser con Node cerca.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (evt, url) => {
    if (url !== GAME_URL) evt.preventDefault();
  });
  mainWindow.loadURL(GAME_URL);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerGameProtocol();
  initSteam();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Fuerza al renderer a autoguardar (localStorage + archivo + Steam Cloud) antes de cerrar de
// verdad. `quitReady` evita el loop infinito: la segunda vez que se llega acá ya no se frena.
app.on('before-quit', (evt) => {
  if (quitReady || !mainWindow) return;
  evt.preventDefault();
  mainWindow.webContents.send('app:before-quit');
  // AUDITORÍA (release): red de seguridad. Si el renderer no confirma (`app:quit-ready`) dentro
  // del margen —boot fallido antes de registrar onBeforeQuit, o renderer colgado— se fuerza el
  // cierre igual, en vez de dejar la ventana imposible de cerrar. La segunda pasada por acá ve
  // `quitReady` en true y retorna sin volver a frenar (no hay loop).
  setTimeout(() => {
    if (quitReady) return;
    quitReady = true;
    shutdownSteam();
    app.quit();
  }, QUIT_FALLBACK_MS);
});

ipcMain.on('app:quit-ready', () => {
  quitReady = true;
  shutdownSteam();
  app.quit();
});

// AUDITORÍA (release): los handlers validan el TIPO del argumento que cruza el IPC. Hoy el único
// emisor es el propio preload (ventana única, sandbox:true, sin contenido remoto), pero validar el
// contrato es defensa en profundidad barata: `save:write` solo escribe strings, y un id de logro
// no-string nunca llega a steamworks.js.
ipcMain.handle('save:write', (_evt, text) => (typeof text === 'string' ? writeSaveFile(text) : false));
ipcMain.handle('save:read', () => readSaveFile());
ipcMain.handle('achievement:set', (_evt, achievementId) =>
  typeof achievementId === 'string' ? setAchievement(achievementId) : false
);
