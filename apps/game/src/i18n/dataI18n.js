/**
 * Overlay de idioma sobre la data cargada (ronda 16, tarea B2). Arquitectura decidida en
 * ROADMAPv3.md: el JSON español es la ÚNICA fuente de verdad; el inglés se aplica IN-PLACE
 * sobre los objetos ya cargados (las vistas siguen leyendo `c.name`/`a.desc` sin enterarse).
 * Buildless: se importa por ruta relativa, sin tocar el importmap ni la CSP (regla 7).
 *
 * Orden de boot duro (R-16.3): `initDataLocalization` corre DESPUÉS de `createStore` (que
 * construyó `itemNameToId` con los nombres todavía en español) y ANTES del primer
 * `applyDataLanguage`. Si se aplica sin baseline, es un bug de orden de boot: se lanza Error
 * en vez de fallar en silencio con la colección remapeada contra nombres ingleses.
 */

import dataEn from './data-en.js';
import dataPt from './data-pt.js';
import dataFr from './data-fr.js';
import dataDe from './data-de.js';

/**
 * Overlays de data por idioma. El español NO tiene entrada: la data real (`data/*.json`) YA está
 * en español y es la fuente de verdad — 'es' restaura el baseline. Exportado (ronda 33) para que
 * los tests de paridad lo deriven de `SUPPORTED_LANGUAGES` en vez de importar cada archivo.
 * @type {Object<string, Object<string, any>>}
 */
export const DATA_DICTIONARIES = { en: dataEn, pt: dataPt, fr: dataFr, de: dataDe };

/**
 * @typedef {Object} LoadedData - los 6 JSON que carga main.js (ver DATA_FILES)
 * @property {Array<{id: string, name: string}>} containers
 * @property {{ rarities: Array<{id: string, name: string}>, containers: Object<string, Array<{id: string, name: string}>> }} items
 * @property {Array<{id: string, label: string}>} upgrades
 * @property {Array<{id: string, name: string, desc: string}>} automations
 * @property {Array<{id: string, name: string, desc: string}>} prestigeTree
 * @property {Array<{id: string, name: string}>} achievements
 * @property {{ legendaryChance: number, items: Array<{id: string, name: string}> }} legendaries
 * @property {Array<{id: string, name: string, desc: string}>} [specializations]
 * @property {Array<{id: string, name: string, desc: string}>} [challenges]
 * @property {Array<{id: string, name: string, desc: string}>} [deedsTree]
 */

/** Baseline español capturado en init: mapas `id → string` por colección. */
let baseline = null;

/**
 * Captura el baseline español de TODOS los campos de display de la data cargada. Los campos
 * son strings (primitivos), así que guardar mapas `id → string` ya es la copia profunda que
 * hace falta para poder restaurar 'es' después de pisar con 'en'.
 * @param {LoadedData} loaded
 */
export function initDataLocalization(loaded) {
  baseline = {
    containers: Object.fromEntries(loaded.containers.map((c) => [c.id, c.name])),
    items: Object.fromEntries(
      Object.entries(loaded.items.containers).map(([containerId, pool]) => [
        containerId,
        Object.fromEntries(pool.map((it) => [it.id, it.name])),
      ])
    ),
    rarities: Object.fromEntries(loaded.items.rarities.map((r) => [r.id, r.name])),
    achievements: Object.fromEntries(loaded.achievements.map((a) => [a.id, a.name])),
    automations: Object.fromEntries(loaded.automations.map((a) => [a.id, { name: a.name, desc: a.desc }])),
    prestigeTree: Object.fromEntries(loaded.prestigeTree.map((n) => [n.id, { name: n.name, desc: n.desc }])),
    upgrades: Object.fromEntries(loaded.upgrades.map((u) => [u.id, u.label])),
    // Ronda 22: legendarios de la Vitrina (data/legendaries.json), mismo criterio que items.
    legendaries: Object.fromEntries(loaded.legendaries.items.map((l) => [l.id, l.name])),
    // Ronda 23.C: NPCs (data/npcs.json) — mismo shape {name, desc} que automations/prestigeTree
    // (acá `rol` hace de `desc`). `story.json` no entra: sus textos son claves i18n fijas
    // (`textKey`), sin campo de display propio que traducir.
    npcs: Object.fromEntries(loaded.npcs.map((n) => [n.id, { name: n.name, rol: n.rol }])),
    // Ronda 25 (PLAN.md §4.31/§4.32): especializaciones/desafíos, mismo shape {name, desc} que
    // automations/prestigeTree. `|| []` porque son opcionales (mismo patrón que data.stall/etc.).
    specializations: Object.fromEntries((loaded.specializations || []).map((s) => [s.id, { name: s.name, desc: s.desc }])),
    challenges: Object.fromEntries((loaded.challenges || []).map((c) => [c.id, { name: c.name, desc: c.desc }])),
    // Ronda 26.C: árbol de Escrituras, mismo shape {name, desc} que prestigeTree.
    deedsTree: Object.fromEntries((loaded.deedsTree || []).map((n) => [n.id, { name: n.name, desc: n.desc }])),
  };
}

/**
 * Pisa in-place los campos de display de `loaded` con el idioma pedido: cualquier idioma con
 * overlay (`DATA_DICTIONARIES`: en/pt/fr/de) usa su archivo `data-<lang>.js` con fallback al
 * baseline español si a la traducción le falta una clave — nunca un hueco en pantalla —, y 'es'
 * (o cualquier valor sin overlay) restaura el baseline. Idempotente: aplicar el mismo idioma dos
 * veces deja la data igual.
 * @param {LoadedData} loaded - el MISMO objeto que se pasó a initDataLocalization
 * @param {string} lang - un valor de SUPPORTED_LANGUAGES; cualquier otro cae al baseline español
 */
export function applyDataLanguage(loaded, lang) {
  if (!baseline) {
    throw new Error('applyDataLanguage sin initDataLocalization previo (orden de boot roto, ver R-16.3)');
  }
  // `Object.hasOwn` y no `DATA_DICTIONARIES[lang]` pelado: `lang` viene del save y un valor como
  // 'constructor' resolvería contra el prototipo (misma clase de bug que la migración v6→v7).
  const overlay = Object.hasOwn(DATA_DICTIONARIES, lang) ? DATA_DICTIONARIES[lang] : undefined;

  /**
   * Un valor traducido de un mapa plano `id → string`, o el baseline español si no está.
   * @param {Object<string, string>|undefined} map
   * @param {Object<string, string>} baseMap
   * @param {string} id
   * @returns {string}
   */
  const pick = (map, baseMap, id) =>
    map && typeof map[id] === 'string' ? map[id] : baseMap[id];

  /**
   * Copia los campos de una entrada `{name, desc}` / `{name, rol}` con fallback campo por campo.
   * @param {{id: string}} entry - el objeto de data que se pisa in-place
   * @param {Object<string, string>|undefined} translated - la entrada traducida, si existe
   * @param {Object<string, string>} base - la entrada del baseline español
   * @param {string[]} fields
   */
  const applyFields = (entry, translated, base, fields) => {
    for (const field of fields) {
      entry[field] = translated && typeof translated[field] === 'string' ? translated[field] : base[field];
    }
  };

  for (const c of loaded.containers) c.name = pick(overlay?.containers, baseline.containers, c.id);
  for (const [containerId, pool] of Object.entries(loaded.items.containers)) {
    for (const item of pool) {
      item.name = pick(overlay?.items[containerId], baseline.items[containerId], item.id);
    }
  }
  for (const r of loaded.items.rarities) r.name = pick(overlay?.rarities, baseline.rarities, r.id);
  for (const a of loaded.achievements) a.name = pick(overlay?.achievements, baseline.achievements, a.id);
  for (const u of loaded.upgrades) u.label = pick(overlay?.upgrades, baseline.upgrades, u.id);
  for (const l of loaded.legendaries.items) l.name = pick(overlay?.legendaries, baseline.legendaries, l.id);

  for (const a of loaded.automations) applyFields(a, overlay?.automations[a.id], baseline.automations[a.id], ['name', 'desc']);
  for (const n of loaded.prestigeTree) applyFields(n, overlay?.prestigeTree[n.id], baseline.prestigeTree[n.id], ['name', 'desc']);
  for (const n of loaded.npcs) applyFields(n, overlay?.npcs[n.id], baseline.npcs[n.id], ['name', 'rol']);
  for (const s of loaded.specializations || []) applyFields(s, overlay?.specializations[s.id], baseline.specializations[s.id], ['name', 'desc']);
  for (const c of loaded.challenges || []) applyFields(c, overlay?.challenges[c.id], baseline.challenges[c.id], ['name', 'desc']);
  for (const n of loaded.deedsTree || []) applyFields(n, overlay?.deedsTree[n.id], baseline.deedsTree[n.id], ['name', 'desc']);
}
