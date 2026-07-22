/**
 * Ronda "features" (pedido del usuario, 2026-07-22):
 *  1. Venta de TODO el inventario del Puesto en un clic (`sellAllInventory`), conviviendo con la
 *     venta individual que ya existe (PLAN.md §4.27/§4.28 — misma fórmula de precio y mismo
 *     matcheo de pedidos, solo cambia el lote).
 *  4. Cuatro herramientas de escarbado nuevas (PLAN.md §4.23) a 500M / 50B / 1T / 10T.
 *
 * TDD: este archivo se escribió en ROJO antes de tocar `stall.js` y `tools.json`.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { sellInventoryItem, sellAllInventory } from '../src/systems/stall.js';
import { buyTool, equipTool } from '../src/systems/tools.js';
import { getStallSalePrice, getToolRadiusMult, getToolRhythmMult } from '../src/economy.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import stall from '../../../apps/game/src/data/stall.json';
import tools from '../../../apps/game/src/data/tools.json';

const data = { upgrades, automations, prestigeTree, stall, tools };

/** Fluctuación fija: `sellAllInventory` la refresca UNA vez, así el test es determinista. */
const noRandom = () => 0.5;

function entry(id, categoria, baseValue) {
  return { itemId: id, containerId: 'tachoVereda', categoria, baseValue };
}

function stateConInventario(entries) {
  const state = freshState();
  state.stallLevel = 1;
  state.inventory = entries;
  return state;
}

describe('venta de todo el inventario en un clic (pedido del usuario)', () => {
  it('vacía el inventario, acredita la suma de los precios y devuelve cuántos vendió', () => {
    const state = stateConInventario([
      entry('i1', 'common', 100),
      entry('i2', 'common', 250),
      entry('i3', 'reusable', 900),
    ]);
    const moneyAntes = state.money;

    const result = sellAllInventory(state, data, 1_000_000, noRandom);

    expect(result.ok).toBe(true);
    expect(result.count).toBe(3);
    expect(state.inventory).toHaveLength(0);
    expect(state.money).toBeCloseTo(moneyAntes + result.moneyDelta, 6);
    expect(result.moneyDelta).toBeGreaterThan(0);
  });

  it('paga EXACTAMENTE lo mismo que vender uno por uno (no es una fórmula nueva)', () => {
    const entradas = () => [entry('i1', 'common', 100), entry('i2', 'reusable', 900), entry('i3', 'electronics', 4200)];

    const unoPorUno = stateConInventario(entradas());
    let esperado = 0;
    while (unoPorUno.inventory.length) {
      const r = sellInventoryItem(unoPorUno, 0, data, 1_000_000, noRandom);
      esperado += r.moneyDelta;
    }

    const enLote = stateConInventario(entradas());
    const result = sellAllInventory(enLote, data, 1_000_000, noRandom);

    expect(result.moneyDelta).toBeCloseTo(esperado, 6);
    expect(enLote.money).toBeCloseTo(unoPorUno.money, 6);
    expect(enLote.stallSoldCount).toBe(unoPorUno.stallSoldCount);
  });

  it('cumple los pedidos activos de Salomón y cobra su multiplicador', () => {
    const state = stateConInventario([entry('i1', 'common', 100), entry('i2', 'common', 100)]);
    state.stallOrders = [{ id: 'o1', npcId: 'salomon', categoria: 'common', cantidad: 2, mult: 2, progress: 0 }];
    const precioBase = getStallSalePrice(state, state.inventory[0], data, 1);

    const result = sellAllInventory(state, data, 1_000_000, noRandom);

    expect(result.ok).toBe(true);
    expect(state.ordersFulfilledCount).toBe(1);
    expect(state.stallOrders).toHaveLength(0);
    // Los dos ítems entraron al pedido ⇒ ambos cobraron ×2 sobre el precio base de la fluctuación.
    expect(result.moneyDelta).toBeGreaterThan(precioBase * 2);
  });

  it('con el inventario vacío no vende nada ni toca el dinero', () => {
    const state = stateConInventario([]);
    const moneyAntes = state.money;
    const result = sellAllInventory(state, data, 1_000_000, noRandom);
    expect(result.ok).toBe(false);
    expect(state.money).toBe(moneyAntes);
    expect(state.stallSoldCount).toBe(0);
  });

  it('refresca la fluctuación de mercado UNA sola vez para todo el lote (§4.27)', () => {
    const state = stateConInventario([entry('i1', 'common', 100), entry('i2', 'common', 100)]);
    state.marketFluctuationAt = 0;
    sellAllInventory(state, data, 5_000_000, noRandom);
    expect(state.marketFluctuationAt).toBe(5_000_000);
    expect(Number.isFinite(state.marketFluctuation)).toBe(true);
  });
});

describe('herramientas de escarbado nuevas (500M / 50B / 1T / 10T)', () => {
  const NUEVAS = ['exoesqueletoChatarrero', 'taladroNucleo', 'barredoraGravitatoria', 'excavadoraSingular'];
  const COSTOS = [500e6, 50e9, 1e12, 10e12];

  it('existen las cuatro con el costo pedido por el usuario', () => {
    NUEVAS.forEach((id, i) => {
      const tool = tools.find((t) => t.id === id);
      expect(tool, `falta la herramienta ${id}`).toBeTruthy();
      expect(tool.costo).toBe(COSTOS[i]);
    });
  });

  it('los costos de tools.json son estrictamente crecientes (la lista se lee como una escalera)', () => {
    for (let i = 1; i < tools.length; i++) {
      expect(tools[i].costo, `${tools[i].id} no supera a ${tools[i - 1].id}`).toBeGreaterThan(tools[i - 1].costo);
    }
  });

  it('cada herramienta nueva mejora radio Y ritmo respecto de la anterior de la escalera', () => {
    const escalera = [tools.find((t) => t.id === 'guanteHidraulico'), ...NUEVAS.map((id) => tools.find((t) => t.id === id))];
    for (let i = 1; i < escalera.length; i++) {
      expect(escalera[i].radioMult).toBeGreaterThan(escalera[i - 1].radioMult);
      expect(escalera[i].ritmoMult).toBeGreaterThan(escalera[i - 1].ritmoMult);
    }
  });

  it('todos los multiplicadores son finitos y positivos (nada de NaN/Infinity en el pincel)', () => {
    for (const tool of tools) {
      expect(Number.isFinite(tool.radioMult) && tool.radioMult > 0).toBe(true);
      expect(Number.isFinite(tool.ritmoMult) && tool.ritmoMult > 0).toBe(true);
      expect(Number.isFinite(tool.costo) && tool.costo >= 0).toBe(true);
    }
  });

  it('comprar y equipar la última herramienta aplica sus multiplicadores al pincel', () => {
    const tool = tools.find((t) => t.id === 'excavadoraSingular');
    const state = freshState();
    state.money = tool.costo;
    expect(buyTool(state, tool).ok).toBe(true);
    expect(state.money).toBe(0);
    expect(equipTool(state, tool.id).ok).toBe(true);
    expect(getToolRadiusMult(state, data)).toBeCloseTo(tool.radioMult, 6);
    expect(getToolRhythmMult(state, data)).toBeCloseTo(tool.ritmoMult, 6);
  });
});
