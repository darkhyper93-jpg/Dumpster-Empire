/**
 * Ronda 23, Agente A (engine) — PLAN.md §2.9 (concepto), §4.27 (precio), §4.28 (pedidos),
 * §4.29 (robot vendedor). El puesto de Chatarra: inventario, captura, venta manual/robot,
 * pedidos, save v12.
 *
 * `automationsStub` con `enablesStallVendor`: el efecto todavía no existe en
 * apps/game/src/data/automations.json (tarea del Agente B de esta ronda, 23.B) — mismo patrón
 * documentado en ronda15-robot.test.js.
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave, serializeState, deserializeState } from '../src/save.js';
import { rollContainerResult, applyContainerResult, isContainerUnlocked } from '../src/systems/containers.js';
import { automationTick } from '../src/systems/automation.js';
import { applyOfflineProgress } from '../src/systems/offline.js';
import {
  getStallCapacity,
  getStallUpgradeCost,
  getStallSalePrice,
  hasStallVendor,
  itemSaleValue,
} from '../src/economy.js';
import {
  buyStall,
  upgradeStall,
  setKeepThreshold,
  sellInventoryItem,
  stallVendorTick,
  rotateStallOrders,
} from '../src/systems/stall.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';
import stall from '../../../apps/game/src/data/stall.json';

const tachoVereda = containers.find((c) => c.id === 'tachoVereda');
const singleSlotTacho = { ...tachoVereda, slots: 1 };
const dataBase = { upgrades, automations, prestigeTree };
const dataConStall = { ...dataBase, stall };

const automationsStub = [{ id: 'robotVendedorStub', name: 'Robot Vendedor Stub', effects: [{ type: 'enablesStallVendor' }] }];
const dataConVendedor = { ...dataConStall, automations: automationsStub };

function seq(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('§2.9/§4.27 compra y nivel del puesto', () => {
  it('buyStall descuenta stallCost y pone stallLevel en 1', () => {
    const state = freshState();
    state.money = 40000;
    const result = buyStall(state, dataConStall);
    expect(result.ok).toBe(true);
    expect(state.stallLevel).toBe(1);
    expect(state.money).toBe(40000 - stall.stallCost);
  });

  it('buyStall falla sin dinero suficiente, sin mutar el estado', () => {
    const state = freshState();
    state.money = 100;
    const result = buyStall(state, dataConStall);
    expect(result.ok).toBe(false);
    expect(state.stallLevel).toBe(0);
    expect(state.money).toBe(100);
  });

  it('buyStall falla si ya se compró', () => {
    const state = freshState();
    state.money = 999999;
    buyStall(state, dataConStall);
    const second = buyStall(state, dataConStall);
    expect(second.ok).toBe(false);
  });

  it('getStallUpgradeCost sigue stallCost × 4^(nivel-1)', () => {
    const state = freshState();
    state.stallLevel = 1;
    expect(getStallUpgradeCost(state, dataConStall)).toBe(Math.ceil(stall.stallCost * Math.pow(4, 1)));
    state.stallLevel = 3;
    expect(getStallUpgradeCost(state, dataConStall)).toBe(Math.ceil(stall.stallCost * Math.pow(4, 3)));
  });

  it('upgradeStall sube de nivel y descuenta el costo; respeta stallNivelMax', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.money = 10_000_000;
    const before = state.money;
    const result = upgradeStall(state, dataConStall);
    expect(result.ok).toBe(true);
    expect(state.stallLevel).toBe(2);
    expect(state.money).toBe(before - getStallUpgradeCost({ ...state, stallLevel: 1 }, dataConStall));

    state.stallLevel = stall.stallNivelMax;
    const maxed = upgradeStall(state, dataConStall);
    expect(maxed.ok).toBe(false);
    expect(state.stallLevel).toBe(stall.stallNivelMax);
  });

  it('upgradeStall falla sin haber comprado el puesto', () => {
    const state = freshState();
    state.money = 10_000_000;
    const result = upgradeStall(state, dataConStall);
    expect(result.ok).toBe(false);
    expect(state.stallLevel).toBe(0);
  });

  it('getStallCapacity es 0 sin puesto, y crece con el nivel', () => {
    const state = freshState();
    expect(getStallCapacity(state, dataConStall)).toBe(0);
    state.stallLevel = 1;
    expect(getStallCapacity(state, dataConStall)).toBe(stall.stallCapacityBase);
    state.stallLevel = 2;
    expect(getStallCapacity(state, dataConStall)).toBe(stall.stallCapacityBase + stall.stallCapacityPorNivel);
  });

  it('setKeepThreshold valida número finito >= 0', () => {
    const state = freshState();
    expect(setKeepThreshold(state, 500).ok).toBe(true);
    expect(state.keepThreshold).toBe(500);
    expect(setKeepThreshold(state, -1).ok).toBe(false);
    expect(setKeepThreshold(state, NaN).ok).toBe(false);
    expect(state.keepThreshold).toBe(500);
  });
});

describe('§2.9 captura en applyContainerResult (R23.2: sin puesto = idéntico)', () => {
  function successResult(value) {
    return {
      isTrap: false,
      items: [{ id: 'x', icon: 'coin', name: 'X', categoria: 'common', value, baseValue: value, isFirstRareFind: false }],
      moneyDelta: value,
    };
  }

  it('con stallLevel 0, el ítem se vende instantáneo igual que antes de la ronda 23', () => {
    const state = freshState();
    const result = applyContainerResult(state, singleSlotTacho, successResult(100), false, dataConStall);
    expect(result.moneyDelta).toBe(100);
    expect(state.money).toBe(100);
    expect(state.inventory).toEqual([]);
  });

  it('con keepThreshold 0 (puesto en pausa), venta instantánea aunque haya puesto', () => {
    const state = freshState();
    state.stallLevel = 1;
    const result = applyContainerResult(state, singleSlotTacho, successResult(100), false, dataConStall);
    expect(result.moneyDelta).toBe(100);
    expect(state.inventory).toEqual([]);
  });

  it('con puesto activo y valor >= umbral, el ítem se captura al inventario en vez de venderse', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 50;
    const result = applyContainerResult(state, singleSlotTacho, successResult(100), false, dataConStall);
    expect(result.moneyDelta).toBe(0);
    expect(state.money).toBe(0);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0]).toEqual({
      itemId: 'x',
      containerId: singleSlotTacho.id,
      categoria: 'common',
      baseValue: 100,
    });
  });

  it('valor por debajo del umbral se sigue vendiendo instantáneo', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 500;
    const result = applyContainerResult(state, singleSlotTacho, successResult(100), false, dataConStall);
    expect(result.moneyDelta).toBe(100);
    expect(state.inventory).toEqual([]);
  });

  it('sin espacio (capacidad llena) cae a venta instantánea (el loot jamás se pierde)', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 1;
    state.inventory = Array.from({ length: stall.stallCapacityBase }, (_, i) => ({
      itemId: `filler${i}`,
      containerId: singleSlotTacho.id,
      categoria: 'common',
      baseValue: 1,
    }));
    const result = applyContainerResult(state, singleSlotTacho, successResult(100), false, dataConStall);
    expect(result.moneyDelta).toBe(100);
    expect(state.inventory).toHaveLength(stall.stallCapacityBase);
  });

  it('los contadores de colección (itemsFoundByItem/itemsFoundCount) suben igual, se capture o no', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 50;
    applyContainerResult(state, singleSlotTacho, successResult(100), false, dataConStall);
    expect(state.itemsFoundCount).toBe(1);
    expect(state.itemsFoundByItem[singleSlotTacho.id]?.x).toBe(1);
  });

  it('legendarios nunca se capturan, siempre venta instantánea (contrato §3.5.3)', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.keepThreshold = 1;
    const legendaryResult = {
      isTrap: false,
      items: [
        {
          id: 'legend-x',
          icon: 'coin',
          name: 'Legendario X',
          categoria: 'common',
          value: 100000,
          baseValue: 100000,
          isFirstRareFind: false,
          isLegendary: true,
        },
      ],
      moneyDelta: 100000,
    };
    const result = applyContainerResult(state, singleSlotTacho, legendaryResult, false, dataConStall);
    expect(result.moneyDelta).toBe(100000);
    expect(state.inventory).toEqual([]);
    expect(state.legendariesFound).toEqual(['legend-x']);
  });

  it('rollContainerResult expone baseValue con fluctuación 1, distinto de value si la fluctuación no es 1', () => {
    const state = freshState();
    state.marketFluctuation = 1.3;
    const random = seq([0.5, 0.9, 0, 0.5]); // fluctuación no refresca (marketFluctuationAt=0 sí refresca en freshState...)
    const result = rollContainerResult(state, singleSlotTacho, false, itemsData, dataBase, random);
    const item = result.items[0];
    expect(item.baseValue).toBeGreaterThan(0);
    expect(item.baseValue).not.toBe(item.value);
  });
});

describe('§4.27 precio de venta del puesto', () => {
  it('getStallSalePrice sigue la fórmula literal', () => {
    const state = freshState();
    state.stallLevel = 3;
    state.marketFluctuation = 1.1;
    const item = { baseValue: 200 };
    const expected = 200 * 1.1 * (stall.stallMultBase + stall.stallMultPorNivel * (3 - 1));
    expect(getStallSalePrice(state, item, dataConStall)).toBeCloseTo(expected, 6);
  });

  it('sellInventoryItem refresca la fluctuación antes de calcular el precio', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.marketFluctuation = 1;
    state.marketFluctuationAt = 0; // fuerza refresh (>60s desde epoch 0)
    state.inventory = [{ itemId: 'x', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 100 }];
    const random = () => 0.5; // fluctuacion = 0.85 + 0.5*0.35 = 1.025
    const now = Date.now();
    const result = sellInventoryItem(state, 0, dataConStall, now, random);
    expect(result.ok).toBe(true);
    expect(state.marketFluctuation).toBeCloseTo(1.025, 6);
    const expectedPrice = 100 * 1.025 * stall.stallMultBase;
    expect(result.moneyDelta).toBeCloseTo(expectedPrice, 6);
    expect(state.money).toBeCloseTo(expectedPrice, 6);
    expect(state.inventory).toEqual([]);
    expect(state.stallSoldCount).toBe(1);
  });

  it('sellInventoryItem falla sin tocar el estado si el índice no existe', () => {
    const state = freshState();
    state.inventory = [];
    const result = sellInventoryItem(state, 0, dataConStall, Date.now(), () => 0.5);
    expect(result.ok).toBe(false);
    expect(state.money).toBe(0);
  });
});

describe('§4.28 pedidos', () => {
  const ownedCategories = ['common', 'reusable'];

  it('rotateStallOrders genera 2 pedidos sobre categorías poseídas si no hay ninguno', () => {
    const state = freshState();
    state.stallLevel = 1;
    const random = seq([0, 0.5, 0.1, 0.9]);
    rotateStallOrders(state, dataConStall, ownedCategories, Date.now(), random);
    expect(state.stallOrders).toHaveLength(2);
    for (const order of state.stallOrders) {
      expect(ownedCategories).toContain(order.categoria);
      expect(order.cantidad).toBeGreaterThanOrEqual(2);
      expect(order.cantidad).toBeLessThanOrEqual(4);
      expect(order.mult).toBe(stall.orderMult);
      expect(order.progress).toBe(0);
    }
  });

  it('rotateStallOrders NO rota si no pasó orderRotationMs (reloj clampeado, R23 rotación)', () => {
    const state = freshState();
    state.stallLevel = 1;
    const now1 = 1_000_000;
    rotateStallOrders(state, dataConStall, ownedCategories, now1, seq([0, 0.5, 0.1, 0.9]));
    const firstOrders = state.stallOrders;
    rotateStallOrders(state, dataConStall, ownedCategories, now1 + 1000, () => 0.99);
    expect(state.stallOrders).toEqual(firstOrders);
  });

  it('rotateStallOrders con reloj hacia atrás NO rota (§3.3)', () => {
    const state = freshState();
    state.stallLevel = 1;
    rotateStallOrders(state, dataConStall, ownedCategories, 5_000_000, seq([0, 0.5, 0.1, 0.9]));
    const firstOrders = state.stallOrders;
    rotateStallOrders(state, dataConStall, ownedCategories, 1_000_000, () => 0.99);
    expect(state.stallOrders).toEqual(firstOrders);
  });

  it('rotateStallOrders SÍ rota tras orderRotationMs', () => {
    const state = freshState();
    state.stallLevel = 1;
    rotateStallOrders(state, dataConStall, ownedCategories, 0, seq([0, 0.5, 0.1, 0.9]));
    const firstOrders = state.stallOrders;
    rotateStallOrders(state, dataConStall, ownedCategories, stall.orderRotationMs + 1, seq([0.9, 0.1, 0.2, 0.8]));
    expect(state.stallOrders).not.toEqual(firstOrders);
    expect(state.ordersRotatedAt).toBe(stall.orderRotationMs + 1);
  });

  it('vender un ítem que satisface un pedido activo paga precioPuesto × orderMult y avanza progress', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.marketFluctuation = 1;
    state.marketFluctuationAt = Date.now(); // no refresca durante el test
    state.stallOrders = [{ id: 'o1', npcId: 'salomon', categoria: 'common', cantidad: 2, mult: stall.orderMult, progress: 0 }];
    state.inventory = [{ itemId: 'x', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 100 }];
    const result = sellInventoryItem(state, 0, dataConStall, state.marketFluctuationAt, () => 0.5);
    const expectedPrice = 100 * 1 * stall.stallMultBase * stall.orderMult;
    expect(result.moneyDelta).toBeCloseTo(expectedPrice, 6);
    expect(state.stallOrders[0].progress).toBe(1);
  });

  it('completar un pedido lo retira de stallOrders y suma ordersFulfilledCount', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.marketFluctuationAt = Date.now();
    state.stallOrders = [{ id: 'o1', npcId: 'salomon', categoria: 'common', cantidad: 1, mult: stall.orderMult, progress: 0 }];
    state.inventory = [{ itemId: 'x', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 100 }];
    sellInventoryItem(state, 0, dataConStall, state.marketFluctuationAt, () => 0.5);
    expect(state.ordersFulfilledCount).toBe(1);
    expect(state.stallOrders.find((o) => o.id === 'o1')).toBeUndefined();
  });
});

describe('§4.29 robot vendedor', () => {
  it('hasStallVendor es false sin la automatización, true con ella comprada', () => {
    const state = freshState();
    expect(hasStallVendor(state, dataConVendedor)).toBe(false);
    state.automationOwned.robotVendedorStub = true;
    expect(hasStallVendor(state, dataConVendedor)).toBe(true);
  });

  it('stallVendorTick no vende antes de vendedorIntervalo', () => {
    const state = freshState();
    state.automationOwned.robotVendedorStub = true;
    state.stallLevel = 1;
    state.inventory = [{ itemId: 'x', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 100 }];
    state.stallVendorAt = 0;
    stallVendorTick(state, dataConVendedor, 5000, () => 0.5);
    expect(state.inventory).toHaveLength(1);
  });

  it('stallVendorTick vende 1 ítem tras vendedorIntervalo, priorizando el que cumple un pedido', () => {
    const state = freshState();
    state.automationOwned.robotVendedorStub = true;
    state.stallLevel = 1;
    state.stallOrders = [{ id: 'o1', npcId: 'salomon', categoria: 'rare', cantidad: 2, mult: stall.orderMult, progress: 0 }];
    state.inventory = [
      { itemId: 'costoso', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 9999 },
      { itemId: 'pedido', containerId: singleSlotTacho.id, categoria: 'rare', baseValue: 10 },
    ];
    state.stallVendorAt = 0;
    const now = stall.vendedorIntervalo * 1000 + 1;
    stallVendorTick(state, dataConVendedor, now, () => 0.5);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0].itemId).toBe('costoso');
    expect(state.stallOrders[0].progress).toBe(1);
  });

  it('stallVendorTick sin la automatización no vende nada', () => {
    const state = freshState();
    state.stallLevel = 1;
    state.inventory = [{ itemId: 'x', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 100 }];
    state.stallVendorAt = 0;
    stallVendorTick(state, dataConVendedor, stall.vendedorIntervalo * 1000 + 1, () => 0.5);
    expect(state.inventory).toHaveLength(1);
  });

  it('automationTick vende del puesto sin depender de tener el robot de escarbado (hasAutoDig)', () => {
    const state = freshState();
    state.automationOwned.robotVendedorStub = true;
    state.stallLevel = 1;
    state.inventory = [{ itemId: 'x', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 100 }];
    state.stallVendorAt = 0;
    // dataConVendedor no incluye ninguna automatización con enablesAutoDig: hasAutoDig da false.
    automationTick(state, stall.vendedorIntervalo + 1, containers, itemsData, dataConVendedor, () => 0.5);
    expect(state.inventory).toHaveLength(0);
  });

  it('offline vende sobre el inventario persistido a fluctuación 1, antes de sumar el loot instantáneo', () => {
    const state = freshState();
    state.automationOwned.robotVendedorStub = true;
    state.stallLevel = 1;
    state.marketFluctuation = 5; // si el offline usara esto en vez de 1, el precio sería 5x
    state.inventory = [{ itemId: 'x', containerId: singleSlotTacho.id, categoria: 'common', baseValue: 100 }];
    state.stallVendorAt = 0;
    const before = state.money;
    applyOfflineProgress(state, stall.vendedorIntervalo * 2, containers, itemsData, dataConVendedor);
    expect(state.inventory).toHaveLength(0);
    const expectedStallPrice = 100 * 1 * stall.stallMultBase;
    expect(state.money).toBeCloseTo(before + expectedStallPrice, 0);
  });
});

describe('save v12: inventario y puesto', () => {
  it('freshState trae los campos del Puesto de la ronda 23 (SAVE_VERSION >= 12)', () => {
    // AJUSTE (ronda 24): SAVE_VERSION avanzó a 13 (misiones diarias/eventos); esta prueba solo
    // verifica que freshState() siga trayendo los campos del Puesto, no el número exacto.
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(12);
    const state = freshState();
    expect(state.inventory).toEqual([]);
    expect(state.stallLevel).toBe(0);
    expect(state.keepThreshold).toBe(0);
    expect(state.stallOrders).toEqual([]);
    expect(state.ordersRotatedAt).toBe(0);
    expect(state.stallVendorAt).toBe(0);
    expect(state.stallSoldCount).toBe(0);
    expect(state.ordersFulfilledCount).toBe(0);
    expect(state.storySeen).toEqual([]);
  });

  it('migra un save v11 sin campos del puesto rellenándolos con los defaults', () => {
    const v11 = { ...freshState(), saveVersion: 11 };
    delete v11.inventory;
    delete v11.stallLevel;
    delete v11.keepThreshold;
    delete v11.stallOrders;
    delete v11.ordersRotatedAt;
    delete v11.stallVendorAt;
    delete v11.stallSoldCount;
    delete v11.ordersFulfilledCount;
    delete v11.storySeen;
    const result = validateSave(v11);
    expect(result.valid).toBe(true);
    // AJUSTE (ronda 24): migrate() encadena todas las migraciones pendientes en una sola pasada,
    // así que un save v11 termina en el SAVE_VERSION actual (13), no en 12.
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.inventory).toEqual([]);
    expect(result.data.stallLevel).toBe(0);
  });

  it('un save fresco v12 es válido tal cual (round-trip)', () => {
    const state = freshState();
    state.stallLevel = 2;
    state.inventory = [{ itemId: 'x', containerId: 'tachoVereda', categoria: 'common', baseValue: 42 }];
    state.stallOrders = [{ id: 'o1', npcId: 'salomon', categoria: 'common', cantidad: 3, mult: 1.4, progress: 1 }];
    const json = serializeState(state);
    const result = deserializeState(json);
    expect(result.ok).toBe(true);
    expect(result.state.inventory).toEqual(state.inventory);
    expect(result.state.stallOrders).toEqual(state.stallOrders);
  });

  it('rechaza inventory con baseValue no finito (1e999 -> Infinity)', () => {
    const bad = { ...freshState(), inventory: [{ itemId: 'x', containerId: 'c', categoria: 'common', baseValue: 1e999 }] };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('rechaza inventory con un elemento objeto-basura', () => {
    const bad = { ...freshState(), inventory: [{ foo: 'bar' }] };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('rechaza inventory que no es un array', () => {
    const bad = { ...freshState(), inventory: 'no-array' };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('rechaza inventory más grande que la capacidad máxima teórica de seguridad', () => {
    const bad = {
      ...freshState(),
      inventory: Array.from({ length: 500 }, (_, i) => ({ itemId: `x${i}`, containerId: 'c', categoria: 'common', baseValue: 1 })),
    };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('rechaza stallOrders con forma inválida', () => {
    expect(validateSave({ ...freshState(), stallOrders: [{ id: 'o1' }] }).valid).toBe(false);
    expect(validateSave({ ...freshState(), stallOrders: 'no-array' }).valid).toBe(false);
  });

  it('rechaza stallLevel fraccionario o negativo', () => {
    expect(validateSave({ ...freshState(), stallLevel: 1.5 }).valid).toBe(false);
    expect(validateSave({ ...freshState(), stallLevel: -1 }).valid).toBe(false);
  });

  it('rechaza storySeen que no es array de strings', () => {
    expect(validateSave({ ...freshState(), storySeen: [123] }).valid).toBe(false);
  });
});
