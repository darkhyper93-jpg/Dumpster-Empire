/**
 * Ronda 31, tarea 3 (ROADMAPv4 §31.3.3, PLAN.md §4.42) — ampliación del clamp de getDigRate a
 * [0.25, 1.5] y mecánica nueva de getAreaRate (Área efectiva por contenedor).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getAreaRate, getDigRate, getEffectiveDigTime } from '../src/economy.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';

const data = { upgrades, automations, prestigeTree };

describe('§4.42 getDigRate — clamp ampliado a [0.25, 1.5]', () => {
  it('con resistencia absurdamente alta, el piso es 0.25 (antes 0.3)', () => {
    const state = freshState();
    const extreme = { ...containers[0], resistencia: 1e9 };
    expect(getDigRate(state, extreme, data)).toBe(0.25);
  });

  it('getEffectiveDigTime es coherente con el piso nuevo: nunca más de digTime/0.25', () => {
    const state = freshState();
    const extreme = { ...containers[0], resistencia: 1e9, digTime: 10 };
    expect(getEffectiveDigTime(state, extreme, data)).toBeCloseTo(10 / 0.25, 10);
  });
});

describe('§4.42 getAreaRate — Área efectiva por contenedor (mecánica nueva)', () => {
  it('con Área al día (areaMult === areaRecomendada), el rate es ≈1 (neutro)', () => {
    const state = freshState();
    const container = { ...containers[0], areaRecomendada: 1 }; // getAreaMult base = 1 a nivel 0
    expect(getAreaRate(state, container, data)).toBeCloseTo(1, 5);
  });

  it('con Área muy por debajo de la recomendada, el rate cae hasta el piso 0.45', () => {
    const state = freshState();
    const container = { ...containers[0], areaRecomendada: 1000 };
    expect(getAreaRate(state, container, data)).toBe(0.45);
  });

  it('con Área muy por encima de la recomendada, el rate sube hasta el techo 1.2', () => {
    const state = freshState();
    state.upgradeLevels.area = 500;
    const container = { ...containers[0], areaRecomendada: 0.001 };
    expect(getAreaRate(state, container, data)).toBe(1.2);
  });

  it('sin areaRecomendada en el contenedor, cae a neutro (1) por defecto — nunca NaN/Infinity', () => {
    const state = freshState();
    const container = { ...containers[0], areaRecomendada: undefined };
    const rate = getAreaRate(state, container, data);
    expect(Number.isFinite(rate)).toBe(true);
  });
});
