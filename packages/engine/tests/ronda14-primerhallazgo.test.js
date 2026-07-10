/**
 * Ronda 14 (D7) — isFirstRareFind: categoría más rara del contenedor + primera vez que se
 * encuentra ESE ítem específico. Reemplaza al jackpot por varianza de ronda 12.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { rollContainerResult, applyContainerResult } from '../src/systems/containers.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const barrio = containers.find((c) => c.id === 'contenedorBarrio');

// AJUSTE: mismo orden de consumo de random() documentado en ronda12-jackpot.test.js —
// llamada 1 = refreshMarketFluctuation, llamada 2 = rollIsTrap, luego por slot:
// rollCategory, rollItem, rollItemVariance.
function makeRareSingleSlotRandom(itemVariance = 0.5) {
  let call = 0;
  return () => {
    call += 1;
    if (call === 1) return 0.5;
    if (call === 2) return 0.99;
    const slotCall = (call - 3) % 3;
    if (slotCall === 0) return 0.01; // rollCategory: bajo ⇒ categoría rara.
    if (slotCall === 1) return 0.0; // rollItem: siempre el primer ítem del pool rara.
    return itemVariance; // rollItemVariance: media, no debería afectar el flag.
  };
}

// Variante para un roll que corre DESPUÉS de uno anterior en el mismo test: `marketFluctuationAt`
// ya quedó en un timestamp real reciente, así que refreshMarketFluctuation NO vuelve a consumir
// random() (elapsed < 60000ms) — la secuencia se corre un lugar respecto al primer roll.
function makeRareSingleSlotRandomAfterPriorRoll(itemVariance = 0.5) {
  let call = 0;
  return () => {
    call += 1;
    if (call === 1) return 0.99; // rollIsTrap: alto ⇒ no cae en trampa.
    const slotCall = (call - 2) % 3;
    if (slotCall === 0) return 0.01; // rollCategory: bajo ⇒ categoría rara.
    if (slotCall === 1) return 0.0; // rollItem: siempre el primer ítem del pool rara.
    return itemVariance; // rollItemVariance: media, no debería afectar el flag.
  };
}

describe('isFirstRareFind — primer hallazgo raro (D7)', () => {
  it('primer roll de un ítem de la categoría más rara con varianza media ⇒ true', () => {
    const state = freshState();
    const result = rollContainerResult(state, barrio, false, items, data, makeRareSingleSlotRandom());
    const rareItem = result.items.find((i) => i.categoria === barrio.categorias[barrio.categorias.length - 1]);
    expect(rareItem.isFirstRareFind).toBe(true);
  });

  it('tras applyContainerResult, un segundo roll del mismo ítem ⇒ false', () => {
    const state = freshState();
    const first = rollContainerResult(state, barrio, false, items, data, makeRareSingleSlotRandom());
    applyContainerResult(state, barrio, first, false, data);

    const second = rollContainerResult(state, barrio, false, items, data, makeRareSingleSlotRandomAfterPriorRoll());
    const rareItem = second.items.find((i) => i.categoria === barrio.categorias[barrio.categorias.length - 1]);
    expect(rareItem.isFirstRareFind).toBe(false);
  });

  it('ítem de categoría común ⇒ false siempre', () => {
    const state = freshState();
    const result = rollContainerResult(state, barrio, false, items, data, () => 0.99);
    expect(result.items.every((i) => !i.isFirstRareFind)).toBe(true);
  });

  it('roll multi-slot que saca el mismo ítem raro dos veces ⇒ exactamente UN true', () => {
    const state = freshState();
    const multiSlotContainer = { ...barrio, slots: 3 };
    let call = 0;
    const random = () => {
      call += 1;
      if (call === 1) return 0.5; // fluctuación de mercado
      if (call === 2) return 0.99; // sin trampa
      const slotCall = (call - 3) % 3;
      if (slotCall === 0) return 0.01; // categoría rara en los 3 slots
      if (slotCall === 1) return 0.0; // mismo ítem (primero del pool) en los 3 slots
      return 0.5; // varianza media
    };
    const result = rollContainerResult(state, multiSlotContainer, false, items, data, random);
    const rareItems = result.items.filter((i) => i.categoria === barrio.categorias[barrio.categorias.length - 1]);
    expect(rareItems.length).toBeGreaterThan(1);
    expect(rareItems.filter((i) => i.isFirstRareFind).length).toBe(1);
  });
});
