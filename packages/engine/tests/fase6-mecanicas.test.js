import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import {
  getContainerLevel,
  digsNeededForNextLevel,
  getLevelRarityShift,
  getDigRate,
  getEffectiveDigTime,
  getTrapPenalty,
  getRecommendedLuck,
  CONTAINER_LEVEL_MAX,
} from '../src/economy.js';
import { categoryWeights } from '../src/rng.js';
import { rollContainerResult, applyContainerResult } from '../src/systems/containers.js';
import { isPrestigeNodeUnlocked, buyPrestigeNode } from '../src/systems/prestige.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { validateSave, deserializeState, serializeState } from '../src/save.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import achievements from '../../../apps/game/src/data/achievements.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const seq = (values) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('PLAN.md §11.4 — ítems únicos por contenedor', () => {
  it('cada contenedor tiene entre 6 y 8 ítems propios', () => {
    for (const container of containers) {
      const pool = items.containers[container.id];
      expect(pool).toBeDefined();
      expect(pool.length).toBeGreaterThanOrEqual(6);
      expect(pool.length).toBeLessThanOrEqual(8);
    }
  });

  it('ningún nombre de ítem se repite entre contenedores distintos', () => {
    const seen = new Map();
    for (const container of containers) {
      for (const item of items.containers[container.id]) {
        const owner = seen.get(item.name);
        expect(owner === undefined || owner === container.id).toBe(true);
        seen.set(item.name, container.id);
      }
    }
  });

  it('cada ítem declara una categoria incluida en las categorias del contenedor', () => {
    for (const container of containers) {
      for (const item of items.containers[container.id]) {
        expect(container.categorias).toContain(item.categoria);
      }
    }
  });
});

describe('PLAN.md §11.3 — niveles de contenedor', () => {
  const container = containers.find((c) => c.id === 'tachoVereda');

  it('arranca en nivel 1 y sube tras acumular los escarbados de digsNeededForNextLevel', () => {
    const state = freshState();
    expect(getContainerLevel(state, container.id)).toBe(1);
    const needed = digsNeededForNextLevel(container, 1);
    for (let i = 0; i < needed - 1; i++) {
      applyContainerResult(state, container, { isTrap: false, items: [], moneyDelta: 0 }, false, data);
    }
    expect(getContainerLevel(state, container.id)).toBe(1);
    applyContainerResult(state, container, { isTrap: false, items: [], moneyDelta: 0 }, false, data);
    expect(getContainerLevel(state, container.id)).toBe(2);
  });

  it('nunca sube más allá de CONTAINER_LEVEL_MAX', () => {
    const state = freshState();
    state.containerLevels[container.id] = CONTAINER_LEVEL_MAX;
    for (let i = 0; i < 500; i++) {
      applyContainerResult(state, container, { isTrap: false, items: [], moneyDelta: 0 }, false, data);
    }
    expect(getContainerLevel(state, container.id)).toBe(CONTAINER_LEVEL_MAX);
  });

  it('el nivel es persistente (parte del estado, sobrevive a otras mutaciones)', () => {
    const state = freshState();
    state.containerLevels[container.id] = 4;
    state.money = 999;
    expect(getContainerLevel(state, container.id)).toBe(4);
  });

  it('a mayor nivel, mejora la probabilidad de la categoría rara del contenedor', () => {
    const multi = containers.find((c) => c.categorias.length === 2);
    const stateLevel1 = freshState();
    const stateLevel10 = freshState();
    stateLevel10.containerLevels[multi.id] = 10;
    const shift1 = getLevelRarityShift(stateLevel1, multi);
    const shift10 = getLevelRarityShift(stateLevel10, multi);
    expect(shift10).toBeGreaterThan(shift1);
    const weights1 = categoryWeights(multi.categorias, 0, shift1);
    const weights10 = categoryWeights(multi.categorias, 0, shift10);
    const rareCategory = multi.categorias[multi.categorias.length - 1];
    expect(weights10[rareCategory]).toBeGreaterThan(weights1[rareCategory]);
  });
});

describe('PLAN.md §11.2 — resistencia / Fuerza mínima', () => {
  it('con Fuerza por debajo de la resistencia requerida, el ritmo baja de 1', () => {
    const state = freshState();
    const hardContainer = containers.find((c) => c.id === 'bovedaPerdida');
    expect(getDigRate(state, hardContainer, data)).toBeLessThan(1);
    expect(getEffectiveDigTime(state, hardContainer, data)).toBeGreaterThan(hardContainer.digTime);
  });

  it('con Fuerza sobrada, el ritmo llega al tope 1.5 y el tiempo efectivo baja hasta digTime/1.5 (ronda 7)', () => {
    const state = freshState();
    // AJUSTE (ronda 10): la resistencia de bovedaPerdida subió a 6.4; el nivel necesita superar
    // 1.5×6.4 = 9.6 de mult (antes 200 alcanzaba con la resistencia vieja de 3.3).
    state.upgradeLevels.digPower = 220; // fuerza muy alta, cubre cualquier resistencia definida
    const hardContainer = containers.find((c) => c.id === 'bovedaPerdida');
    expect(getDigRate(state, hardContainer, data)).toBe(1.5);
    expect(getEffectiveDigTime(state, hardContainer, data)).toBeCloseTo(hardContainer.digTime / 1.5, 10);
  });

  it('el ritmo nunca baja de un piso de 30% (ronda 7)', () => {
    const state = freshState();
    const extremeContainer = { ...containers.find((c) => c.id === 'containerExtradimensional'), resistencia: 10000 };
    expect(getDigRate(state, extremeContainer, data)).toBe(0.3);
  });
});

describe('PLAN.md §11.2/§4.6 — trampas de monto FIJO por tier (ronda 7)', () => {
  it('un contenedor de tier alto castiga más que uno de tier bajo con la misma Suerte', () => {
    const state = freshState();
    const low = containers.find((c) => c.id === 'contenedorBarrio');
    const high = containers.find((c) => c.id === 'bovedaPerdida');
    expect(getTrapPenalty(state, high, data)).toBeGreaterThan(getTrapPenalty(state, low, data));
  });

  it('el monto NO cambia con la Suerte: es costoInicial × trapPenaltyMult, fijo (la Suerte reduce la probabilidad, no el dolor)', () => {
    const container = containers.find((c) => c.id === 'bovedaPerdida');
    const lowLuck = freshState();
    const highLuck = freshState();
    highLuck.upgradeLevels.luck = 100;
    const expected = Math.max(1, container.costoInicial * container.trapPenaltyMult);
    expect(getTrapPenalty(lowLuck, container, data)).toBe(expected);
    expect(getTrapPenalty(highLuck, container, data)).toBe(expected);
  });

  it('nunca baja de 1 (piso mínimo, incluso en el contenedor gratis)', () => {
    const container = containers.find((c) => c.id === 'tachoVereda');
    const state = freshState();
    state.upgradeLevels.luck = 100000;
    expect(getTrapPenalty(state, container, data)).toBeGreaterThanOrEqual(1);
  });

  it('applyContainerResult descuenta exactamente getTrapPenalty en un resultado de trampa', () => {
    const state = freshState();
    const container = containers.find((c) => c.id === 'contenedorBarrio');
    state.money = 1_000_000;
    const expectedPenalty = getTrapPenalty(state, container, data);
    const { trapPenalty } = applyContainerResult(state, container, { isTrap: true, items: [], moneyDelta: 0 }, false, data);
    expect(trapPenalty).toBeCloseTo(expectedPenalty, 10);
    expect(state.money).toBeCloseTo(1_000_000 - expectedPenalty, 10);
  });
});

describe('PLAN.md §11.2 — Suerte recomendada por contenedor', () => {
  it('devuelve un número finito y no negativo para todos los contenedores', () => {
    const state = freshState();
    for (const container of containers) {
      const recommended = getRecommendedLuck(state, container, items, data);
      expect(Number.isFinite(recommended)).toBe(true);
      expect(recommended).toBeGreaterThanOrEqual(0);
    }
  });

  it('un contenedor más riesgoso/caro recomienda igual o más Suerte que uno de entrada', () => {
    const state = freshState();
    const easy = containers.find((c) => c.id === 'tachoVereda');
    const hard = containers.find((c) => c.id === 'bovedaPerdida');
    expect(getRecommendedLuck(state, hard, items, data)).toBeGreaterThanOrEqual(getRecommendedLuck(state, easy, items, data));
  });

  // Ronda 7: la recomendada es una META FIJA por contenedor, calculada contra un jugador
  // neutro. Antes usaba los multiplicadores actuales (niveles de contenedor, Fuerza, venta):
  // en una partida avanzada TODO colapsaba a "0 (alcanzada)" y el número dejaba de guiar.
  it('es independiente del estado del jugador: partida avanzada y partida fresca ven el mismo número', () => {
    const fresh = freshState();
    const advanced = freshState();
    advanced.upgradeLevels = { luck: 30, digPower: 20, area: 47, capacity: 3 };
    advanced.ownedContainers = { tachoVereda: 85, contenedorBarrio: 30, containerIndustrial: 15 };
    advanced.containerLevels = { tachoVereda: 7, contenedorBarrio: 4, containerIndustrial: 3 };
    advanced.automationOwned = { guantes: true };
    advanced.prestigeCount = 1;
    advanced.prestigeTreeLevels = {};
    for (const container of containers) {
      expect(getRecommendedLuck(advanced, container, items, data)).toBe(
        getRecommendedLuck(fresh, container, items, data)
      );
    }
  });
});

describe('PLAN.md §11.6 — recompensas de logros (una sola vez)', () => {
  it('otorga la recompensa de dinero al desbloquear, y no la repite en la siguiente revisión', () => {
    const state = freshState();
    const ctx = { allContainers: containers, allAutomations: automations };
    state.totalMoneyEarned = 1;
    const unlocked = checkAchievements(state, achievements, ctx);
    expect(unlocked).toContain('a1');
    const moneyAfterFirst = state.money;
    expect(moneyAfterFirst).toBeGreaterThan(0);
    const unlockedAgain = checkAchievements(state, achievements, ctx);
    expect(unlockedAgain).not.toContain('a1');
    expect(state.money).toBe(moneyAfterFirst);
  });

  it('otorga Llaves de Ciudad para los logros que declaran reward.type = "keys"', () => {
    const state = freshState();
    const ctx = { allContainers: containers, allAutomations: automations };
    state.prestigeCount = 1;
    const before = state.prestigeKeys;
    checkAchievements(state, achievements, ctx);
    const a22 = achievements.find((a) => a.id === 'a22');
    expect(state.prestigeKeys).toBe(before + a22.reward.amount);
  });
});

describe('PLAN.md §11.7 — dependencias reales del árbol de prestigio', () => {
  it('un nodo con requires no comprados está bloqueado', () => {
    const state = freshState();
    const node = prestigeTree.find((n) => n.id === 'instintoCarronero');
    expect(isPrestigeNodeUnlocked(state, node)).toBe(false);
    state.prestigeKeys = 1000;
    const result = buyPrestigeNode(state, node);
    expect(result.ok).toBe(false);
  });

  it('comprar el prerrequisito desbloquea el nodo dependiente', () => {
    const state = freshState();
    state.prestigeKeys = 1000;
    const capitalInicial = prestigeTree.find((n) => n.id === 'capitalInicial');
    const suerte = prestigeTree.find((n) => n.id === 'suerteAncestral');
    const instinto = prestigeTree.find((n) => n.id === 'instintoCarronero');
    expect(buyPrestigeNode(state, capitalInicial).ok).toBe(true);
    expect(buyPrestigeNode(state, suerte).ok).toBe(true);
    expect(isPrestigeNodeUnlocked(state, instinto)).toBe(true);
    expect(buyPrestigeNode(state, instinto).ok).toBe(true);
  });

  it('el nodo raíz (sin requires) siempre está desbloqueado', () => {
    const state = freshState();
    const root = prestigeTree.find((n) => n.id === 'capitalInicial');
    expect(isPrestigeNodeUnlocked(state, root)).toBe(true);
  });
});

describe('save v1 -> v2 migra sin perder partidas viejas', () => {
  it('un save v1 sin containerLevels/containerLevelProgress se acepta y se completa con {}', () => {
    const oldSave = freshState();
    oldSave.saveVersion = 1;
    oldSave.money = 12345;
    delete oldSave.containerLevels;
    delete oldSave.containerLevelProgress;
    const result = validateSave(oldSave);
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.money).toBe(12345);
    expect(result.data.containerLevels).toEqual({});
    expect(result.data.containerLevelProgress).toEqual({});
  });

  it('ida y vuelta de serialize/deserialize preserva niveles de contenedor', () => {
    const state = freshState();
    state.containerLevels.tachoVereda = 7;
    state.containerLevelProgress.tachoVereda = 2;
    const json = serializeState(state);
    const result = deserializeState(json);
    expect(result.ok).toBe(true);
    expect(result.state.containerLevels.tachoVereda).toBe(7);
    expect(result.state.containerLevelProgress.tachoVereda).toBe(2);
  });
});

describe('rollContainerResult usa el pool propio del contenedor (sanity end-to-end)', () => {
  it('los ítems devueltos siempre pertenecen al pool de ese contenedor', () => {
    const container = containers.find((c) => c.id === 'contenedorBarrio');
    const state = freshState();
    const random = seq([0.9, 0.1, 0.5, 0.1, 0.5, 0.1]); // evita trampa, alterna categoría/pick
    const result = rollContainerResult(state, container, false, items, data, random);
    expect(result.isTrap).toBe(false);
    const poolNames = new Set(items.containers[container.id].map((i) => i.name));
    for (const item of result.items) {
      expect(poolNames.has(item.name)).toBe(true);
    }
  });
});
