/**
 * Guardado a archivo en `userData` (además del `localStorage` que ya usa `apps/game/src/store.js`)
 * para que Steam Cloud lo tome, y resolución de conflicto local-vs-nube por `lastSavedAt`
 * (PLAN.md §6.3: nunca pisar en silencio una partida más avanzada).
 */
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { readCloudSave, writeCloudSave } = require('./steam.js');
// AUDITORÍA (ronda 18): extraído a su módulo (testeable sin Electron) y endurecido con
// Number.isFinite — un `lastSavedAt: 1e999` (Infinity vía JSON.parse) ganaba la reconciliación.
const { extractTimestamp } = require('./saveTimestamp.js');
// AUDITORÍA (release): escritura atómica (tmp + rename), también su módulo testeable sin Electron.
const { writeFileAtomic } = require('./atomicWrite.js');

const SAVE_FILENAME = 'save.json';

function savePath() {
  return path.join(app.getPath('userData'), SAVE_FILENAME);
}

function readLocalFile() {
  try {
    return fs.readFileSync(savePath(), 'utf-8');
  } catch {
    return null;
  }
}

function writeLocalFile(text) {
  // AUDITORÍA (release): atómico (tmp + rename) — un corte a mitad de escritura ya no puede dejar
  // el save real truncado (antes era `writeFileSync` directo sobre `save.json`).
  return writeFileAtomic(savePath(), text);
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
