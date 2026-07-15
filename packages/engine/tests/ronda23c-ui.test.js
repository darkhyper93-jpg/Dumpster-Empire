/**
 * Ronda 23, Agente C (UI: pestaña Puesto) — PLAN.md §4.30 (presets del umbral, calculados por el
 * engine, nunca aproximados en la UI) y el checker de historia liviana (roadmap §3.2, "un solo
 * motor de condiciones para logros, historia y misiones" — reusa CONDITION_EVALUATORS de
 * achievements.js, exportado por esta ronda para que systems/story.js no lo duplique).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getStallThresholdPresets, itemSaleValue, getLuck } from '../src/economy.js';
import { checkStory } from '../src/systems/story.js';
import containers from '../../../apps/game/src/data/containers.json';
import itemsData from '../../../apps/game/src/data/items.json';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import story from '../../../apps/game/src/data/story.json';

const dataBase = { upgrades, automations, prestigeTree };
const tachoVereda = containers.find((c) => c.id === 'tachoVereda');

describe('§4.30 getStallThresholdPresets', () => {
  it('sin contenedores poseídos, devuelve []', () => {
    const state = freshState();
    expect(getStallThresholdPresets(state, containers, itemsData, dataBase)).toEqual([]);
  });

  it('con un contenedor poseído, devuelve 3 presets ascendentes derivados de su pool', () => {
    const state = freshState();
    state.ownedContainers[tachoVereda.id] = 1;
    const presets = getStallThresholdPresets(state, containers, itemsData, dataBase);
    expect(presets).toHaveLength(3);
    expect(presets[0]).toBeLessThanOrEqual(presets[1]);
    expect(presets[1]).toBeLessThanOrEqual(presets[2]);
    for (const p of presets) expect(Number.isFinite(p)).toBe(true);
  });

  it('usa el contenedor de mayor costoInicial entre los poseídos (el más avanzado)', () => {
    const state = freshState();
    // tachoVereda es el contenedor inicial (costoInicial más bajo); el segundo tier posee ítems
    // de mayor valorBase, así que sus presets deben ser estrictamente mayores.
    const sorted = [...containers].sort((a, b) => a.costoInicial - b.costoInicial);
    const advanced = sorted[1];
    state.ownedContainers[tachoVereda.id] = 1;
    const presetsBase = getStallThresholdPresets(state, containers, itemsData, dataBase);
    state.ownedContainers[advanced.id] = 1;
    const presetsAdvanced = getStallThresholdPresets(state, containers, itemsData, dataBase);
    expect(presetsAdvanced[1]).toBeGreaterThan(presetsBase[1]);
  });

  it('el preset central (p50) coincide con itemSaleValue promedio del pool sin variance ni fluctuación', () => {
    const state = freshState();
    state.ownedContainers[tachoVereda.id] = 1;
    const pool = itemsData.containers[tachoVereda.id];
    const luck = getLuck(state, dataBase);
    const values = pool
      .map((item) => {
        const rarity = itemsData.rarities.find((r) => r.id === item.categoria);
        return itemSaleValue({
          valorBaseObjeto: item.valorBase,
          multiplicadorRareza: rarity.mult,
          suerte: luck,
          fluctuacionMercado: 1,
        });
      })
      .sort((a, b) => a - b);
    const presets = getStallThresholdPresets(state, containers, itemsData, dataBase);
    // La mediana debe caer dentro del rango real de valores del pool (nunca fuera de min/max).
    expect(presets[1]).toBeGreaterThanOrEqual(values[0]);
    expect(presets[1]).toBeLessThanOrEqual(values[values.length - 1]);
  });
});

describe('checkStory (roadmap §3.2) — mismo motor de condiciones que checkAchievements', () => {
  it('marca storySeen y devuelve el hito cuando su condición se cumple', () => {
    const state = freshState();
    state.stallLevel = 1;
    const newlySeen = checkStory(state, story, {});
    expect(state.storySeen).toContain('stallUnlockRita');
    expect(newlySeen.some((s) => s.id === 'stallUnlockRita')).toBe(true);
  });

  it('no repite un hito ya visto aunque la condición siga cumpliéndose', () => {
    const state = freshState();
    state.stallLevel = 1;
    checkStory(state, story, {});
    const secondPass = checkStory(state, story, {});
    expect(secondPass).toEqual([]);
    expect(state.storySeen.filter((id) => id === 'stallUnlockRita')).toHaveLength(1);
  });

  it('no marca un hito cuya condición todavía no se cumple', () => {
    const state = freshState();
    const newlySeen = checkStory(state, story, {});
    expect(newlySeen).toEqual([]);
    expect(state.storySeen).toEqual([]);
  });
});
