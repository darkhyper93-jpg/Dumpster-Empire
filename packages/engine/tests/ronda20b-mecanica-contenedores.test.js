/**
 * Ronda 20, Agente B (data + canvas) — PLAN.md §4.24: contenedores con mecánica propia
 * (Bóveda a Contrarreloj, Sótano Sin Luz), `fueraDeCadena` en `isContainerUnlocked`, y
 * `getMechanicValueMult` aplicado al valor final del ítem.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getMechanicValueMult } from '../src/economy.js';
import { isContainerUnlocked, rollContainerResult } from '../src/systems/containers.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const NEW_IDS = ['bovedaContrarreloj', 'sotanoSinLuz'];

describe('§4.24 contenedores con mecánica propia (ronda 20)', () => {
  it('bovedaContrarreloj y sotanoSinLuz existen al final, con mode/fueraDeCadena/mechanicValueMult', () => {
    const boveda = containers.find((c) => c.id === 'bovedaContrarreloj');
    const sotano = containers.find((c) => c.id === 'sotanoSinLuz');
    expect(boveda.mode).toBe('timed');
    expect(boveda.fueraDeCadena).toBe(true);
    expect(boveda.mechanicValueMult).toBe(1.3);
    expect(boveda.requiresPrestigeCount).toBe(7);
    expect(sotano.mode).toBe('dark');
    expect(sotano.fueraDeCadena).toBe(true);
    expect(sotano.mechanicValueMult).toBe(1.4);
    expect(sotano.requiresPrestigeCount).toBe(8);
  });

  it('los 16 contenedores previos a la ronda 20 no declaran mode/fueraDeCadena/mechanicValueMult', () => {
    const previous = containers.filter((c) => !NEW_IDS.includes(c.id));
    for (const c of previous) {
      expect(c.mode).toBeUndefined();
      expect(c.fueraDeCadena).toBeUndefined();
      expect(c.mechanicValueMult).toBeUndefined();
    }
  });

  it('fueraDeCadena desbloquea SOLO por requiresPrestigeCount, sin poseer el contenedor anterior del array', () => {
    const state = freshState();
    const boveda = containers.find((c) => c.id === 'bovedaContrarreloj');
    // El contenedor justo anterior en el array (chatarreriaTitanes o el que sea) NO está poseído.
    state.prestigeCount = 6;
    expect(isContainerUnlocked(state, boveda, containers)).toBe(false); // falta prestigio 7
    state.prestigeCount = 7;
    expect(isContainerUnlocked(state, boveda, containers)).toBe(true); // sin poseer nada anterior

    const sotano = containers.find((c) => c.id === 'sotanoSinLuz');
    expect(isContainerUnlocked(state, sotano, containers)).toBe(false); // falta prestigio 8
    state.prestigeCount = 8;
    expect(isContainerUnlocked(state, sotano, containers)).toBe(true);
  });

  it('la cadena normal (sin fueraDeCadena) sigue exigiendo el contenedor anterior, sin cambios', () => {
    const state = freshState();
    state.prestigeCount = 9;
    const bigBang = containers.find((c) => c.id === 'vertederoBigBang');
    expect(isContainerUnlocked(state, bigBang, containers)).toBe(false); // falta poseer el anterior
    const index = containers.findIndex((c) => c.id === 'vertederoBigBang');
    state.ownedContainers[containers[index - 1].id] = 1;
    expect(isContainerUnlocked(state, bigBang, containers)).toBe(true);
  });

  it('cada contenedor nuevo tiene pool propio de 7 ítems cubriendo todas sus categorías', () => {
    for (const id of NEW_IDS) {
      const container = containers.find((c) => c.id === id);
      const pool = itemsData.containers[id];
      expect(pool).toHaveLength(7);
      for (const item of pool) expect(container.categorias).toContain(item.categoria);
      for (const categoria of container.categorias) {
        expect(pool.some((item) => item.categoria === categoria)).toBe(true);
      }
    }
  });

  it('getMechanicValueMult es 1 (neutro) sin el campo, y el valor propio con él', () => {
    expect(getMechanicValueMult({})).toBe(1);
    expect(getMechanicValueMult({ mechanicValueMult: 1.3 })).toBe(1.3);
  });

  it('rollContainerResult multiplica el valor de ítem por mechanicValueMult del contenedor', () => {
    const state = freshState();
    const boveda = containers.find((c) => c.id === 'bovedaContrarreloj');
    const baseline = { ...boveda, mechanicValueMult: undefined };
    const seq = [0.99, ...Array(20).fill(0.5)]; // 0.99 evita la trampa (probTrampaBase < 0.99)
    const makeRandom = () => {
      let i = 0;
      return () => seq[Math.min(i++, seq.length - 1)];
    };
    const withMult = rollContainerResult(state, boveda, false, itemsData, data, makeRandom());
    const without = rollContainerResult(freshState(), baseline, false, itemsData, data, makeRandom());
    expect(withMult.isTrap).toBe(false);
    expect(without.isTrap).toBe(false);
    expect(withMult.moneyDelta / (without.moneyDelta * 1.3)).toBeCloseTo(1, 6);
  });
});
