/**
 * Ronda 27 — tareas delegadas de auditoría (ROADMAPv4 §27.5).
 *
 * §27.5.1 (Y1, 🟡): `money`/`totalMoneyEarned` sin clamp anti-Infinity. Un save HOSTIL pero
 * VÁLIDO (deedsTreeLevels con niveles finitos astronómicos pasa validateSave: cada valor es un
 * número finito) infla getSellMult y cualquier ganancia repetida desborda `money` a Infinity;
 * JSON.stringify(Infinity) -> null y el PRÓXIMO boot rechaza el save entero (wipe de la
 * partida — misma clase de brick que motivó los guards de galaxyMoveDeedsPreview/doGalaxyMove
 * en la 26.D). Fix: helper `addMoney(state, x)` en economy.js aplicado en los 5 puntos de
 * ganancia (containers/stall/achievements/missions/offline).
 *
 * §27.5.8: la liquidación del inventario en doGalaxyMove (stallSoldCount += inventory.length)
 * NO debe contar como progreso de una misión `sellAtStallCount` activa (no es una venta real
 * del jugador; sería progreso gratis por mudarse).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { validateSave, serializeState, deserializeState } from '../src/save.js';
import { addMoney } from '../src/economy.js';
import { applyContainerResult } from '../src/systems/containers.js';
import { sellInventoryItem } from '../src/systems/stall.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { claimMission, updateMissionsProgress } from '../src/systems/missions.js';
import { applyOfflineProgress } from '../src/systems/offline.js';
import { doGalaxyMove, GALAXY_MOVE_PRESTIGE_THRESHOLD } from '../src/systems/prestige.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import deedsTree from '../../../apps/game/src/data/deedsTree.json';
import stall from '../../../apps/game/src/data/stall.json';

const robotStub = {
  id: 'robotStub',
  name: 'Robot Stub',
  effects: [{ type: 'enablesAutoDig' }, { type: 'parallelSlots', flat: 1 }],
};
const dataBase = { upgrades, automations: [robotStub], prestigeTree, deedsTree };
const dataConStall = { ...dataBase, stall };

const contStub = {
  id: 'contStub',
  name: 'Contenedor Stub',
  costoInicial: 100,
  categorias: ['common'],
  probTrampaBase: 0,
  digTime: 10,
  slots: 1,
  resistencia: 1,
  areaRecomendada: 1,
  trapPenaltyMult: 0.3,
  levelUpDigsBase: 5,
  levelUpDigsGrowth: 1.35,
  levelRarityShiftPerLevel: 2.5,
  levelValueMultPerLevel: 0.05,
};
const itemsDataStub = {
  containers: {
    contStub: [{ id: 'stubItem', icon: 'artifact', name: 'Item Stub', categoria: 'common', valorBase: 10 }],
  },
  rarities: [{ id: 'common', mult: 1, colorToken: '--r-common' }],
};

function hugeResult(value) {
  return {
    isTrap: false,
    items: [{ id: 'x', icon: 'coin', name: 'X', categoria: 'common', value, baseValue: value, isFirstRareFind: false }],
    moneyDelta: value,
  };
}

describe('§27.5.1 (Y1) — addMoney: clamp anti-Infinity de money/totalMoneyEarned', () => {
  it('suma una ganancia normal a money y totalMoneyEarned', () => {
    const state = freshState();
    addMoney(state, 100);
    expect(state.money).toBe(100);
    expect(state.totalMoneyEarned).toBe(100);
  });

  it('una ganancia Infinity se clampea a Number.MAX_VALUE (nunca escribe Infinity)', () => {
    const state = freshState();
    addMoney(state, Infinity);
    expect(state.money).toBe(Number.MAX_VALUE);
    expect(Number.isFinite(state.totalMoneyEarned)).toBe(true);
  });

  it('una ganancia NaN no muta nada', () => {
    const state = freshState();
    state.money = 500;
    state.totalMoneyEarned = 500;
    addMoney(state, NaN);
    expect(state.money).toBe(500);
    expect(state.totalMoneyEarned).toBe(500);
  });

  it('cerca del techo, la suma se clampea en vez de desbordar', () => {
    const state = freshState();
    state.money = Number.MAX_VALUE;
    state.totalMoneyEarned = Number.MAX_VALUE;
    addMoney(state, 1e308);
    expect(state.money).toBe(Number.MAX_VALUE);
    expect(state.totalMoneyEarned).toBe(Number.MAX_VALUE);
  });
});

describe('§27.5.1 (Y1) — el save hostil pero válido no puede brickear la partida', () => {
  function hostileState() {
    const state = freshState();
    state.deedsTreeLevels = { ventajaGalactica: 1e305 };
    return state;
  }

  it('PREMISA: el save hostil pasa validateSave (niveles finitos — el clamp es la única defensa)', () => {
    expect(validateSave(hostileState()).valid).toBe(true);
  });

  it('applyContainerResult repetido con valores enormes deja money finito y el save serializable', () => {
    const state = freshState();
    for (let i = 0; i < 4; i++) {
      applyContainerResult(state, contStub, hugeResult(1e308), false, dataConStall);
    }
    expect(Number.isFinite(state.money)).toBe(true);
    expect(Number.isFinite(state.totalMoneyEarned)).toBe(true);
    const roundTrip = deserializeState(serializeState(state));
    expect(roundTrip.ok).toBe(true);
  });

  it('sellInventoryItem con el multiplicador hostil de Escrituras deja money finito', () => {
    const state = hostileState();
    state.stallLevel = 1;
    state.inventory = [{ itemId: 'i1', containerId: 'tachoVereda', categoria: 'common', baseValue: 1e9 }];
    const result = sellInventoryItem(state, 0, dataConStall, 1000, () => 0.5);
    expect(result.ok).toBe(true);
    expect(Number.isFinite(state.money)).toBe(true);
    expect(deserializeState(serializeState(state)).ok).toBe(true);
  });

  it('una recompensa de logro no desborda money en el techo', () => {
    const state = freshState();
    state.money = Number.MAX_VALUE;
    state.totalMoneyEarned = Number.MAX_VALUE;
    const stub = { id: 'tAudit', name: 'Stub', icon: 'coin', cond: { type: 'always' }, reward: { type: 'money', amount: 1e308 } };
    checkAchievements(state, [stub], {});
    expect(state.achievementsUnlocked).toContain('tAudit');
    expect(Number.isFinite(state.money)).toBe(true);
  });

  it('claimMission no desborda money en el techo', () => {
    const state = freshState();
    state.money = Number.MAX_VALUE;
    state.totalMoneyEarned = Number.MAX_VALUE;
    state.dailyMissions = [{
      id: 'mAudit',
      type: 'sellAtStallCount',
      difficulty: 'easy',
      params: {},
      target: 1,
      progress: 1,
      claimed: false,
      snapshot: 0,
      reward: { type: 'money', amount: 1e308 },
    }];
    const result = claimMission(state, 'mAudit');
    expect(result.ok).toBe(true);
    expect(Number.isFinite(state.money)).toBe(true);
  });

  it('applyOfflineProgress nunca deja money no-finito, ni siquiera partiendo del techo', () => {
    const state = freshState();
    state.automationOwned.robotStub = true;
    state.money = Number.MAX_VALUE;
    state.totalMoneyEarned = Number.MAX_VALUE;
    applyOfflineProgress(state, 3600, [contStub], itemsDataStub, dataBase);
    expect(Number.isFinite(state.money)).toBe(true);
    expect(Number.isFinite(state.totalMoneyEarned)).toBe(true);
    expect(deserializeState(serializeState(state)).ok).toBe(true);
  });
});

describe('§27.5.8 — la liquidación de la Mudanza no cuenta para misiones sellAtStallCount', () => {
  it('mudarse con inventario NO avanza una misión de venta activa sin reclamar', () => {
    const state = freshState();
    state.prestigeCount = GALAXY_MOVE_PRESTIGE_THRESHOLD;
    state.totalKeysEarned = 1000;
    state.totalKeysEarnedRun = 1000;
    state.stallLevel = 1;
    state.inventory = [
      { itemId: 'i1', containerId: 'tachoVereda', categoria: 'common', baseValue: 100 },
      { itemId: 'i2', containerId: 'tachoVereda', categoria: 'common', baseValue: 100 },
      { itemId: 'i3', containerId: 'tachoVereda', categoria: 'common', baseValue: 100 },
    ];
    state.dailyMissions = [{
      id: 'mMove',
      type: 'sellAtStallCount',
      difficulty: 'easy',
      params: {},
      target: 10,
      progress: 0,
      claimed: false,
      snapshot: state.stallSoldCount,
      reward: { type: 'money', amount: 100 },
    }];

    const result = doGalaxyMove(state, dataConStall);
    expect(result.ok).toBe(true);
    expect(state.stallSoldCount).toBe(3); // la liquidación en sí se mantiene (R26.D)

    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(0);
  });
});
