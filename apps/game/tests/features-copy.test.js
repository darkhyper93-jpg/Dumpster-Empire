/**
 * Ronda "features" (pedido del usuario, 2026-07-22) — el lado COPY de los cinco pedidos, en los
 * CINCO idiomas (regla §1.15: nada de placeholders en español).
 *
 *  2. La Vitrina de legendarios es GLOBAL, no del contenedor seleccionado: gana un subtítulo que
 *     lo dice y cada pedestal muestra de qué rareza sale (el usuario no entendía por qué el
 *     "Tacho de Vereda" mostraba una vitrina de 8 piezas).
 *  3. Se ELIMINA `automation.hint` ("Botón gris = ...") de los cinco diccionarios y de la vista.
 *  4. Las cuatro herramientas nuevas tienen nombre traducido de verdad en los cinco idiomas.
 *  5. `shop.rateLine` / `shop.areaRateLine` dejan de llamarse "Ritmo"/"Pincel" (nombran la
 *     herramienta, no el efecto) y pasan a "Velocidad"/"Alcance" — Speed/Reach en inglés.
 *
 * TDD: escrito en ROJO antes de tocar los diccionarios y las vistas.
 */

import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES } from '@dumpster/engine';
import { DICTIONARIES } from '../src/i18n/i18n.js';
import tools from '../src/data/tools.json';

/** Los ids de herramienta que se agregan en esta ronda (los viejos ya tenían clave). */
const HERRAMIENTAS_NUEVAS = ['exoesqueletoChatarrero', 'taladroNucleo', 'barredoraGravitatoria', 'excavadoraSingular'];

describe('3. el cartel "Botón gris = ..." se va de la Automatización', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    it(`${lang}: no existe la clave automation.hint`, () => {
      expect(Object.hasOwn(DICTIONARIES[lang], 'automation.hint')).toBe(false);
    });
  }
});

describe('4. nombre de las herramientas nuevas en los cinco idiomas', () => {
  it('toda herramienta de tools.json tiene su clave tools.<id> en TODOS los idiomas', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const tool of tools) {
        const key = `tools.${tool.id}`;
        expect(Object.hasOwn(DICTIONARIES[lang], key), `falta ${key} en ${lang}`).toBe(true);
        expect(String(DICTIONARIES[lang][key]).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('los nombres nuevos NO son el texto español copiado en otro idioma (traducción real)', () => {
    for (const id of HERRAMIENTAS_NUEVAS) {
      const key = `tools.${id}`;
      for (const lang of SUPPORTED_LANGUAGES.filter((l) => l !== 'es')) {
        expect(DICTIONARIES[lang][key], `${key} sin traducir en ${lang}`).not.toBe(DICTIONARIES.es[key]);
      }
    }
  });
});

describe('5. las etiquetas bajo cada contenedor nombran el EFECTO, no la herramienta', () => {
  it('shop.rateLine y shop.areaRateLine siguen existiendo en los cinco idiomas con su {pct}', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const key of ['shop.rateLine', 'shop.areaRateLine']) {
        expect(DICTIONARIES[lang][key], `falta ${key} en ${lang}`).toContain('{pct}');
      }
    }
  });

  it('ya no dicen "Ritmo"/"Pincel" (es) ni "Pace"/"Brush" (en)', () => {
    expect(DICTIONARIES.es['shop.rateLine']).toContain('Velocidad');
    expect(DICTIONARIES.es['shop.areaRateLine']).toContain('Alcance');
    expect(DICTIONARIES.en['shop.rateLine']).toContain('Speed');
    expect(DICTIONARIES.en['shop.areaRateLine']).toContain('Reach');
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(DICTIONARIES[lang]['shop.areaRateLine']).not.toMatch(/pincel|brush|pinsel|pincelada/i);
    }
  });

  it('las dos etiquetas tienen tooltip explicando contra qué se compara el %', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const key of ['shop.rateLineTitle', 'shop.areaRateLineTitle']) {
        expect(Object.hasOwn(DICTIONARIES[lang], key), `falta ${key} en ${lang}`).toBe(true);
        expect(String(DICTIONARIES[lang][key]).trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('2. la Vitrina se declara global y cada pedestal dice de qué rareza sale', () => {
  it('existe el subtítulo global de la vitrina en los cinco idiomas', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(Object.hasOwn(DICTIONARIES[lang], 'collection.showcaseGlobalHint'), `falta en ${lang}`).toBe(true);
      expect(String(DICTIONARIES[lang]['collection.showcaseGlobalHint']).trim().length).toBeGreaterThan(0);
    }
  });

  it('existe la línea de origen por pedestal, con su {categoria}, en los cinco idiomas', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(DICTIONARIES[lang]['collection.showcaseFrom'], `falta en ${lang}`).toContain('{categoria}');
    }
  });
});

describe('1. la venta en lote del Puesto tiene su copy en los cinco idiomas', () => {
  it('stall.sellAll y stall.sellAllDone existen y stall.sellAllDone lleva {count} y {amount}', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(String(DICTIONARIES[lang]['stall.sellAll'] || '').trim().length, `falta stall.sellAll en ${lang}`).toBeGreaterThan(0);
      const done = DICTIONARIES[lang]['stall.sellAllDone'] || '';
      expect(done, `falta stall.sellAllDone en ${lang}`).toContain('{count}');
      expect(done).toContain('{amount}');
    }
  });
});
