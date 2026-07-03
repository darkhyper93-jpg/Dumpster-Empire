/**
 * Guardado a archivo en `userData` (además del `localStorage` que ya usa `apps/game/src/store.js`)
 * para que Steam Cloud lo tome, y resolución de conflicto local-vs-nube por `lastSavedAt`
 * (PLAN.md §6.3: nunca pisar en silencio una partida más avanzada).
 */
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { readCloudSave, writeCloudSave } = require('./steam.js');

const SAVE_FILENAME = 'save.json';

function savePath() {
  return path.join(app.getPath('userData'), SAVE_FILENAME);
}

/**
 * @param {string} text
 * @returns {number} `lastSavedAt` embebido en el guardado, o -1 si no parsea/no lo tiene.
 */
function extractTimestamp(text) {
  if (typeof text !== 'string' || text.length === 0) return -1;
  try {
    const parsed = JSON.parse(text);
    return typeof parsed.lastSavedAt === 'number' ? parsed.lastSavedAt : -1;
  } catch {
    return -1;
  }
}

function readLocalFile() {
  try {
    return fs.readFileSync(savePath(), 'utf-8');
  } catch {
    return null;
  }
}

function writeLocalFile(text) {
  try {
    fs.mkdirSync(path.dirname(savePath()), { recursive: true });
    fs.writeFileSync(savePath(), text, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Escribe el guardado tanto en `userData` como en Steam Cloud (si está disponible).
 * @param {string} text
 * @returns {boolean} true si al menos el archivo local se pudo escribir.
 */
function writeSaveFile(text) {
  const localOk = writeLocalFile(text);
  writeCloudSave(text);
  return localOk;
}

/**
 * Devuelve el guardado más reciente entre el archivo local y Steam Cloud, comparando
 * `lastSavedAt`. Si gana uno de los dos, sincroniza el otro para que ambos queden iguales.
 * @returns {string | null}
 */
function readSaveFile() {
  const local = readLocalFile();
  const cloud = readCloudSave();
  const localTs = extractTimestamp(local);
  const cloudTs = extractTimestamp(cloud);

  if (localTs < 0 && cloudTs < 0) return null;
  if (cloudTs > localTs) {
    writeLocalFile(cloud);
    return cloud;
  }
  if (localTs > 0) {
    writeCloudSave(local);
    return local;
  }
  return cloud;
}

module.exports = { readSaveFile, writeSaveFile, savePath };
