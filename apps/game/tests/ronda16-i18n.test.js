/**
 * Ronda 16, Agente B — plomería de idioma. Cubre: resolveInitialLanguage (pura, sin navigator),
 * paridad DINÁMICA de es.js/en.js (claves y {params} por clave, sin conteos hardcodeados),
 * paridad de ids entre data-en.js y la data real (en ambas direcciones, para detectar huecos
 * y sobras), y el overlay in-place de dataI18n.js (aplicar, fallback, restaurar, idempotencia,
 * orden de boot roto).
 */

import { describe, it, expect } from 'vitest';
import { resolveInitialLanguage } from '../src/i18n/i18n.js';
import es from '../src/i18n/es.js';
import en from '../src/i18n/en.js';
import dataEn from '../src/i18n/data-en.js';
import { initDataLocalization, applyDataLanguage } from '../src/i18n/dataI18n.js';
import containersData from '../src/data/containers.json';
import itemsData from '../src/data/items.json';
import upgradesData from '../src/data/upgrades.json';
import automationsData from '../src/data/automations.json';
import prestigeTreeData from '../src/data/prestigeTree.json';
import achievementsData from '../src/data/achievements.json';
import legendariesData from '../src/data/legendaries.json';
import npcsData from '../src/data/npcs.json';

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

  it('cualquier otro locale (o basura) resuelve inglés', () => {
    expect(resolveInitialLanguage('en-US')).toBe('en');
    expect(resolveInitialLanguage('pt-BR')).toBe('en');
    expect(resolveInitialLanguage(undefined)).toBe('en');
    expect(resolveInitialLanguage(null)).toBe('en');
    expect(resolveInitialLanguage('')).toBe('en');
    // "estonio" empieza con 'es' como substring pero NO es es-*: 'et' no debe confundirse;
    // y un valor no-string nunca debe romper el boot.
    expect(resolveInitialLanguage(42)).toBe('en');
  });
});

describe('paridad es.js ↔ en.js (dinámica, sin conteos hardcodeados)', () => {
  it('mismas claves en ambos diccionarios', () => {
    const esKeys = Object.keys(es).sort();
    const enKeys = Object.keys(en).sort();
    expect(esKeys).toEqual(enKeys);
    expect(esKeys.length).toBeGreaterThan(0);
  });

  it('cada clave usa exactamente los mismos {params} en ambos idiomas', () => {
    const paramsOf = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(es)) {
      expect(paramsOf(en[key]), `params de "${key}" difieren entre es.js y en.js`).toEqual(paramsOf(es[key]));
    }
  });
});

describe('paridad data-en.js ↔ data real (ambas direcciones)', () => {
  const idsOf = (arr) => arr.map((x) => x.id).sort();
  const keysOf = (obj) => Object.keys(obj).sort();

  it('containers: mismos ids', () => {
    expect(keysOf(dataEn.containers)).toEqual(idsOf(containersData));
  });

  it('items: mismos contenedores y mismos ids de ítem por pool', () => {
    expect(keysOf(dataEn.items)).toEqual(keysOf(itemsData.containers));
    for (const [containerId, pool] of Object.entries(itemsData.containers)) {
      expect(keysOf(dataEn.items[containerId]), `pool de ${containerId}`).toEqual(idsOf(pool));
    }
  });

  it('rarities: mismos ids', () => {
    expect(keysOf(dataEn.rarities)).toEqual(idsOf(itemsData.rarities));
  });

  it('achievements: mismos ids', () => {
    expect(keysOf(dataEn.achievements)).toEqual(idsOf(achievementsData));
  });

  it('automations: mismos ids, cada entrada con name y desc string', () => {
    expect(keysOf(dataEn.automations)).toEqual(idsOf(automationsData));
    for (const [id, entry] of Object.entries(dataEn.automations)) {
      expect(typeof entry.name, `automations.${id}.name`).toBe('string');
      expect(typeof entry.desc, `automations.${id}.desc`).toBe('string');
    }
  });

  it('prestigeTree: mismos ids, cada entrada con name y desc string', () => {
    expect(keysOf(dataEn.prestigeTree)).toEqual(idsOf(prestigeTreeData));
    for (const [id, entry] of Object.entries(dataEn.prestigeTree)) {
      expect(typeof entry.name, `prestigeTree.${id}.name`).toBe('string');
      expect(typeof entry.desc, `prestigeTree.${id}.desc`).toBe('string');
    }
  });

  it('upgrades: mismos ids', () => {
    expect(keysOf(dataEn.upgrades)).toEqual(idsOf(upgradesData));
  });

  it('legendaries: mismos ids (ronda 22)', () => {
    expect(keysOf(dataEn.legendaries)).toEqual(idsOf(legendariesData.items));
  });

  it('npcs: mismos ids, cada entrada con name y rol string (ronda 23.C)', () => {
    expect(keysOf(dataEn.npcs)).toEqual(idsOf(npcsData));
    for (const [id, entry] of Object.entries(dataEn.npcs)) {
      expect(typeof entry.name, `npcs.${id}.name`).toBe('string');
      expect(typeof entry.rol, `npcs.${id}.rol`).toBe('string');
    }
  });
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
