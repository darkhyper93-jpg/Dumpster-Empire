/**
 * Serialización de guardado: validación de esquema + saveVersion + migración,
 * y export/import en base64. Nunca corrompe la partida en curso ante un input inválido.
 */

import { SAVE_VERSION, freshState } from './state.js';

/** Campos que deben existir y tener el tipo correcto para aceptar un save como válido. */
const REQUIRED_FIELDS = {
  saveVersion: 'number',
  money: 'number',
  totalMoneyEarned: 'number',
  upgradeLevels: 'object',
  ownedContainers: 'object',
  containerLevels: 'object',
  containerLevelProgress: 'object',
  automationOwned: 'object',
  prestigeKeys: 'number',
  prestigeCount: 'number',
  prestigeTreeLevels: 'object',
  achievementsUnlocked: 'object',
  itemsFoundCount: 'number',
  itemsFoundByCategory: 'object',
  itemsFoundByItem: 'object',
  categoryFragments: 'number',
  trapsHit: 'number',
  autoProcessedCount: 'number',
  autoQueue: 'object',
  autoProcessing: 'object',
  marketFluctuation: 'number',
  marketFluctuationAt: 'number',
  tutorialStep: 'number',
  soundOn: 'boolean',
  lastSavedAt: 'number',
};

/**
 * Migra un objeto de guardado de una versión anterior a la actual. v1 es la primera versión,
 * así que hoy es una función identidad; queda el mecanismo listo para futuros bumps de esquema.
 * @param {Object} raw
 * @returns {Object}
 */
function migrate(raw) {
  let migrated = raw;
  if (migrated.saveVersion < 1) {
    migrated = { ...freshState(), ...migrated, saveVersion: 1 };
  }
  // v1 -> v2 (Fase 6, PLAN.md §11.3): agrega containerLevels/containerLevelProgress. Saves viejos
  // arrancan todos los contenedores en nivel 1 (comportamiento correcto: nunca escarbaron a ese nivel).
  if (migrated.saveVersion < 2) {
    migrated = {
      ...migrated,
      containerLevels: migrated.containerLevels || {},
      containerLevelProgress: migrated.containerLevelProgress || {},
      saveVersion: 2,
    };
  }
  // v2 -> v3 (Fase 7, PLAN.md §11.5): agrega itemsFoundByItem. Saves viejos arrancan vacío
  // (comportamiento correcto: el INDEX no puede saber qué encontraron antes de este campo).
  if (migrated.saveVersion < 3) {
    migrated = {
      ...migrated,
      itemsFoundByItem: migrated.itemsFoundByItem || {},
      saveVersion: 3,
    };
  }
  return migrated;
}

/**
 * Valida que un objeto candidato a save tenga la forma esperada.
 * @param {unknown} candidate
 * @returns {{ valid: true, data: Object } | { valid: false, error: string }}
 */
export function validateSave(candidate) {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { valid: false, error: 'El guardado no es un objeto JSON válido.' };
  }
  if (typeof candidate.saveVersion !== 'number') {
    return { valid: false, error: 'Falta o es inválido el campo saveVersion.' };
  }
  if (candidate.saveVersion > SAVE_VERSION) {
    return { valid: false, error: `saveVersion ${candidate.saveVersion} es más nueva que la soportada (${SAVE_VERSION}).` };
  }
  const migrated = migrate(candidate);
  for (const [field, type] of Object.entries(REQUIRED_FIELDS)) {
    if (typeof migrated[field] !== type) {
      return { valid: false, error: `Campo inválido o faltante: ${field}` };
    }
  }
  return { valid: true, data: migrated };
}

/**
 * Serializa el estado a un string JSON, actualizando `lastSavedAt`.
 * @param {import('./state.js').GameState} state
 * @returns {string}
 */
export function serializeState(state) {
  return JSON.stringify({ ...state, lastSavedAt: Date.now() });
}

/**
 * Deserializa un string JSON de guardado. Si es inválido, devuelve un error explícito y
 * nunca modifica el estado en curso.
 * @param {string} raw
 * @returns {{ ok: true, state: import('./state.js').GameState } | { ok: false, error: string }}
 */
export function deserializeState(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'El guardado no es JSON válido.' };
  }
  const result = validateSave(parsed);
  if (!result.valid) return { ok: false, error: result.error };
  return { ok: true, state: result.data };
}

/**
 * Codifica el estado como texto base64 para exportar (backup manual del jugador).
 * @param {import('./state.js').GameState} state
 * @returns {string}
 */
export function exportSave(state) {
  const json = serializeState(state);
  return typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf-8').toString('base64');
}

/**
 * Decodifica un texto base64 exportado e intenta reconstruir el estado.
 * Rechaza el import (sin tocar la partida en curso) si el texto no decodifica a un save válido.
 * @param {string} encoded
 * @returns {{ ok: true, state: import('./state.js').GameState } | { ok: false, error: string }}
 */
export function importSave(encoded) {
  let json;
  try {
    json =
      typeof atob === 'function'
        ? decodeURIComponent(escape(atob(encoded)))
        : Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return { ok: false, error: 'El texto no es un guardado en base64 válido.' };
  }
  return deserializeState(json);
}
