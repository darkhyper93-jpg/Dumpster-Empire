/**
 * Ronda 9 (PLAN.md §11.3 ampliado): multiplicador de valor por nivel de contenedor.
 * multNivel = 1 + (nivel − 1) × levelValueMultPerLevel. Aplica al roll real, a la
 * automatización/offline, y NO mueve la Suerte recomendada (meta neutra de rondas 7/8).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getLevelValueMult, getRecommendedLuck, CONTAINER_LEVEL_MAX } from '../src/economy.js';
import { rollContainerResult } from '../src/systems/containers.js';
import { expectedContainerValue } from '../src/systems/offline.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const tacho = containers.find((c) => c.id === 'tachoVereda');

describe('Ronda 9 — multiplicador de valor por nivel (PLAN.md §11.3)', () => {
  it('literal: multNivel = 1 + (nivel − 1) × levelValueMultPerLevel', () => {
    const state = freshState();
    expect(getLevelValueMult(state, tacho)).toBe(1);
    state.containerLevels.tachoVereda = 5;
    expect(getLevelValueMult(state, tacho)).toBeCloseTo(1 + 4 * tacho.levelValueMultPerLevel, 10);
    state.containerLevels.tachoVereda = CONTAINER_LEVEL_MAX;
    expect(getLevelValueMult(state, tacho)).toBeCloseTo(1.45, 10);
  });

  it('el valor real de un escarbado escala con el nivel (roll determinista; el tacho tiene una sola categoría, así que el corrimiento de rareza no contamina el ratio)', () => {
    const random = () => 0.5;
    const low = freshState();
    const high = freshState();
    high.containerLevels.tachoVereda = 5;
    const a = rollContainerResult(low, tacho, false, items, data, random);
    const b = rollContainerResult(high, tacho, false, items, data, random);
    expect(a.isTrap).toBe(false);
    expect(b.isTrap).toBe(false);
    expect(b.moneyDelta / a.moneyDelta).toBeCloseTo(getLevelValueMult(high, tacho), 10);
  });

  it('el valor esperado de automatización/offline escala igual que el roll', () => {
    const low = freshState();
    const high = freshState();
    high.containerLevels.tachoVereda = CONTAINER_LEVEL_MAX;
    const ratio = expectedContainerValue(high, tacho, items, data) / expectedContainerValue(low, tacho, items, data);
    expect(ratio).toBeCloseTo(1.45, 10);
  });

  it('todos los contenedores definen levelValueMultPerLevel > 0 (constante de datos, no hardcode)', () => {
    for (const c of containers) expect(c.levelValueMultPerLevel).toBeGreaterThan(0);
  });

  it('un nivel manipulado en el save (fuera de rango o no entero) queda clampeado a [1, MAX] (el save es input externo)', () => {
    const state = freshState();
    state.containerLevels.tachoVereda = 1e15; // save trucho: dinero infinito sin clamp
    expect(getLevelValueMult(state, tacho)).toBeCloseTo(1.45, 10);
    state.containerLevels.tachoVereda = -5; // multiplicador negativo: los ítems RESTARÍAN dinero
    expect(getLevelValueMult(state, tacho)).toBe(1);
    state.containerLevels.tachoVereda = 2.7; // "Nivel 2.7/10" en la UI sin el floor
    expect(getLevelValueMult(state, tacho)).toBeCloseTo(1.05, 10);
  });

  it('la Suerte recomendada NO cambia aunque todos los contenedores estén a nivel máximo (meta neutra de rondas 7/8 intacta)', () => {
    const advanced = freshState();
    for (const c of containers) advanced.containerLevels[c.id] = CONTAINER_LEVEL_MAX;
    const rec = containers.map((c) => getRecommendedLuck(advanced, c, items, data));
    expect(rec).toEqual([0, 6, 16, 32, 56, 86, 126, 176]);
  });
});
