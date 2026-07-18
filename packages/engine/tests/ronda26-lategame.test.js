/**
 * Ronda 26.A — segunda capa de prestigio: Mudanza de Galaxia (§2.11/§4.34), Escrituras (§4.35)
 * y su árbol (§4.36). Save v15.
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave } from '../src/save.js';
import { getSellMult, getStallCapacity, getParallelAutoSlots, getFleetSize, getExtraDailyMissionSlots, hasProceduralContainersUnlocked } from '../src/economy.js';
import {
  doPrestige,
  canGalaxyMove,
  galaxyMoveDeedsPreview,
  doGalaxyMove,
  nextDeedsNodeCost,
  isDeedsNodeUnlocked,
  buyDeedsNode,
  GALAXY_MOVE_PRESTIGE_THRESHOLD,
} from '../src/systems/prestige.js';
import { rollThreeMissions } from '../src/systems/missions.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import deedsTree from '../../../apps/game/src/data/deedsTree.json';
import stall from '../../../apps/game/src/data/stall.json';
import missionsData from '../../../apps/game/src/data/missions.json';
import itemsData from '../../../apps/game/src/data/items.json';

const dataBase = { upgrades, automations, prestigeTree };
const dataFull = { ...dataBase, deedsTree, stall, missions: missionsData };

const tachoVereda = containers.find((c) => c.id === 'tachoVereda');

/** Estado listo para prestigiar/mudarse: dinero + prestigeCount al umbral pedido. */
function primedState({ money = 2_000_000_000, prestigeCount = GALAXY_MOVE_PRESTIGE_THRESHOLD, totalKeysEarnedRun = 300 } = {}) {
  const state = freshState();
  state.money = money;
  state.totalMoneyEarned = money;
  state.prestigeCount = prestigeCount;
  state.totalKeysEarnedRun = totalKeysEarnedRun;
  return state;
}

describe('save v15: Mudanza de Galaxia', () => {
  it('SAVE_VERSION es >= 15 y freshState trae los campos nuevos (la ronda 27 la extendió a 16)', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(15);
    const state = freshState();
    expect(state.deeds).toBe(0);
    expect(state.deedsTreeLevels).toEqual({});
    expect(state.galaxyMoveCount).toBe(0);
    expect(state.totalKeysEarnedRun).toBe(0);
  });

  it('migra un save v14 sin campos nuevos, backfillando totalKeysEarnedRun con totalKeysEarned', () => {
    const v14 = { ...freshState(), saveVersion: 14, totalKeysEarned: 42, autoTargetContainerId: null }; // repuesto: freshState v16 ya no lo trae (ronda 27)
    delete v14.deeds;
    delete v14.deedsTreeLevels;
    delete v14.galaxyMoveCount;
    delete v14.totalKeysEarnedRun;
    const result = validateSave(v14, undefined, undefined, prestigeTree);
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.deeds).toBe(0);
    expect(result.data.deedsTreeLevels).toEqual({});
    expect(result.data.galaxyMoveCount).toBe(0);
    expect(result.data.totalKeysEarnedRun).toBe(42);
  });

  it('rechaza un save con deeds negativo', () => {
    const bad = { ...freshState(), deeds: -1 };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('rechaza un save con galaxyMoveCount fraccionario', () => {
    const bad = { ...freshState(), galaxyMoveCount: 1.5 };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('rechaza un save con totalKeysEarnedRun no finito (Infinity de JSON.parse("1e999"))', () => {
    const bad = { ...freshState(), totalKeysEarnedRun: Infinity };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('rechaza un save con deedsTreeLevels con un valor no numérico', () => {
    const bad = { ...freshState(), deedsTreeLevels: { ventajaGalactica: 'x' } };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('round-trip serialize/deserialize v15 sin pérdida', () => {
    const state = freshState();
    state.deeds = 12;
    state.deedsTreeLevels = { ventajaGalactica: 2 };
    state.galaxyMoveCount = 1;
    state.totalKeysEarnedRun = 7;
    // Coherencia (auditoría 26.D): run <= total en todo save legítimo — sin esto el seed se rechaza.
    state.totalKeysEarned = 7;
    const result = validateSave(JSON.parse(JSON.stringify(state)));
    expect(result.valid).toBe(true);
    expect(result.data.deeds).toBe(12);
    expect(result.data.deedsTreeLevels).toEqual({ ventajaGalactica: 2 });
    expect(result.data.galaxyMoveCount).toBe(1);
    expect(result.data.totalKeysEarnedRun).toBe(7);
  });
});

describe('§4.34 — canGalaxyMove / umbral de prestigio 10', () => {
  it('no disponible por debajo del prestigio 10', () => {
    const state = primedState({ prestigeCount: 9 });
    expect(canGalaxyMove(state)).toBe(false);
    const result = doGalaxyMove(state, dataFull);
    expect(result.ok).toBe(false);
  });

  it('disponible desde el prestigio 10', () => {
    const state = primedState({ prestigeCount: 10 });
    expect(canGalaxyMove(state)).toBe(true);
  });
});

describe('§4.35 — fórmula de Escrituras', () => {
  it('escrituras = max(1, floor(sqrt(prestigeCount * totalKeysEarnedRun) / 5))', () => {
    const state = primedState({ prestigeCount: 10, totalKeysEarnedRun: 300 });
    // sqrt(10*300)=sqrt(3000)=54.77 / 5 = 10.95 -> floor 10
    expect(galaxyMoveDeedsPreview(state)).toBe(10);
  });

  it('nunca da menos de 1, incluso con totalKeysEarnedRun en 0', () => {
    const state = primedState({ prestigeCount: 10, totalKeysEarnedRun: 0 });
    expect(galaxyMoveDeedsPreview(state)).toBe(1);
  });

  it('doGalaxyMove otorga exactamente galaxyMoveDeedsPreview() de Escrituras', () => {
    const state = primedState({ prestigeCount: 12, totalKeysEarnedRun: 500 });
    const preview = galaxyMoveDeedsPreview(state);
    const result = doGalaxyMove(state, dataFull);
    expect(result.ok).toBe(true);
    expect(result.deedsEarned).toBe(preview);
    expect(state.deeds).toBe(preview);
  });

  it('las Escrituras se ACUMULAN a través de mudanzas sucesivas (nunca se resetean)', () => {
    const state = primedState({ prestigeCount: 10, totalKeysEarnedRun: 300 });
    const first = doGalaxyMove(state, dataFull).deedsEarned;
    expect(state.deeds).toBe(first);
    // segunda mudanza: hace falta volver a prestigio 10 y acumular Llaves de nuevo
    state.prestigeCount = 10;
    state.totalKeysEarnedRun = 300;
    const second = doGalaxyMove(state, dataFull).deedsEarned;
    expect(state.deeds).toBe(first + second);
  });
});

describe('§4.34 — tabla campo-por-campo: qué resetea / qué conserva la mudanza (R26.1)', () => {
  function stateBeforeMove() {
    const state = primedState({ prestigeCount: 10, totalKeysEarnedRun: 300 });
    // "run" actual con contenido a resetear
    state.money = 5000;
    state.totalMoneyEarned = 5000;
    state.upgradeLevels = { luck: 3, digPower: 2, area: 1, capacity: 4 };
    state.ownedContainers = { tachoVereda: 2 };
    state.automationOwned = { autoDig: true };
    state.autoQueue = ['tachoVereda'];
    state.autoProcessing = [{ containerId: 'tachoVereda', totalTime: 10, remaining: 5 }];
    state.autoTargetContainerId = 'tachoVereda';
    // exclusivo de la mudanza
    state.prestigeKeys = 50;
    state.prestigeTreeLevels = { capitalInicial: 3 };
    state.specialization = 'chatarrero';
    state.activeChallenge = 'campoMinado';
    // NO se resetea
    state.achievementsUnlocked = ['a1', 'a2'];
    state.itemsFoundCount = 40;
    state.itemsFoundByCategory = { common: 40 };
    state.itemsFoundByItem = { tachoVereda: { lataAbollada: 5 } };
    state.categoryFragments = 3;
    state.trapsHit = 6;
    state.trapsDiscarded = 1;
    state.legendariesFound = ['legend-can'];
    state.containerLevels = { tachoVereda: 4 };
    state.containerLevelProgress = { tachoVereda: 2 };
    state.digStreak = 7;
    state.bestDigStreak = 20;
    state.equippedTool = 'manos';
    state.toolsOwned = { manos: true };
    state.gravesHit = 2;
    state.stallLevel = 2;
    state.keepThreshold = 100;
    state.stallOrders = [];
    state.ordersRotatedAt = 111;
    state.stallVendorAt = 222;
    state.stallSoldCount = 9;
    state.ordersFulfilledCount = 4;
    state.storySeen = ['stall-intro'];
    state.dailyMissions = [];
    state.missionsRolledAt = 333;
    state.missionsCompletedCount = 8;
    state.lastEventAt = 444;
    state.eventsUsedCount = 2;
    state.challengesCompleted = ['manosVacias'];
    state.specializationsUsed = 3;
    state.totalKeysEarned = 200;
    state.inventory = [
      { itemId: 'lataAbollada', containerId: 'tachoVereda', categoria: 'common', baseValue: 10 },
      { itemId: 'radioAntigua', containerId: 'tachoVereda', categoria: 'electronics', baseValue: 30 },
    ];
    state.deedsTreeLevels = { ventajaGalactica: 1 };
    return state;
  }

  it('resetea lo mismo que un prestigio normal (dinero, contenedores, mejoras, automatización)', () => {
    const state = stateBeforeMove();
    doGalaxyMove(state, dataFull);
    expect(state.upgradeLevels).toEqual({ luck: 0, digPower: 0, area: 0, capacity: 0 });
    expect(state.ownedContainers).toEqual({});
    expect(state.automationOwned).toEqual({});
    expect(state.autoQueue).toEqual([]);
    expect(state.autoProcessing).toEqual([]);
    expect(state.robots.every((r) => r.targetContainerId === null)).toBe(true); // ronda 27: flota
    // startMoney recalculado con prestigeTreeLevels ya vacío -> 0 (sin nodo capitalInicial)
    expect(state.money).toBe(0);
    expect(state.totalMoneyEarned).toBe(0);
  });

  it('resetea ADEMÁS lo exclusivo de la mudanza (Llaves, árbol de prestigio, prestigeCount, elección)', () => {
    const state = stateBeforeMove();
    doGalaxyMove(state, dataFull);
    expect(state.prestigeKeys).toBe(0);
    expect(state.prestigeTreeLevels).toEqual({});
    expect(state.prestigeCount).toBe(0);
    expect(state.specialization).toBeNull();
    expect(state.activeChallenge).toBeNull();
    expect(state.totalKeysEarnedRun).toBe(0);
  });

  it('el desafío activo se CANCELA sin evaluar su goal ni otorgar recompensa (R26.D)', () => {
    const state = stateBeforeMove();
    state.activeChallenge = 'campoMinado'; // goal "always": se cumpliría instantáneo en un prestigio normal
    const challengesBefore = [...state.challengesCompleted];
    doGalaxyMove(state, dataFull);
    expect(state.challengesCompleted).toEqual(challengesBefore); // sin agregar campoMinado
  });

  it('liquida el inventario del Puesto: se vacía y cuenta como vendido (stallSoldCount)', () => {
    const state = stateBeforeMove();
    const soldBefore = state.stallSoldCount;
    const inventoryCount = state.inventory.length;
    doGalaxyMove(state, dataFull);
    expect(state.inventory).toEqual([]);
    expect(state.stallSoldCount).toBe(soldBefore + inventoryCount);
  });

  it('NO resetea logros, colección, contadores históricos, herramientas ni el Puesto (nivel/umbral)', () => {
    const state = stateBeforeMove();
    doGalaxyMove(state, dataFull);
    expect(state.achievementsUnlocked).toEqual(['a1', 'a2']);
    expect(state.itemsFoundCount).toBe(40);
    expect(state.itemsFoundByCategory).toEqual({ common: 40 });
    expect(state.itemsFoundByItem).toEqual({ tachoVereda: { lataAbollada: 5 } });
    expect(state.categoryFragments).toBe(3);
    expect(state.trapsHit).toBe(6);
    expect(state.trapsDiscarded).toBe(1);
    expect(state.legendariesFound).toEqual(['legend-can']);
    expect(state.containerLevels).toEqual({ tachoVereda: 4 });
    expect(state.containerLevelProgress).toEqual({ tachoVereda: 2 });
    expect(state.digStreak).toBe(7);
    expect(state.bestDigStreak).toBe(20);
    expect(state.equippedTool).toBe('manos');
    expect(state.toolsOwned).toEqual({ manos: true });
    expect(state.gravesHit).toBe(2);
    expect(state.stallLevel).toBe(2);
    expect(state.keepThreshold).toBe(100);
    expect(state.ordersRotatedAt).toBe(111);
    expect(state.stallVendorAt).toBe(222);
    expect(state.ordersFulfilledCount).toBe(4);
    expect(state.storySeen).toEqual(['stall-intro']);
    expect(state.missionsRolledAt).toBe(333);
    expect(state.missionsCompletedCount).toBe(8);
    expect(state.lastEventAt).toBe(444);
    expect(state.eventsUsedCount).toBe(2);
    expect(state.challengesCompleted).toEqual(['manosVacias']);
    expect(state.specializationsUsed).toBe(3);
    expect(state.totalKeysEarned).toBe(200);
  });

  it('NO resetea deeds/deedsTreeLevels: el punto entero de la mudanza es que sobrevivan', () => {
    const state = stateBeforeMove();
    doGalaxyMove(state, dataFull);
    expect(state.deedsTreeLevels).toEqual({ ventajaGalactica: 1 });
    expect(state.deeds).toBeGreaterThan(0); // arrancó en 0, ganó Escrituras por esta misma mudanza
  });

  it('galaxyMoveCount sube en 1 por cada mudanza', () => {
    const state = stateBeforeMove();
    doGalaxyMove(state, dataFull);
    expect(state.galaxyMoveCount).toBe(1);
  });
});

describe('§4.36 — árbol de Escrituras: 6 nodos, mecanismo espejo del árbol de prestigio', () => {
  it('deedsTree.json tiene 6 nodos, todos con nivelMaximo finito (ninguno infinito)', () => {
    expect(deedsTree.length).toBe(6);
    for (const node of deedsTree) {
      expect(Number.isFinite(node.nivelMaximo)).toBe(true);
    }
  });

  it('buyDeedsNode compra un nivel, descuenta Escrituras y sube deedsTreeLevels', () => {
    const state = freshState();
    state.deeds = 1000;
    const node = deedsTree.find((n) => n.id === 'ventajaGalactica');
    const cost = nextDeedsNodeCost(state, node);
    const result = buyDeedsNode(state, node);
    expect(result.ok).toBe(true);
    expect(state.deedsTreeLevels.ventajaGalactica).toBe(1);
    expect(state.deeds).toBe(1000 - cost);
  });

  it('rechaza comprar sin Escrituras suficientes', () => {
    const state = freshState();
    state.deeds = 0;
    const node = deedsTree.find((n) => n.id === 'ventajaGalactica');
    const result = buyDeedsNode(state, node);
    expect(result.ok).toBe(false);
    expect(state.deedsTreeLevels.ventajaGalactica).toBeUndefined();
  });

  it('respeta nivelMaximo: rechaza comprar por encima del tope', () => {
    const state = freshState();
    state.deeds = 1e9;
    const node = deedsTree.find((n) => n.id === 'ecoDelBigBang'); // nivelMaximo 1
    expect(buyDeedsNode(state, node).ok).toBe(true);
    expect(isDeedsNodeUnlocked(state, node)).toBe(true);
    const second = buyDeedsNode(state, node);
    expect(second.ok).toBe(false);
    expect(state.deedsTreeLevels.ecoDelBigBang).toBe(1);
  });

  it('deedsTreeLevels sobrevive una mudanza (ya cubierto arriba) y NO es tocado por un prestigio normal', () => {
    const state = primedState();
    state.deedsTreeLevels = { ventajaGalactica: 2 };
    doPrestige(state, dataFull);
    expect(state.deedsTreeLevels).toEqual({ ventajaGalactica: 2 });
  });

  it('ventajaGalactica: +25% valor de venta global por nivel, compuesto con el resto de getSellMult', () => {
    const state = freshState();
    const before = getSellMult(state, 'antiques', dataFull);
    state.deedsTreeLevels = { ventajaGalactica: 2 };
    expect(getSellMult(state, 'antiques', dataFull)).toBeCloseTo(before * (1 + 2 * 0.25));
  });

  it('memoriaDeCiudades: +1 Llave de Ciudad por prestigio, por nivel, sumado en doPrestige', () => {
    const state = primedState();
    state.deedsTreeLevels = { memoriaDeCiudades: 3 };
    const { keysEarned } = doPrestige(state, dataFull);
    const stateNeutral = primedState();
    const { keysEarned: keysEarnedNeutral } = doPrestige(stateNeutral, dataFull);
    expect(keysEarned).toBe(keysEarnedNeutral + 3);
  });

  it('bolsilloCosmico: +6 slots de inventario del Puesto por nivel', () => {
    const state = freshState();
    state.stallLevel = 1;
    const before = getStallCapacity(state, dataFull);
    state.deedsTreeLevels = { bolsilloCosmico: 2 };
    expect(getStallCapacity(state, dataFull)).toBe(before + 2 * 6);
  });

  it('bolsilloCosmico no da capacidad sin el Puesto comprado (stallLevel 0)', () => {
    const state = freshState();
    state.deedsTreeLevels = { bolsilloCosmico: 3 };
    expect(getStallCapacity(state, dataFull)).toBe(0);
  });

  it('agendaLlena: +1 misión diaria por nivel, sobre las 3 base', () => {
    const state = freshState();
    state.ownedContainers[tachoVereda.id] = 1;
    const baseline = rollThreeMissions(state, containers, itemsData, dataFull, () => 0.1);
    state.deedsTreeLevels = { agendaLlena: 2 };
    expect(getExtraDailyMissionSlots(state, dataFull)).toBe(2);
    const withExtra = rollThreeMissions(state, containers, itemsData, dataFull, () => 0.1);
    expect(withExtra.length).toBe(baseline.length + 2);
  });

  it('flotaFundadora: +1 robot de flota por nivel (ronda 27: robots enteros, ya no brazos)', () => {
    const state = freshState();
    const before = getFleetSize(state, dataBase);
    state.deedsTreeLevels = { flotaFundadora: 2 };
    expect(getFleetSize(state, dataFull)).toBe(before + 2);
    // Los brazos del robot 1 NO cambian con flotaFundadora (PLAN.md §4.38).
    expect(getParallelAutoSlots(state, dataFull)).toBe(getParallelAutoSlots(state, dataBase));
  });

  it('ecoDelBigBang: desbloquea el flag de contenedores procedurales al comprarlo', () => {
    const state = freshState();
    expect(hasProceduralContainersUnlocked(state, dataFull)).toBe(false);
    state.deedsTreeLevels = { ecoDelBigBang: 1 };
    expect(hasProceduralContainersUnlocked(state, dataFull)).toBe(true);
  });

  it('sin data.deedsTree, ningún efecto suma nada (opcional, comportamiento previo intacto)', () => {
    const state = freshState();
    state.deedsTreeLevels = { ventajaGalactica: 5, bolsilloCosmico: 5, flotaFundadora: 5 };
    state.stallLevel = 1;
    expect(getSellMult(state, 'antiques', dataBase)).toBe(1);
    expect(getStallCapacity(state, { ...dataBase, stall })).toBe(stall.stallCapacityBase);
    expect(getParallelAutoSlots(state, dataBase)).toBe(0);
    expect(hasProceduralContainersUnlocked(state, dataBase)).toBe(false);
  });
});
