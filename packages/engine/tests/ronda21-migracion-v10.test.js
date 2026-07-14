import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { serializeState, deserializeState, validateSave } from '../src/save.js';

/**
 * Ronda 21: la migración v9->v10 borra energy/energyAt/spiesUsed (Energía y espionaje
 * removidos por decisión del usuario) y filtra el logro muerto `a39` de achievementsUnlocked.
 * Es la primera migración del repo que ELIMINA campos.
 */
describe('save.js — migración v9 -> v10 (ronda 21, remoción de energía/espionaje)', () => {
  function buildV9Save() {
    // Simula un save v9 real: freshState() de hoy ya no trae energy/spiesUsed, así que se
    // agregan a mano para reproducir la forma exacta que dejó la ronda 20 en el disco.
    return {
      ...freshState(),
      saveVersion: 9,
      energy: 2,
      energyAt: 123456,
      spiesUsed: 5,
      gravesHit: 1,
      achievementsUnlocked: ['a1', 'a39', 'a40'],
    };
  }

  it('SAVE_VERSION actual es 10', () => {
    expect(SAVE_VERSION).toBe(10);
  });

  it('migra un save v9 real: energy/energyAt/spiesUsed desaparecen del resultado', () => {
    const result = validateSave(buildV9Save());
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(10);
    expect('energy' in result.data).toBe(false);
    expect('energyAt' in result.data).toBe(false);
    expect('spiesUsed' in result.data).toBe(false);
  });

  it('filtra a39 de achievementsUnlocked sin rechazar el save ni tocar el resto de logros', () => {
    const result = validateSave(buildV9Save());
    expect(result.valid).toBe(true);
    expect(result.data.achievementsUnlocked).toEqual(['a1', 'a40']);
  });

  it('gravesHit (trampas graves) sobrevive intacto — no es parte del espionaje', () => {
    const result = validateSave(buildV9Save());
    expect(result.valid).toBe(true);
    expect(result.data.gravesHit).toBe(1);
  });

  it('un save v9 sin a39 desbloqueado migra igual, sin romper achievementsUnlocked', () => {
    const v9 = buildV9Save();
    v9.achievementsUnlocked = ['a1', 'a2'];
    const result = validateSave(v9);
    expect(result.valid).toBe(true);
    expect(result.data.achievementsUnlocked).toEqual(['a1', 'a2']);
  });

  it('round-trip serialize/deserialize de un save v10 fresco no pierde nada', () => {
    const state = freshState();
    state.money = 777;
    state.gravesHit = 3;
    const raw = serializeState(state);
    const result = deserializeState(raw);
    expect(result.ok).toBe(true);
    expect(result.state.money).toBe(777);
    expect(result.state.gravesHit).toBe(3);
    expect('energy' in result.state).toBe(false);
    expect('spiesUsed' in result.state).toBe(false);
  });

  it('export/import (base64) de un save v9 real migra ida y vuelta sin restos de energía', () => {
    const v9 = buildV9Save();
    const raw = JSON.stringify(v9);
    const result = deserializeState(raw);
    expect(result.ok).toBe(true);
    expect(result.state.saveVersion).toBe(10);
    expect('energy' in result.state).toBe(false);
    expect('energyAt' in result.state).toBe(false);
    expect('spiesUsed' in result.state).toBe(false);
  });

  it('freshState() ya no trae energy/energyAt/spiesUsed', () => {
    const state = freshState();
    expect('energy' in state).toBe(false);
    expect('energyAt' in state).toBe(false);
    expect('spiesUsed' in state).toBe(false);
  });
});
