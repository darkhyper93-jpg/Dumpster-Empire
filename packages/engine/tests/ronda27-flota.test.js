/**
 * Ronda 27 — Flota de robots y filtros (PLAN.md §2.12, §4.38, §4.39; ROADMAPv4 §27).
 * Save v16: el robot actual pasa a ser el slot 1 de una flota (`state.robots[]`), cada robot
 * con `targetContainerId` y filtros propios (`descartarBajoValor` / `reservarCategorias`)
 * evaluados por el ENGINE (nunca la UI). La migración v15->v16 absorbe `autoTargetContainerId`
 * en el robot 1 y BORRA el campo (segunda migración que elimina campos; precedente: v9->v10).
 *
 * `robotStub`/`hangarStub`: mismo patrón que ronda15-robot.test.js / ronda23-puesto.test.js —
 * stubs de máquinas con solo los efectos bajo prueba, sobre data real de upgrades/prestigio.
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION, ROBOTS_MAX_SAFETY, defaultRobotConfig } from '../src/state.js';
import { validateSave, serializeState, deserializeState } from '../src/save.js';
import {
  getFleetSize,
  getParallelAutoSlots,
} from '../src/economy.js';
import {
  automationTick,
  bestAffordableUnlockedContainer,
  setRobotTarget,
  setRobotFilters,
} from '../src/systems/automation.js';
import { applyContainerResult, proceduralContainer } from '../src/systems/containers.js';
import {
  stallVendorTick,
  applyOfflineStallSales,
  setMantenerStockPedidos,
} from '../src/systems/stall.js';
import {
  doPrestige,
  PRESTIGE_MONEY_THRESHOLD,
} from '../src/systems/prestige.js';
import { checkAchievements } from '../src/systems/achievements.js';
import {
  estimateAutomationRatePerSecond,
  expectedContainerValue,
  estimateDiscardShare,
} from '../src/systems/offline.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import deedsTree from '../../../apps/game/src/data/deedsTree.json';
import achievements from '../../../apps/game/src/data/achievements.json';
import itemsData from '../../../apps/game/src/data/items.json';
import stall from '../../../apps/game/src/data/stall.json';

const robotStub = {
  id: 'robotStub',
  name: 'Robot Stub',
  effects: [{ type: 'enablesAutoDig' }, { type: 'parallelSlots', flat: 1 }],
};
const hangarStub = {
  id: 'hangarStub',
  name: 'Hangar Stub',
  effects: [{ type: 'fleetRobots', flat: 1 }],
};
const vendorStub = {
  id: 'robotVendedorStub',
  name: 'Robot Vendedor Stub',
  effects: [{ type: 'enablesStallVendor' }],
};

const dataBase = { upgrades, automations: [robotStub, hangarStub], prestigeTree, deedsTree };
const dataConStall = { ...dataBase, stall };
const dataReal = { upgrades, automations, prestigeTree, deedsTree };
const dataConVendedor = { upgrades, automations: [vendorStub], prestigeTree, deedsTree, stall };

// costoInicial alto a propósito (patrón ronda 15): evita que automationTick auto-compre estos
// contenedores dentro de la cola durante los escenarios que no prueban la compra.
const baseStubContainer = {
  name: 'Contenedor Stub',
  costoInicial: 999999,
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
const contA = { ...baseStubContainer, id: 'contA', categorias: ['common'] };
const contB = { ...baseStubContainer, id: 'contB', categorias: ['rare'] };
const contCheap = { ...baseStubContainer, id: 'contCheap', costoInicial: 100, categorias: ['common'] };

const itemsDataStub = {
  containers: {
    contA: [{ id: 'stubItemA', icon: 'artifact', name: 'Item A', categoria: 'common', valorBase: 10 }],
    contB: [{ id: 'stubItemB', icon: 'artifact', name: 'Item B', categoria: 'rare', valorBase: 50 }],
    contCheap: [{ id: 'stubItemC', icon: 'artifact', name: 'Item C', categoria: 'common', valorBase: 10 }],
  },
  rarities: [
    { id: 'common', mult: 1, colorToken: '--r-common' },
    { id: 'rare', mult: 2, colorToken: '--r-rare' },
  ],
};

const vertederoBigBang = containers.find((c) => c.id === 'vertederoBigBang');

function fleetState() {
  const state = freshState();
  state.automationOwned.robotStub = true;
  state.automationOwned.hangarStub = true;
  return state;
}

function successResult(value, categoria = 'common', extraItems = []) {
  return {
    isTrap: false,
    items: [
      { id: 'x', icon: 'coin', name: 'X', categoria, value, baseValue: value, isFirstRareFind: false },
      ...extraItems,
    ],
    moneyDelta: value + extraItems.reduce((sum, i) => sum + i.value, 0),
  };
}

/** Save válido con la forma exacta de la v15 (pre-flota), para probar la migración. */
function v15Save(autoTarget = null) {
  const state = { ...freshState() };
  delete state.robots;
  delete state.filteredProcessedCount;
  delete state.mantenerStockPedidos;
  state.autoProcessing = state.autoProcessing.map(({ robotIndex, ...slot }) => slot);
  state.autoTargetContainerId = autoTarget;
  state.saveVersion = 15;
  return state;
}

describe('§4.38 — estado v16: robots[], filteredProcessedCount, mantenerStockPedidos', () => {
  it('SAVE_VERSION es 16', () => {
    expect(SAVE_VERSION).toBe(16);
  });

  it('freshState arranca con 1 robot con target null y filtros neutros, sin autoTargetContainerId', () => {
    const state = freshState();
    expect(state.robots).toEqual([{ targetContainerId: null, filters: { descartarBajoValor: 0, reservarCategorias: [] } }]);
    expect(state.filteredProcessedCount).toBe(0);
    expect(state.mantenerStockPedidos).toBe(false);
    expect('autoTargetContainerId' in state).toBe(false);
  });

  it('defaultRobotConfig devuelve instancias independientes (sin aliasing entre robots)', () => {
    const a = defaultRobotConfig();
    const b = defaultRobotConfig();
    a.filters.reservarCategorias.push('common');
    expect(b.filters.reservarCategorias).toEqual([]);
  });

  it('freshState valida', () => {
    expect(validateSave(freshState()).valid).toBe(true);
  });
});

describe('§4.38 — migración v15 -> v16 (absorbe y BORRA autoTargetContainerId)', () => {
  it('un v15 con target fijado lo absorbe como target del robot 1 y elimina el campo viejo', () => {
    const result = validateSave(v15Save('tachoVereda'));
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.robots[0].targetContainerId).toBe('tachoVereda');
    expect(result.data.robots[0].filters).toEqual({ descartarBajoValor: 0, reservarCategorias: [] });
    expect('autoTargetContainerId' in result.data).toBe(false);
    expect(result.data.filteredProcessedCount).toBe(0);
    expect(result.data.mantenerStockPedidos).toBe(false);
  });

  it('un v15 en modo Auto (target null) migra a robot 1 con target null', () => {
    const result = validateSave(v15Save(null));
    expect(result.valid).toBe(true);
    expect(result.data.robots[0].targetContainerId).toBe(null);
  });

  it('backfillea robotIndex 0 en los slots de autoProcessing v15', () => {
    const save = v15Save(null);
    save.autoProcessing = [{ containerId: 'tachoVereda', totalTime: 10, remaining: 5 }];
    const result = validateSave(save);
    expect(result.valid).toBe(true);
    expect(result.data.autoProcessing[0].robotIndex).toBe(0);
  });

  it('NO lava un autoTargetContainerId inválido: v15 con target numérico se rechaza', () => {
    const result = validateSave(v15Save(42));
    expect(result.valid).toBe(false);
  });

  it('un save de versión futura se sigue rechazando', () => {
    const future = { ...freshState(), saveVersion: SAVE_VERSION + 1 };
    expect(validateSave(future).valid).toBe(false);
  });
});

describe('§4.38 — validación hostil de robots/filtros/contadores v16', () => {
  it.each([
    ['robots no-array', (s) => { s.robots = 'nope'; }],
    ['robots vacío', (s) => { s.robots = []; }],
    ['robots por encima de ROBOTS_MAX_SAFETY', (s) => { s.robots = Array.from({ length: ROBOTS_MAX_SAFETY + 1 }, () => defaultRobotConfig()); }],
    ['target numérico', (s) => { s.robots[0].targetContainerId = 42; }],
    ['filters ausente', (s) => { s.robots[0] = { targetContainerId: null }; }],
    ['descartarBajoValor negativo', (s) => { s.robots[0].filters.descartarBajoValor = -5; }],
    ['descartarBajoValor NaN', (s) => { s.robots[0].filters.descartarBajoValor = NaN; }],
    ['reservarCategorias con no-strings', (s) => { s.robots[0].filters.reservarCategorias = [42]; }],
    ['reservarCategorias no-array', (s) => { s.robots[0].filters.reservarCategorias = 'common'; }],
    ['filteredProcessedCount negativo', (s) => { s.filteredProcessedCount = -1; }],
    ['filteredProcessedCount fraccionario', (s) => { s.filteredProcessedCount = 2.5; }],
    ['mantenerStockPedidos string', (s) => { s.mantenerStockPedidos = 'yes'; }],
    ['robotIndex negativo en autoProcessing', (s) => { s.autoProcessing = [{ containerId: 'x', totalTime: 10, remaining: 5, robotIndex: -1 }]; }],
    ['robotIndex fraccionario en autoProcessing', (s) => { s.autoProcessing = [{ containerId: 'x', totalTime: 10, remaining: 5, robotIndex: 1.5 }]; }],
  ])('rechaza %s', (_label, mutate) => {
    const save = freshState();
    mutate(save);
    expect(validateSave(save).valid).toBe(false);
  });

  it('sanitizeContainerRefs anula un target de robot huérfano, y respeta los procedurales válidos', () => {
    const save = freshState();
    save.automationOwned.hangarStub = true;
    save.robots = [
      { targetContainerId: 'zzzNoExiste', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
      { targetContainerId: 'bigbangPlus3', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
    ];
    const result = validateSave(save, ['tachoVereda']);
    expect(result.valid).toBe(true);
    expect(result.data.robots[0].targetContainerId).toBe(null);
    expect(result.data.robots[1].targetContainerId).toBe('bigbangPlus3');
  });

  it('sanitizeContainerRefs anula un target procedural fuera de rango (bigbangPlus999)', () => {
    const save = freshState();
    save.robots[0].targetContainerId = 'bigbangPlus999';
    const result = validateSave(save, ['tachoVereda']);
    expect(result.valid).toBe(true);
    expect(result.data.robots[0].targetContainerId).toBe(null);
  });

  it('round-trip serialize/deserialize conserva la flota completa (targets + filtros)', () => {
    const state = fleetState();
    state.robots = [
      { targetContainerId: 'tachoVereda', filters: { descartarBajoValor: 120, reservarCategorias: ['rare'] } },
      { targetContainerId: null, filters: { descartarBajoValor: 0, reservarCategorias: ['common'] } },
    ];
    state.filteredProcessedCount = 7;
    state.mantenerStockPedidos = true;
    const result = deserializeState(serializeState(state));
    expect(result.ok).toBe(true);
    expect(result.state.robots).toEqual(state.robots);
    expect(result.state.filteredProcessedCount).toBe(7);
    expect(result.state.mantenerStockPedidos).toBe(true);
  });
});

describe('§4.38 — getFleetSize / getParallelAutoSlots (brazos del robot 1)', () => {
  it('la flota base es 1 robot, sin máquinas ni Escrituras', () => {
    expect(getFleetSize(freshState(), dataBase)).toBe(1);
  });

  it('hangarRobots (efecto fleetRobots) suma +1 robot', () => {
    const state = freshState();
    state.automationOwned.hangarStub = true;
    expect(getFleetSize(state, dataBase)).toBe(2);
  });

  it('flotaFundadora (fleetRobotsFlatPerNivel) suma +1 robot por nivel; con hangar llega a 4', () => {
    const state = freshState();
    state.automationOwned.hangarStub = true;
    state.deedsTreeLevels.flotaFundadora = 2;
    expect(getFleetSize(state, dataBase)).toBe(4);
  });

  it('getParallelAutoSlots ya NO cuenta flotaFundadora (los niveles son robots, no brazos)', () => {
    const state = freshState();
    state.automationOwned.robotStub = true;
    state.deedsTreeLevels.flotaFundadora = 2;
    expect(getParallelAutoSlots(state, dataBase)).toBe(1);
  });

  it('el hangarRobots real cuesta 5e9 y declara fleetRobots +1', () => {
    const hangar = automations.find((a) => a.id === 'hangarRobots');
    expect(hangar.cost).toBe(5000000000);
    expect(hangar.effects).toEqual([{ type: 'fleetRobots', flat: 1 }]);
  });
});

describe('§4.38 — setRobotTarget / setRobotFilters (validación del engine)', () => {
  it('setRobotTarget fija el target del robot 2 (crece la flota al tamaño real)', () => {
    const state = fleetState();
    const result = setRobotTarget(state, 1, 'contB', [contA, contB], dataBase);
    expect(result.ok).toBe(true);
    expect(state.robots[1].targetContainerId).toBe('contB');
  });

  it('setRobotTarget con null vuelve al modo Auto', () => {
    const state = fleetState();
    setRobotTarget(state, 0, 'contA', [contA, contB], dataBase);
    const result = setRobotTarget(state, 0, null, [contA, contB], dataBase);
    expect(result.ok).toBe(true);
    expect(state.robots[0].targetContainerId).toBe(null);
  });

  it('setRobotTarget rechaza un índice fuera de la flota real', () => {
    const state = fleetState(); // flota 2
    expect(setRobotTarget(state, 5, 'contA', [contA, contB], dataBase).ok).toBe(false);
    expect(setRobotTarget(state, -1, 'contA', [contA, contB], dataBase).ok).toBe(false);
  });

  it('setRobotTarget rechaza un containerId fuera del allow-list', () => {
    const state = fleetState();
    expect(setRobotTarget(state, 0, 'zzzNoExiste', [contA, contB], dataBase).ok).toBe(false);
    expect(state.robots[0].targetContainerId).toBe(null);
  });

  it('setRobotTarget acepta un id procedural válido (R26.3)', () => {
    const state = fleetState();
    expect(setRobotTarget(state, 0, 'bigbangPlus1', containers, dataBase).ok).toBe(true);
    expect(state.robots[0].targetContainerId).toBe('bigbangPlus1');
  });

  it('setRobotFilters valida umbral y categorías contra el allow-list', () => {
    const state = fleetState();
    const validCategories = ['common', 'rare'];
    const ok = setRobotFilters(state, 0, { descartarBajoValor: 100, reservarCategorias: ['common'] }, validCategories, dataBase);
    expect(ok.ok).toBe(true);
    expect(state.robots[0].filters).toEqual({ descartarBajoValor: 100, reservarCategorias: ['common'] });

    expect(setRobotFilters(state, 0, { descartarBajoValor: NaN, reservarCategorias: [] }, validCategories, dataBase).ok).toBe(false);
    expect(setRobotFilters(state, 0, { descartarBajoValor: -1, reservarCategorias: [] }, validCategories, dataBase).ok).toBe(false);
    expect(setRobotFilters(state, 0, { descartarBajoValor: 0, reservarCategorias: ['zzz'] }, validCategories, dataBase).ok).toBe(false);
    expect(setRobotFilters(state, 0, { descartarBajoValor: 0, reservarCategorias: 'common' }, validCategories, dataBase).ok).toBe(false);
    // El estado no cambió con los rechazos.
    expect(state.robots[0].filters).toEqual({ descartarBajoValor: 100, reservarCategorias: ['common'] });
  });
});

describe('§4.38 — automationTick con flota: 2 robots procesan 2 contenedores distintos en paralelo', () => {
  it('cada robot toma de la cola global el contenedor de SU target y ambos procesan a la vez', () => {
    const state = fleetState();
    state.robots = [
      { targetContainerId: 'contA', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
      { targetContainerId: 'contB', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
    ];
    state.autoQueue = ['contA', 'contB'];

    automationTick(state, 0.1, [contA, contB], itemsDataStub, dataBase, () => 0.99);

    expect(state.autoProcessing).toHaveLength(2);
    const byRobot = Object.fromEntries(state.autoProcessing.map((s) => [s.robotIndex, s.containerId]));
    expect(byRobot[0]).toBe('contA');
    expect(byRobot[1]).toBe('contB');

    automationTick(state, 9999, [contA, contB], itemsDataStub, dataBase, () => 0.99);

    expect(state.autoProcessedCount).toBe(2);
    expect(state.money).toBeGreaterThan(0);
    // Cada contenedor tiene una categoría distinta: si ambas suman 1, procesaron AMBOS (no uno dos veces).
    expect(state.itemsFoundByCategory.common).toBe(1);
    expect(state.itemsFoundByCategory.rare).toBe(1);
  });

  it('un robot con target espera si su contenedor no está en la cola (sin fallback silencioso)', () => {
    const state = fleetState();
    state.robots = [
      { targetContainerId: 'contA', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
      { targetContainerId: 'contB', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
    ];
    state.autoQueue = ['contA', 'contA'];

    automationTick(state, 0.1, [contA, contB], itemsDataStub, dataBase, () => 0.99);

    expect(state.autoProcessing).toHaveLength(1);
    expect(state.autoProcessing[0].robotIndex).toBe(0);
    expect(state.autoProcessing[0].containerId).toBe('contA');
    expect(state.autoQueue).toEqual(['contA']);
  });

  it('un robot en modo Auto toma la cabeza de la cola global', () => {
    const state = freshState();
    state.automationOwned.robotStub = true;
    state.autoQueue = ['contB'];

    automationTick(state, 0.1, [contA, contB], itemsDataStub, dataBase, () => 0.99);

    expect(state.autoProcessing).toHaveLength(1);
    expect(state.autoProcessing[0].containerId).toBe('contB');
    expect(state.autoProcessing[0].robotIndex).toBe(0);
  });

  it('R27.2 — con dinero para exactamente un contenedor, dos robots Auto compran UNO (secuencial, sin doble gasto)', () => {
    const state = fleetState();
    state.money = 150;

    automationTick(state, 0.1, [contCheap], itemsDataStub, dataBase, () => 0.99);

    expect(state.ownedContainers.contCheap).toBe(1);
    expect(state.money).toBe(50);
  });
});

describe('R26.3 — la flota considera los tiers procedurales (target y modo Auto)', () => {
  it('bestAffordableUnlockedContainer resuelve un target procedural desbloqueado y afordable', () => {
    const state = freshState();
    state.deedsTreeLevels.ecoDelBigBang = 1;
    state.money = vertederoBigBang.costoInicial * 15;
    const pick = bestAffordableUnlockedContainer(state, containers, dataReal, 'bigbangPlus1');
    expect(pick).not.toBe(null);
    expect(pick.id).toBe('bigbangPlus1');
  });

  it('un target procedural bloqueado (sin Eco del Big Bang) devuelve null: el robot espera', () => {
    const state = freshState();
    state.money = vertederoBigBang.costoInicial * 15;
    expect(bestAffordableUnlockedContainer(state, containers, dataReal, 'bigbangPlus1')).toBe(null);
  });

  it('en modo Auto, el mejor afordable incluye el próximo tier procedural desbloqueado', () => {
    const state = freshState();
    state.deedsTreeLevels.ecoDelBigBang = 1;
    state.ownedContainers.bigbangPlus1 = 1; // desbloquea el tier 2
    state.money = 1e30;
    const pick = bestAffordableUnlockedContainer(state, containers, dataReal, null);
    expect(pick.id).toBe('bigbangPlus2');
  });
});

describe('§4.39 — filtros por robot en applyContainerResult (prioridad reserva > descarte > captura > venta)', () => {
  const noFilters = null;

  it('descartarBajoValor: un ítem por debajo del umbral se descarta ($0) pero SÍ cuenta en la colección', () => {
    const state = freshState();
    const filters = { descartarBajoValor: 150, reservarCategorias: [] };
    applyContainerResult(state, contA, successResult(100), true, dataConStall, filters);
    expect(state.money).toBe(0);
    expect(state.inventory).toEqual([]);
    expect(state.itemsFoundCount).toBe(1);
    expect(state.filteredProcessedCount).toBe(1);
  });

  it('descartarBajoValor: un ítem por encima del umbral se vende normal', () => {
    const state = freshState();
    const filters = { descartarBajoValor: 150, reservarCategorias: [] };
    applyContainerResult(state, contA, successResult(200), true, dataConStall, filters);
    expect(state.money).toBe(200);
    expect(state.filteredProcessedCount).toBe(1);
  });

  it('reservarCategorias manda el ítem al inventario del Puesto aunque esté por debajo del umbral global', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 0; // puesto "en pausa" para la captura global
    const filters = { descartarBajoValor: 0, reservarCategorias: ['common'] };
    applyContainerResult(state, contA, successResult(100), true, dataConStall, filters);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0].categoria).toBe('common');
    expect(state.money).toBe(0);
  });

  it('reserva gana sobre descarte: categoría reservada por debajo del umbral de descarte va al inventario', () => {
    const state = freshState();
    state.stallLevel = 1;
    const filters = { descartarBajoValor: 999, reservarCategorias: ['common'] };
    applyContainerResult(state, contA, successResult(100), true, dataConStall, filters);
    expect(state.inventory).toHaveLength(1);
    expect(state.money).toBe(0);
  });

  it('reserva sin puesto (stallLevel 0) cae a la venta normal, nunca pierde el ítem', () => {
    const state = freshState();
    const filters = { descartarBajoValor: 0, reservarCategorias: ['common'] };
    applyContainerResult(state, contA, successResult(100), true, dataConStall, filters);
    expect(state.inventory).toEqual([]);
    expect(state.money).toBe(100);
  });

  it('sin filtros (null) el comportamiento es idéntico al anterior y no cuenta filteredProcessedCount', () => {
    const state = freshState();
    applyContainerResult(state, contA, successResult(100), true, dataConStall, noFilters);
    expect(state.money).toBe(100);
    expect(state.filteredProcessedCount).toBe(0);
  });

  it('filteredProcessedCount suma +1 por CONTENEDOR procesado con filtro activo, no por ítem', () => {
    const state = freshState();
    const filters = { descartarBajoValor: 1, reservarCategorias: [] };
    const extra = { id: 'y', icon: 'coin', name: 'Y', categoria: 'common', value: 300, baseValue: 300, isFirstRareFind: false };
    applyContainerResult(state, contA, successResult(200, 'common', [extra]), true, dataConStall, filters);
    expect(state.filteredProcessedCount).toBe(1);
  });

  it('integración con el tick: un robot con descarte total procesa sin ganar dinero y cuenta el filtro', () => {
    const state = freshState();
    state.automationOwned.robotStub = true;
    state.robots[0].filters = { descartarBajoValor: 1e15, reservarCategorias: [] };
    state.autoProcessing = [{ robotIndex: 0, containerId: 'contA', totalTime: 10, remaining: 0.05 }];

    automationTick(state, 1, [contA, contB], itemsDataStub, dataBase, () => 0.99);

    expect(state.money).toBe(0);
    expect(state.autoProcessedCount).toBe(1);
    expect(state.filteredProcessedCount).toBe(1);
    expect(state.itemsFoundCount).toBeGreaterThanOrEqual(1);
  });
});

describe('§4.39 — robot vendedor: mantenerStockPedidos', () => {
  function vendorState() {
    const state = freshState();
    state.automationOwned.robotVendedorStub = true;
    state.stallLevel = 1;
    state.stallVendorAt = 0;
    state.stallOrders = [{ id: 'o1', npcId: 'salomon', categoria: 'common', cantidad: 2, mult: 1.5, progress: 0 }];
    return state;
  }
  const tickAt = stall.vendedorIntervalo * 1000 + 1;
  const item = (categoria, baseValue) => ({ itemId: `i-${categoria}-${baseValue}`, containerId: 'tachoVereda', categoria, baseValue });

  it('setMantenerStockPedidos valida booleano', () => {
    const state = freshState();
    expect(setMantenerStockPedidos(state, true).ok).toBe(true);
    expect(state.mantenerStockPedidos).toBe(true);
    expect(setMantenerStockPedidos(state, 'yes').ok).toBe(false);
    expect(state.mantenerStockPedidos).toBe(true);
  });

  it('apagado (default), el vendedor vende como siempre', () => {
    const state = vendorState();
    state.inventory = [item('common', 100)];
    stallVendorTick(state, dataConVendedor, tickAt, () => 0.5);
    expect(state.inventory).toHaveLength(0);
    expect(state.money).toBeGreaterThan(0);
  });

  it('encendido, NO vende un ítem cuyo stock es <= a la demanda restante de un pedido activo', () => {
    const state = vendorState();
    state.mantenerStockPedidos = true;
    state.inventory = [item('common', 100)]; // stock 1 <= demanda 2
    stallVendorTick(state, dataConVendedor, tickAt, () => 0.5);
    expect(state.inventory).toHaveLength(1);
    expect(state.money).toBe(0);
  });

  it('encendido, el EXCEDENTE por encima de la demanda sí se vende', () => {
    const state = vendorState();
    state.mantenerStockPedidos = true;
    state.inventory = [item('common', 100), item('common', 90), item('common', 80)]; // stock 3, demanda 2
    stallVendorTick(state, dataConVendedor, tickAt, () => 0.5);
    expect(state.inventory).toHaveLength(2);
  });

  it('encendido, prefiere vender un ítem de categoría NO demandada antes que tocar el stock reservado', () => {
    const state = vendorState();
    state.mantenerStockPedidos = true;
    state.inventory = [item('common', 100), item('rare', 500)];
    stallVendorTick(state, dataConVendedor, tickAt, () => 0.5);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0].categoria).toBe('common');
  });

  it('applyOfflineStallSales respeta mantenerStockPedidos (vende solo el excedente offline)', () => {
    const state = vendorState();
    state.mantenerStockPedidos = true;
    state.inventory = [item('common', 100), item('common', 90), item('common', 80)];
    const earned = applyOfflineStallSales(state, dataConVendedor, 1e9);
    expect(state.inventory).toHaveLength(2);
    expect(earned).toBeGreaterThan(0);
  });
});

describe('§4.38 — prestigio: los targets de la flota se resetean, los filtros sobreviven', () => {
  it('doPrestige anula todos los targets pero conserva los filtros configurados', () => {
    const state = fleetState();
    state.totalMoneyEarned = PRESTIGE_MONEY_THRESHOLD; // canPrestige mira lo GANADO, no el efectivo
    state.robots = [
      { targetContainerId: 'tachoVereda', filters: { descartarBajoValor: 50, reservarCategorias: ['rare'] } },
      { targetContainerId: 'contenedorOxidado', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
    ];
    const result = doPrestige(state, dataBase);
    expect(result.ok).toBe(true);
    expect(state.robots.every((r) => r.targetContainerId === null)).toBe(true);
    expect(state.robots[0].filters).toEqual({ descartarBajoValor: 50, reservarCategorias: ['rare'] });
  });
});

describe('logros a59/a60 — flota y filtros', () => {
  it('a59 (fleetSizeAtLeast 3) se desbloquea con flota 3 y robot activo, no sin autoDig', () => {
    const a59 = achievements.find((a) => a.id === 'a59');
    expect(a59).toBeDefined();

    const sinRobot = freshState();
    sinRobot.automationOwned.hangarStub = true;
    sinRobot.deedsTreeLevels.flotaFundadora = 1; // flota 3, pero sin enablesAutoDig
    expect(checkAchievements(sinRobot, [a59], { data: dataBase })).toEqual([]);

    const conRobot = fleetState();
    conRobot.deedsTreeLevels.flotaFundadora = 1; // flota 3 activa
    expect(checkAchievements(conRobot, [a59], { data: dataBase })).toEqual(['a59']);
  });

  it('a60 (filteredProcessedCountAtLeast 10000) se desbloquea con el contador y paga Llaves', () => {
    const a60 = achievements.find((a) => a.id === 'a60');
    expect(a60).toBeDefined();

    const state = freshState();
    state.filteredProcessedCount = 9999;
    expect(checkAchievements(state, [a60], { data: dataBase })).toEqual([]);
    state.filteredProcessedCount = 10000;
    expect(checkAchievements(state, [a60], { data: dataBase })).toEqual(['a60']);
    expect(state.prestigeKeys).toBe(a60.reward.amount);
  });
});

describe('§4.38/§4.39 — offline con flota y filtros', () => {
  it('estimateDiscardShare: descarte total da shares 1; sin umbral da 0', () => {
    const state = freshState();
    const all = estimateDiscardShare(state, contA, { descartarBajoValor: 1e12, reservarCategorias: [] }, itemsDataStub, dataBase);
    expect(all.countShare).toBe(1);
    expect(all.valueShare).toBe(1);
    const none = estimateDiscardShare(state, contA, { descartarBajoValor: 0, reservarCategorias: [] }, itemsDataStub, dataBase);
    expect(none.countShare).toBe(0);
    expect(none.valueShare).toBe(0);
  });

  it('la tasa offline con 2 robots supera a la de 1 (la flota multiplica robots enteros)', () => {
    const uno = freshState();
    uno.automationOwned.robotStub = true;
    uno.money = 999999999;
    uno.ownedContainers.contA = 1; // desbloquea contB (cadena de contenedores), paridad con `dos`
    uno.robots[0].targetContainerId = 'contA';
    const rateUno = estimateAutomationRatePerSecond(uno, [contA, contB], itemsDataStub, dataBase);
    expect(rateUno).toBeGreaterThan(0);

    const dos = fleetState();
    dos.money = 999999999;
    dos.ownedContainers.contA = 1;
    dos.robots = [
      { targetContainerId: 'contA', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
      { targetContainerId: 'contB', filters: { descartarBajoValor: 0, reservarCategorias: [] } },
    ];
    const rateDos = estimateAutomationRatePerSecond(dos, [contA, contB], itemsDataStub, dataBase);
    expect(rateDos).toBeGreaterThan(rateUno);
  });

  it('un robot que descarta TODO no genera dinero offline (anti-exploit: offline nunca ignora el filtro)', () => {
    const state = freshState();
    state.automationOwned.robotStub = true;
    state.money = 999999999;
    state.robots[0] = { targetContainerId: 'contA', filters: { descartarBajoValor: 1e15, reservarCategorias: [] } };
    expect(estimateAutomationRatePerSecond(state, [contA, contB], itemsDataStub, dataBase)).toBe(0);
  });

  it('R26.3 offline — expectedContainerValue de un tier procedural usa el pool del contenedor base', () => {
    const state = freshState();
    const proc1 = proceduralContainer(1, vertederoBigBang);
    const value = expectedContainerValue(state, proc1, itemsData, dataReal);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
  });
});
