/**
 * Serialización de guardado: validación de esquema + saveVersion + migración,
 * y export/import en base64. Nunca corrompe la partida en curso ante un input inválido.
 */

import { SAVE_VERSION, DIG_SENSITIVITY_MIN, DIG_SENSITIVITY_MAX, freshState } from './state.js';

/** Idiomas soportados por el módulo i18n (apps/game/src/i18n). Fuente de verdad del allow-list. */
export const SUPPORTED_LANGUAGES = ['es', 'en'];

/** Mapas planos `id -> number` (freshState() los arranca en `{}` o con valores numéricos). */
const NUMERIC_MAP_FIELDS = [
  'upgradeLevels',
  'ownedContainers',
  'containerLevels',
  'containerLevelProgress',
  'prestigeTreeLevels',
  'itemsFoundByCategory',
];

/** Mapa plano `id -> boolean` (compras de un solo uso). */
const BOOLEAN_MAP_FIELDS = ['automationOwned'];

/** Arrays cuyos elementos deben ser strings (ids, no texto libre). */
const STRING_ARRAY_FIELDS = ['achievementsUnlocked', 'autoQueue'];

/**
 * Valida que todo valor propio de `obj` sea un número finito.
 * @param {unknown} obj
 * @returns {boolean}
 */
function isFiniteNumberMap(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  return Object.values(obj).every((v) => Number.isFinite(v));
}

/**
 * Valida que todo valor propio de `obj` sea un booleano.
 * @param {unknown} obj
 * @returns {boolean}
 */
function isBooleanMap(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  return Object.values(obj).every((v) => typeof v === 'boolean');
}

/**
 * ¿Es un objeto plano (no null, no array)? La forma mínima que exige todo mapa del save.
 * @param {unknown} v
 * @returns {boolean}
 */
function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Valida `itemsFoundByItem`: mapa `containerId -> { itemName -> number }`.
 * @param {unknown} obj
 * @returns {boolean}
 */
function isValidItemsFoundByItem(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  return Object.values(obj).every((byItem) => isFiniteNumberMap(byItem));
}

/**
 * Valida `autoProcessing`: array de slots `{ containerId: string, totalTime: number, remaining: number }`.
 * @param {unknown} arr
 * @returns {boolean}
 */
function isValidAutoProcessing(arr) {
  if (!Array.isArray(arr)) return false;
  // AJUSTE (auditoría post-ronda 14): además de finitud, coherencia del slot. automationTick
  // solo persiste slots con 0 < remaining <= totalTime; un slot manipulado con totalTime 0 (o
  // remaining > totalTime) producía "Contenedor: NaN%" / porcentajes negativos en AutomationView.
  return arr.every(
    (slot) =>
      typeof slot === 'object' &&
      slot !== null &&
      typeof slot.containerId === 'string' &&
      Number.isFinite(slot.totalTime) &&
      Number.isFinite(slot.remaining) &&
      slot.totalTime > 0 &&
      slot.remaining >= 0 &&
      slot.remaining <= slot.totalTime
  );
}

/**
 * Valida el contenido profundo de los campos de tipo `object`/array que `REQUIRED_FIELDS`
 * solo chequea a nivel de tipo. Capa primaria de defensa contra saves manipulados (XSS
 * almacenado vía `state → innerHTML` en la UI, ver agentes/fix-xss-save-prompt.md).
 * @param {Object} migrated
 * @returns {string | null} mensaje de error, o `null` si todo es válido.
 */
function validateDeepContent(migrated) {
  for (const field of NUMERIC_MAP_FIELDS) {
    if (!isFiniteNumberMap(migrated[field])) {
      return `Contenido inválido en ${field}: todos los valores deben ser números.`;
    }
  }
  for (const field of BOOLEAN_MAP_FIELDS) {
    if (!isBooleanMap(migrated[field])) {
      return `Contenido inválido en ${field}: todos los valores deben ser booleanos.`;
    }
  }
  for (const field of STRING_ARRAY_FIELDS) {
    if (!Array.isArray(migrated[field]) || !migrated[field].every((v) => typeof v === 'string')) {
      return `Contenido inválido en ${field}: debe ser un array de strings.`;
    }
  }
  if (!isValidItemsFoundByItem(migrated.itemsFoundByItem)) {
    return 'Contenido inválido en itemsFoundByItem: debe ser containerId -> { itemName -> número }.';
  }
  if (!isValidAutoProcessing(migrated.autoProcessing)) {
    return 'Contenido inválido en autoProcessing: debe ser un array de slots { containerId, totalTime, remaining }.';
  }
  if (migrated.autoTargetContainerId !== null && typeof migrated.autoTargetContainerId !== 'string') {
    return 'Contenido inválido en autoTargetContainerId: debe ser null o un string.';
  }
  if (
    !Number.isFinite(migrated.digSensitivity) ||
    migrated.digSensitivity < DIG_SENSITIVITY_MIN ||
    migrated.digSensitivity > DIG_SENSITIVITY_MAX
  ) {
    return `Contenido inválido en digSensitivity: debe ser un número entre ${DIG_SENSITIVITY_MIN} y ${DIG_SENSITIVITY_MAX}.`;
  }
  if (!SUPPORTED_LANGUAGES.includes(migrated.language)) {
    return `Contenido inválido en language: debe ser uno de ${SUPPORTED_LANGUAGES.join(', ')}.`;
  }
  // AJUSTE (ronda 19): digStreak/bestDigStreak son enteros >= 0 (la finitud ya la cubre el loop
  // de REQUIRED_FIELDS); acá se cubre el rango y que no sean fraccionarios (save manipulado).
  if (!Number.isInteger(migrated.digStreak) || migrated.digStreak < 0) {
    return 'Contenido inválido en digStreak: debe ser un entero >= 0.';
  }
  if (!Number.isInteger(migrated.bestDigStreak) || migrated.bestDigStreak < 0) {
    return 'Contenido inválido en bestDigStreak: debe ser un entero >= 0.';
  }
  // El chequeo de finitud de `volume` (y de todo campo numérico top-level) vive ahora en el
  // loop de REQUIRED_FIELDS de validateSave — ver AJUSTE de la auditoría post-ronda 14.
  return null;
}

/**
 * Descarta de `autoQueue`/`autoProcessing` las referencias a contenedores que ya no existen
 * (save de una versión anterior tras un rebalanceo, o import manipulado). El engine ya no crashea
 * ante un containerId huérfano (systems/automation.js), pero una entrada muerta no debe persistir
 * ni seguir ocupando un slot/lugar en la cola. Muta `migrated` in place.
 * @param {Object} migrated - save ya validado a nivel de tipo/contenido
 * @param {Set<string>} validIds - ids de contenedores que existen en la data actual
 */
function sanitizeContainerRefs(migrated, validIds) {
  migrated.autoQueue = migrated.autoQueue.filter((id) => validIds.has(id));
  migrated.autoProcessing = migrated.autoProcessing.filter((slot) => validIds.has(slot.containerId));
  if (migrated.autoTargetContainerId !== null && !validIds.has(migrated.autoTargetContainerId)) {
    migrated.autoTargetContainerId = null;
  }
}

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
  trapsDiscarded: 'number',
  autoProcessedCount: 'number',
  autoQueue: 'object',
  autoProcessing: 'object',
  marketFluctuation: 'number',
  marketFluctuationAt: 'number',
  tutorialStep: 'number',
  soundOn: 'boolean',
  volume: 'number',
  lastSavedAt: 'number',
  digSensitivity: 'number',
  language: 'string',
  digStreak: 'number',
  bestDigStreak: 'number',
  vibrationOn: 'boolean',
};
// autoTargetContainerId NO va en REQUIRED_FIELDS: es unión `string|null` y `typeof null === 'object'`
// rompería el chequeo de tipo; su validación de contenido vive en validateDeepContent().

/**
 * Migra un objeto de guardado de una versión anterior a la actual. v1 es la primera versión,
 * así que hoy es una función identidad; queda el mecanismo listo para futuros bumps de esquema.
 * @param {Object} raw
 * @param {Object<string, Object<string, string>>} [itemNameToId] - mapa `containerId -> { nombreEspañol -> id }`
 *   usado por la migración v6->v7 para remapear las claves de `itemsFoundByItem`. Si se omite,
 *   las claves quedan tal cual (compat: saves ya en v7 no lo necesitan).
 * @returns {Object}
 */
function migrate(raw, itemNameToId) {
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
  // v3 -> v4 (PUNTOS_A_MEJORAR_2.md §5): agrega `volume` (0..1). Saves viejos arrancan con volumen
  // 1 (comportamiento actual: sonido a todo volumen si estaba encendido).
  if (migrated.saveVersion < 4) {
    migrated = {
      ...migrated,
      volume: typeof migrated.volume === 'number' ? migrated.volume : 1,
      saveVersion: 4,
    };
  }
  // v4 -> v5 (ronda 14): agrega autoTargetContainerId (selector del robot), digSensitivity
  // (slider de sensibilidad) y language (base de i18n). Saves viejos arrancan en modo Auto,
  // sensibilidad neutra y español (comportamiento actual sin cambios visibles).
  if (migrated.saveVersion < 5) {
    migrated = {
      ...migrated,
      autoTargetContainerId: null,
      digSensitivity: 1,
      language: 'es',
      saveVersion: 5,
    };
  }
  // v5 -> v6 (ronda 15): agrega trapsDiscarded (contador de contenedores con trampa que el
  // robot descartó vía el nodo "Escáner de Trampas"). Saves viejos arrancan en 0.
  if (migrated.saveVersion < 6) {
    migrated = { ...migrated, trapsDiscarded: 0, saveVersion: 6 };
  }
  // v6 -> v7 (ronda 16): itemsFoundByItem pasa de nombre-español a id de ítem como clave, para
  // que la colección sobreviva a la traducción. Claves desconocidas pasan tal cual (idempotente).
  // AUDITORÍA (ronda 16): este loop corre ANTES de validateDeepContent, así que no puede confiar
  // en la forma del save. La versión ingenua (a) tiraba TypeError con un byItem null (brick de
  // boot con localStorage manipulado), (b) "lavaba" arrays a objetos válidos, y (c) con una clave
  // __proto__ seteaba el prototipo de remapped, dejando contenido heredado invisible para la
  // validación (bypass de la capa primaria anti-XSS del save). Fix: solo se remapea lo que ya
  // tiene la forma esperada (el resto pasa tal cual y la validación lo rechaza con su error de
  // siempre), sobre objetos sin prototipo (Object.create(null): toda clave, incluida __proto__,
  // es propiedad propia y visible), y los lookups de mapas usan Object.hasOwn (una clave
  // 'constructor' no debe resolver contra el prototipo).
  if (migrated.saveVersion < 7) {
    if (isPlainObject(migrated.itemsFoundByItem)) {
      const remapped = Object.create(null);
      for (const [containerId, byItem] of Object.entries(migrated.itemsFoundByItem)) {
        if (!isPlainObject(byItem)) {
          remapped[containerId] = byItem;
          continue;
        }
        const nameMap =
          itemNameToId && Object.hasOwn(itemNameToId, containerId) ? itemNameToId[containerId] : {};
        const target = (remapped[containerId] = Object.create(null));
        for (const [key, count] of Object.entries(byItem)) {
          target[Object.hasOwn(nameMap, key) ? nameMap[key] : key] = count;
        }
      }
      migrated = { ...migrated, itemsFoundByItem: remapped, saveVersion: 7 };
    } else {
      // Campo ausente o con forma inválida: NO se fabrica un `{}` que lo haga pasar — se deja
      // tal cual para que REQUIRED_FIELDS/validateDeepContent lo rechacen (pre-ronda-16 un v6
      // sin itemsFoundByItem válido se rechazaba; la migración no debe relajar eso).
      migrated = { ...migrated, saveVersion: 7 };
    }
  }
  // v7 -> v8 (ronda 19): agrega digStreak/bestDigStreak (racha de escarbado sin trampa) y
  // vibrationOn (toggle de vibración táctil). Saves viejos arrancan en racha 0 y vibración
  // encendida (comportamiento actual sin cambios visibles).
  if (migrated.saveVersion < 8) {
    migrated = { ...migrated, digStreak: 0, bestDigStreak: 0, vibrationOn: true, saveVersion: 8 };
  }
  return migrated;
}

/**
 * Valida que un objeto candidato a save tenga la forma esperada.
 * @param {unknown} candidate
 * @param {Set<string> | Array<string>} [validContainerIds] - si se pasa, se filtran de
 *   `autoQueue`/`autoProcessing` los ids de contenedor que no estén en este conjunto (limpieza de
 *   referencias huérfanas de saves viejos/manipulados). Si se omite, no se filtra (compat).
 * @param {Object<string, Object<string, string>>} [itemNameToId] - ver migrate(). Necesario solo
 *   para migrar saves v6 o anteriores; saves ya en v7 no lo requieren.
 * @returns {{ valid: true, data: Object } | { valid: false, error: string }}
 */
export function validateSave(candidate, validContainerIds, itemNameToId) {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { valid: false, error: 'El guardado no es un objeto JSON válido.' };
  }
  if (typeof candidate.saveVersion !== 'number') {
    return { valid: false, error: 'Falta o es inválido el campo saveVersion.' };
  }
  if (candidate.saveVersion > SAVE_VERSION) {
    return { valid: false, error: `saveVersion ${candidate.saveVersion} es más nueva que la soportada (${SAVE_VERSION}).` };
  }
  const migrated = migrate(candidate, itemNameToId);
  for (const [field, type] of Object.entries(REQUIRED_FIELDS)) {
    if (typeof migrated[field] !== type) {
      return { valid: false, error: `Campo inválido o faltante: ${field}` };
    }
    // AJUSTE (auditoría post-ronda 14): `typeof NaN === 'number'` — un save manipulado con
    // money/lastSavedAt/tutorialStep en NaN o Infinity pasaba la validación y dejaba la partida
    // inutilizable (botones muertos por costo NaN, offline NaN). Misma lección del napkin que
    // ya motivó Number.isFinite en los mapas numéricos: el typeof solo no alcanza.
    if (type === 'number' && !Number.isFinite(migrated[field])) {
      return { valid: false, error: `Campo numérico no finito: ${field}` };
    }
  }
  const deepError = validateDeepContent(migrated);
  if (deepError) {
    return { valid: false, error: deepError };
  }
  if (validContainerIds) {
    const validIds = validContainerIds instanceof Set ? validContainerIds : new Set(validContainerIds);
    sanitizeContainerRefs(migrated, validIds);
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
 * @param {Set<string> | Array<string>} [validContainerIds] - ver validateSave.
 * @param {Object<string, Object<string, string>>} [itemNameToId] - ver migrate().
 * @returns {{ ok: true, state: import('./state.js').GameState } | { ok: false, error: string }}
 */
export function deserializeState(raw, validContainerIds, itemNameToId) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'El guardado no es JSON válido.' };
  }
  const result = validateSave(parsed, validContainerIds, itemNameToId);
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
 * @param {Set<string> | Array<string>} [validContainerIds] - ver validateSave.
 * @param {Object<string, Object<string, string>>} [itemNameToId] - ver migrate().
 * @returns {{ ok: true, state: import('./state.js').GameState } | { ok: false, error: string }}
 */
export function importSave(encoded, validContainerIds, itemNameToId) {
  let json;
  try {
    json =
      typeof atob === 'function'
        ? decodeURIComponent(escape(atob(encoded)))
        : Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return { ok: false, error: 'El texto no es un guardado en base64 válido.' };
  }
  return deserializeState(json, validContainerIds, itemNameToId);
}
