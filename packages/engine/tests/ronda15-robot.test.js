/**
 * Ronda 15 (PLAN.md §4.7): mejoras del robot — Fuerza del robot (autoDigPowerPercent),
 * velocidad de procesamiento (autoSpeedPercent) y descarte de trampas (trapDiscardChancePerNivel).
 * Data inyectada mínima (stubs): los efectos todavía no existen en apps/game/src/data/*.json
 * (eso es tarea de los Agentes B/C de esta ronda).
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave, serializeState, deserializeState } from '../src/save.js';
import {
  getAutoDigPowerMult,
  getAutoSpeedMult,
  getAutoTrapDiscardChance,
  getEffectiveDigTime,
} from '../src/economy.js';
import { automationTick } from '../src/systems/automation.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { estimateAutomationRatePerSecond, expectedContainerValue } from '../src/systems/offline.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';

// Stub mínimo: solo lo que necesitan los tests de esta ronda, sin depender de que B/C ya
// hayan agregado los efectos nuevos a automations.json/prestigeTree.json.
const automationsStub = [
  { id: 'robotStub', name: 'Robot Stub', effects: [{ type: 'enablesAutoDig' }] },
  { id: 'fuerzaMotor1', name: 'Motor de Fuerza I', effects: [{ type: 'autoDigPowerPercent', percent: 0.4 }] },
  { id: 'fuerzaMotor2', name: 'Motor de Fuerza II', effects: [{ type: 'autoDigPowerPercent', percent: 0.8 }] },
  { id: 'velocidadMotor1', name: 'Motor de Velocidad I', effects: [{ type: 'autoSpeedPercent', percent: 0.25 }] },
  { id: 'velocidadMotor2', name: 'Motor de Velocidad II', effects: [{ type: 'autoSpeedPercent', percent: 0.5 }] },
];

const prestigeTreeStub = [
  {
    id: 'escanerTrampas',
    name: 'Escaner de Trampas',
    effects: [{ type: 'trapDiscardChancePerNivel', percentPerNivel: 0.34 }],
  },
];

const data = { upgrades, automations: automationsStub, prestigeTree: prestigeTreeStub };

// costoInicial alto a propósito: evita que automationTick auto-compre este contenedor dentro de
// la cola durante los tests (efecto colateral no relacionado con lo que se está probando acá).
const stubContainer = {
  id: 'stubContainer',
  name: 'Contenedor Stub',
  costoInicial: 999999,
  categorias: ['common'],
  probTrampaBase: 1,
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
    stubContainer: [{ icon: 'artifact', name: 'Item Stub', categoria: 'common', valorBase: 10 }],
  },
  rarities: [{ id: 'common', mult: 1, colorToken: '--r-common' }],
};

function stateWithRobot() {
  const state = freshState();
  state.automationOwned.robotStub = true;
  return state;
}

describe('getAutoDigPowerMult — Fuerza extra del robot (PLAN.md §4.7)', () => {
  it('es 1 sin máquinas compradas', () => {
    const state = freshState();
    expect(getAutoDigPowerMult(state, data)).toBe(1);
  });

  it('es 1.4 con una máquina de +0.4 comprada', () => {
    const state = freshState();
    state.automationOwned.fuerzaMotor1 = true;
    expect(getAutoDigPowerMult(state, data)).toBeCloseTo(1.4);
  });

  it('es 2.2 con dos máquinas — los percent SUMAN sobre la base 1', () => {
    const state = freshState();
    state.automationOwned.fuerzaMotor1 = true;
    state.automationOwned.fuerzaMotor2 = true;
    expect(getAutoDigPowerMult(state, data)).toBeCloseTo(2.2);
  });
});

describe('getEffectiveDigTime — la Fuerza del robot solo afecta isAuto=true', () => {
  it('con la máquina comprada, automático es más rápido que manual', () => {
    const state = freshState();
    state.automationOwned.fuerzaMotor1 = true;
    const autoTime = getEffectiveDigTime(state, stubContainer, data, true);
    const manualTime = getEffectiveDigTime(state, stubContainer, data, false);
    expect(autoTime).toBeLessThan(manualTime);
  });

  it('sin ninguna máquina, automático y manual dan exactamente lo mismo', () => {
    const state = freshState();
    const autoTime = getEffectiveDigTime(state, stubContainer, data, true);
    const manualTime = getEffectiveDigTime(state, stubContainer, data, false);
    expect(autoTime).toBe(manualTime);
    // el default isAuto=false no cambia nada: llamadores existentes (UI, resto de la suite)
    // que no pasan el 4º parámetro siguen viendo el mismo comportamiento de antes.
    expect(getEffectiveDigTime(state, stubContainer, data)).toBe(manualTime);
  });
});

describe('getAutoSpeedMult y su aplicación en automationTick', () => {
  it('es 1 sin máquinas; 1.75 con dos máquinas (0.25 + 0.5)', () => {
    const state = freshState();
    expect(getAutoSpeedMult(state, data)).toBe(1);
    state.automationOwned.velocidadMotor1 = true;
    state.automationOwned.velocidadMotor2 = true;
    expect(getAutoSpeedMult(state, data)).toBeCloseTo(1.75);
  });

  it('un slot con remaining 10 avanza dt*mult: tras 1s con mult 1.75, remaining pasa a 8.25', () => {
    const state = stateWithRobot();
    state.automationOwned.velocidadMotor1 = true;
    state.automationOwned.velocidadMotor2 = true;
    state.autoProcessing = [{ containerId: stubContainer.id, totalTime: 10, remaining: 10 }];

    automationTick(state, 1, [stubContainer], itemsDataStub, data, () => 0.99);

    expect(state.autoProcessing[0].remaining).toBeCloseTo(8.25);
  });
});

describe('getAutoTrapDiscardChance — nodo de prestigio Escaner de Trampas', () => {
  it('es 0 sin el nodo', () => {
    const state = freshState();
    expect(getAutoTrapDiscardChance(state, data)).toBe(0);
  });

  it('es 0.34/0.68/1 (clampeado) con nivel 1/2/3', () => {
    const state = freshState();
    state.prestigeTreeLevels.escanerTrampas = 1;
    expect(getAutoTrapDiscardChance(state, data)).toBeCloseTo(0.34);
    state.prestigeTreeLevels.escanerTrampas = 2;
    expect(getAutoTrapDiscardChance(state, data)).toBeCloseTo(0.68);
    state.prestigeTreeLevels.escanerTrampas = 3;
    expect(getAutoTrapDiscardChance(state, data)).toBe(1);
  });
});

describe('Descarte de trampas end-to-end (automationTick)', () => {
  it('con el nodo a nivel 3, un slot que completa en trampa se descarta: sin castigo ni loot', () => {
    const state = stateWithRobot();
    state.prestigeTreeLevels.escanerTrampas = 3;
    state.money = 1000;
    state.autoProcessing = [{ containerId: stubContainer.id, totalTime: 10, remaining: 0.1 }];

    automationTick(state, 1, [stubContainer], itemsDataStub, data, () => 0.5);

    expect(state.money).toBe(1000);
    expect(state.trapsDiscarded).toBe(1);
    expect(state.autoProcessedCount).toBe(0);
    expect(state.trapsHit).toBe(0);
  });

  it('sin el nodo, el mismo escenario SÍ castiga (dinero baja, trapsHit sube)', () => {
    const state = stateWithRobot();
    state.money = 1000;
    state.autoProcessing = [{ containerId: stubContainer.id, totalTime: 10, remaining: 0.1 }];

    automationTick(state, 1, [stubContainer], itemsDataStub, data, () => 0.5);

    expect(state.money).toBeLessThan(1000);
    expect(state.trapsDiscarded).toBe(0);
    expect(state.trapsHit).toBe(1);
  });
});

describe('save.js — migración v5 -> v6 (trapsDiscarded)', () => {
  it('un save v5 sin trapsDiscarded se acepta y sale con trapsDiscarded: 0', () => {
    const v5 = { ...freshState(), saveVersion: 5 };
    delete v5.trapsDiscarded;
    const result = validateSave(v5);
    expect(result.valid).toBe(true);
    expect(result.data.trapsDiscarded).toBe(0);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
  });

  it('trapsDiscarded: NaN se rechaza', () => {
    const state = { ...freshState(), trapsDiscarded: NaN };
    const result = validateSave(state);
    expect(result.valid).toBe(false);
  });

  it('serializeState/deserializeState conservan trapsDiscarded', () => {
    const state = freshState();
    state.trapsDiscarded = 7;
    const result = deserializeState(serializeState(state));
    expect(result.ok).toBe(true);
    expect(result.state.trapsDiscarded).toBe(7);
  });
});

describe('checkAchievements — cond types nuevos (trapsDiscardedAtLeast, containerOwnedAtLeast)', () => {
  const ctx = { allContainers: [stubContainer], allAutomations: automationsStub };

  it('trapsDiscardedAtLeast desbloquea cuando state.trapsDiscarded llega al value', () => {
    const state = freshState();
    state.trapsDiscarded = 50;
    const achievementsData = [{ id: 'aTest1', cond: { type: 'trapsDiscardedAtLeast', value: 50 } }];
    const unlocked = checkAchievements(state, achievementsData, ctx);
    expect(unlocked).toEqual(['aTest1']);
  });

  it('containerOwnedAtLeast desbloquea cuando ownedContainers[id] llega al value', () => {
    const state = freshState();
    state.ownedContainers.x = 1;
    const achievementsData = [
      { id: 'aTest2', cond: { type: 'containerOwnedAtLeast', containerId: 'x', value: 1 } },
    ];
    const unlocked = checkAchievements(state, achievementsData, ctx);
    expect(unlocked).toEqual(['aTest2']);
  });
});

// AJUSTE (auditoría ronda 15): la tasa offline (§4.5) tiene que reflejar las máquinas del robot
// (§4.7) — automationTick procesa con isAuto=true y getAutoSpeedMult, pero la estimación offline
// usaba el tiempo efectivo MANUAL y velocidad 1: las máquinas compradas no hacían nada offline.
describe('AUDITORÍA ronda 15 — el offline respeta las máquinas del robot (§4.5 × §4.7)', () => {
  // probTrampaBase 0: con la trampa segura del stubContainer (probTrampaBase 1) el valor
  // esperado del contenedor es 0 y la tasa da 0 haya o no máquinas — no se podría medir nada.
  const offlineContainer = { ...stubContainer, id: 'offlineStub', probTrampaBase: 0 };
  const offlineItemsData = {
    containers: {
      offlineStub: [{ icon: 'artifact', name: 'Item Offline', categoria: 'common', valorBase: 10 }],
    },
    rarities: itemsDataStub.rarities,
  };
  // getParallelAutoSlots parte de 0 (en la data real el slot base lo aporta el efecto
  // `parallelSlots` del Robot Clasificador): el stub necesita su propia máquina de slots
  // para que la tasa no dé 0. No se agrega al robotStub compartido para no alterar los
  // escenarios de automationTick de arriba.
  const offlineData = {
    ...data,
    automations: [...automationsStub, { id: 'slotStub', name: 'Slot Stub', effects: [{ type: 'parallelSlots', flat: 1 }] }],
  };

  function offlineState() {
    const state = stateWithRobot();
    state.automationOwned.slotStub = true;
    state.money = offlineContainer.costoInicial; // bestAffordableUnlockedContainer lo elige
    return state;
  }

  it('sin máquinas, la tasa offline es la de siempre (regresión: nada cambia para saves viejos)', () => {
    const state = offlineState();
    const rate = estimateAutomationRatePerSecond(state, [offlineContainer], offlineItemsData, offlineData);
    const expected =
      expectedContainerValue(state, offlineContainer, offlineItemsData, offlineData) /
      getEffectiveDigTime(state, offlineContainer, offlineData);
    expect(rate).toBeCloseTo(expected);
    expect(rate).toBeGreaterThan(0);
  });

  it('con Motor de Velocidad I (+25%), la tasa offline es exactamente 1.25× la base', () => {
    const base = estimateAutomationRatePerSecond(offlineState(), [offlineContainer], offlineItemsData, offlineData);
    const state = offlineState();
    state.automationOwned.velocidadMotor1 = true;
    const faster = estimateAutomationRatePerSecond(state, [offlineContainer], offlineItemsData, offlineData);
    expect(faster).toBeCloseTo(base * 1.25);
  });

  it('con Motor de Fuerza I (+40%), la tasa offline usa el tiempo efectivo isAuto=true (igual que automationTick)', () => {
    const base = estimateAutomationRatePerSecond(offlineState(), [offlineContainer], offlineItemsData, offlineData);
    const state = offlineState();
    state.automationOwned.fuerzaMotor1 = true;
    const faster = estimateAutomationRatePerSecond(state, [offlineContainer], offlineItemsData, offlineData);
    expect(faster).toBeGreaterThan(base);
    const expected =
      expectedContainerValue(state, offlineContainer, offlineItemsData, offlineData) /
      getEffectiveDigTime(state, offlineContainer, offlineData, true);
    expect(faster).toBeCloseTo(expected);
  });
});
