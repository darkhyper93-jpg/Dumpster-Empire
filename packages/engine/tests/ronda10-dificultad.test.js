/**
 * Ronda 10 (PLAN.md §11.2 ampliado): Fuerza y Búsqueda recomendadas por contenedor (metas
 * visibles, exponenciales) y nuevas metas de Suerte exponenciales (~×1.6 por tier).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getRecommendedDigPower, getRecommendedArea, getRecommendedLuck } from '../src/economy.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };

// AJUSTE (ronda 11): estos 3 guards son sobre los 8 contenedores ORIGINALES de la ronda 10
// (`containers.slice(0, 8)`), no sobre el array completo — la ronda 11 agregó 4 contenedores de
// prestigio al final de `containers.json`, y este archivo solo debe detectar una regresión en la
// tabla de la ronda 10, no fallar porque ahora hay más contenedores.
const round10Containers = containers.slice(0, 8);

describe('Ronda 10 — dificultad exponencial (PLAN.md §11.2)', () => {
  // AJUSTE (ronda 31, PLAN.md §4.42): tabla de resistencia/areaRecomendada recalibrada a
  // ~×1.5 por tier (antes ~×1.35) — ver ronda31-balance.test.js para el guard genérico contra
  // containers.json completo.
  it('la Fuerza recomendada es la resistencia del contenedor y crece exponencialmente', () => {
    const state = freshState();
    const rec = round10Containers.map((c) => getRecommendedDigPower(state, c));
    expect(rec).toEqual([1.0, 1.55, 2.4, 3.7, 5.7, 8.8, 13.5, 20.5]);
    for (let i = 2; i < rec.length; i++) {
      const growthPrev = rec[i - 1] / rec[i - 2];
      const growth = rec[i] / rec[i - 1];
      expect(growth).toBeGreaterThan(1.2); // exponencial de verdad, no lineal
      expect(Math.abs(growth - growthPrev)).toBeLessThan(0.25); // razón ~constante
    }
  });

  it('la Búsqueda recomendada sale de la constante de datos areaRecomendada', () => {
    const state = freshState();
    const rec = round10Containers.map((c) => getRecommendedArea(state, c));
    expect(rec).toEqual([1, 1.45, 2.25, 3.45, 5.3, 8.2, 12.5, 19]);
  });

  it('las metas de Suerte de la ronda 10 son exponenciales (~×1.6 por tier)', () => {
    const neutral = freshState();
    const rec = round10Containers.map((c) => getRecommendedLuck(neutral, c, items, data));
    expect(rec).toEqual([0, 8, 20, 40, 72, 120, 190, 290]);
  });
});
