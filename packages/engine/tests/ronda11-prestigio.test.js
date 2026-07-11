/**
 * Ronda 11 (PLAN.md §2.6 ampliado): 4 contenedores de prestigio (requiresPrestigeCount 2-5)
 * con pools propios, integrados a niveles (§11.3) y a las metas exponenciales (ronda 10).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getRecommendedLuck, getLevelValueMult } from '../src/economy.js';
import { isContainerUnlocked } from '../src/systems/containers.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const NEW_IDS = ['convoyFantasma', 'criptaColeccionista', 'estacionOrbital', 'vertederoDivino'];

describe('Ronda 11 — contenedores de prestigio', () => {
  // AJUSTE (ronda 15): la ronda 15 agrega 4 contenedores más al final (prestigio 6-9) — este
  // test ya no asume el total de contenedores del array, solo que los 4 de ESTA ronda existen
  // en el orden esperado y con su gate de prestigio, sin importar cuántos más se agreguen después.
  it('los 4 contenedores de la ronda 11 existen y gatean por prestigio 2/3/4/5, en orden', () => {
    const indices = NEW_IDS.map((id) => containers.findIndex((c) => c.id === id));
    expect(indices.every((i) => i >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b)); // conservan el orden relativo
    expect(NEW_IDS.map((id) => containers.find((c) => c.id === id).requiresPrestigeCount)).toEqual([2, 3, 4, 5]);
  });

  it('bloqueados sin el prestigio, desbloqueados con prestigio + contenedor anterior comprado', () => {
    const state = freshState();
    state.prestigeCount = 1;
    state.automationOwned.redDrones = true;
    for (const c of containers) state.ownedContainers[c.id] = 1;
    const convoy = containers.find((c) => c.id === 'convoyFantasma');
    expect(isContainerUnlocked(state, convoy, containers)).toBe(false); // falta prestigio 2
    state.prestigeCount = 2;
    expect(isContainerUnlocked(state, convoy, containers)).toBe(true);
    const cripta = containers.find((c) => c.id === 'criptaColeccionista');
    expect(isContainerUnlocked(state, cripta, containers)).toBe(false); // falta prestigio 3
  });

  it('cada contenedor nuevo tiene pool propio de 7 ítems de sus categorías', () => {
    for (const id of NEW_IDS) {
      const container = containers.find((c) => c.id === id);
      const pool = items.containers[id];
      expect(pool).toHaveLength(7);
      for (const item of pool) expect(container.categorias).toContain(item.categoria);
      for (const categoria of container.categorias) {
        expect(pool.some((item) => item.categoria === categoria)).toBe(true);
      }
    }
  });

  it('las metas de Suerte de los primeros 12 (rondas 1-11) siguen siendo las de las rondas 10 y 11, exactas', () => {
    // AJUSTE (ronda 15): acotado a los primeros 12 contenedores (histórico de esta ronda) — los
    // 4 nuevos de la ronda 15 se verifican en fase9-balance.test.js, sin pisar esta regresión.
    const neutral = freshState();
    const firstTwelve = containers.slice(0, 12);
    const rec = firstTwelve.map((c) => getRecommendedLuck(neutral, c, items, data));
    expect(rec).toEqual([0, 8, 20, 40, 72, 120, 190, 290, 340, 420, 500, 580]);
  });

  it('los niveles de contenedor (§11.3) funcionan en los nuevos', () => {
    const state = freshState();
    state.containerLevels.vertederoDivino = 10;
    const vertedero = containers.find((c) => c.id === 'vertederoDivino');
    expect(getLevelValueMult(state, vertedero)).toBeCloseTo(1.45, 10);
  });
});
