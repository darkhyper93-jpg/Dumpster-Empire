/**
 * Ronda 19 — Racha de escarbado (PLAN.md §4.20), logros ocultos por racha (digStreakAtLeast)
 * y migración de save v7 -> v8 (digStreak/bestDigStreak/vibrationOn).
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { applyContainerResult } from '../src/systems/containers.js';
import { getLuck } from '../src/economy.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { validateSave } from '../src/save.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import streak from '../../../apps/game/src/data/streak.json';
import achievements from '../../../apps/game/src/data/achievements.json';

const data = { upgrades, automations, prestigeTree, streak };
const barrio = containers.find((c) => c.id === 'contenedorBarrio');

function successResult() {
  return { isTrap: false, items: [{ id: 'x', icon: 'coin', name: 'X', categoria: 'common', value: 10 }], moneyDelta: 10 };
}
function trapResult() {
  return { isTrap: true, items: [], moneyDelta: 0 };
}

describe('§4.20 racha de escarbado manual', () => {
  it('sube +1 por escarbado manual exitoso, sin trampa', () => {
    const state = freshState();
    applyContainerResult(state, barrio, successResult(), false, data);
    expect(state.digStreak).toBe(1);
    applyContainerResult(state, barrio, successResult(), false, data);
    expect(state.digStreak).toBe(2);
    expect(state.bestDigStreak).toBe(2);
  });

  it('se corta a 0 al caer en trampa (manual)', () => {
    const state = freshState();
    applyContainerResult(state, barrio, successResult(), false, data);
    applyContainerResult(state, barrio, successResult(), false, data);
    expect(state.digStreak).toBe(2);
    applyContainerResult(state, barrio, trapResult(), false, data);
    expect(state.digStreak).toBe(0);
    // bestDigStreak recuerda el máximo aunque la racha actual se corte.
    expect(state.bestDigStreak).toBe(2);
  });

  it('el robot (isAuto=true) ni sube ni corta la racha', () => {
    const state = freshState();
    state.digStreak = 3;
    state.bestDigStreak = 3;
    applyContainerResult(state, barrio, successResult(), true, data);
    expect(state.digStreak).toBe(3);
    applyContainerResult(state, barrio, trapResult(), true, data);
    expect(state.digStreak).toBe(3);
  });

  it('getLuck suma +1 de Suerte cada 5 de racha, tope +5 (data/streak.json)', () => {
    const state = freshState();
    const base = getLuck(state, data);
    state.digStreak = 4;
    expect(getLuck(state, data)).toBe(base); // todavía no completó el primer tramo
    state.digStreak = 5;
    expect(getLuck(state, data)).toBe(base + 1);
    state.digStreak = 24;
    expect(getLuck(state, data)).toBe(base + 4);
    state.digStreak = 100; // muy por encima del tope
    expect(getLuck(state, data)).toBe(base + 5);
  });

  it('sin data.streak (llamadores previos a la ronda 19), getLuck no cambia con digStreak', () => {
    const state = freshState();
    state.digStreak = 25;
    const dataSinStreak = { upgrades, automations, prestigeTree };
    const stateNeutro = freshState();
    expect(getLuck(state, dataSinStreak)).toBe(getLuck(stateNeutro, dataSinStreak));
  });

  it('R19.1: con digStreak en 0 (default), getLuck es idéntico a como si data.streak no existiera', () => {
    const state = freshState();
    expect(getLuck(state, data)).toBe(getLuck(state, { upgrades, automations, prestigeTree }));
  });
});

describe('logro oculto digStreakAtLeast (evalúa bestDigStreak)', () => {
  it('a36 (racha 10, visible) se desbloquea al llegar a bestDigStreak 10', () => {
    const state = freshState();
    state.bestDigStreak = 10;
    const unlocked = checkAchievements(state, achievements, { allContainers: containers, allAutomations: automations });
    expect(unlocked).toContain('a36');
    const def = achievements.find((a) => a.id === 'a36');
    expect(def.hidden).toBeFalsy();
  });

  it('a37 (racha 25, oculto) y a38 (racha 50, oculto) llevan hidden:true', () => {
    expect(achievements.find((a) => a.id === 'a37').hidden).toBe(true);
    expect(achievements.find((a) => a.id === 'a38').hidden).toBe(true);
  });

  it('no se desbloquea antes de alcanzar el umbral', () => {
    const state = freshState();
    state.bestDigStreak = 9;
    const unlocked = checkAchievements(state, achievements, { allContainers: containers, allAutomations: automations });
    expect(unlocked).not.toContain('a36');
  });
});

describe('migración de save v7 -> v8', () => {
  it('un save v7 sin digStreak/bestDigStreak/vibrationOn migra con defaults', () => {
    const v7 = { ...freshState(), saveVersion: 7 };
    delete v7.digStreak;
    delete v7.bestDigStreak;
    delete v7.vibrationOn;
    const result = validateSave(v7);
    expect(result.valid).toBe(true);
    expect(result.data.digStreak).toBe(0);
    expect(result.data.bestDigStreak).toBe(0);
    expect(result.data.vibrationOn).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
  });

  it('rechaza digStreak negativo o fraccionario', () => {
    expect(validateSave({ ...freshState(), digStreak: -1 }).valid).toBe(false);
    expect(validateSave({ ...freshState(), digStreak: 1.5 }).valid).toBe(false);
    expect(validateSave({ ...freshState(), bestDigStreak: Number.POSITIVE_INFINITY }).valid).toBe(false);
  });

  it('un save fresco (freshState) es válido tal cual', () => {
    expect(validateSave(freshState()).valid).toBe(true);
  });
});
