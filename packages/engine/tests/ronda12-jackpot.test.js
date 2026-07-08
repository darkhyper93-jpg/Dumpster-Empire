/**
 * Ronda 12 (PLAN.md §5.2 ampliado): jackpot = ítem de la categoría más rara del contenedor
 * con varianza en el tope (>= JACKPOT_VARIANCE_MIN de un rango 0.85-1.15).
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

describe('Ronda 12 — jackpot en el roll', () => {
  it('varianza al tope + categoría más rara ⇒ isJackpot true; varianza media ⇒ false', () => {
    // AJUSTE (ronda 12): rollCategory (rng.js:39) elige la categoría RARA (última) cuando
    // random()*100 < pHigh, es decir con random BAJO, no alto — al revés de lo que asumía el
    // roadmap ("random 0.99 = categoría alta"). Un () => 0.99 constante da SIEMPRE la categoría
    // común (0.99*100=99 nunca es < pHigh<=70) y el jackpot jamás dispara. Además, con
    // freshState() (`marketFluctuationAt: 0`) la primerísima llamada a random() la consume
    // refreshMarketFluctuation, no rollIsTrap. Se arma un generador por posición de llamada para
    // exigir a la vez: fluctuación de mercado (llamada 1, valor irrelevante), sin trampa (llamada
    // 2 alta), categoría rara (llamada de categoría baja) y varianza al tope (llamada de varianza
    // alta) — mismo intento del roadmap, ajustado a la secuencia real de random() del roll.
    let call = 0;
    const highRandom = () => {
      call += 1;
      if (call === 1) return 0.5; // refreshMarketFluctuation: valor sin efecto en este test.
      if (call === 2) return 0.99; // rollIsTrap: alto ⇒ no cae en trampa.
      const slotCall = (call - 3) % 3;
      if (slotCall === 0) return 0.01; // rollCategory: bajo ⇒ categoría rara (última).
      if (slotCall === 1) return 0.99; // rollItem: cuál ítem del pool, no afecta el jackpot.
      return 0.99; // rollItemVariance: alto ⇒ 0.85 + 0.99*0.3 = 1.147 (>= JACKPOT_VARIANCE_MIN).
    };
    const high = rollContainerResult(freshState(), barrio, false, items, data, highRandom);
    expect(high.isTrap).toBe(false);
    expect(high.items.some((item) => item.isJackpot)).toBe(true);
    for (const item of high.items.filter((i) => i.isJackpot)) {
      expect(item.categoria).toBe(barrio.categorias[barrio.categorias.length - 1]);
    }
    // random = 0.5: varianza 1.0 (< 1.10) ⇒ nunca jackpot, caiga la categoría que caiga.
    const mid = rollContainerResult(freshState(), barrio, false, items, data, () => 0.5);
    expect(mid.items.every((item) => !item.isJackpot)).toBe(true);
  });
});
