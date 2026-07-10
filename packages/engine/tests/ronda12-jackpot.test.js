/**
 * El contrato de "jackpot por varianza" (ronda 12) ya no existe (D7, ronda 14): ahora es
 * "primer hallazgo de ese ítem" (isFirstRareFind), cubierto en detalle por
 * ronda14-primerhallazgo.test.js. Este archivo queda como regresión del nuevo comportamiento,
 * conservando el comentario-lección sobre el orden de consumo de random() dentro del roll.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { rollContainerResult } from '../src/systems/containers.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const barrio = containers.find((c) => c.id === 'contenedorBarrio');

describe('Ronda 14 — regresión: isFirstRareFind reemplaza al jackpot por varianza', () => {
  it('categoría más rara + primera vez ⇒ isFirstRareFind true, sin importar la varianza', () => {
    // AJUSTE (ronda 12, migrado a ronda 14): rollCategory (rng.js:39) elige la categoría RARA
    // (última) cuando random()*100 < pHigh, es decir con random BAJO, no alto. Además, con
    // freshState() (`marketFluctuationAt: 0`) la primerísima llamada a random() la consume
    // refreshMarketFluctuation, no rollIsTrap. Se arma un generador por posición de llamada para
    // exigir a la vez: fluctuación de mercado (llamada 1, valor irrelevante), sin trampa (llamada
    // 2 alta), categoría rara (llamada de categoría baja) y varianza MEDIA (llamada de varianza
    // ~0.5) — prueba que la condición de varianza murió: con varianza media, el jackpot viejo de
    // ronda 12 hubiera dado false, y ronda 14 da isFirstRareFind: true igual.
    let call = 0;
    const gen = () => {
      call += 1;
      if (call === 1) return 0.5; // refreshMarketFluctuation: valor sin efecto en este test.
      if (call === 2) return 0.99; // rollIsTrap: alto ⇒ no cae en trampa.
      const slotCall = (call - 3) % 3;
      if (slotCall === 0) return 0.01; // rollCategory: bajo ⇒ categoría rara (última).
      if (slotCall === 1) return 0.99; // rollItem: cuál ítem del pool, no afecta el flag.
      return 0.5; // rollItemVariance: media (1.0) — ya no debería importar.
    };
    const result = rollContainerResult(freshState(), barrio, false, items, data, gen);
    expect(result.isTrap).toBe(false);
    expect(result.items.some((item) => item.isFirstRareFind)).toBe(true);
    for (const item of result.items.filter((i) => i.isFirstRareFind)) {
      expect(item.categoria).toBe(barrio.categorias[barrio.categorias.length - 1]);
    }
  });

  it('categoría común ⇒ isFirstRareFind siempre false', () => {
    const result = rollContainerResult(freshState(), barrio, false, items, data, () => 0.99);
    expect(result.items.every((item) => !item.isFirstRareFind)).toBe(true);
  });
});
