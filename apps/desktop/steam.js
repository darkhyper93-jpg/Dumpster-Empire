/**
 * Puente con steamworks.js: init, logros (espejo de packages/engine/.../achievements.js) y
 * Steam Cloud. El juego (apps/game) nunca importa esto ni sabe que Steam existe — solo habla
 * con `preload.js`, que a su vez llama a las funciones de acá vía IPC (CLAUDE.md, DESARROLLO.md §4).
 *
 * DECISIÓN: appId de prueba 480 (Spacewar) hasta que el usuario tenga el appId real de Steam
 * (agentes/agente10-prompt.md, tarea 3). No requiere `steam_appid.txt` porque se lo pasamos
 * directo a `init()`; en un release real hay que reemplazar esta constante y sí sumar
 * `steam_appid.txt` con el appId real junto al ejecutable para testing sin el cliente de Steam
 * abierto primero (steamworks.js lo necesita para resolver el appId en dev).
 */
const STEAM_APP_ID = 480;

/** Nombre del archivo de guardado tanto en disco (userData) como en Steam Cloud. */
const CLOUD_SAVE_FILENAME = 'save.json';

let steamworks = null;
let client = null;

/**
 * Inicializa steamworks.js. Si el cliente de Steam no está corriendo (dev sin Steam abierto,
 * o build de prueba), falla en silencio: el juego debe seguir siendo jugable sin Steam, solo
 * sin logros/cloud (mismo espíritu que "no romper el modo web" del prompt del Agente 10).
 * @returns {boolean} true si Steam quedó inicializado.
 */
function initSteam() {
  try {
    // eslint-disable-next-line global-require
    steamworks = require('steamworks.js');
    client = steamworks.init(STEAM_APP_ID);
    return true;
  } catch {
    steamworks = null;
    client = null;
    return false;
  }
}

function isSteamReady() {
  return client !== null;
}

/**
 * Dispara un logro de Steam espejando el id del logro del engine (`achievements.json`).
 * Requiere que el usuario haya dado de alta, en el panel de Steamworks, una API Name de logro
 * idéntica al `id` del engine (a1..a27) — ver agentes/HANDOFF.md para la lista completa.
 * @param {string} achievementId
 * @returns {boolean} true si se pudo activar (o ya estaba activado).
 */
function setAchievement(achievementId) {
  if (!isSteamReady()) return false;
  try {
    client.achievement.activate(achievementId);
    return true;
  } catch {
    // API Name inexistente en el panel de Steamworks para este appId, o SDK no disponible.
    return false;
  }
}

/**
 * Lee el guardado desde Steam Cloud si está habilitado para el appId. Nunca tira: devuelve
 * `null` si Steam no está listo, la nube está deshabilitada o el archivo no existe.
 * @returns {string | null}
 */
function readCloudSave() {
  if (!isSteamReady()) return null;
  try {
    if (!client.cloud.isEnabledForApp() || !client.cloud.fileExists(CLOUD_SAVE_FILENAME)) {
      return null;
    }
    return client.cloud.readFile(CLOUD_SAVE_FILENAME);
  } catch {
    return null;
  }
}

/**
 * Escribe el guardado en Steam Cloud. No tira si la nube está deshabilitada o Steam no está listo.
 * @param {string} saveText
 * @returns {boolean}
 */
function writeCloudSave(saveText) {
  if (!isSteamReady()) return false;
  try {
    if (!client.cloud.isEnabledForApp()) return false;
    client.cloud.writeFile(CLOUD_SAVE_FILENAME, saveText);
    return true;
  } catch {
    return false;
  }
}

function shutdownSteam() {
  client = null;
  steamworks = null;
}

module.exports = {
  STEAM_APP_ID,
  CLOUD_SAVE_FILENAME,
  initSteam,
  isSteamReady,
  setAchievement,
  readCloudSave,
  writeCloudSave,
  shutdownSteam,
};
