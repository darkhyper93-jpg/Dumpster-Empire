import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
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

describe('validateSave — filtrado de referencias de contenedor huérfanas (auditoría §M1)', () => {
  const validIds = ['tachoVereda', 'contenedorBarrio'];

  it('descarta de autoQueue los ids que no existen en la data actual', () => {
    const state = freshState();
    state.autoQueue = ['tachoVereda', 'contenedorFantasma', 'contenedorBarrio'];
    const result = validateSave(state, validIds);
    expect(result.valid).toBe(true);
    expect(result.data.autoQueue).toEqual(['tachoVereda', 'contenedorBarrio']);
  });

  it('descarta de autoProcessing los slots cuyo containerId no existe', () => {
    const state = freshState();
    state.autoProcessing = [
      { containerId: 'tachoVereda', totalTime: 10, remaining: 4 },
      { containerId: 'contenedorFantasma', totalTime: 10, remaining: 4 },
    ];
    const result = validateSave(state, validIds);
    expect(result.valid).toBe(true);
    expect(result.data.autoProcessing).toHaveLength(1);
    expect(result.data.autoProcessing[0].containerId).toBe('tachoVereda');
  });

  it('acepta un Set además de un array como validContainerIds', () => {
    const state = freshState();
    state.autoQueue = ['tachoVereda', 'contenedorFantasma'];
    const result = validateSave(state, new Set(validIds));
    expect(result.data.autoQueue).toEqual(['tachoVereda']);
  });

  it('sin validContainerIds no filtra nada (compatibilidad)', () => {
    const state = freshState();
    state.autoQueue = ['contenedorFantasma'];
    const result = validateSave(state);
    expect(result.valid).toBe(true);
    expect(result.data.autoQueue).toEqual(['contenedorFantasma']);
  });

  it('deserializeState propaga el filtrado', () => {
    const state = freshState();
    state.autoQueue = ['tachoVereda', 'contenedorFantasma'];
    const result = deserializeState(serializeState(state), validIds);
    expect(result.ok).toBe(true);
    expect(result.state.autoQueue).toEqual(['tachoVereda']);
  });
});

describe('save v3 -> v4 migra sin perder partidas viejas (PUNTOS_A_MEJORAR_2.md §5)', () => {
  it('un save v3 sin volume se acepta y se completa con volume: 1', () => {
    const v3 = freshState();
    delete v3.volume;
    v3.saveVersion = 3;

    const result = validateSave(v3);
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.volume).toBe(1);
  });

  it('un save v4 conserva el volume guardado en la ida y vuelta', () => {
    const state = freshState();
    state.volume = 0.4;
    const result = deserializeState(serializeState(state));
    expect(result.ok).toBe(true);
    expect(result.state.volume).toBe(0.4);
  });
});
