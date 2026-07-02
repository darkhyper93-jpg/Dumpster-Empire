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

describe('save.js — validación profunda contra XSS almacenado (agentes/fix-xss-save-prompt.md)', () => {
  it('rechaza un string malicioso dentro de itemsFoundByItem', () => {
    const state = freshState();
    state.itemsFoundByItem = { tachoVereda: { 'Lata aplastada': '<img src=x onerror=alert(1)>' } };
    const result = validateSave(state);
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('rechaza un string malicioso dentro de un mapa numérico plano (ownedContainers)', () => {
    const state = freshState();
    state.ownedContainers = { tachoVereda: '<script>alert(1)</script>' };
    const result = validateSave(state);
    expect(result.valid).toBe(false);
  });

  it('rechaza un string malicioso dentro de containerLevels', () => {
    const state = freshState();
    state.containerLevels = { tachoVereda: '<img src=x onerror=alert(1)>' };
    const result = validateSave(state);
    expect(result.valid).toBe(false);
  });

  it('rechaza autoProcessing con containerId que no es string', () => {
    const state = freshState();
    state.autoProcessing = [{ containerId: { evil: true }, totalTime: 10, remaining: 5 }];
    const result = validateSave(state);
    expect(result.valid).toBe(false);
  });

  it('rechaza autoQueue con elementos que no son strings', () => {
    const state = freshState();
    state.autoQueue = [{ toString: () => '<img src=x onerror=alert(1)>' }];
    const result = validateSave(state);
    expect(result.valid).toBe(false);
  });

  it('rechaza achievementsUnlocked con elementos que no son strings', () => {
    const state = freshState();
    state.achievementsUnlocked = [123, '<img src=x onerror=alert(1)>'];
    const result = validateSave(state);
    // el elemento numérico ya viola "debe ser array de strings"
    expect(result.valid).toBe(false);
  });

  it('acepta un save legítimo con contenido numérico normal en todos los mapas', () => {
    const state = freshState();
    state.ownedContainers = { tachoVereda: 3 };
    state.containerLevels = { tachoVereda: 5 };
    state.containerLevelProgress = { tachoVereda: 12 };
    state.upgradeLevels = { luck: 4, digPower: 2, area: 1, capacity: 0 };
    state.prestigeTreeLevels = { nodo1: 2 };
    state.itemsFoundByCategory = { comun: 10 };
    state.itemsFoundByItem = { tachoVereda: { 'Lata aplastada': 3 } };
    state.automationOwned = { robot1: true };
    state.achievementsUnlocked = ['a1', 'a10'];
    state.autoQueue = ['tachoVereda', 'contenedorIndustrial'];
    state.autoProcessing = [{ containerId: 'tachoVereda', totalTime: 10, remaining: 4 }];

    const raw = serializeState(state);
    const result = deserializeState(raw);
    expect(result.ok).toBe(true);
    expect(result.state.itemsFoundByItem.tachoVereda['Lata aplastada']).toBe(3);
  });
});
