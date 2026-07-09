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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
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
});

ipcMain.on('app:quit-ready', () => {
  quitReady = true;
  shutdownSteam();
  app.quit();
});

ipcMain.handle('save:write', (_evt, text) => writeSaveFile(text));
ipcMain.handle('save:read', () => readSaveFile());
ipcMain.handle('achievement:set', (_evt, achievementId) => setAchievement(achievementId));
