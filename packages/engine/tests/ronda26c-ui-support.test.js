/**
 * Ronda 26.C — soporte de engine mínimo para la UI (PrestigeView/ShopView/DigContainerPicker):
 * "próximo tier procedural a ofrecer" y el evaluador de logro de Mudanza de Galaxia. Save v15
 * (sin campos nuevos: reusa el estado de la 26.A/26.B).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { nextProceduralTier } from '../src/systems/containers.js';
import { PROCEDURAL_CONTAINER_MAX_N } from '../src/procedural.js';
import { CONDITION_EVALUATORS } from '../src/systems/achievements.js';

describe('nextProceduralTier(state): próximo tier sin poseer, para ofrecer en Tienda/Escarbar', () => {
  it('sin ningún tier poseído, el próximo es 1', () => {
    const state = freshState();
    expect(nextProceduralTier(state)).toBe(1);
  });

  it('con bigbangPlus1 poseído, el próximo es 2 (ignora otros ownedContainers no procedurales)', () => {
    const state = freshState();
    state.ownedContainers.bigbangPlus1 = 1;
    state.ownedContainers.tachoVereda = 3;
    expect(nextProceduralTier(state)).toBe(2);
  });

  it('salta al hueco más alto realmente poseído (nunca cuenta cantidad, solo si se posee)', () => {
    const state = freshState();
    state.ownedContainers.bigbangPlus1 = 1;
    state.ownedContainers.bigbangPlus2 = 5;
    expect(nextProceduralTier(state)).toBe(3);
  });

  it('con 0 unidades en un tier (ownedContainers en 0), no cuenta como poseído', () => {
    const state = freshState();
    state.ownedContainers.bigbangPlus1 = 0;
    expect(nextProceduralTier(state)).toBe(1);
  });

  it('nunca devuelve más allá del tope', () => {
    const state = freshState();
    state.ownedContainers[`bigbangPlus${PROCEDURAL_CONTAINER_MAX_N}`] = 1;
    expect(nextProceduralTier(state)).toBe(PROCEDURAL_CONTAINER_MAX_N + 1);
  });
});

describe('CONDITION_EVALUATORS.galaxyMoveCountAtLeast (logros de Mudanza de Galaxia)', () => {
  it('compara contra state.galaxyMoveCount', () => {
    const state = freshState();
    expect(CONDITION_EVALUATORS.galaxyMoveCountAtLeast(state, { value: 1 })).toBe(false);
    state.galaxyMoveCount = 3;
    expect(CONDITION_EVALUATORS.galaxyMoveCountAtLeast(state, { value: 1 })).toBe(true);
    expect(CONDITION_EVALUATORS.galaxyMoveCountAtLeast(state, { value: 3 })).toBe(true);
    expect(CONDITION_EVALUATORS.galaxyMoveCountAtLeast(state, { value: 4 })).toBe(false);
  });
});
