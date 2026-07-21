/**
 * Ronda 16, Agente B — plomería de idioma. Cubre: resolveInitialLanguage (pura, sin navigator),
 * paridad DINÁMICA de es.js/en.js (claves y {params} por clave, sin conteos hardcodeados),
 * paridad de ids entre data-en.js y la data real (en ambas direcciones, para detectar huecos
 * y sobras), y el overlay in-place de dataI18n.js (aplicar, fallback, restaurar, idempotencia,
 * orden de boot roto).
 *
 * Ronda 33: la paridad se DERIVA de `SUPPORTED_LANGUAGES` (es/en/pt/fr/de) en vez de mirar
 * es.js/en.js a mano — agregar un idioma nuevo al allow-list hace fallar estos tests hasta que
 * su diccionario de UI y su overlay de data estén completos. Nada de conteos hardcodeados.
 */

import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES } from '@dumpster/engine';
import { resolveInitialLanguage, DICTIONARIES } from '../src/i18n/i18n.js';
import es from '../src/i18n/es.js';
import en from '../src/i18n/en.js';
import dataEn from '../src/i18n/data-en.js';
import { initDataLocalization, applyDataLanguage, DATA_DICTIONARIES } from '../src/i18n/dataI18n.js';
import containersData from '../src/data/containers.json';
import itemsData from '../src/data/items.json';
import upgradesData from '../src/data/upgrades.json';
import automationsData from '../src/data/automations.json';
import prestigeTreeData from '../src/data/prestigeTree.json';
import achievementsData from '../src/data/achievements.json';
import legendariesData from '../src/data/legendaries.json';
import npcsData from '../src/data/npcs.json';
import specializationsData from '../src/data/specializations.json';
import challengesData from '../src/data/challenges.json';
import deedsTreeData from '../src/data/deedsTree.json';

// El throw por orden de boot roto va PRIMERO: dataI18n guarda el baseline en estado de módulo
// y cualquier initDataLocalization posterior lo dejaría seteado para el resto del archivo.
describe('dataI18n — orden de boot (R-16.3)', () => {
  it('applyDataLanguage sin initDataLocalization previo lanza Error (no falla en silencio)', () => {
    expect(() => applyDataLanguage({ containers: [] }, 'en')).toThrow(/initDataLocalization/);
  });
});

describe('resolveInitialLanguage (R-16.8: pura, navigator por parámetro)', () => {
  it('es-* en cualquier casing resuelve español', () => {
    expect(resolveInitialLanguage('es')).toBe('es');
    expect(resolveInitialLanguage('es-AR')).toBe('es');
    expect(resolveInitialLanguage('ES-mx')).toBe('es');
  });

  // Ronda 33: pt/fr/de entran al allow-list y por lo tanto al mapeo de locale del navegador.
  it('pt-*, fr-* y de-* resuelven su propio idioma (ronda 33)', () => {
    expect(resolveInitialLanguage('pt')).toBe('pt');
    expect(resolveInitialLanguage('pt-BR')).toBe('pt');
    expect(resolveInitialLanguage('PT-pt')).toBe('pt');
    expect(resolveInitialLanguage('fr')).toBe('fr');
    expect(resolveInitialLanguage('fr-CA')).toBe('fr');
    expect(resolveInitialLanguage('de')).toBe('de');
    expect(resolveInitialLanguage('de-AT')).toBe('de');
    expect(resolveInitialLanguage('DE-ch')).toBe('de');
  });

  it('cualquier otro locale (o basura) resuelve inglés', () => {
    expect(resolveInitialLanguage('en-US')).toBe('en');
    expect(resolveInitialLanguage('it-IT')).toBe('en');
    expect(resolveInitialLanguage('ja')).toBe('en');
    expect(resolveInitialLanguage(undefined)).toBe('en');
    expect(resolveInitialLanguage(null)).toBe('en');
    expect(resolveInitialLanguage('')).toBe('en');
    // "estonio" empieza con 'es' como substring pero NO es es-*: 'et' no debe confundirse;
    // y un valor no-string nunca debe romper el boot.
    expect(resolveInitialLanguage(42)).toBe('en');
    expect(resolveInitialLanguage('et-EE')).toBe('en');
    // 'des-XX' no existe como locale, pero verifica que el match sea por PREFIJO de subtag y no
    // por substring suelto (un `includes('de')` daría alemán acá).
    expect(resolveInitialLanguage('nl-NL')).toBe('en');
  });

  it('todo idioma que resuelve está dentro de SUPPORTED_LANGUAGES', () => {
    for (const lang of [...SUPPORTED_LANGUAGES, 'it-IT', 'zzz', '', undefined]) {
      expect(SUPPORTED_LANGUAGES).toContain(resolveInitialLanguage(lang));
    }
  });
});

describe('paridad de diccionarios de UI (derivada de SUPPORTED_LANGUAGES, ronda 33)', () => {
  const esKeys = Object.keys(es).sort();
  /** @param {string} value @returns {string[]} nombres de los `{param}` del template, ordenados */
  const paramsOf = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it('hay un diccionario por cada idioma soportado, y ninguno de sobra', () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
    expect(esKeys.length).toBeGreaterThan(0);
  });

  for (const lang of SUPPORTED_LANGUAGES) {
    it(`${lang}: mismas claves que es.js`, () => {
      expect(Object.keys(DICTIONARIES[lang]).sort()).toEqual(esKeys);
    });

    // Dos reglas distintas, por un motivo concreto:
    //  (a) un param que NO está en es.js se renderiza crudo en pantalla ("{foo}") → prohibido siempre;
    //  (b) faltar un param pierde información → prohibido, SALVO `plural`, que es el sufijo de
    //      pluralización "" | "s" que arma la UI: alemán ("Stadtschlüssel", "Roboter") y francés
    //      ("bras") tienen plurales invariables donde pegar una "s" sería una falta de ortografía.
    const PLURAL_SUFFIX_PARAM = 'plural';
    it(`${lang}: no introduce {params} que es.js no tenga`, () => {
      for (const key of esKeys) {
        const extra = paramsOf(DICTIONARIES[lang][key]).filter((p) => !paramsOf(es[key]).includes(p));
        expect(extra, `${lang}.js["${key}"] usa params inexistentes (saldrían crudos en pantalla)`).toEqual([]);
      }
    });

    it(`${lang}: no pierde ningún {param} de es.js (salvo el sufijo de plural)`, () => {
      for (const key of esKeys) {
        const missing = paramsOf(es[key])
          .filter((p) => p !== PLURAL_SUFFIX_PARAM)
          .filter((p) => !paramsOf(DICTIONARIES[lang][key]).includes(p));
        expect(missing, `${lang}.js["${key}"] pierde params de es.js`).toEqual([]);
      }
    });

    it(`${lang}: ningún valor vacío ni no-string`, () => {
      for (const key of esKeys) {
        const value = DICTIONARIES[lang][key];
        expect(typeof value, `${lang}.js["${key}"] no es string`).toBe('string');
        expect(value.trim().length, `${lang}.js["${key}"] está vacío`).toBeGreaterThan(0);
      }
    });
  }

  // Regla §1.15: los idiomas nuevos entran con traducción REAL, no con el español copiado. Se
  // mide como proporción para tolerar los pocos calcos legítimos (nombres propios de NPC,
  // "Chispa", siglas). AJUSTE: umbral 0.5 — el peor caso real es el portugués (lengua hermana),
  // que igual queda muy por debajo; un diccionario copiado del español daría ~1.0.
  const MAX_IDENTICAL_TO_ES_RATIO = 0.5;
  for (const lang of SUPPORTED_LANGUAGES.filter((l) => l !== 'es')) {
    it(`${lang}: es una traducción real, no una copia del español`, () => {
      const identical = esKeys.filter((key) => DICTIONARIES[lang][key] === es[key]).length;
      expect(identical / esKeys.length).toBeLessThan(MAX_IDENTICAL_TO_ES_RATIO);
    });
  }
});

describe('paridad de overlays de data ↔ data real (ambas direcciones, todos los idiomas)', () => {
  const idsOf = (arr) => arr.map((x) => x.id).sort();
  const keysOf = (obj) => Object.keys(obj).sort();

  /** Idiomas con overlay de data: todos menos el español, que ES la data real (fuente de verdad). */
  const overlayLangs = SUPPORTED_LANGUAGES.filter((lang) => lang !== 'es');

  /**
   * Colecciones planas `id → string` y colecciones con `{name, desc}` (o `{name, rol}`),
   * derivadas de la data real. Agregar una colección nueva acá la cubre en TODOS los idiomas.
   */
  const flatCollections = [
    ['containers', idsOf(containersData)],
    ['rarities', idsOf(itemsData.rarities)],
    ['achievements', idsOf(achievementsData)],
    ['upgrades', idsOf(upgradesData)],
    ['legendaries', idsOf(legendariesData.items)],
  ];
  const richCollections = [
    ['automations', idsOf(automationsData), ['name', 'desc']],
    ['prestigeTree', idsOf(prestigeTreeData), ['name', 'desc']],
    ['npcs', idsOf(npcsData), ['name', 'rol']],
    ['specializations', idsOf(specializationsData), ['name', 'desc']],
    ['challenges', idsOf(challengesData), ['name', 'desc']],
    ['deedsTree', idsOf(deedsTreeData), ['name', 'desc']],
  ];

  it('hay un overlay de data por cada idioma con overlay, y ninguno de sobra', () => {
    expect(keysOf(DATA_DICTIONARIES)).toEqual([...overlayLangs].sort());
  });

  for (const lang of overlayLangs) {
    for (const [collection, expectedIds] of flatCollections) {
      it(`${lang}/${collection}: mismos ids y todo valor string no vacío`, () => {
        const map = DATA_DICTIONARIES[lang][collection];
        expect(keysOf(map)).toEqual(expectedIds);
        for (const [id, value] of Object.entries(map)) {
          expect(typeof value, `${lang}.${collection}.${id}`).toBe('string');
          expect(value.trim().length, `${lang}.${collection}.${id} vacío`).toBeGreaterThan(0);
        }
      });
    }

    it(`${lang}/items: mismos contenedores y mismos ids de ítem por pool`, () => {
      const map = DATA_DICTIONARIES[lang].items;
      expect(keysOf(map)).toEqual(keysOf(itemsData.containers));
      for (const [containerId, pool] of Object.entries(itemsData.containers)) {
        expect(keysOf(map[containerId]), `${lang}: pool de ${containerId}`).toEqual(idsOf(pool));
        for (const [id, value] of Object.entries(map[containerId])) {
          expect(typeof value, `${lang}.items.${containerId}.${id}`).toBe('string');
          expect(value.trim().length, `${lang}.items.${containerId}.${id} vacío`).toBeGreaterThan(0);
        }
      }
    });

    for (const [collection, expectedIds, fields] of richCollections) {
      it(`${lang}/${collection}: mismos ids, cada entrada con ${fields.join(' y ')} string`, () => {
        const map = DATA_DICTIONARIES[lang][collection];
        expect(keysOf(map)).toEqual(expectedIds);
        for (const [id, entry] of Object.entries(map)) {
          for (const field of fields) {
            expect(typeof entry[field], `${lang}.${collection}.${id}.${field}`).toBe('string');
            expect(
              entry[field].trim().length,
              `${lang}.${collection}.${id}.${field} vacío`
            ).toBeGreaterThan(0);
          }
        }
      });
    }
  }
});

describe('dataI18n — overlay in-place con fallback y restauración', () => {
  /**
   * Data sintética mínima con la MISMA forma que la real: un id que existe en data-en.js
   * (tachoVereda / can-crushed / common / a1 / guantes / capitalInicial / luck) y un id
   * inventado que NO está (fantasmaXYZ), para probar el fallback al baseline español.
   */
  const makeLoaded = () => ({
    containers: [
      { id: 'tachoVereda', name: 'Tacho de Vereda (base)' },
      { id: 'fantasmaXYZ', name: 'Contenedor Fantasma' },
    ],
    items: {
      rarities: [
        { id: 'common', name: 'Basura Común (base)' },
        { id: 'fantasmaXYZ', name: 'Rareza Fantasma' },
      ],
      containers: {
        tachoVereda: [
          { id: 'can-crushed', name: 'Lata aplastada (base)' },
          { id: 'fantasma-item', name: 'Ítem Fantasma' },
        ],
      },
    },
    upgrades: [
      { id: 'luck', label: 'Suerte (base)' },
      { id: 'fantasmaXYZ', label: 'Mejora Fantasma' },
    ],
    automations: [
      { id: 'guantes', name: 'Guantes (base)', desc: 'Desc base.' },
      { id: 'fantasmaXYZ', name: 'Máquina Fantasma', desc: 'Desc fantasma.' },
    ],
    prestigeTree: [
      { id: 'capitalInicial', name: 'Capital Inicial (base)', desc: 'Desc base.' },
      { id: 'fantasmaXYZ', name: 'Nodo Fantasma', desc: 'Desc fantasma.' },
    ],
    achievements: [
      { id: 'a1', name: 'Primeros Pasos (base)' },
      { id: 'fantasmaXYZ', name: 'Logro Fantasma' },
    ],
    legendaries: {
      legendaryChance: 0.002,
      items: [
        { id: 'legendary-first-can', name: 'La Primera Lata (base)' },
        { id: 'fantasmaXYZ', name: 'Legendario Fantasma' },
      ],
    },
    npcs: [
      { id: 'rita', name: 'Doña Rita (base)', rol: 'Rol base.' },
      { id: 'fantasmaXYZ', name: 'NPC Fantasma', rol: 'Rol fantasma.' },
    ],
  });

  // Ronda 33: el ida y vuelta se prueba para TODOS los idiomas con overlay, no solo inglés.
  for (const lang of SUPPORTED_LANGUAGES.filter((l) => l !== 'es')) {
    it(`aplica '${lang}' por id y vuelve al baseline español sin pérdida`, () => {
      const loaded = makeLoaded();
      const snapshot = JSON.parse(JSON.stringify(loaded));
      initDataLocalization(loaded);
      applyDataLanguage(loaded, lang);
      const overlay = DATA_DICTIONARIES[lang];
      expect(loaded.containers[0].name).toBe(overlay.containers.tachoVereda);
      expect(loaded.achievements[0].name).toBe(overlay.achievements.a1);
      expect(loaded.automations[0].desc).toBe(overlay.automations.guantes.desc);
      expect(loaded.npcs[0].rol).toBe(overlay.npcs.rita.rol);
      // Los ids fantasma siempre caen al baseline español: nunca `undefined` en pantalla.
      expect(loaded.containers[1].name).toBe('Contenedor Fantasma');
      expect(loaded.npcs[1].rol).toBe('Rol fantasma.');
      applyDataLanguage(loaded, 'es');
      expect(loaded).toEqual(snapshot);
    });
  }

  it("aplica 'en' por id, con fallback al baseline para ids que no están en data-en.js", () => {
    const loaded = makeLoaded();
    initDataLocalization(loaded);
    applyDataLanguage(loaded, 'en');
    // Ids conocidos: toman el valor de data-en.js (hoy en español a propósito, tarea 16.C).
    expect(loaded.containers[0].name).toBe(dataEn.containers.tachoVereda);
    expect(loaded.items.containers.tachoVereda[0].name).toBe(dataEn.items.tachoVereda['can-crushed']);
    expect(loaded.items.rarities[0].name).toBe(dataEn.rarities.common);
    expect(loaded.achievements[0].name).toBe(dataEn.achievements.a1);
    expect(loaded.automations[0].name).toBe(dataEn.automations.guantes.name);
    expect(loaded.automations[0].desc).toBe(dataEn.automations.guantes.desc);
    expect(loaded.prestigeTree[0].desc).toBe(dataEn.prestigeTree.capitalInicial.desc);
    expect(loaded.upgrades[0].label).toBe(dataEn.upgrades.luck);
    expect(loaded.legendaries.items[0].name).toBe(dataEn.legendaries['legendary-first-can']);
    expect(loaded.npcs[0].name).toBe(dataEn.npcs.rita.name);
    expect(loaded.npcs[0].rol).toBe(dataEn.npcs.rita.rol);
    // Ids fantasma: caen al baseline español, nunca undefined ni hueco.
    expect(loaded.containers[1].name).toBe('Contenedor Fantasma');
    expect(loaded.items.containers.tachoVereda[1].name).toBe('Ítem Fantasma');
    expect(loaded.items.rarities[1].name).toBe('Rareza Fantasma');
    expect(loaded.achievements[1].name).toBe('Logro Fantasma');
    expect(loaded.automations[1].desc).toBe('Desc fantasma.');
    expect(loaded.prestigeTree[1].name).toBe('Nodo Fantasma');
    expect(loaded.upgrades[1].label).toBe('Mejora Fantasma');
    expect(loaded.legendaries.items[1].name).toBe('Legendario Fantasma');
    expect(loaded.npcs[1].name).toBe('NPC Fantasma');
    expect(loaded.npcs[1].rol).toBe('Rol fantasma.');
  });

  it("restaura el baseline español completo al volver a 'es' (ida y vuelta sin pérdida)", () => {
    const loaded = makeLoaded();
    const snapshot = JSON.parse(JSON.stringify(loaded));
    initDataLocalization(loaded);
    applyDataLanguage(loaded, 'en');
    applyDataLanguage(loaded, 'es');
    expect(loaded).toEqual(snapshot);
  });

  it('aplicar el mismo idioma dos veces es idempotente', () => {
    const loaded = makeLoaded();
    initDataLocalization(loaded);
    applyDataLanguage(loaded, 'en');
    const after = JSON.parse(JSON.stringify(loaded));
    applyDataLanguage(loaded, 'en');
    expect(loaded).toEqual(after);
  });

  it("un idioma fuera del allow-list cae al baseline español (nunca rompe)", () => {
    const loaded = makeLoaded();
    const snapshot = JSON.parse(JSON.stringify(loaded));
    initDataLocalization(loaded);
    applyDataLanguage(loaded, '<img src=x>');
    expect(loaded).toEqual(snapshot);
  });
});
