/**
 * Ronda 31, bloque 31.3.B (ROADMAPv4 §4.42/§4.43) — trampa simultánea con items + crédito
 * por-ítem. Cubre el refactor estructural de containers.js (creditDugItem/springTrap) y el
 * cambio de contrato del roll: un dig trampeado ahora TAMBIÉN trae la lista normal de items,
 * con la trampa como una entry adicional marcada `isTrap`.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import {
  rollContainerResult,
  applyContainerResult,
  creditDugItem,
  springTrap,
} from '../src/systems/containers.js';
import { automationTick } from '../src/systems/automation.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';
import traps from '../../../apps/game/src/data/traps.json';
import stall from '../../../apps/game/src/data/stall.json';

const tachoVereda = containers.find((c) => c.id === 'tachoVereda');
const dataBase = { upgrades, automations, prestigeTree };
const dataConTraps = { ...dataBase, traps };
const dataConStall = { ...dataBase, stall };

function neverTrapRandom() {
  return 0.99;
}

describe('§4.42/§4.43 (31.3.B.1) — snapshot: applyContainerResult sin trampa idéntico al refactor', () => {
  it('el dinero y los contadores resultantes de un dig sin trampa son EXACTAMENTE los mismos con el nuevo código', () => {
    const state = freshState();
    const result = rollContainerResult(state, tachoVereda, false, itemsData, dataBase, neverTrapRandom);
    expect(result.isTrap).toBe(false);
    const expectedTotal = result.items.reduce((sum, item) => sum + item.value, 0);

    const before = { ...state, itemsFoundByItem: { ...state.itemsFoundByItem } };
    const applied = applyContainerResult(state, tachoVereda, result, false, dataBase);

    expect(applied.moneyDelta).toBeCloseTo(expectedTotal, 6);
    expect(applied.trapPenalty).toBe(0);
    expect(state.money).toBeCloseTo(before.money + expectedTotal, 6);
    expect(state.itemsFoundCount).toBe(before.itemsFoundCount + tachoVereda.slots);
    expect(state.digStreak).toBe(1);
    expect(state.autoProcessedCount).toBe(0);
  });
});

describe('§4.42 (31.3.B.2) — rollContainerResult: trampa simultánea con items', () => {
  it('con trampa forzada, devuelve isTrap:true Y una lista de items NO vacía con la entry-trampa marcada', () => {
    const state = freshState();
    const trapContainer = { ...tachoVereda, probTrampaBase: 1 };
    const result = rollContainerResult(state, trapContainer, false, itemsData, dataConTraps, () => 0);
    expect(result.isTrap).toBe(true);
    expect(result.items.length).toBe(trapContainer.slots + 1); // N items + 1 trampa
    const trapEntries = result.items.filter((i) => i.isTrap);
    expect(trapEntries).toHaveLength(1);
    const nonTrapEntries = result.items.filter((i) => !i.isTrap);
    expect(nonTrapEntries).toHaveLength(trapContainer.slots);
    for (const item of nonTrapEntries) {
      expect(item.value).toBeGreaterThanOrEqual(0);
    }
  });

  it('el legendario NUNCA aparece en un dig trampeado (contrato §3.5.3 intacto)', () => {
    const state = freshState();
    const trapContainer = { ...tachoVereda, probTrampaBase: 1 };
    const dataConLegendaries = { ...dataConTraps, legendaries: { legendaryChance: 1, items: [] } };
    // legendaryChance 1 forzaría SIEMPRE un intento de legendario si el roll llegara a evaluarlo
    // — la ausencia de cualquier isLegendary:true confirma que el camino de trampa nunca lo intenta.
    const result = rollContainerResult(state, trapContainer, false, itemsData, dataConLegendaries, () => 0);
    expect(result.isTrap).toBe(true);
    expect(result.items.some((i) => i.isLegendary)).toBe(false);
  });
});

describe('§4.42 (31.3.B.1) — creditDugItem y springTrap como piezas puras', () => {
  it('creditDugItem acredita un item (venta instantánea) sin tocar racha/nivel/trampa', () => {
    const state = freshState();
    const item = { id: 'x', icon: 'coin', name: 'X', categoria: 'common', value: 42, baseValue: 42 };
    const before = { digStreak: state.digStreak, trapsHit: state.trapsHit, containerLevels: { ...state.containerLevels } };
    const { moneyDelta, captured } = creditDugItem(state, tachoVereda, item, false, dataBase);

    expect(moneyDelta).toBeCloseTo(42, 6);
    expect(captured).toBe(false);
    expect(state.money).toBeCloseTo(42, 6);
    expect(state.itemsFoundCount).toBe(1);
    expect(state.digStreak).toBe(before.digStreak);
    expect(state.trapsHit).toBe(before.trapsHit);
    expect(state.containerLevels).toEqual(before.containerLevels);
  });

  it('creditDugItem captura al inventario del Puesto cuando el umbral/capacidad lo permiten', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 0.01;
    const item = { id: 'x', icon: 'coin', name: 'X', categoria: 'common', value: 42, baseValue: 42 };
    const { moneyDelta, captured } = creditDugItem(state, tachoVereda, item, false, dataConStall);

    expect(captured).toBe(true);
    expect(moneyDelta).toBe(0);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0]).toMatchObject({ itemId: 'x', containerId: tachoVereda.id, baseValue: 42 });
  });

  it('creditDugItem con legendario lo registra en legendariesFound y vende SIEMPRE instantáneo', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 0.01; // captura agresiva — el legendario debe ignorarla igual
    const legendary = { id: 'leg1', icon: 'legend', name: 'Leyenda', categoria: 'relics', value: 999, isLegendary: true };
    const { moneyDelta, captured } = creditDugItem(state, tachoVereda, legendary, false, dataConStall);

    expect(captured).toBe(false);
    expect(moneyDelta).toBeCloseTo(999, 6);
    expect(state.inventory).toHaveLength(0);
    expect(state.legendariesFound).toContain('leg1');
  });

  it('springTrap corta digStreak a 0, suma trapsHit y aplica el castigo correcto por grado', () => {
    const state = freshState();
    state.money = 1000;
    state.digStreak = 5;
    const normalResult = { isTrap: true, items: [] };
    const { trapPenalty } = springTrap(state, tachoVereda, normalResult, dataConTraps, false);

    expect(state.digStreak).toBe(0);
    expect(state.trapsHit).toBe(1);
    expect(trapPenalty).toBeGreaterThan(0);
    expect(state.money).toBeCloseTo(1000 - trapPenalty, 6);
  });

  it('springTrap con grado "leve" no castiga dinero pero igual corta la racha', () => {
    const state = freshState();
    state.money = 1000;
    state.digStreak = 3;
    const leveResult = { isTrap: true, trapGrade: 'leve', items: [] };
    const { trapPenalty } = springTrap(state, tachoVereda, leveResult, dataConTraps, false);

    expect(trapPenalty).toBe(0);
    expect(state.money).toBe(1000);
    expect(state.digStreak).toBe(0);
  });

  it('springTrap con isAuto:true NUNCA corta la racha (contrato §3.5.1, el robot no tiene racha manual)', () => {
    const state = freshState();
    state.digStreak = 7;
    springTrap(state, tachoVereda, { isTrap: true, items: [] }, dataConTraps, true);
    expect(state.digStreak).toBe(7);
  });
});

describe('§4.43 (31.3.B.3) — robot "guarda todo, come el castigo" vía applyContainerResult', () => {
  it('con trampa e items no vacíos (isAuto), acredita TODOS los items no-trampa Y aplica el castigo', () => {
    const state = freshState();
    state.money = 1_000_000;
    const trapContainer = { ...tachoVereda, probTrampaBase: 1 };
    // Secuencia: fluctuación (0) -> rollIsTrap (0, siempre cae) -> trapGrade (0.5, cae "normal" —
    // castigo > 0, a diferencia de "leve"). El resto (rolls de items) clampea al último valor.
    const seq = [0, 0, 0.5, 0.5];
    let i = 0;
    const scriptedRandom = () => seq[Math.min(i++, seq.length - 1)];
    const result = rollContainerResult(state, trapContainer, true, itemsData, dataConTraps, scriptedRandom);
    expect(result.isTrap).toBe(true);
    expect(result.trapGrade).toBe('normal');
    const itemsTotal = result.items.filter((i) => !i.isTrap).reduce((sum, i) => sum + i.value, 0);
    const moneyBefore = state.money;

    const applied = applyContainerResult(state, trapContainer, result, true, dataConTraps);

    // El total de dinero neto es Σitems − castigo (cubre el signo: el robot puede perder plata
    // neta si el castigo supera el loot, pero SIEMPRE conserva los items).
    expect(state.money).toBeCloseTo(moneyBefore + itemsTotal - applied.trapPenalty, 6);
    expect(applied.moneyDelta).toBeCloseTo(itemsTotal, 6);
    expect(applied.trapPenalty).toBeGreaterThan(0);
    expect(state.itemsFoundCount).toBe(trapContainer.slots);
    expect(state.trapsHit).toBe(1);
  });
});

describe('§4.43 (31.3.B.3) — Escáner de Trampas: descarta SOLO la trampa (automationTick)', () => {
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
    containers: { stubContainer: [{ icon: 'artifact', name: 'Item Stub', categoria: 'common', valorBase: 10 }] },
    rarities: [{ id: 'common', mult: 1, colorToken: '--r-common' }],
  };
  const automationsStub = [{ id: 'robotStub', name: 'Robot Stub', effects: [{ type: 'enablesAutoDig' }] }];
  const prestigeStub = [
    { id: 'escanerTrampas', name: 'Escaner', effects: [{ type: 'trapDiscardChancePerNivel', percentPerNivel: 0.34 }] },
  ];
  const dataStub = { upgrades, automations: automationsStub, prestigeTree: prestigeStub, traps };

  it('con chance 1 (nodo nivel 3), conserva los items y descarta SOLO la trampa: sin castigo ni corte de racha', () => {
    const state = freshState();
    state.automationOwned.robotStub = true;
    state.prestigeTreeLevels.escanerTrampas = 3; // 0.34*3 clampeado a 1
    state.money = 1000;
    state.autoProcessing = [{ containerId: stubContainer.id, totalTime: 10, remaining: 0.1 }];

    automationTick(state, 1, [stubContainer], itemsDataStub, dataStub, () => 0);

    expect(state.money).toBeGreaterThan(1000);
    expect(state.trapsDiscarded).toBe(1);
    expect(state.trapsHit).toBe(0);
    expect(state.itemsFoundCount).toBe(1);
  });

  it('con chance 0 (sin el nodo), cae a "guarda todo, come el castigo": items acreditados Y castigo aplicado', () => {
    const state = freshState();
    state.automationOwned.robotStub = true;
    state.money = 1000;
    state.autoProcessing = [{ containerId: stubContainer.id, totalTime: 10, remaining: 0.1 }];

    automationTick(state, 1, [stubContainer], itemsDataStub, dataStub, () => 0);

    expect(state.trapsDiscarded).toBe(0);
    expect(state.trapsHit).toBe(1);
    expect(state.itemsFoundCount).toBe(1); // el item se acreditó igual
  });
});

// NOTA (§4.43): el progreso offline (systems/offline.js `applyOfflineProgress`) usa una tasa
// AGREGADA (`expectedContainerValue`, valor esperado estadístico), no `rollContainerResult` por
// escarbado individual — no hay "guarda todo, come el castigo" que aplicar a un promedio, así
// que no hay código de trampa simultánea que testear en ese camino. Decisión y motivo completos
// documentados en el comentario de `expectedContainerValue` (offline.js).
