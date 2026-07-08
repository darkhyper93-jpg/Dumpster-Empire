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

describe('Ronda 10 — dificultad exponencial (PLAN.md §11.2)', () => {
  it('la Fuerza recomendada es la resistencia del contenedor y crece exponencialmente', () => {
    const state = freshState();
    const rec = containers.map((c) => getRecommendedDigPower(state, c));
    expect(rec).toEqual([1.0, 1.35, 1.85, 2.5, 3.4, 4.7, 6.4, 8.7]);
    for (let i = 2; i < rec.length; i++) {
      const growthPrev = rec[i - 1] / rec[i - 2];
      const growth = rec[i] / rec[i - 1];
      expect(growth).toBeGreaterThan(1.2); // exponencial de verdad, no lineal
      expect(Math.abs(growth - growthPrev)).toBeLessThan(0.25); // razón ~constante
    }
  });

  it('la Búsqueda recomendada sale de la constante de datos areaRecomendada', () => {
    const state = freshState();
    const rec = containers.map((c) => getRecommendedArea(state, c));
    expect(rec).toEqual([1, 1.35, 1.8, 2.45, 3.3, 4.5, 6.1, 8.2]);
  });

  it('las metas de Suerte de la ronda 10 son exponenciales (~×1.6 por tier)', () => {
    const neutral = freshState();
    const rec = containers.map((c) => getRecommendedLuck(neutral, c, items, data));
    expect(rec).toEqual([0, 8, 20, 40, 72, 120, 190, 290]);
  });
});
