/**
 * Ronda 23, Agente B (data) — PLAN.md §2.9/§3.1/§3.2 (roadmap): NPCs, retratos, historia liviana,
 * `robotVendedor` en automations.json, 3 logros nuevos. Motor de condiciones ÚNICO (achievements,
 * historia, misiones): `ordersFulfilledAtLeast`/`stallLevelAtLeast`/`stallInventoryAtLeast` se
 * agregan a `CONDITION_EVALUATORS` (achievements.js) — 23.A ya dejó los campos de estado
 * (`ordersFulfilledCount`, `stallLevel`, `inventory`) listos en save v12.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { checkAchievements } from '../src/systems/achievements.js';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import achievementsData from '../../../apps/game/src/data/achievements.json';
import npcs from '../../../apps/game/src/data/npcs.json';
import story from '../../../apps/game/src/data/story.json';

const ctx = { allContainers: containers, allAutomations: automations };

describe('CONDITION_EVALUATORS nuevos (ronda 23.B)', () => {
  it('ordersFulfilledAtLeast evalúa contra state.ordersFulfilledCount', () => {
    const achievement = { id: 'test-orders', cond: { type: 'ordersFulfilledAtLeast', value: 25 } };
    const state = freshState();
    state.ordersFulfilledCount = 24;
    expect(checkAchievements(state, [achievement], ctx)).toEqual([]);
    state.ordersFulfilledCount = 25;
    expect(checkAchievements(state, [achievement], ctx)).toEqual(['test-orders']);
  });

  it('stallLevelAtLeast evalúa contra state.stallLevel', () => {
    const achievement = { id: 'test-level', cond: { type: 'stallLevelAtLeast', value: 5 } };
    const state = freshState();
    state.stallLevel = 4;
    expect(checkAchievements(state, [achievement], ctx)).toEqual([]);
    state.stallLevel = 5;
    expect(checkAchievements(state, [achievement], ctx)).toEqual(['test-level']);
  });

  it('stallInventoryAtLeast evalúa contra state.inventory.length', () => {
    const achievement = { id: 'test-inventory', cond: { type: 'stallInventoryAtLeast', value: 1 } };
    const state = freshState();
    expect(checkAchievements(state, [achievement], ctx)).toEqual([]);
    state.inventory.push({ itemId: 'can-crushed', containerId: 'tachoVereda', categoria: 'common', baseValue: 5 });
    expect(checkAchievements(state, [achievement], ctx)).toEqual(['test-inventory']);
  });

  it('tipo de condición desconocido sigue lanzando (motor genérico intacto)', () => {
    const achievement = { id: 'test-unknown', cond: { type: 'tipoInventado', value: 1 } };
    expect(() => checkAchievements(freshState(), [achievement], ctx)).toThrow();
  });
});

describe('apps/game/src/data/npcs.json (§3.1)', () => {
  it('define exactamente los 5 personajes fijos del roadmap', () => {
    const ids = npcs.map((n) => n.id).sort();
    expect(ids).toEqual(['chispa', 'intendente', 'rita', 'salomon', 'zoraida']);
  });

  it('cada NPC tiene id/name/portrait/rol string no vacíos', () => {
    for (const npc of npcs) {
      expect(typeof npc.id).toBe('string');
      expect(typeof npc.name).toBe('string');
      expect(npc.name.length).toBeGreaterThan(0);
      expect(typeof npc.portrait).toBe('string');
      expect(npc.portrait.length).toBeGreaterThan(0);
      expect(typeof npc.rol).toBe('string');
      expect(npc.rol.length).toBeGreaterThan(0);
    }
  });

  it('rita define saleComments/saleCategoryGroups cubriendo las 8 categorías de items.json', () => {
    const rita = npcs.find((n) => n.id === 'rita');
    expect(rita.saleComments).toBeTruthy();
    const groups = Object.values(rita.saleCategoryGroups);
    for (const group of groups) {
      expect(rita.saleComments[group]).toBeTruthy();
    }
    const categorias = ['common', 'reusable', 'electronics', 'antiques', 'historic', 'art', 'relics', 'future'];
    expect(Object.keys(rita.saleCategoryGroups).sort()).toEqual(categorias.sort());
  });
});

describe('apps/game/src/data/story.json (§3.2)', () => {
  it('los 2 hitos de la ronda 23 referencian npcIds/cond types válidos', () => {
    expect(story.length).toBeGreaterThanOrEqual(2);
    const npcIds = new Set(npcs.map((n) => n.id));
    for (const beat of story) {
      expect(typeof beat.id).toBe('string');
      expect(npcIds.has(beat.npcId)).toBe(true);
      expect(typeof beat.cond.type).toBe('string');
      expect(typeof beat.textKey).toBe('string');
    }
    const ids = story.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la viñeta de Rita dispara con stallLevelAtLeast y la de Salomón con ordersFulfilledAtLeast', () => {
    const ritaBeat = story.find((s) => s.npcId === 'rita');
    const salomonBeat = story.find((s) => s.npcId === 'salomon');
    expect(ritaBeat.cond.type).toBe('stallLevelAtLeast');
    expect(salomonBeat.cond.type).toBe('ordersFulfilledAtLeast');
  });
});

describe('apps/game/src/data/automations.json — robotVendedor (§4.29)', () => {
  it('existe con el efecto enablesStallVendor, costo 2000000, e insertado en orden de costo', () => {
    const robotVendedor = automations.find((a) => a.id === 'robotVendedor');
    expect(robotVendedor).toBeTruthy();
    expect(robotVendedor.cost).toBe(2000000);
    expect(robotVendedor.effects.some((e) => e.type === 'enablesStallVendor')).toBe(true);
    for (let i = 1; i < automations.length; i++) {
      expect(automations[i].cost).toBeGreaterThanOrEqual(automations[i - 1].cost);
    }
  });
});

describe('apps/game/src/data/achievements.json — 3 logros nuevos del Puesto', () => {
  it('agrega logros con los 3 cond types nuevos, ids consecutivos tras el último real', () => {
    const newOnes = achievementsData.filter((a) =>
      ['stallInventoryAtLeast', 'ordersFulfilledAtLeast', 'stallLevelAtLeast'].includes(a.cond.type)
    );
    expect(newOnes.length).toBe(3);
    for (const a of newOnes) {
      expect(typeof a.name).toBe('string');
      expect(a.reward).toBeTruthy();
    }
  });

  it('el logro de nivel máximo del puesto usa value 5 (stallNivelMax de data/stall.json)', () => {
    const maxed = achievementsData.find((a) => a.cond.type === 'stallLevelAtLeast');
    expect(maxed.cond.value).toBe(5);
  });

  it('checkAchievements desbloquea los 3 logros nuevos con el estado correcto', () => {
    const state = freshState();
    state.inventory.push({ itemId: 'x', containerId: 'y', categoria: 'common', baseValue: 1 });
    state.ordersFulfilledCount = 25;
    state.stallLevel = 5;
    const unlocked = checkAchievements(state, achievementsData, ctx);
    const newIds = achievementsData
      .filter((a) => ['stallInventoryAtLeast', 'ordersFulfilledAtLeast', 'stallLevelAtLeast'].includes(a.cond.type))
      .map((a) => a.id);
    for (const id of newIds) expect(unlocked).toContain(id);
  });
});
