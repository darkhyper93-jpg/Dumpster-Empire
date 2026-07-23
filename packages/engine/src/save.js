/**
 * Serialización de guardado: validación de esquema + saveVersion + migración,
 * y export/import en base64. Nunca corrompe la partida en curso ante un input inválido.
 */

import {
  SAVE_VERSION,
  DIG_SENSITIVITY_MIN,
  DIG_SENSITIVITY_MAX,
  INVENTORY_MAX_SAFETY,
  ROBOTS_MAX_SAFETY,
  TREE_LEVEL_MAX_SAFETY,
  ARRAY_MAX_SAFETY,
  defaultRobotConfig,
  freshState,
} from './state.js';
import { MISSION_TYPES, MISSION_DIFFICULTIES } from './systems/missions.js';
import { isProceduralContainerId } from './procedural.js';

/**
 * Idiomas soportados por el módulo i18n (apps/game/src/i18n). Fuente de verdad del allow-list:
 * de acá derivan la validación del save, el selector de Ajustes, `resolveInitialLanguage` y los
 * tests de paridad de diccionarios (ronda 33 sumó pt/fr/de al par es/en de la ronda 16).
 * Agregar un idioma acá SIN su diccionario de UI y su overlay de data rompe los tests a propósito.
 */
export const SUPPORTED_LANGUAGES = ['es', 'en', 'pt', 'fr', 'de'];

/** Mapas planos `id -> number` (freshState() los arranca en `{}` o con valores numéricos). */
const NUMERIC_MAP_FIELDS = [
  'upgradeLevels',
  'ownedContainers',
  'containerLevels',
  'containerLevelProgress',
  'prestigeTreeLevels',
  'itemsFoundByCategory',
  'deedsTreeLevels',
];

/** Mapa plano `id -> boolean` (compras de un solo uso). */
const BOOLEAN_MAP_FIELDS = ['automationOwned', 'toolsOwned'];

/** Arrays cuyos elementos deben ser strings (ids, no texto libre). */
const STRING_ARRAY_FIELDS = [
  'achievementsUnlocked',
  'autoQueue',
  'legendariesFound',
  'storySeen',
  'challengesCompleted',
];

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
 * Valida que todo valor propio de `obj` sea un entero en [0, max]. Más estricto que
 * isFiniteNumberMap: los niveles de árbol (prestigeTreeLevels/deedsTreeLevels) no pueden ser
 * fraccionarios, negativos ni finito-gigantes (auditoría de release, napkin #8).
 * @param {unknown} obj
 * @param {number} max
 * @returns {boolean}
 */
function isBoundedIntegerMap(obj, max) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  return Object.values(obj).every((v) => Number.isInteger(v) && v >= 0 && v <= max);
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
 * Valida `autoProcessing`: array de slots `{ robotIndex, containerId, totalTime, remaining }`.
 * @param {unknown} arr
 * @returns {boolean}
 */
function isValidAutoProcessing(arr) {
  // AJUSTE (auditoría 2026-07-22): cota de longitud — era el ÚNICO array del save sin la suya
  // (inventory 200, robots 8, stallOrders/STRING_ARRAY_FIELDS ARRAY_MAX_SAFETY, dailyMissions 5).
  // El diseño real son ROBOTS_MAX_SAFETY × brazos slots; sin cota, un save IMPORTADO con cientos
  // de miles pasaba la validación y después congelaba el juego por dos vías: `automationTick`
  // itera todos los slots una vez por segundo y `AutomationView` renderiza una tarjeta por slot.
  // Es el mismo fallo que ya se cerró en `isValidStallOrders`; a este se le pasó por alto.
  if (!Array.isArray(arr) || arr.length > ARRAY_MAX_SAFETY) return false;
  // AJUSTE (auditoría post-ronda 14): además de finitud, coherencia del slot. automationTick
  // solo persiste slots con 0 < remaining <= totalTime; un slot manipulado con totalTime 0 (o
  // remaining > totalTime) producía "Contenedor: NaN%" / porcentajes negativos en AutomationView.
  // Ronda 27 (PLAN.md §4.38): `robotIndex` entero 0..ROBOTS_MAX_SAFETY — se compara contra la
  // cota de seguridad, no contra la flota real del save (save.js es agnóstico de balance; un
  // índice fuera de la flota actual cae al robot 1 en el tick, ver robotFiltersFor).
  return arr.every(
    (slot) =>
      typeof slot === 'object' &&
      slot !== null &&
      typeof slot.containerId === 'string' &&
      Number.isFinite(slot.totalTime) &&
      Number.isFinite(slot.remaining) &&
      slot.totalTime > 0 &&
      slot.remaining >= 0 &&
      slot.remaining <= slot.totalTime &&
      Number.isInteger(slot.robotIndex) &&
      slot.robotIndex >= 0 &&
      slot.robotIndex <= ROBOTS_MAX_SAFETY
  );
}

/**
 * Valida `robots` (ronda 27, PLAN.md §4.38): la flota, 1..ROBOTS_MAX_SAFETY configuraciones
 * `{ targetContainerId: string|null, filters: { descartarBajoValor >= 0, reservarCategorias } }`.
 * El allow-list real de targets/categorías lo aplican sanitizeContainerRefs y store.js — acá
 * solo forma y rangos (mismo criterio que inventory/stallOrders).
 * @param {unknown} arr
 * @returns {boolean}
 */
function isValidRobots(arr) {
  if (!Array.isArray(arr) || arr.length < 1 || arr.length > ROBOTS_MAX_SAFETY) return false;
  return arr.every(
    (robot) =>
      isPlainObject(robot) &&
      (robot.targetContainerId === null || typeof robot.targetContainerId === 'string') &&
      isPlainObject(robot.filters) &&
      Number.isFinite(robot.filters.descartarBajoValor) &&
      robot.filters.descartarBajoValor >= 0 &&
      Array.isArray(robot.filters.reservarCategorias) &&
      robot.filters.reservarCategorias.every((c) => typeof c === 'string')
  );
}

/**
 * Valida `inventory` (PLAN.md §2.9, ronda 23): array de ítems capturados por el Puesto de
 * Chatarra, sin vender. `INVENTORY_MAX_SAFETY` rechaza un array absurdamente grande (save
 * manipulado) sin acoplar save.js a la capacidad de diseño real (data/stall.json).
 * @param {unknown} arr
 * @returns {boolean}
 */
function isValidInventory(arr) {
  if (!Array.isArray(arr) || arr.length > INVENTORY_MAX_SAFETY) return false;
  return arr.every(
    (item) =>
      isPlainObject(item) &&
      typeof item.itemId === 'string' &&
      typeof item.containerId === 'string' &&
      typeof item.categoria === 'string' &&
      Number.isFinite(item.baseValue) &&
      item.baseValue > 0
  );
}

/**
 * Valida `stallOrders` (PLAN.md §4.28, ronda 23): hasta 2 pedidos activos del Puesto.
 * @param {unknown} arr
 * @returns {boolean}
 */
function isValidStallOrders(arr) {
  // AJUSTE (auditoría de release): cota de seguridad (ARRAY_MAX_SAFETY) — el diseño real son 2
  // pedidos activos; sin esta, un save manipulado con cientos de miles hacía a StallView renderizar
  // esa cantidad de tarjetas. Mismo criterio que INVENTORY_MAX_SAFETY / ROBOTS_MAX_SAFETY.
  if (!Array.isArray(arr) || arr.length > ARRAY_MAX_SAFETY) return false;
  return arr.every(
    (order) =>
      isPlainObject(order) &&
      typeof order.id === 'string' &&
      typeof order.npcId === 'string' &&
      typeof order.categoria === 'string' &&
      Number.isInteger(order.cantidad) &&
      order.cantidad > 0 &&
      Number.isFinite(order.mult) &&
      order.mult > 0 &&
      Number.isInteger(order.progress) &&
      order.progress >= 0 &&
      order.progress <= order.cantidad
  );
}

/**
 * Valida `dailyMissions` (PLAN.md §4.30/§4.31, ronda 24): hasta 3 misiones activas del día, más
 * hasta 2 slots extra del nodo `agendaLlena` del árbol de Escrituras (PLAN.md §4.36, ronda 26) —
 * 5 en total como techo de seguridad (save.js es agnóstico de deedsTree.json, igual que del resto
 * de la data de balance; la validación de cantidad exacta no le corresponde).
 * @param {unknown} arr
 * @returns {boolean}
 */
function isValidDailyMissions(arr) {
  if (!Array.isArray(arr) || arr.length > 5) return false;
  return arr.every(
    (m) =>
      isPlainObject(m) &&
      typeof m.id === 'string' &&
      MISSION_TYPES.includes(m.type) &&
      MISSION_DIFFICULTIES.includes(m.difficulty) &&
      isPlainObject(m.params) &&
      (m.params.categoria === undefined || typeof m.params.categoria === 'string') &&
      (m.params.containerId === undefined || typeof m.params.containerId === 'string') &&
      Number.isFinite(m.target) &&
      m.target > 0 &&
      Number.isFinite(m.progress) &&
      m.progress >= 0 &&
      typeof m.claimed === 'boolean' &&
      Number.isFinite(m.snapshot) &&
      m.snapshot >= 0 &&
      isPlainObject(m.reward) &&
      (m.reward.type === 'money' || m.reward.type === 'keys') &&
      Number.isFinite(m.reward.amount) &&
      m.reward.amount > 0
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
    // AJUSTE (auditoría de release): además de "array de strings", cota de seguridad genérica
    // (ARRAY_MAX_SAFETY) para que un save manipulado no traiga cientos de miles de ids.
    if (
      !Array.isArray(migrated[field]) ||
      migrated[field].length > ARRAY_MAX_SAFETY ||
      !migrated[field].every((v) => typeof v === 'string')
    ) {
      return `Contenido inválido en ${field}: debe ser un array de strings.`;
    }
  }
  // AJUSTE (auditoría de release, napkin #8): los niveles de árbol NO son solo "número finito"
  // (loop de NUMERIC_MAP_FIELDS de arriba) sino enteros en un rango de seguridad. Un nivel
  // finito-gigante colgaba migrateTo14 (bucle de backfill) e inflaba getFleetSize a millones
  // (OOM en ensureFleet) — dos bricks de ARRANQUE. Los demás mapas numéricos quedan en finitud:
  // containerLevels ya se clampea al leerse (getContainerLevel), y upgradeLevels es ilimitado por
  // diseño, así que no llevan cota superior acá.
  for (const field of ['prestigeTreeLevels', 'deedsTreeLevels']) {
    if (!isBoundedIntegerMap(migrated[field], TREE_LEVEL_MAX_SAFETY)) {
      return `Contenido inválido en ${field}: los niveles deben ser enteros entre 0 y ${TREE_LEVEL_MAX_SAFETY}.`;
    }
  }
  if (!isValidItemsFoundByItem(migrated.itemsFoundByItem)) {
    return 'Contenido inválido en itemsFoundByItem: debe ser containerId -> { itemName -> número }.';
  }
  if (!isValidAutoProcessing(migrated.autoProcessing)) {
    return 'Contenido inválido en autoProcessing: debe ser un array de slots { robotIndex, containerId, totalTime, remaining }.';
  }
  // Ronda 27 (PLAN.md §4.38): la flota reemplaza a autoTargetContainerId (borrado en la v16).
  if (!isValidRobots(migrated.robots)) {
    return 'Contenido inválido en robots: debe ser una flota de { targetContainerId, filters } válidos.';
  }
  if (!Number.isInteger(migrated.filteredProcessedCount) || migrated.filteredProcessedCount < 0) {
    return 'Contenido inválido en filteredProcessedCount: debe ser un entero >= 0.';
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
  // AJUSTE (ronda 20): gravesHit es entero >= 0 por la misma razón que digStreak (ronda 19) —
  // la finitud ya la cubre REQUIRED_FIELDS, acá se cubre el rango y que no sea fraccionario.
  if (!Number.isInteger(migrated.gravesHit) || migrated.gravesHit < 0) {
    return 'Contenido inválido en gravesHit: debe ser un entero >= 0.';
  }
  // La herramienta equipada siempre tiene que ser una de las poseídas (isBooleanMap ya validó
  // que toolsOwned es un mapa de booleanos arriba, en el loop de BOOLEAN_MAP_FIELDS).
  if (typeof migrated.equippedTool !== 'string' || migrated.toolsOwned[migrated.equippedTool] !== true) {
    return 'Contenido inválido en equippedTool: debe ser una herramienta presente en toolsOwned.';
  }
  // El chequeo de finitud de `volume` (y de todo campo numérico top-level) vive ahora en el
  // loop de REQUIRED_FIELDS de validateSave — ver AJUSTE de la auditoría post-ronda 14.
  // AJUSTE (ronda 23, PLAN.md §2.9/§4.27-§4.29): inventory/stallOrders del Puesto de Chatarra.
  if (!isValidInventory(migrated.inventory)) {
    return 'Contenido inválido en inventory: debe ser un array de { itemId, containerId, categoria, baseValue > 0 }.';
  }
  if (!isValidStallOrders(migrated.stallOrders)) {
    return 'Contenido inválido en stallOrders: debe ser un array de pedidos { id, npcId, categoria, cantidad, mult, progress }.';
  }
  if (!Number.isInteger(migrated.stallLevel) || migrated.stallLevel < 0) {
    return 'Contenido inválido en stallLevel: debe ser un entero >= 0.';
  }
  if (!Number.isFinite(migrated.keepThreshold) || migrated.keepThreshold < 0) {
    return 'Contenido inválido en keepThreshold: debe ser un número >= 0.';
  }
  if (!Number.isInteger(migrated.stallSoldCount) || migrated.stallSoldCount < 0) {
    return 'Contenido inválido en stallSoldCount: debe ser un entero >= 0.';
  }
  if (!Number.isInteger(migrated.ordersFulfilledCount) || migrated.ordersFulfilledCount < 0) {
    return 'Contenido inválido en ordersFulfilledCount: debe ser un entero >= 0.';
  }
  // AJUSTE (ronda 24, PLAN.md §4.30/§4.31): misiones diarias.
  if (!isValidDailyMissions(migrated.dailyMissions)) {
    return 'Contenido inválido en dailyMissions: debe ser un array de hasta 3 misiones válidas.';
  }
  if (!Number.isInteger(migrated.missionsCompletedCount) || migrated.missionsCompletedCount < 0) {
    return 'Contenido inválido en missionsCompletedCount: debe ser un entero >= 0.';
  }
  if (!Number.isInteger(migrated.eventsUsedCount) || migrated.eventsUsedCount < 0) {
    return 'Contenido inválido en eventsUsedCount: debe ser un entero >= 0.';
  }
  // AJUSTE (ronda 25, PLAN.md §4.31/§4.32): specialization/activeChallenge son unión
  // string|null, mismo patrón que autoTargetContainerId — save.js es agnóstico de
  // specializations.json/challenges.json (esa allow-list real la aplica store.js al cargar,
  // igual que sanitizeLegendariesFound/sanitizeContainerRefs); acá solo se valida el tipo.
  if (migrated.specialization !== null && typeof migrated.specialization !== 'string') {
    return 'Contenido inválido en specialization: debe ser null o un string.';
  }
  if (migrated.activeChallenge !== null && typeof migrated.activeChallenge !== 'string') {
    return 'Contenido inválido en activeChallenge: debe ser null o un string.';
  }
  if (migrated.specialization !== null && migrated.activeChallenge !== null) {
    return 'Contenido inválido: specialization y activeChallenge son excluyentes por run.';
  }
  if (!Number.isInteger(migrated.specializationsUsed) || migrated.specializationsUsed < 0) {
    return 'Contenido inválido en specializationsUsed: debe ser un entero >= 0.';
  }
  if (!Number.isFinite(migrated.totalKeysEarned) || migrated.totalKeysEarned < 0) {
    return 'Contenido inválido en totalKeysEarned: debe ser un número >= 0.';
  }
  // AJUSTE (ronda 26, PLAN.md §2.11/§4.34-§4.36): Mudanza de Galaxia y Escrituras.
  if (!Number.isFinite(migrated.deeds) || migrated.deeds < 0) {
    return 'Contenido inválido en deeds: debe ser un número >= 0.';
  }
  if (!Number.isInteger(migrated.galaxyMoveCount) || migrated.galaxyMoveCount < 0) {
    return 'Contenido inválido en galaxyMoveCount: debe ser un entero >= 0.';
  }
  if (!Number.isFinite(migrated.totalKeysEarnedRun) || migrated.totalKeysEarnedRun < 0) {
    return 'Contenido inválido en totalKeysEarnedRun: debe ser un número >= 0.';
  }
  // AJUSTE (auditoría 26.D, regla dura §1.13 de ROADMAPv4 — coherencia entre campos): todo save
  // legítimo cumple `totalKeysEarnedRun <= totalKeysEarned`: ambos se incrementan JUNTOS y por
  // el mismo monto solo en doPrestige, la migración v15 los iguala, y la mudanza solo BAJA el
  // run (a 0). Un run por encima del histórico es manipulación para inflar Escrituras (§4.35).
  if (migrated.totalKeysEarnedRun > migrated.totalKeysEarned) {
    return 'Contenido inválido: totalKeysEarnedRun no puede superar totalKeysEarned.';
  }
  // AJUSTE (auditoría 26.D): prestigeCount es el otro factor de la fórmula de Escrituras — antes
  // solo se exigía finitud (loop de REQUIRED_FIELDS); acá el rango y que no sea fraccionario
  // (mismo criterio que digStreak/gravesHit).
  if (!Number.isInteger(migrated.prestigeCount) || migrated.prestigeCount < 0) {
    return 'Contenido inválido en prestigeCount: debe ser un entero >= 0.';
  }
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
  // Ronda 26.B: los tiers procedurales post-Big Bang (`bigbangPlus<n>`) nunca están en
  // containers.json, así que jamás entran a `validIds` — sin este OR, un jugador legítimo que
  // los tenga en autoQueue/autoProcessing los perdería en cada recarga (falso positivo de
  // "referencia huérfana"). `isProceduralContainerId` valida patrón Y tope de n, así que un id
  // hostil (`bigbangPlus999`, `bigbangPlus01`, `bigbangPlus1e2`, `bigbangPlus-1`) se sigue
  // filtrando igual que cualquier otro id inexistente.
  const isValidRef = (id) => validIds.has(id) || isProceduralContainerId(id);
  migrated.autoQueue = migrated.autoQueue.filter(isValidRef);
  migrated.autoProcessing = migrated.autoProcessing.filter((slot) => isValidRef(slot.containerId));
  // Ronda 27: un target de robot huérfano vuelve a modo Auto (mismo criterio que tenía
  // autoTargetContainerId antes de la v16 — descartar la referencia muerta, no rechazar el save).
  for (const robot of migrated.robots) {
    if (robot.targetContainerId !== null && !isValidRef(robot.targetContainerId)) {
      robot.targetContainerId = null;
    }
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
  equippedTool: 'string',
  toolsOwned: 'object',
  gravesHit: 'number',
  legendariesFound: 'object',
  inventory: 'object',
  stallLevel: 'number',
  keepThreshold: 'number',
  stallOrders: 'object',
  ordersRotatedAt: 'number',
  stallVendorAt: 'number',
  stallSoldCount: 'number',
  ordersFulfilledCount: 'number',
  storySeen: 'object',
  dailyMissions: 'object',
  missionsRolledAt: 'number',
  missionsCompletedCount: 'number',
  lastEventAt: 'number',
  eventsUsedCount: 'number',
  challengesCompleted: 'object',
  specializationsUsed: 'number',
  totalKeysEarned: 'number',
  deeds: 'number',
  deedsTreeLevels: 'object',
  galaxyMoveCount: 'number',
  totalKeysEarnedRun: 'number',
  robots: 'object',
  filteredProcessedCount: 'number',
  mantenerStockPedidos: 'boolean',
};
// specialization/activeChallenge NO van en REQUIRED_FIELDS: son unión `string|null` y
// `typeof null === 'object'` rompería el chequeo de tipo; su validación de contenido vive en
// validateDeepContent(). (autoTargetContainerId, el tercer caso histórico, se borró en la v16 —
// el targetContainerId de cada robot se valida dentro de isValidRobots.)

// ---------------------------------------------------------------------------
// Migraciones, un paso por versión (§27.5.4, ronda 27): cada `migrateToN` lleva un save de la
// versión N-1 (o anterior, ya migrada) a la N. Extraídas de la cadena monolítica de `migrate()`
// SIN cambio de comportamiento — mismos guards, mismos backfills, mismos comentarios.
// ---------------------------------------------------------------------------

/**
 * Contexto opcional que algunas migraciones necesitan (se enhebra desde validateSave).
 * @typedef {Object} MigrationContext
 * @property {Object<string, Object<string, string>>} [itemNameToId] - mapa
 *   `containerId -> { nombreEspañol -> id }` usado por la migración v6->v7 para remapear las
 *   claves de `itemsFoundByItem`. Si se omite, las claves quedan tal cual (compat: saves ya en
 *   v7 no lo necesitan).
 * @property {Array<Object>} [prestigeTreeData] - definición de `prestigeTree.json`, usada SOLO
 *   por la migración v13->v14 para backfillear `totalKeysEarned` (necesita `costoBase`/
 *   `factorCrecimiento` de cada nodo ya comprado).
 */

/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo1(migrated, ctx) {
  return { ...freshState(), ...migrated, saveVersion: 1 };
}

// v1 -> v2 (Fase 6, PLAN.md §11.3): agrega containerLevels/containerLevelProgress. Saves viejos
// arrancan todos los contenedores en nivel 1 (comportamiento correcto: nunca escarbaron a ese nivel).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo2(migrated, ctx) {
  return {
    ...migrated,
    containerLevels: migrated.containerLevels || {},
    containerLevelProgress: migrated.containerLevelProgress || {},
    saveVersion: 2,
  };
}

// v2 -> v3 (Fase 7, PLAN.md §11.5): agrega itemsFoundByItem. Saves viejos arrancan vacío
// (comportamiento correcto: el INDEX no puede saber qué encontraron antes de este campo).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo3(migrated, ctx) {
  return {
    ...migrated,
    itemsFoundByItem: migrated.itemsFoundByItem || {},
    saveVersion: 3,
  };
}

// v3 -> v4 (PUNTOS_A_MEJORAR_2.md §5): agrega `volume` (0..1). Saves viejos arrancan con volumen
// 1 (comportamiento actual: sonido a todo volumen si estaba encendido).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo4(migrated, ctx) {
  return {
    ...migrated,
    volume: typeof migrated.volume === 'number' ? migrated.volume : 1,
    saveVersion: 4,
  };
}

// v4 -> v5 (ronda 14): agrega autoTargetContainerId (selector del robot), digSensitivity
// (slider de sensibilidad) y language (base de i18n). Saves viejos arrancan en modo Auto,
// sensibilidad neutra y español (comportamiento actual sin cambios visibles).
// (La v16 borra autoTargetContainerId; este paso lo sigue creando para que un save pre-v5
// atraviese v5..v15 con la MISMA forma que tuvo históricamente.)
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo5(migrated, ctx) {
  return {
    ...migrated,
    autoTargetContainerId: null,
    digSensitivity: 1,
    language: 'es',
    saveVersion: 5,
  };
}

// v5 -> v6 (ronda 15): agrega trapsDiscarded (contador de contenedores con trampa que el
// robot descartó vía el nodo "Escáner de Trampas"). Saves viejos arrancan en 0.
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo6(migrated, ctx) {
  return { ...migrated, trapsDiscarded: 0, saveVersion: 6 };
}

// v6 -> v7 (ronda 16): itemsFoundByItem pasa de nombre-español a id de ítem como clave, para
// que la colección sobreviva a la traducción. Claves desconocidas pasan tal cual (idempotente).
// AUDITORÍA (ronda 16): este paso corre ANTES de validateDeepContent, así que no puede confiar
// en la forma del save. La versión ingenua (a) tiraba TypeError con un byItem null (brick de
// boot con localStorage manipulado), (b) "lavaba" arrays a objetos válidos, y (c) con una clave
// __proto__ seteaba el prototipo de remapped, dejando contenido heredado invisible para la
// validación (bypass de la capa primaria anti-XSS del save). Fix: solo se remapea lo que ya
// tiene la forma esperada (el resto pasa tal cual y la validación lo rechaza con su error de
// siempre), sobre objetos sin prototipo (Object.create(null): toda clave, incluida __proto__,
// es propiedad propia y visible), y los lookups de mapas usan Object.hasOwn (una clave
// 'constructor' no debe resolver contra el prototipo).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo7(migrated, ctx) {
  if (!isPlainObject(migrated.itemsFoundByItem)) {
    // Campo ausente o con forma inválida: NO se fabrica un `{}` que lo haga pasar — se deja
    // tal cual para que REQUIRED_FIELDS/validateDeepContent lo rechacen (pre-ronda-16 un v6
    // sin itemsFoundByItem válido se rechazaba; la migración no debe relajar eso).
    return { ...migrated, saveVersion: 7 };
  }
  const { itemNameToId } = ctx;
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
  return { ...migrated, itemsFoundByItem: remapped, saveVersion: 7 };
}

// v7 -> v8 (ronda 19): agrega digStreak/bestDigStreak (racha de escarbado sin trampa) y
// vibrationOn (toggle de vibración táctil). Saves viejos arrancan en racha 0 y vibración
// encendida (comportamiento actual sin cambios visibles).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo8(migrated, ctx) {
  return { ...migrated, digStreak: 0, bestDigStreak: 0, vibrationOn: true, saveVersion: 8 };
}

// v8 -> v9 (ronda 20): agrega energy/energyAt (Energía de espionaje), equippedTool/toolsOwned
// (herramientas de escarbado) y spiesUsed/gravesHit (contadores de logros). Saves viejos
// arrancan con Energía llena, solo "manos" (herramienta inicial) equipada y contadores en 0
// (comportamiento actual sin cambios visibles).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo9(migrated, ctx) {
  return {
    ...migrated,
    energy: 3,
    energyAt: 0,
    equippedTool: 'manos',
    toolsOwned: { manos: true },
    spiesUsed: 0,
    gravesHit: 0,
    saveVersion: 9,
  };
}

// v9 -> v10 (ronda 21): remueve energy/energyAt/spiesUsed (Energía y espionaje removidos por
// decisión del usuario, 2026-07-14) y filtra el logro muerto `a39` de achievementsUnlocked.
// PRIMERA migración del repo que ELIMINA campos en vez de agregarlos: no alcanza con no
// setearlos (un save v9 real los trae puestos), hay que borrarlos explícitamente con
// destructuring-omit. Filtrar `a39` no es "lavar" un save inválido (patrón
// sanitizeContainerRefs: descartar una referencia muerta es limpieza, no relajar validación)
// — un save con basura real en otro campo se sigue rechazando igual más abajo. Precedente para
// la v16, que reusa este patrón para borrar `autoTargetContainerId`.
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo10(migrated, ctx) {
  const { energy, energyAt, spiesUsed, ...rest } = migrated;
  return {
    ...rest,
    achievementsUnlocked: Array.isArray(migrated.achievementsUnlocked)
      ? migrated.achievementsUnlocked.filter((id) => id !== 'a39')
      : migrated.achievementsUnlocked,
    saveVersion: 10,
  };
}

// v10 -> v11 (ronda 22, PLAN.md §4.26): agrega legendariesFound (ids de legendarios ya
// encontrados). Saves viejos arrancan sin ninguno (comportamiento correcto: no existían).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo11(migrated, ctx) {
  return { ...migrated, legendariesFound: [], saveVersion: 11 };
}

// v11 -> v12 (ronda 23, PLAN.md §2.9/§4.27-§4.29): agrega el Puesto de Chatarra. Saves viejos
// arrancan sin puesto (stallLevel 0, comportamiento actual: todo se vende instantáneo, sin
// cambios visibles) e inventario/pedidos vacíos.
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo12(migrated, ctx) {
  return {
    ...migrated,
    inventory: [],
    stallLevel: 0,
    keepThreshold: 0,
    stallOrders: [],
    ordersRotatedAt: 0,
    stallVendorAt: 0,
    stallSoldCount: 0,
    ordersFulfilledCount: 0,
    storySeen: [],
    saveVersion: 12,
  };
}

// v12 -> v13 (ronda 24, PLAN.md §4.30-§4.33): misiones diarias + evento de contenedor. Saves
// viejos arrancan sin misiones activas (se rollean solas en el próximo boot, ver
// rerollDailyMissionsIfNeeded: `missionsRolledAt: 0` siempre difiere del día de hoy), sin
// cooldown de evento consumido y sin eventos aprovechados (logro nuevo).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo13(migrated, ctx) {
  return {
    ...migrated,
    dailyMissions: [],
    missionsRolledAt: 0,
    missionsCompletedCount: 0,
    lastEventAt: 0,
    eventsUsedCount: 0,
    saveVersion: 13,
  };
}

// v13 -> v14 (ronda 25, PLAN.md §4.31-§4.33): prestigio profundo. Saves viejos arrancan sin
// especialización/desafío activo (comportamiento actual sin cambios visibles) y
// `totalKeysEarned` se backfillea con `prestigeKeys` (lo que le queda sin gastar) más el costo
// en Llaves ya invertido en `prestigeTreeLevels` (lo que gastó históricamente) — el mejor
// estimado posible de lo ganado alguna vez a partir de lo que el save YA tiene. Si
// `prestigeTreeData` no se pasa (compat: llamador previo a esa ronda), el costo invertido
// backfillea en 0 — subestima levemente pero nunca sobreestima ni crashea.
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo14(migrated, ctx) {
  const { prestigeTreeData } = ctx;
  const levels = isPlainObject(migrated.prestigeTreeLevels) ? migrated.prestigeTreeLevels : {};
  let investedCost = 0;
  if (Array.isArray(prestigeTreeData)) {
    for (const [nodeId, level] of Object.entries(levels)) {
      const node = prestigeTreeData.find((n) => n.id === nodeId);
      // AJUSTE (auditoría de release, napkin #7 + #8): este paso corre ANTES de validateDeepContent,
      // así que no puede confiar en el RANGO de `level`. Sin la cota, un nivel finito-gigante
      // (1e9) colgaba el bucle para SIEMPRE en el arranque (PoC). Un nivel fuera del techo de
      // seguridad se saltea acá (el save se rechaza igual, después, en la capa de niveles de árbol)
      // — no se "lava" ni se itera. Los saves v13 legítimos traen niveles enteros chicos.
      if (!node || !Number.isInteger(level) || level < 0 || level > TREE_LEVEL_MAX_SAFETY) continue;
      for (let lvl = 0; lvl < level; lvl++) {
        investedCost += Math.ceil(node.costoBase * Math.pow(node.factorCrecimiento, lvl));
      }
    }
  }
  return {
    ...migrated,
    specialization: null,
    activeChallenge: null,
    challengesCompleted: [],
    specializationsUsed: 0,
    totalKeysEarned: (Number.isFinite(migrated.prestigeKeys) ? migrated.prestigeKeys : 0) + investedCost,
    saveVersion: 14,
  };
}

// v14 -> v15 (ronda 26, PLAN.md §2.11/§4.34-§4.36): Mudanza de Galaxia. Saves viejos arrancan
// sin Escrituras ni mudanzas (comportamiento actual sin cambios visibles) y
// `totalKeysEarnedRun` se backfillea con `totalKeysEarned` (el save nunca se mudó todavía, así
// que la "ventana desde la última mudanza" es toda la vida de la partida).
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo15(migrated, ctx) {
  return {
    ...migrated,
    deeds: 0,
    deedsTreeLevels: {},
    galaxyMoveCount: 0,
    totalKeysEarnedRun: Number.isFinite(migrated.totalKeysEarned) ? migrated.totalKeysEarned : 0,
    saveVersion: 15,
  };
}

// v15 -> v16 (ronda 27, PLAN.md §2.12/§4.38): la flota de robots. SEGUNDA migración que borra
// campos (patrón destructuring-omit de la v10): `autoTargetContainerId` se absorbe TAL CUAL como
// target del robot 1 — incluso un valor inválido (un número, p. ej.) viaja hasta isValidRobots y
// el save se rechaza, exactamente igual que se rechazaba antes; la migración nunca "lava"
// (napkin #7). Los slots de autoProcessing ganan `robotIndex: 0` (todos eran del robot único);
// un slot que ya trae robotIndex propio (v16 residual u hostil) lo conserva para que la
// validación lo juzgue. `filteredProcessedCount`/`mantenerStockPedidos` arrancan neutros.
/** @param {Object} migrated @param {MigrationContext} ctx @returns {Object} */
function migrateTo16(migrated, ctx) {
  const { autoTargetContainerId, ...rest } = migrated;
  const robot = defaultRobotConfig();
  robot.targetContainerId = autoTargetContainerId;
  return {
    ...rest,
    robots: [robot],
    autoProcessing: Array.isArray(migrated.autoProcessing)
      ? migrated.autoProcessing.map((slot) => (isPlainObject(slot) ? { robotIndex: 0, ...slot } : slot))
      : migrated.autoProcessing,
    filteredProcessedCount: 0,
    mantenerStockPedidos: false,
    saveVersion: 16,
  };
}

/**
 * Migra un objeto de guardado de una versión anterior a la actual, encadenando los pasos
 * `migrateToN` en orden (§27.5.4: un paso por versión; cada uno chequea `saveVersion` para que
 * un save ya migrado lo saltee — misma semántica que la cadena monolítica que reemplaza).
 * @param {Object} raw
 * @param {Object<string, Object<string, string>>} [itemNameToId] - ver MigrationContext.
 * @param {Array<Object>} [prestigeTreeData] - ver MigrationContext.
 * @returns {Object}
 */
function migrate(raw, itemNameToId, prestigeTreeData) {
  const steps = [
    migrateTo1,
    migrateTo2,
    migrateTo3,
    migrateTo4,
    migrateTo5,
    migrateTo6,
    migrateTo7,
    migrateTo8,
    migrateTo9,
    migrateTo10,
    migrateTo11,
    migrateTo12,
    migrateTo13,
    migrateTo14,
    migrateTo15,
    migrateTo16,
  ];
  /** @type {MigrationContext} */
  const ctx = { itemNameToId, prestigeTreeData };
  let migrated = raw;
  for (let version = 1; version <= steps.length; version++) {
    if (migrated.saveVersion < version) migrated = steps[version - 1](migrated, ctx);
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
 * @param {Array<Object>} [prestigeTreeData] - ver migrate(). Necesario solo para migrar saves
 *   v13 o anteriores con niveles de árbol ya comprados; saves ya en v14 no lo requieren.
 * @returns {{ valid: true, data: Object } | { valid: false, error: string }}
 */
export function validateSave(candidate, validContainerIds, itemNameToId, prestigeTreeData) {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { valid: false, error: 'El guardado no es un objeto JSON válido.' };
  }
  if (typeof candidate.saveVersion !== 'number') {
    return { valid: false, error: 'Falta o es inválido el campo saveVersion.' };
  }
  if (candidate.saveVersion > SAVE_VERSION) {
    return { valid: false, error: `saveVersion ${candidate.saveVersion} es más nueva que la soportada (${SAVE_VERSION}).` };
  }
  const migrated = migrate(candidate, itemNameToId, prestigeTreeData);
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
 * @param {Array<Object>} [prestigeTreeData] - ver migrate().
 * @returns {{ ok: true, state: import('./state.js').GameState } | { ok: false, error: string }}
 */
export function deserializeState(raw, validContainerIds, itemNameToId, prestigeTreeData) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'El guardado no es JSON válido.' };
  }
  const result = validateSave(parsed, validContainerIds, itemNameToId, prestigeTreeData);
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
 * @param {Array<Object>} [prestigeTreeData] - ver migrate().
 * @returns {{ ok: true, state: import('./state.js').GameState } | { ok: false, error: string }}
 */
export function importSave(encoded, validContainerIds, itemNameToId, prestigeTreeData) {
  let json;
  try {
    json =
      typeof atob === 'function'
        ? decodeURIComponent(escape(atob(encoded)))
        : Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return { ok: false, error: 'El texto no es un guardado en base64 válido.' };
  }
  return deserializeState(json, validContainerIds, itemNameToId, prestigeTreeData);
}
