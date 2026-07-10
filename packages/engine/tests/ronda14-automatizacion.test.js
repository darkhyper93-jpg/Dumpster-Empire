/**
 * Ronda 14 — selector de target del robot (D3-D6 de RONDA14-PLAN.md).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { bestAffordableUnlockedContainer, setAutoTarget, automationTick } from '../src/systems/automation.js';
import { doPrestige } from '../src/systems/prestige.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import containers from '../../../apps/game/src/data/containers.json';
import itemsData from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };

function stateWithAutoDig() {
  const state = freshState();
  state.automationOwned.robotClasificador = true;
  return state;
}

describe('bestAffordableUnlockedContainer — target fijo (D4/D5)', () => {
  it('target fijo afordable y desbloqueado gana aunque exista otro más caro también afordable', () => {
    const state = stateWithAutoDig();
    const cheap = containers[0];
    state.money = 1_000_000_000;
    state.autoTargetContainerId = cheap.id;
    const pick = bestAffordableUnlockedContainer(state, containers, data);
    expect(pick.id).toBe(cheap.id);
  });

  it('target fijo NO afordable ⇒ null, y el robot ahorra (no gasta ni encola)', () => {
    const state = stateWithAutoDig();
    const expensive = containers[containers.length - 1];
    state.money = 0;
    state.autoTargetContainerId = expensive.id;
    expect(bestAffordableUnlockedContainer(state, containers, data)).toBeNull();

    const moneyBefore = state.money;
    automationTick(state, 1, containers, itemsData, data, () => 0.5);
    expect(state.money).toBe(moneyBefore);
    expect(state.autoQueue).toEqual([]);
  });

  it('target null ⇒ modo Auto (el más caro afordable), regresión del comportamiento previo', () => {
    const state = stateWithAutoDig();
    state.money = 1_000_000_000;
    state.autoTargetContainerId = null;
    // Desbloquear todos los contenedores no-de-prestigio comprando 1 unidad de cada uno en orden
    // (isContainerUnlocked exige la unidad previa comprada además del prestigio requerido).
    for (const c of containers) {
      if (!c.requiresPrestigeCount) state.ownedContainers[c.id] = 1;
    }
    const pick = bestAffordableUnlockedContainer(state, containers, data);
    const affordable = containers.filter(
      (c) => !c.requiresPrestigeCount && c.costoInicial <= state.money
    );
    const expected = affordable.reduce((best, c) => (c.costoInicial > best.costoInicial ? c : best));
    expect(pick.id).toBe(expected.id);
  });

  it('target bloqueado (requiere prestigio no alcanzado) ⇒ null', () => {
    const state = stateWithAutoDig();
    const locked = containers.find((c) => c.requiresPrestigeCount);
    state.money = Number.MAX_SAFE_INTEGER;
    state.autoTargetContainerId = locked.id;
    expect(bestAffordableUnlockedContainer(state, containers, data)).toBeNull();
  });
});

describe('setAutoTarget', () => {
  it('id inventado ⇒ { ok: false } y el estado no muta', () => {
    const state = freshState();
    const result = setAutoTarget(state, 'idInventado', containers);
    expect(result.ok).toBe(false);
    expect(state.autoTargetContainerId).toBeNull();
  });

  it('null ⇒ { ok: true }, vuelve a modo Auto', () => {
    const state = freshState();
    state.autoTargetContainerId = containers[0].id;
    const result = setAutoTarget(state, null, containers);
    expect(result.ok).toBe(true);
    expect(state.autoTargetContainerId).toBeNull();
  });

  it('id válido ⇒ { ok: true } y lo fija', () => {
    const state = freshState();
    const result = setAutoTarget(state, containers[0].id, containers);
    expect(result.ok).toBe(true);
    expect(state.autoTargetContainerId).toBe(containers[0].id);
  });
});

describe('doPrestige — deja autoTargetContainerId en null (D6)', () => {
  it('resetea el target tras prestigiar', () => {
    const state = freshState();
    state.autoTargetContainerId = containers[0].id;
    state.totalMoneyEarned = 1_000_000_000;
    const result = doPrestige(state, data);
    expect(result.ok).toBe(true);
    expect(state.autoTargetContainerId).toBeNull();
  });
});
