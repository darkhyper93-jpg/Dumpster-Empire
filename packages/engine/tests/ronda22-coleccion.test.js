/**
 * Ronda 22 — PLAN.md §4.25 (sets de colección) y §4.26 (legendarios).
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave } from '../src/save.js';
import { rollLegendary } from '../src/rng.js';
import { rollContainerResult, applyContainerResult } from '../src/systems/containers.js';
import { getSetBonus, isSetComplete, itemSaleValue } from '../src/economy.js';
import { checkAchievements } from '../src/systems/achievements.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';
import collectionSets from '../../../apps/game/src/data/collectionSets.json';
import legendaries from '../../../apps/game/src/data/legendaries.json';
import achievementsData from '../../../apps/game/src/data/achievements.json';

const tachoVereda = containers.find((c) => c.id === 'tachoVereda');
const dataBase = { upgrades, automations, prestigeTree };
const dataConSets = { ...dataBase, collectionSets };
const dataConLegendaries = { ...dataBase, legendaries };
const dataFull = { ...dataBase, collectionSets, legendaries };

/** Container de un solo slot y una sola categoría, para controlar la secuencia de random(). */
const singleSlotTacho = { ...tachoVereda, slots: 1 };

/**
 * Orden de consumo de random() para rollContainerResult con un contenedor de 1 categoría/1 slot:
 * 1) refreshMarketFluctuation (marketFluctuationAt=0 en freshState ⇒ siempre refresca)
 * 2) rollIsTrap
 * 3) rollItem (rollCategory NO consume random con una sola categoría)
 * 4) rollItemVariance
 * 5) rollLegendary (solo si !isAuto && data.legendaries)
 */
function makeLegendarySeq({
  fluctuationRoll = 0.5,
  trapRoll = 0.5,
  itemIndexRoll = 0,
  varianceRoll = 0.5,
  legendaryRoll = 0.0001,
} = {}) {
  const seq = [fluctuationRoll, trapRoll, itemIndexRoll, varianceRoll, legendaryRoll];
  let i = 0;
  return () => seq[Math.min(i++, seq.length - 1)];
}

describe('§4.25 sets de colección', () => {
  it('isSetComplete es false si falta algún ítem del pool', () => {
    const state = freshState();
    expect(isSetComplete(state, tachoVereda, itemsData)).toBe(false);
  });

  it('isSetComplete es true cuando itemsFoundByItem cubre TODO el pool del contenedor', () => {
    const state = freshState();
    const pool = itemsData.containers[tachoVereda.id];
    state.itemsFoundByItem[tachoVereda.id] = Object.fromEntries(pool.map((it) => [it.id, 1]));
    expect(isSetComplete(state, tachoVereda, itemsData)).toBe(true);
  });

  it('getSetBonus es neutro (1) sin data.collectionSets o con el set incompleto', () => {
    const state = freshState();
    expect(getSetBonus(state, tachoVereda, itemsData, dataBase)).toBe(1);
    const pool = itemsData.containers[tachoVereda.id];
    state.itemsFoundByItem[tachoVereda.id] = Object.fromEntries(pool.map((it) => [it.id, 1]));
    // Set completo pero sin data.collectionSets: sigue neutro (constante opcional, patrón data.streak).
    expect(getSetBonus(state, tachoVereda, itemsData, dataBase)).toBe(1);
  });

  it('getSetBonus da 1 + setBonusPercent con el set completo y data.collectionSets presente', () => {
    const state = freshState();
    const pool = itemsData.containers[tachoVereda.id];
    state.itemsFoundByItem[tachoVereda.id] = Object.fromEntries(pool.map((it) => [it.id, 1]));
    expect(getSetBonus(state, tachoVereda, itemsData, dataConSets)).toBe(1 + collectionSets.setBonusPercent);
  });
});

describe('§4.26 legendarios', () => {
  it('rollLegendary respeta legendaryChance con random sembrado', () => {
    expect(rollLegendary(0.002, () => 0.001)).toBe(true);
    expect(rollLegendary(0.002, () => 0.003)).toBe(false);
  });

  it('reemplaza el slot 1 cuando el roll de legendario sale y la categoría coincide', () => {
    const state = freshState();
    const result = rollContainerResult(state, singleSlotTacho, false, itemsData, dataConLegendaries, makeLegendarySeq());
    expect(result.items).toHaveLength(1);
    const legendary = legendaries.items.find((l) => l.categoria === 'common');
    expect(result.items[0].id).toBe(legendary.id);
    expect(result.items[0].isLegendary).toBe(true);
    expect(result.items[0].isFirstRareFind).toBe(false);
  });

  it('el valor del legendario pasa por itemSaleValue con su propia valorBase (R22.1: moneyDelta refleja el total real)', () => {
    const state = freshState();
    const result = rollContainerResult(state, singleSlotTacho, false, itemsData, dataConLegendaries, makeLegendarySeq());
    const legendary = legendaries.items.find((l) => l.categoria === 'common');
    const rarity = itemsData.rarities.find((r) => r.id === 'common');
    const expectedValue = itemSaleValue({
      valorBaseObjeto: legendary.valorBase,
      multiplicadorRareza: rarity.mult,
      suerte: 0,
      fluctuacionMercado: state.marketFluctuation,
    });
    expect(result.items[0].value).toBeCloseTo(expectedValue, 6);
    expect(result.moneyDelta).toBeCloseTo(expectedValue, 6);
  });

  it('un legendario ya poseído no vuelve a salir: el slot 1 queda con el ítem normal', () => {
    const state = freshState();
    const legendary = legendaries.items.find((l) => l.categoria === 'common');
    state.legendariesFound = [legendary.id];
    const result = rollContainerResult(state, singleSlotTacho, false, itemsData, dataConLegendaries, makeLegendarySeq());
    expect(result.items[0].isLegendary).toBeFalsy();
  });

  it('el robot (isAuto=true) nunca rollea legendario', () => {
    const state = freshState();
    // Secuencia de 4 valores (sin el quinto de rollLegendary): si el código igual intentara
    // rollear legendario, consumiría un 5to random() y devolvería `undefined` (NaN downstream),
    // rompiendo el test de forma visible en vez de silenciosa.
    const seq = [0.5, 0.5, 0, 0.5];
    let i = 0;
    const random = () => seq[Math.min(i++, seq.length - 1)];
    const result = rollContainerResult(state, singleSlotTacho, true, itemsData, dataConLegendaries, random);
    expect(result.items[0].isLegendary).toBeFalsy();
  });

  it('applyContainerResult registra el legendario en legendariesFound y NO en itemsFoundByItem/itemsFoundCount', () => {
    const state = freshState();
    const result = rollContainerResult(state, singleSlotTacho, false, itemsData, dataConLegendaries, makeLegendarySeq());
    applyContainerResult(state, singleSlotTacho, result, false, dataConLegendaries);
    const legendary = legendaries.items.find((l) => l.categoria === 'common');
    expect(state.legendariesFound).toEqual([legendary.id]);
    expect(state.itemsFoundCount).toBe(0);
    expect(state.itemsFoundByItem[singleSlotTacho.id]?.[legendary.id]).toBeUndefined();
    expect(state.money).toBeCloseTo(result.moneyDelta, 6);
  });

  it('un mismo legendario nunca se duplica en legendariesFound (aunque applyContainerResult corra dos veces)', () => {
    const state = freshState();
    const result = rollContainerResult(state, singleSlotTacho, false, itemsData, dataConLegendaries, makeLegendarySeq());
    applyContainerResult(state, singleSlotTacho, result, false, dataConLegendaries);
    applyContainerResult(state, singleSlotTacho, result, false, dataConLegendaries);
    const legendary = legendaries.items.find((l) => l.categoria === 'common');
    expect(state.legendariesFound).toEqual([legendary.id]);
  });

  it('getSetBonus se aplica también al valor del legendario cuando el set del contenedor está completo', () => {
    const state = freshState();
    const pool = itemsData.containers[singleSlotTacho.id];
    state.itemsFoundByItem[singleSlotTacho.id] = Object.fromEntries(pool.map((it) => [it.id, 1]));
    const withSet = rollContainerResult(state, singleSlotTacho, false, itemsData, dataFull, makeLegendarySeq());
    const state2 = freshState();
    const withoutSet = rollContainerResult(state2, singleSlotTacho, false, itemsData, dataConLegendaries, makeLegendarySeq());
    expect(withSet.items[0].value).toBeCloseTo(withoutSet.items[0].value * (1 + collectionSets.setBonusPercent), 6);
  });
});

describe('logros de sets/legendarios (a42-a45)', () => {
  it('legendariesFoundAtLeast evalúa contra state.legendariesFound', () => {
    const state = freshState();
    state.legendariesFound = ['legendary-first-can'];
    const unlocked = checkAchievements(state, achievementsData, { allContainers: containers, allAutomations: automations, itemsData });
    expect(unlocked).toContain('a42');
    expect(unlocked).not.toContain('a43');
  });

  it('setsCompletedAtLeast cuenta contenedores con el pool completo (a45)', () => {
    const state = freshState();
    const pool = itemsData.containers[tachoVereda.id];
    state.itemsFoundByItem[tachoVereda.id] = Object.fromEntries(pool.map((it) => [it.id, 1]));
    const unlocked = checkAchievements(state, achievementsData, { allContainers: containers, allAutomations: automations, itemsData });
    expect(unlocked).toContain('a45');
  });

  it('a44 (Vitrina Completa) requiere los 8 legendarios y está oculto', () => {
    const a44 = achievementsData.find((a) => a.id === 'a44');
    expect(a44.hidden).toBe(true);
    expect(a44.cond).toEqual({ type: 'legendariesFoundAtLeast', value: 8 });
  });
});

describe('save v11: legendariesFound', () => {
  it('SAVE_VERSION es 11 y freshState trae legendariesFound: []', () => {
    expect(SAVE_VERSION).toBe(11);
    expect(freshState().legendariesFound).toEqual([]);
  });

  it('migra un save v10 sin legendariesFound agregándolo vacío', () => {
    const v10 = { ...freshState(), saveVersion: 10 };
    delete v10.legendariesFound;
    const result = validateSave(v10);
    expect(result.valid).toBe(true);
    expect(result.data.legendariesFound).toEqual([]);
    expect(result.data.saveVersion).toBe(11);
  });

  it('rechaza legendariesFound que no es un array de strings', () => {
    expect(validateSave({ ...freshState(), legendariesFound: [123] }).valid).toBe(false);
    expect(validateSave({ ...freshState(), legendariesFound: 'no-array' }).valid).toBe(false);
  });

  it('un save fresco es válido tal cual', () => {
    expect(validateSave(freshState()).valid).toBe(true);
  });
});
