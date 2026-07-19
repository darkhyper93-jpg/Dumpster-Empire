/**
 * Ronda 30 — franjas horarias COSMÉTICAS (PLAN.md §4.40).
 *
 * Contrato central de la ronda: las 5 franjas son puramente estéticas (eligen qué modelo de
 * contenedor se dibuja). El día/noche JUGABLE de la ronda 24 (§4.33, binario, noche 20-06 con
 * Suerte +3 y trampa +0.03) queda INTACTO — decisión del usuario 2026-07-19. Por eso el último
 * bloque de tests fija que agregar franjas no movió un solo número de balance.
 */

import { describe, it, expect } from 'vitest';
import { getTimeBand, isNightHour, getDayNightModifiers } from '../src/index.js';
import dayNight from '../../../apps/game/src/data/dayNight.json' with { type: 'json' };

describe('getTimeBand — franjas cosméticas (§4.40)', () => {
  it('las franjas salen de la data, cubren las 24 horas sin huecos ni solapes y arrancan en 0', () => {
    const bands = dayNight.timeBands;
    expect(Array.isArray(bands)).toBe(true);
    expect(bands.length).toBeGreaterThan(0);
    // Ordenadas y arrancando en la medianoche: si no, hay horas sin franja.
    expect(bands[0].startHour).toBe(0);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i].startHour).toBeGreaterThan(bands[i - 1].startHour);
    }
    expect(bands[bands.length - 1].startHour).toBeLessThan(24);
    // Cobertura total derivada de la data (cero conteos hardcodeados, §0 del roadmap).
    const ids = new Set(bands.map((b) => b.id));
    expect(ids.size).toBe(bands.length);
    for (let h = 0; h < 24; h += 1) {
      expect(ids.has(getTimeBand(h, dayNight))).toBe(true);
    }
  });

  it('cada hora cae en la franja cuyo tramo la contiene (bordes incluidos)', () => {
    const bands = dayNight.timeBands;
    for (let h = 0; h < 24; h += 1) {
      // La franja esperada es la última cuyo startHour <= h.
      const expected = bands.reduce((acc, b) => (b.startHour <= h ? b : acc), bands[0]);
      expect(getTimeBand(h, dayNight), `hora ${h}`).toBe(expected.id);
    }
  });

  it('el primer instante de cada franja ya devuelve esa franja (test de borde exacto)', () => {
    for (const band of dayNight.timeBands) {
      expect(getTimeBand(band.startHour, dayNight)).toBe(band.id);
    }
  });

  it('hora hostil o data ausente degrada a la primera franja en vez de romper', () => {
    // Regla dura 13/14: lo que pasa el typeof pero rompe la UI. `getHours()` no debería dar esto
    // nunca, pero la firma es pública y el fallback tiene que ser total.
    const first = dayNight.timeBands[0].id;
    for (const hostile of [NaN, Infinity, -Infinity, -1, 24, 99, '12', null, undefined, {}]) {
      expect(getTimeBand(hostile, dayNight), String(hostile)).toBe(first);
    }
    expect(getTimeBand(12, undefined)).toBe(null);
    expect(getTimeBand(12, {})).toBe(null);
    expect(getTimeBand(12, { timeBands: [] })).toBe(null);
  });

  it('es pura: no lee el reloj (misma hora ⇒ misma franja siempre)', () => {
    expect(getTimeBand(3, dayNight)).toBe(getTimeBand(3, dayNight));
  });
});

describe('las franjas NO tocan el balance de la ronda 24 (§4.33 intacto)', () => {
  it('isNightHour sigue siendo binario con el tramo 20-06 de la data', () => {
    expect(dayNight.nightStartHour).toBe(20);
    expect(dayNight.nightEndHour).toBe(6);
    for (const h of [20, 21, 23, 0, 3, 5]) expect(isNightHour(h, dayNight), `h=${h}`).toBe(true);
    for (const h of [6, 7, 12, 17, 19]) expect(isNightHour(h, dayNight), `h=${h}`).toBe(false);
  });

  it('los modificadores siguen teniendo SOLO dos valores posibles: los de noche y los neutros', () => {
    const seen = new Set();
    for (let h = 0; h < 24; h += 1) seen.add(JSON.stringify(getDayNightModifiers(h, dayNight)));
    expect(seen.size).toBe(2);
    expect(getDayNightModifiers(23, dayNight)).toEqual({
      luckBonus: dayNight.nightLuckBonus,
      trapProbBonus: dayNight.nightTrapProbBonus,
    });
    expect(getDayNightModifiers(12, dayNight)).toEqual({ luckBonus: 0, trapProbBonus: 0 });
  });

  it('ninguna franja aporta modificadores propios (son cosméticas y nada más)', () => {
    for (const band of dayNight.timeBands) {
      expect(band.luckBonus, `${band.id} no debe traer balance`).toBeUndefined();
      expect(band.trapProbBonus, `${band.id} no debe traer balance`).toBeUndefined();
    }
  });
});
