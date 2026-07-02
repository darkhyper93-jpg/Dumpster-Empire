import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { serializeState, deserializeState, exportSave, importSave, validateSave } from '../src/save.js';

describe('save.js — ida y vuelta sin pérdida', () => {
  it('serializeState + deserializeState reconstruye el mismo estado', () => {
    const state = freshState();
    state.money = 1234.5;
    state.upgradeLevels.luck = 7;
    state.ownedContainers.tachoVereda = 3;
    state.achievementsUnlocked.push('a1', 'a10');

    const raw = serializeState(state);
    const result = deserializeState(raw);

    expect(result.ok).toBe(true);
    expect(result.state.money).toBe(state.money);
    expect(result.state.upgradeLevels).toEqual(state.upgradeLevels);
    expect(result.state.ownedContainers).toEqual(state.ownedContainers);
    expect(result.state.achievementsUnlocked).toEqual(state.achievementsUnlocked);
  });

  it('exportSave + importSave (base64) reconstruye el mismo estado', () => {
    const state = freshState();
    state.money = 999;
    state.prestigeKeys = 42;

    const encoded = exportSave(state);
    const result = importSave(encoded);

    expect(result.ok).toBe(true);
    expect(result.state.money).toBe(999);
    expect(result.state.prestigeKeys).toBe(42);
  });
});

describe('save.js — rechazo de save corrupto sin romper el estado en curso', () => {
  it('rechaza JSON malformado', () => {
    const currentState = freshState();
    currentState.money = 500;
    const result = deserializeState('{ esto no es json ');
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(currentState.money).toBe(500); // el estado en curso no se tocó
  });

  it('rechaza un objeto JSON válido pero sin la forma de un save', () => {
    const result = deserializeState(JSON.stringify({ foo: 'bar' }));
    expect(result.ok).toBe(false);
  });

  it('rechaza un saveVersion más nuevo que el soportado', () => {
    const state = { ...freshState(), saveVersion: 999 };
    const result = validateSave(state);
    expect(result.valid).toBe(false);
  });

  it('rechaza un base64 de import que no decodifica a un save válido', () => {
    const result = importSave('esto-no-es-base64-valido!!');
    expect(result.ok).toBe(false);
  });

  it('acepta un save v1 completo', () => {
    const result = validateSave(freshState());
    expect(result.valid).toBe(true);
  });
});
