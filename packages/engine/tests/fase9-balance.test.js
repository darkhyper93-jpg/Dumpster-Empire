/**
 * PLAN.md §3 (ritmo) y §11.2/§11.6 (objetivos de jugabilidad) — Agente 9, pase de balance.
 * Cubre lo que un cambio futuro de `data/*.json` podría romper sin que nadie lo note: que los
 * contenedores sigan siendo rentables a la Suerte recomendada, que perder duela pero se suavice
 * con la Suerte, que escarbar cueste esfuerzo, que las recompensas de logros no sean OP, y que la
 * automatización nunca sea más rentable por segundo que jugar manual (arriesgando trampa más alta).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import {
  getContainerCost,
  getEffectiveTrapProbability,
  getTrapPenalty,
  getDigRate,
  getRecommendedLuck,
  upgradeCost,
} from '../src/economy.js';
import { expectedContainerValue } from '../src/systems/offline.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import achievements from '../../../apps/game/src/data/achievements.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };

/** Valor esperado neto de comprar+escarbar `container` a mano con `luck` fija (sin RNG). */
function expectedNetValueAtLuck(container, luck) {
  const state = freshState();
  const luckDef = upgrades.find((u) => u.id === 'luck');
  state.upgradeLevels.luck = Math.round((luck - luckDef.baseValue) / luckDef.perNivel);
  const cost = getContainerCost(state, container, data);
  const gross = expectedContainerValue(state, container, items, data);
  const trapProb = getEffectiveTrapProbability(state, container, false, data);
  const penalty = getTrapPenalty(state, container, data);
  return gross - trapProb * penalty - cost;
}

describe('PLAN.md §11.2 — con la Suerte recomendada, el contenedor es rentable en promedio', () => {
  for (const container of containers) {
    it(`${container.id}: valor esperado neto >= 0 a la Suerte recomendada`, () => {
      const state = freshState();
      const recLuck = getRecommendedLuck(state, container, items, data);
      expect(expectedNetValueAtLuck(container, recLuck)).toBeGreaterThanOrEqual(-0.01);
    });
  }
});

// Ronda 6: con precio fijo y tiers ×10–×15, la Suerte recomendada dejó de ser 0 para todo
// contenedor pago — "un contenedor recién comprado debe ser una ruina segura" (PLAN.md §11.2)
// hasta juntar la Suerte del tier. Guarda el rebalanceo de items.json contra regresiones de data.
describe('Ronda 6 — la Suerte recomendada es real (no 0) y crece por tier', () => {
  const state = freshState();
  const recommended = containers.map((c) => getRecommendedLuck(state, c, items, data));

  for (let i = 0; i < containers.length; i++) {
    const container = containers[i];
    if (container.costoInicial === 0) continue;
    // AJUSTE (ronda 11): el tope "alcanzable" sube de 350 a 650 — los 4 contenedores de
    // prestigio nuevos recomiendan hasta 580 (vertederoDivino) con la calibración de esta ronda.
    it(`${container.id}: recomendada > 0, alcanzable (< 650) y en pérdida a Suerte 0`, () => {
      expect(recommended[i]).toBeGreaterThan(0);
      expect(recommended[i]).toBeLessThan(650);
      expect(expectedNetValueAtLuck(container, 0)).toBeLessThan(0);
    });
  }

  it('la recomendada crece estrictamente de tier en tier (entre contenedores pagos)', () => {
    const paid = recommended.filter((_, i) => containers[i].costoInicial > 0);
    for (let i = 1; i < paid.length; i++) {
      expect(paid[i]).toBeGreaterThan(paid[i - 1]);
    }
  });
});

// Ronda 10: los requerimientos de Suerte subieron de nuevo (~×1.6 por tier) recalibrando SOLO
// los valorBase de items.json (fórmulas y containers.json intactos) con el script
// agentes/scripts/calibrate-luck-ronda10.mjs. Este test fija los targets EXACTOS: si un
// rebalanceo futuro de data los mueve, tiene que verse acá a propósito.
describe('Ronda 10/11 — requerimientos de Suerte por contenedor (targets exactos)', () => {
  it('la Suerte recomendada de los 12 contenedores es exactamente la tabla de las rondas 10 y 11', () => {
    const state = freshState();
    const recommended = containers.map((c) => getRecommendedLuck(state, c, items, data));
    expect(recommended).toEqual([0, 8, 20, 40, 72, 120, 190, 290, 340, 420, 500, 580]);
  });
});

describe('PLAN.md §11.2 — la pérdida esperada baja a medida que sube la Suerte', () => {
  for (const container of containers) {
    it(`${container.id}: pérdida esperada (probTrampa * penalización) es menor a Suerte alta que a Suerte 0`, () => {
      const low = freshState();
      const high = freshState();
      high.upgradeLevels.luck = 100;
      const lossLow =
        getEffectiveTrapProbability(low, container, false, data) * getTrapPenalty(low, container, data);
      const lossHigh =
        getEffectiveTrapProbability(high, container, false, data) * getTrapPenalty(high, container, data);
      expect(lossHigh).toBeLessThan(lossLow);
    });
  }
});

describe('PLAN.md §11.2 — el escarbado cuesta esfuerzo y escala con el tier', () => {
  it('con Fuerza base (nivel 0), todo contenedor con resistencia > 1 escarba más lento que el ritmo normal', () => {
    const state = freshState();
    for (const container of containers) {
      if (container.resistencia > 1) {
        expect(getDigRate(state, container, data)).toBeLessThan(1);
      }
    }
  });

  it('la resistencia requerida crece con el tier (orden de PLAN.md §2.6)', () => {
    for (let i = 1; i < containers.length; i++) {
      expect(containers[i].resistencia).toBeGreaterThanOrEqual(containers[i - 1].resistencia);
    }
  });
});

describe('PLAN.md §11.2 — trampas más caras por tier, nunca injustas', () => {
  it('el castigo de trampa crece monotónicamente con el tier del contenedor', () => {
    const state = freshState();
    for (let i = 1; i < containers.length; i++) {
      expect(getTrapPenalty(state, containers[i], data)).toBeGreaterThanOrEqual(
        getTrapPenalty(state, containers[i - 1], data)
      );
    }
  });

  // AJUSTE (ronda 11): el tope sube de 35% a 40% — vertederoDivino (el contenedor de mayor
  // riesgo, gateado por Prestigio 5) sube a 38% a propósito para justificar su Suerte recomendada.
  it('incluso en el contenedor de mayor riesgo, la probabilidad base de trampa nunca supera 40%', () => {
    for (const container of containers) {
      expect(container.probTrampaBase).toBeLessThanOrEqual(0.4);
    }
  });
});

describe('PLAN.md §11.6 — recompensas de logros no rompen la economía', () => {
  it('la suma de recompensas en dinero de todos los logros es una fracción chica del umbral de Prestigio', () => {
    const totalMoney = achievements.filter((a) => a.reward.type === 'money').reduce((s, a) => s + a.reward.amount, 0);
    // PLAN.md §2.8: el umbral de Prestigio es 1.000.000.000. Los logros no deben regalar una
    // fracción significativa de eso — techo arbitrario pero generoso: 5%.
    expect(totalMoney).toBeLessThan(1_000_000_000 * 0.05);
  });

  it('la suma de recompensas en Llaves de todos los logros es comparable a una sola tanda de Prestigio, no varias', () => {
    const totalKeys = achievements.filter((a) => a.reward.type === 'keys').reduce((s, a) => s + a.reward.amount, 0);
    // §4.3: llaves = floor(sqrt(dineroTotalGanado / 1e9) * 10). En el umbral exacto (1e9) da 10.
    // Los logros no deberían regalar, sumados, mucho más que eso de entrada.
    expect(totalKeys).toBeLessThanOrEqual(60);
  });

  it('ningún logro individual de dinero regala, de una, una fracción relevante del umbral de Prestigio', () => {
    for (const a of achievements.filter((x) => x.reward.type === 'money')) {
      expect(a.reward.amount).toBeLessThan(1_000_000_000 * 0.01);
    }
  });
});

describe('PLAN.md §2.7 — la automatización nunca es más rentable por segundo que jugar manual óptimo', () => {
  it('con el Robot Clasificador comprado, la probabilidad de trampa automática siempre es >= a la manual', () => {
    const state = freshState();
    state.automationOwned.robotClasificador = true;
    for (const container of containers) {
      const manual = getEffectiveTrapProbability(state, container, false, data);
      const auto = getEffectiveTrapProbability(state, container, true, data);
      expect(auto).toBeGreaterThanOrEqual(manual);
    }
  });

  it('el multiplicador de trampa automática (autoTrapMultiplier) es mayor a 1 (nunca ventaja para el robot)', () => {
    const robot = automations.find((a) => a.id === 'robotClasificador');
    const effect = robot.effects.find((e) => e.type === 'autoTrapMultiplier');
    expect(effect.mult).toBeGreaterThan(1);
  });
});

describe('PLAN.md §3 — ritmo temprano (determinístico, sin depender de una estrategia simulada)', () => {
  it('el valor esperado de un escarbado del Tacho de Vereda alcanza la primera mejora de Suerte en <= 30s', () => {
    const tacho = containers.find((c) => c.id === 'tachoVereda');
    const state = freshState();
    const perDig = expectedContainerValue(state, tacho, items, data);
    const perSecond = perDig / tacho.digTime;
    const luckDef = upgrades.find((u) => u.id === 'luck');
    const firstUpgradeCost = upgradeCost(luckDef.costoBase, luckDef.factorCrecimiento, 0);
    expect(firstUpgradeCost / perSecond).toBeLessThanOrEqual(30);
  });

  it('el Contenedor de Barrio es afordable dentro de los primeros 2 minutos escarbando el Tacho', () => {
    const tacho = containers.find((c) => c.id === 'tachoVereda');
    const barrio = containers.find((c) => c.id === 'contenedorBarrio');
    const state = freshState();
    const perSecond = expectedContainerValue(state, tacho, items, data) / tacho.digTime;
    const cost = getContainerCost(state, barrio, data);
    expect(cost / perSecond).toBeLessThanOrEqual(120);
  });
});
