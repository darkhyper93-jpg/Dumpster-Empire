import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { canPrestige, prestigeKeysPreview, doPrestige } from '../src/systems/prestige.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';

const data = { upgrades, automations, prestigeTree };

function stateBelowThreshold() {
  const state = freshState();
  state.totalMoneyEarned = 500_000_000;
  return state;
}

function stateAboveThreshold() {
  const state = freshState();
  state.money = 12_345;
  state.totalMoneyEarned = 4_000_000_000;
  state.upgradeLevels = { luck: 10, digPower: 8, area: 5, capacity: 3 };
  state.ownedContainers = { tachoVereda: 5, contenedorBarrio: 2 };
  state.automationOwned = { guantes: true, carrito: true };
  state.autoQueue = ['tachoVereda'];
  state.autoProcessing = [{ containerId: 'tachoVereda', totalTime: 3, remaining: 1 }];
  state.prestigeTreeLevels = { suerteAncestral: 2 };
  state.achievementsUnlocked = ['a1', 'a2'];
  return state;
}

describe('canPrestige', () => {
  it('es false por debajo de $1.000.000.000 de dinero total ganado', () => {
    expect(canPrestige(stateBelowThreshold())).toBe(false);
  });

  it('es true en o por encima del umbral', () => {
    expect(canPrestige(stateAboveThreshold())).toBe(true);
  });
});

describe('doPrestige', () => {
  it('rechaza prestigiar si no se cumplió el umbral', () => {
    const state = stateBelowThreshold();
    const result = doPrestige(state, data);
    expect(result.ok).toBe(false);
  });

  it('resetea progreso normal pero conserva llaves, árbol de prestigio y logros', () => {
    const state = stateAboveThreshold();
    const keysBefore = state.prestigeKeys;
    const expectedKeysEarned = prestigeKeysPreview(state);

    const result = doPrestige(state, data);

    expect(result.ok).toBe(true);
    expect(result.keysEarned).toBe(expectedKeysEarned);
    expect(state.prestigeKeys).toBe(keysBefore + expectedKeysEarned);
    expect(state.prestigeCount).toBe(1);

    // se borra lo normal
    expect(state.upgradeLevels).toEqual({ luck: 0, digPower: 0, area: 0, capacity: 0 });
    expect(state.ownedContainers).toEqual({});
    expect(state.automationOwned).toEqual({});
    expect(state.autoQueue).toEqual([]);
    expect(state.autoProcessing).toEqual([]);
    expect(state.totalMoneyEarned).toBe(state.money);

    // se conserva
    expect(state.prestigeTreeLevels).toEqual({ suerteAncestral: 2 });
    expect(state.achievementsUnlocked).toEqual(['a1', 'a2']);
  });

  it('aplica el dinero inicial del nodo Capital Inicial', () => {
    const state = stateAboveThreshold();
    state.prestigeTreeLevels.capitalInicial = 3;
    doPrestige(state, data);
    expect(state.money).toBe(300);
    expect(state.totalMoneyEarned).toBe(300);
  });
});
