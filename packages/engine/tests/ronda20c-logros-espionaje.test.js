/**
 * Ronda 20.C — logros nuevos de espionaje/herramientas/trampas graves (PLAN.md §4.21-4.23):
 * `spiesUsedAtLeast`, `gravesHitAtLeast` y `allToolsOwned`. RED antes de sumar los
 * CONDITION_EVALUATORS correspondientes en systems/achievements.js.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { checkAchievements } from '../src/systems/achievements.js';
import tools from '../../../apps/game/src/data/tools.json';
import achievements from '../../../apps/game/src/data/achievements.json';

const ctx = { allContainers: [], allAutomations: [], allTools: tools };

describe('§4.22 logro spiesUsedAtLeast', () => {
  it('se desbloquea cuando state.spiesUsed alcanza el umbral', () => {
    const achievement = { id: 'test-spies', name: 'x', cond: { type: 'spiesUsedAtLeast', value: 50 } };
    const state = freshState();
    state.spiesUsed = 49;
    expect(checkAchievements(state, [achievement], ctx)).toEqual([]);
    state.spiesUsed = 50;
    expect(checkAchievements(state, [achievement], ctx)).toEqual(['test-spies']);
  });
});

describe('§4.21 logro gravesHitAtLeast', () => {
  it('se desbloquea cuando state.gravesHit alcanza el umbral', () => {
    const achievement = { id: 'test-graves', name: 'x', cond: { type: 'gravesHitAtLeast', value: 10 } };
    const state = freshState();
    state.gravesHit = 9;
    expect(checkAchievements(state, [achievement], ctx)).toEqual([]);
    state.gravesHit = 10;
    expect(checkAchievements(state, [achievement], ctx)).toEqual(['test-graves']);
  });
});

describe('§4.23 logro allToolsOwned', () => {
  it('se desbloquea solo cuando las 4 herramientas de tools.json están compradas', () => {
    const achievement = { id: 'test-tools', name: 'x', cond: { type: 'allToolsOwned' } };
    const state = freshState();
    expect(checkAchievements(state, [achievement], ctx)).toEqual([]);
    for (const tool of tools) state.toolsOwned[tool.id] = true;
    expect(checkAchievements(state, [achievement], ctx)).toEqual(['test-tools']);
  });

  it('sin ctx.allTools (llamador previo a la ronda 20) nunca se desbloquea', () => {
    const achievement = { id: 'test-tools-2', name: 'x', cond: { type: 'allToolsOwned' } };
    const state = freshState();
    for (const tool of tools) state.toolsOwned[tool.id] = true;
    expect(checkAchievements(state, [achievement], { allContainers: [], allAutomations: [] })).toEqual([]);
  });
});

describe('achievements.json — a39/a40/a41 (ronda 20.C)', () => {
  it('existen y usan los cond types nuevos', () => {
    const a39 = achievements.find((a) => a.id === 'a39');
    const a40 = achievements.find((a) => a.id === 'a40');
    const a41 = achievements.find((a) => a.id === 'a41');
    expect(a39.cond.type).toBe('spiesUsedAtLeast');
    expect(a40.cond.type).toBe('gravesHitAtLeast');
    expect(a40.hidden).toBe(true);
    expect(a41.cond.type).toBe('allToolsOwned');
  });
});
