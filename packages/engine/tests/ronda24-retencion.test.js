/**
 * Ronda 24 — misiones diarias (§4.30/§4.31), eventos de contenedor (§4.32) y ciclo día/noche
 * (§4.33). Save v13.
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave } from '../src/save.js';
import { rollContainerResult, applyContainerResult } from '../src/systems/containers.js';
import { automationTick } from '../src/systems/automation.js';
import {
  rollThreeMissions,
  rerollDailyMissionsIfNeeded,
  updateMissionsProgress,
  claimMission,
  MISSION_TYPES,
} from '../src/systems/missions.js';
import { tryTriggerContainerEvent, isEventExpired } from '../src/systems/events.js';
import { isNightHour, getDayNightModifiers } from '../src/dayNight.js';
import { getLuck, getEffectiveTrapProbability, getTotalContainerDigs, getMissionRewardBaseValue } from '../src/economy.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';
import missionsData from '../../../apps/game/src/data/missions.json';
import dayNightData from '../../../apps/game/src/data/dayNight.json';
import eventsData from '../../../apps/game/src/data/events.json';

const tachoVereda = containers.find((c) => c.id === 'tachoVereda');
const dataBase = { upgrades, automations, prestigeTree };
const dataFull = { ...dataBase, missions: missionsData, dayNight: dayNightData, events: eventsData };

function ownTacho(state) {
  state.ownedContainers[tachoVereda.id] = 1;
}

describe('save v13: misiones diarias + evento de contenedor', () => {
  it('SAVE_VERSION es 13 y freshState trae los campos nuevos', () => {
    // AJUSTE (ronda 25): SAVE_VERSION avanzó a 14 (prestigio profundo); esta prueba solo
    // necesita que sea al menos 13 (los campos de esta ronda siguen presentes).
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(13);
    const state = freshState();
    expect(state.dailyMissions).toEqual([]);
    expect(state.missionsRolledAt).toBe(0);
    expect(state.missionsCompletedCount).toBe(0);
    expect(state.lastEventAt).toBe(0);
    expect(state.eventsUsedCount).toBe(0);
  });

  it('migra un save v12 sin campos nuevos rellenándolos con los defaults', () => {
    const v12 = { ...freshState(), saveVersion: 12, autoTargetContainerId: null }; // repuesto: freshState v16 ya no lo trae (ronda 27)
    delete v12.dailyMissions;
    delete v12.missionsRolledAt;
    delete v12.missionsCompletedCount;
    delete v12.lastEventAt;
    delete v12.eventsUsedCount;
    const result = validateSave(v12);
    expect(result.valid).toBe(true);
    // AJUSTE (ronda 25): un v12 migra hasta el SAVE_VERSION actual (14), no se detiene en 13.
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.dailyMissions).toEqual([]);
    expect(result.data.missionsCompletedCount).toBe(0);
  });

  it('rechaza un save con una misión de forma inválida', () => {
    const bad = { ...freshState(), dailyMissions: [{ id: 'x' }] };
    const result = validateSave(bad);
    expect(result.valid).toBe(false);
  });

  it('rechaza un save con un tipo de misión desconocido (allow-list, napkin #8)', () => {
    const state = freshState();
    ownTacho(state);
    state.dailyMissions = rollThreeMissions(state, containers, itemsData, dataFull, () => 0.1);
    state.dailyMissions[0].type = 'hostileType';
    const result = validateSave(state);
    expect(result.valid).toBe(false);
  });
});

describe('misiones diarias: reroll (relojes, roadmap §3.3/R24.1)', () => {
  it('primer boot (missionsRolledAt=0) rollea misiones aunque no haya contenido poseído todavía', () => {
    const state = freshState();
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataFull, Date.parse('2026-07-15T12:00:00'), () => 0.1);
    // Sin contenedores poseídos, findCategoryCount/digContainerCount no son elegibles: solo
    // sobreviven los tipos hard sin requisito de contenido (streakReach/moneyEarnedToday).
    expect(state.dailyMissions.length).toBeGreaterThan(0);
    expect(state.missionsRolledAt).toBe(Date.parse('2026-07-15T12:00:00'));
  });

  it('mismo día: NO rerollea (progreso no se pierde de gratis)', () => {
    const state = freshState();
    ownTacho(state);
    const day1 = Date.parse('2026-07-15T09:00:00');
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataFull, day1, () => 0.1);
    const missionsAfterFirstRoll = state.dailyMissions;
    const laterSameDay = Date.parse('2026-07-15T20:00:00');
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataFull, laterSameDay, () => 0.9);
    expect(state.dailyMissions).toBe(missionsAfterFirstRoll);
    expect(state.missionsRolledAt).toBe(day1);
  });

  it('cambia el día local: rerollea (el progreso viejo se pierde, es diario)', () => {
    const state = freshState();
    ownTacho(state);
    const day1 = Date.parse('2026-07-15T09:00:00');
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataFull, day1, () => 0.1);
    const missionsDay1 = state.dailyMissions;
    missionsDay1[0].progress = 999;
    const day2 = Date.parse('2026-07-16T09:00:00');
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataFull, day2, () => 0.5);
    expect(state.dailyMissions).not.toBe(missionsDay1);
    expect(state.missionsRolledAt).toBe(day2);
  });

  it('reloj hacia atrás: NO rerollea nunca (anti-exploit, §3.3)', () => {
    const state = freshState();
    ownTacho(state);
    const day2 = Date.parse('2026-07-16T09:00:00');
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataFull, day2, () => 0.1);
    const missionsDay2 = state.dailyMissions;
    const day1Retrocedido = Date.parse('2026-07-15T09:00:00');
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataFull, day1Retrocedido, () => 0.9);
    expect(state.dailyMissions).toBe(missionsDay2);
    expect(state.missionsRolledAt).toBe(day2);
  });

  it('sin data.missions, nunca rollea (patrón data.stall/data.streak opcional)', () => {
    const state = freshState();
    ownTacho(state);
    rerollDailyMissionsIfNeeded(state, containers, itemsData, dataBase, Date.now(), () => 0.1);
    expect(state.dailyMissions).toEqual([]);
  });
});

describe('misiones diarias: recompensas escalan con el mejor contenedor del seed (§4.31)', () => {
  it('getMissionRewardBaseValue crece con un contenedor más caro poseído', () => {
    const state = freshState();
    ownTacho(state);
    const vTacho = getMissionRewardBaseValue(state, containers, itemsData);
    const contenedorBarrio = containers.find((c) => c.id === 'contenedorBarrio');
    state.ownedContainers[contenedorBarrio.id] = 1;
    const vBarrio = getMissionRewardBaseValue(state, containers, itemsData);
    expect(vBarrio).toBeGreaterThan(vTacho);
  });

  it('sin ningún contenedor poseído, V es 0', () => {
    const state = freshState();
    expect(getMissionRewardBaseValue(state, containers, itemsData)).toBe(0);
  });
});

describe('misiones diarias: progreso por delta contra snapshot (roadmap §24.3, R24.1)', () => {
  it('findCategoryCount progresa por DELTA, no por el contador absoluto', () => {
    const state = freshState();
    ownTacho(state);
    state.itemsFoundByCategory.common = 3; // ya tenía progreso previo al roll
    state.dailyMissions = [
      { id: 'm1', type: 'findCategoryCount', difficulty: 'easy', params: { categoria: 'common' }, target: 5, progress: 0, claimed: false, snapshot: 3, reward: { type: 'money', amount: 10 } },
    ];
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(0);
    state.itemsFoundByCategory.common = 6;
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(3);
  });

  it('el robot (automationTick) también hace avanzar el progreso, sin tracking paralelo', () => {
    const state = freshState();
    ownTacho(state);
    const auto = automations.find((a) => (a.effects || []).some((e) => e.type === 'enablesAutoDig'));
    state.automationOwned[auto.id] = true;
    state.robots[0].targetContainerId = tachoVereda.id; // ronda 27: el target vive en la flota
    state.money = 1e9;
    state.dailyMissions = [
      { id: 'm1', type: 'digContainerCount', difficulty: 'easy', params: { containerId: tachoVereda.id }, target: 3, progress: 0, claimed: false, snapshot: getTotalContainerDigs(state, tachoVereda), reward: { type: 'money', amount: 10 } },
    ];
    for (let i = 0; i < 10; i++) {
      automationTick(state, 10, containers, itemsData, dataFull, () => 0.99);
    }
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBeGreaterThan(0);
  });

  it('EXCEPCIÓN streakReach: el progreso es el MÁXIMO observado, nunca baja con la racha', () => {
    const state = freshState();
    state.dailyMissions = [
      { id: 'm1', type: 'streakReach', difficulty: 'medium', params: {}, target: 8, progress: 0, claimed: false, snapshot: 0, reward: { type: 'money', amount: 10 } },
    ];
    state.digStreak = 5;
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(5);
    state.digStreak = 0; // cae en trampa, la racha se corta
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(5); // el máximo se conserva
  });

  it('claimMission paga la recompensa una sola vez y cuenta missionsCompletedCount', () => {
    const state = freshState();
    state.dailyMissions = [
      { id: 'm1', type: 'streakReach', difficulty: 'medium', params: {}, target: 5, progress: 5, claimed: false, snapshot: 0, reward: { type: 'money', amount: 500 } },
    ];
    const before = state.money;
    const result = claimMission(state, 'm1');
    expect(result.ok).toBe(true);
    expect(state.money).toBe(before + 500);
    expect(state.missionsCompletedCount).toBe(1);
    const second = claimMission(state, 'm1');
    expect(second.ok).toBe(false);
    expect(state.money).toBe(before + 500);
  });

  it('claimMission rechaza una misión todavía no cumplida', () => {
    const state = freshState();
    state.dailyMissions = [
      { id: 'm1', type: 'streakReach', difficulty: 'medium', params: {}, target: 8, progress: 3, claimed: false, snapshot: 0, reward: { type: 'money', amount: 500 } },
    ];
    const result = claimMission(state, 'm1');
    expect(result.ok).toBe(false);
    expect(state.money).toBe(0);
  });

  it('moneyEarnedToday nunca genera target 0 (V=0 sin contenedores poseídos rompía validateSave)', () => {
    // Bug real detectado en e2e: freshState() sin ningún contenedor poseído da
    // getMissionRewardBaseValue = 0; un target de 0 fallaba `validateDeepContent` (target > 0),
    // invalidando el save COMPLETO al deserializar (no solo la misión) — reproducido con
    // reroll en boot antes de comprar el primer contenedor.
    const state = freshState();
    const missions = rollThreeMissions(state, containers, itemsData, dataFull, () => 0.99);
    const moneyMission = missions.find((m) => m.type === 'moneyEarnedToday');
    if (moneyMission) expect(moneyMission.target).toBeGreaterThan(0);
  });

  it('MISSION_TYPES cubre los 6 tipos de PLAN.md §4.30', () => {
    expect(MISSION_TYPES).toEqual(
      expect.arrayContaining([
        'findCategoryCount',
        'digContainerCount',
        'streakReach',
        'sellAtStallCount',
        'fulfillOrders',
        'moneyEarnedToday',
      ])
    );
  });
});

describe('eventos de contenedor (§4.32): dispara, expira, nunca se persiste', () => {
  it('sin contenedor poseído, nunca dispara', () => {
    const state = freshState();
    const event = tryTriggerContainerEvent(state, containers, dataFull, 10, Date.now(), () => 0);
    expect(event).toBeNull();
  });

  it('con contenedor poseído y probabilidad favorable, dispara un evento con expiresAt futuro', () => {
    const state = freshState();
    ownTacho(state);
    const event = tryTriggerContainerEvent(state, containers, dataFull, 600, Date.now(), () => 0);
    expect(event).not.toBeNull();
    expect(event.containerId).toBe(tachoVereda.id);
    expect(event.expiresAt).toBeGreaterThan(Date.now());
    expect(state.lastEventAt).toBeGreaterThan(0);
  });

  it('respeta el cooldown: no dispara dos veces seguidas', () => {
    const state = freshState();
    ownTacho(state);
    const now = Date.now();
    const first = tryTriggerContainerEvent(state, containers, dataFull, 600, now, () => 0);
    expect(first).not.toBeNull();
    const second = tryTriggerContainerEvent(state, containers, dataFull, 600, now + 1000, () => 0);
    expect(second).toBeNull();
  });

  it('isEventExpired: true cuando pasó expiresAt, false mientras sigue activo', () => {
    const event = { containerId: 'x', expiresAt: 1000 };
    expect(isEventExpired(event, 999)).toBe(false);
    expect(isEventExpired(event, 1000)).toBe(true);
    expect(isEventExpired(null, 500)).toBe(true);
  });

  it('sin data.events, nunca dispara (patrón opcional)', () => {
    const state = freshState();
    ownTacho(state);
    const event = tryTriggerContainerEvent(state, containers, dataBase, 600, Date.now(), () => 0);
    expect(event).toBeNull();
  });

  it('un evento Dorado activo multiplica el valor del roll de ESE contenedor, y solo ese', () => {
    const state = freshState();
    const event = { containerId: tachoVereda.id, kind: 'golden', valueMult: 3, trapProbBonus: 0 };
    const random = () => 0.99; // sin trampa (probTrampaBase 0.05 < 0.99)
    const withEvent = rollContainerResult(state, tachoVereda, false, itemsData, dataBase, random, event, 12);
    const stateSinEvento = freshState();
    const withoutEvent = rollContainerResult(stateSinEvento, tachoVereda, false, itemsData, dataBase, random, null, 12);
    expect(withEvent.moneyDelta).toBeCloseTo(withoutEvent.moneyDelta * 3, 5);
    expect(withEvent.usedEvent).toBe(true);
    expect(withoutEvent.usedEvent).toBe(false);
  });

  it('un evento En Llamas de OTRO contenedor no afecta este roll', () => {
    const state = freshState();
    const otroContenedor = containers.find((c) => c.id === 'contenedorBarrio');
    const event = { containerId: otroContenedor.id, kind: 'fire', valueMult: 4, trapProbBonus: 0.15 };
    const random = () => 0.99;
    const result = rollContainerResult(state, tachoVereda, false, itemsData, dataBase, random, event, 12);
    expect(result.usedEvent).toBe(false);
  });

  it('applyContainerResult cuenta eventsUsedCount solo cuando el escarbado se resolvió con evento', () => {
    const state = freshState();
    const event = { containerId: tachoVereda.id, kind: 'golden', valueMult: 3, trapProbBonus: 0 };
    const result = rollContainerResult(state, tachoVereda, false, itemsData, dataBase, () => 0.99, event, 12);
    applyContainerResult(state, tachoVereda, result, false, dataBase);
    expect(state.eventsUsedCount).toBe(1);
  });
});

describe('ciclo día/noche (§4.33): puro por hora inyectada, nunca Date.now() interno', () => {
  it('isNightHour: 23hs es de noche, 12hs es de día (cruza medianoche 20-06)', () => {
    expect(isNightHour(23, dayNightData)).toBe(true);
    expect(isNightHour(3, dayNightData)).toBe(true);
    expect(isNightHour(12, dayNightData)).toBe(false);
    expect(isNightHour(19, dayNightData)).toBe(false);
    expect(isNightHour(6, dayNightData)).toBe(false);
  });

  it('getDayNightModifiers: neutro de día, bonus de noche', () => {
    expect(getDayNightModifiers(12, dayNightData)).toEqual({ luckBonus: 0, trapProbBonus: 0 });
    expect(getDayNightModifiers(23, dayNightData)).toEqual({ luckBonus: 3, trapProbBonus: 0.03 });
  });

  it('getLuck/getEffectiveTrapProbability: default hour=12 (día) no cambia ningún resultado previo a la ronda 24', () => {
    const state = freshState();
    const luckDefault = getLuck(state, dataBase);
    const luckDia = getLuck(state, dataBase, 12);
    expect(luckDefault).toBe(luckDia);
  });

  it('getLuck sube de noche, getEffectiveTrapProbability también (con data.dayNight)', () => {
    const state = freshState();
    const luckDia = getLuck(state, dataFull, 12);
    const luckNoche = getLuck(state, dataFull, 23);
    expect(luckNoche).toBe(luckDia + 3);

    const trapDia = getEffectiveTrapProbability(state, tachoVereda, false, dataFull, 12);
    const trapNoche = getEffectiveTrapProbability(state, tachoVereda, false, dataFull, 23);
    // El bonus de Suerte nocturno también reduce la trampa por la fórmula §4.6 — el delta neto
    // no es el `nightTrapProbBonus` puro, sino ese menos la reducción que aporta la Suerte extra.
    const expectedDelta = dayNightData.nightTrapProbBonus - dayNightData.nightLuckBonus * 0.002;
    expect(trapNoche - trapDia).toBeCloseTo(expectedDelta, 5);
  });
});
