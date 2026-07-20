/**
 * Ronda 31, tarea 1 (ROADMAPv4 §31.3.1) — fix del regalo temprano de $250.000: a45 ("Set
 * Completo", el set trivial del Tacho de Vereda) baja a $2.500; los $250.000 se mudan a a61
 * ("Cinco Sets") y se agrega a62 ("Coleccionista Serial", oculto, 6 Llaves).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { checkAchievements } from '../src/systems/achievements.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';
import achievementsData from '../../../apps/game/src/data/achievements.json';

const data = { upgrades, automations, prestigeTree };
const a45 = achievementsData.find((a) => a.id === 'a45');
const a61 = achievementsData.find((a) => a.id === 'a61');
const a62 = achievementsData.find((a) => a.id === 'a62');

/** Marca el pool ENTERO de un contenedor como encontrado (isSetComplete lo evalúa true). */
function completeSet(state, container) {
  const pool = itemsData.containers[container.id];
  state.itemsFoundByItem[container.id] = Object.fromEntries(pool.map((it) => [it.id, 1]));
}

describe('§31.3.1 fix de los $250k tempranos (a45/a61/a62)', () => {
  it('a45 declara $2.500, no $250.000', () => {
    expect(a45.reward).toEqual({ type: 'money', amount: 2500 });
  });

  it('a61 y a62 existen con la data del roadmap', () => {
    expect(a61.cond).toEqual({ type: 'setsCompletedAtLeast', value: 5 });
    expect(a61.reward).toEqual({ type: 'money', amount: 250000 });
    expect(a62.hidden).toBe(true);
    expect(a62.cond).toEqual({ type: 'setsCompletedAtLeast', value: 10 });
    expect(a62.reward).toEqual({ type: 'keys', amount: 6 });
  });

  it('con 1 set completo, el jugador gana $2.500 por logros de sets — nunca $250.000', () => {
    const state = freshState();
    completeSet(state, containers.find((c) => c.id === 'tachoVereda'));
    const ctx = { allContainers: containers, allAutomations: automations, itemsData, data };
    const unlocked = checkAchievements(state, achievementsData, ctx);
    expect(unlocked).toContain('a45');
    expect(unlocked).not.toContain('a61');
    expect(unlocked).not.toContain('a62');
    expect(state.money).toBe(2500);
  });

  it('con 5 sets completos, a61 desbloquea y paga $250.000 (además del $2.500 de a45)', () => {
    const state = freshState();
    const chain = containers.filter((c) => !c.fueraDeCadena && !c.isProcedural).slice(0, 5);
    for (const c of chain) completeSet(state, c);
    const ctx = { allContainers: containers, allAutomations: automations, itemsData, data };
    const unlocked = checkAchievements(state, achievementsData, ctx);
    expect(unlocked).toContain('a45');
    expect(unlocked).toContain('a61');
    expect(unlocked).not.toContain('a62');
    expect(state.money).toBe(2500 + 250000);
  });

  it('con 10 sets completos, a62 (oculto) desbloquea y paga 6 Llaves', () => {
    const state = freshState();
    const chain = containers.filter((c) => !c.fueraDeCadena && !c.isProcedural).slice(0, 10);
    for (const c of chain) completeSet(state, c);
    const ctx = { allContainers: containers, allAutomations: automations, itemsData, data };
    const unlocked = checkAchievements(state, achievementsData, ctx);
    expect(unlocked).toEqual(expect.arrayContaining(['a45', 'a61', 'a62']));
    expect(state.prestigeKeys).toBe(6);
  });
});
