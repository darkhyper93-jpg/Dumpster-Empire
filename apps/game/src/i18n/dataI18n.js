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

/**
 * @typedef {Object} LoadedData - los 6 JSON que carga main.js (ver DATA_FILES)
 * @property {Array<{id: string, name: string}>} containers
 * @property {{ rarities: Array<{id: string, name: string}>, containers: Object<string, Array<{id: string, name: string}>> }} items
 * @property {Array<{id: string, label: string}>} upgrades
 * @property {Array<{id: string, name: string, desc: string}>} automations
 * @property {Array<{id: string, name: string, desc: string}>} prestigeTree
 * @property {Array<{id: string, name: string}>} achievements
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
  };
}

/**
 * Pisa in-place los campos de display de `loaded` con el idioma pedido: 'en' usa data-en.js
 * (con fallback al baseline español si a la traducción le falta una clave — nunca un hueco
 * en pantalla), 'es' restaura el baseline. Idempotente: aplicar el mismo idioma dos veces
 * deja la data igual.
 * @param {LoadedData} loaded - el MISMO objeto que se pasó a initDataLocalization
 * @param {string} lang - 'es' | 'en' (cualquier otro valor cae al baseline español)
 */
export function applyDataLanguage(loaded, lang) {
  if (!baseline) {
    throw new Error('applyDataLanguage sin initDataLocalization previo (orden de boot roto, ver R-16.3)');
  }
  const useEn = lang === 'en';
  /**
   * @param {Object<string, string>|undefined} enMap
   * @param {Object<string, string>} baseMap
   * @param {string} id
   * @returns {string}
   */
  const pick = (enMap, baseMap, id) =>
    useEn && enMap && typeof enMap[id] === 'string' ? enMap[id] : baseMap[id];

  for (const c of loaded.containers) c.name = pick(dataEn.containers, baseline.containers, c.id);
  for (const [containerId, pool] of Object.entries(loaded.items.containers)) {
    for (const item of pool) {
      item.name = pick(dataEn.items[containerId], baseline.items[containerId], item.id);
    }
  }
  for (const r of loaded.items.rarities) r.name = pick(dataEn.rarities, baseline.rarities, r.id);
  for (const a of loaded.achievements) a.name = pick(dataEn.achievements, baseline.achievements, a.id);
  for (const a of loaded.automations) {
    const en = useEn ? dataEn.automations[a.id] : undefined;
    const base = baseline.automations[a.id];
    a.name = en && typeof en.name === 'string' ? en.name : base.name;
    a.desc = en && typeof en.desc === 'string' ? en.desc : base.desc;
  }
  for (const n of loaded.prestigeTree) {
    const en = useEn ? dataEn.prestigeTree[n.id] : undefined;
    const base = baseline.prestigeTree[n.id];
    n.name = en && typeof en.name === 'string' ? en.name : base.name;
    n.desc = en && typeof en.desc === 'string' ? en.desc : base.desc;
  }
  for (const u of loaded.upgrades) u.label = pick(dataEn.upgrades, baseline.upgrades, u.id);
}
