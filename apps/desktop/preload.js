/**
 * Puente seguro (contextBridge): el renderer (apps/game, sin nodeIntegration) solo ve
 * `window.dumpsterDesktop`, nunca `require`/`ipcRenderer` directo. El juego no habla con
 * Steam ni con el sistema de archivos — solo con esta API mínima (CLAUDE.md, tarea 2).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dumpsterDesktop', {
  platform: 'electron',

  /**
   * Guarda el texto de guardado en `userData` (y Steam Cloud si está disponible). Fire-and-forget:
   * el juego ya persistió en `localStorage`, esto es la copia que toma Steam Cloud.
   * @param {string} saveText
   */
  saveGame: (saveText) => ipcRenderer.invoke('save:write', saveText),

  /**
   * Devuelve el guardado ya reconciliado entre `userData` y Steam Cloud (el más nuevo por
   * `lastSavedAt`), o `null` si no hay ninguno todavía.
   * @returns {Promise<string | null>}
   */
  loadGame: () => ipcRenderer.invoke('save:read'),

  /**
   * Dispara un logro de Steam espejando el id de `achievements.json` del engine.
   * @param {string} achievementId
   */
  setAchievement: (achievementId) => ipcRenderer.invoke('achievement:set', achievementId),

  /**
   * El proceso principal avisa acá antes de cerrar (`before-quit`) para forzar un autoguardado.
   * El callback debe llamar a `confirmQuit()` cuando termine de guardar.
   * @param {() => void} callback
   */
  onBeforeQuit: (callback) => ipcRenderer.on('app:before-quit', () => callback()),

  /** Avisa al proceso principal que ya se guardó y puede cerrar la ventana de verdad. */
  confirmQuit: () => ipcRenderer.send('app:quit-ready'),
});
