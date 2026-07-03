import { describe, it, expect } from 'vitest';
import {
  upgradeCost,
  containerCost,
  prestigeKeysEarned,
  trapProbability,
  getLuck,
  getDigPowerMult,
  getRevealThreshold,
  getDepthValueMult,
  getAreaMult,
  getQueueMax,
  getDigRate,
} from '../src/economy.js';
import { freshState } from '../src/state.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';

const data = { upgrades, automations, prestigeTree };

describe('§4.1 costo de mejoras repetibles', () => {
  for (const upgrade of upgrades) {
    it(`${upgrade.id}: primeros 10 niveles siguen costoBase * factorCrecimiento^nivel`, () => {
      for (let nivel = 0; nivel < 10; nivel++) {
        const expected = Math.ceil(upgrade.costoBase * Math.pow(upgrade.factorCrecimiento, nivel));
        expect(upgradeCost(upgrade.costoBase, upgrade.factorCrecimiento, nivel)).toBe(expected);
      }
    });
  }

  // AJUSTE (Fase 9, PLAN.md §3/§4.1): §4.1 fija 1.13 como el valor "por defecto" de
  // factorCrecimiento para Suerte/Fuerza/Área. El pase de balance headless (agentes/scripts/
  // sim-pace.mjs) mostró que a 1.13 la Suerte se vuelve prohibitiva pasado el nivel ~30 y el
  // primer Prestigio (PLAN.md §3, hito de 1.5-3h) nunca se alcanza en simulación. Se bajó SOLO
  // el de Suerte a 1.12 — digPower/área quedan en el default 1.13 (no gatean ningún hito de ritmo).
  it('usa 1.12 para Suerte (ajuste de balance), 1.13 para Fuerza/Área y 1.22 para capacidad', () => {
    expect(upgrades.find((u) => u.id === 'luck').factorCrecimiento).toBe(1.12);
    expect(upgrades.find((u) => u.id === 'digPower').factorCrecimiento).toBe(1.13);
    expect(upgrades.find((u) => u.id === 'area').factorCrecimiento).toBe(1.13);
    expect(upgrades.find((u) => u.id === 'capacity').factorCrecimiento).toBe(1.22);
  });
});

describe('§4.2 costo de contenedores adicionales', () => {
  for (const container of containers) {
    it(`${container.id}: primeras 10 unidades siguen costoInicial * 1.08^cantidad`, () => {
      for (let cantidad = 0; cantidad < 10; cantidad++) {
        const expected = Math.ceil(container.costoInicial * Math.pow(1.08, cantidad));
        expect(containerCost(container.costoInicial, cantidad)).toBe(expected);
      }
    });
  }
});

describe('§4.3 llaves de Ciudad al prestigiar', () => {
  it('da 0 llaves por debajo del umbral de 1e9', () => {
    expect(prestigeKeysEarned(0)).toBe(0);
    expect(prestigeKeysEarned(999_999_999)).toBe(0);
  });

  it('en el umbral exacto (dineroTotalGanado = 1e9) da floor(sqrt(1)*10) = 10', () => {
    expect(prestigeKeysEarned(1_000_000_000)).toBe(10);
  });

  it('el piso de 1 llave nunca se cruza para valores que cumplen el umbral', () => {
    // Para cualquier dineroTotalGanado >= 1e9, sqrt(dinero/1e9) >= 1, así que floor(...*10) >= 10 > 1.
    // El max(1, ...) de la fórmula es una red de seguridad explícita del PLAN, se prueba igual.
    expect(prestigeKeysEarned(1_000_000_000)).toBeGreaterThanOrEqual(1);
  });

  for (const dineroTotalGanado of [1e9, 4e9, 1e10, 1e11, 1e12, 5e13]) {
    it(`dineroTotalGanado=${dineroTotalGanado}: floor(sqrt(dinero/1e9)*10)`, () => {
      const expected = Math.max(1, Math.floor(Math.sqrt(dineroTotalGanado / 1_000_000_000) * 10));
      expect(prestigeKeysEarned(dineroTotalGanado)).toBe(expected);
    });
  }

  it('crece sub-linealmente (duplicar dinero no duplica llaves)', () => {
    const base = prestigeKeysEarned(1e10);
    const doble = prestigeKeysEarned(2e10);
    expect(doble).toBeLessThan(base * 2);
  });
});

describe('§4.6 probabilidad de trampa', () => {
  it('nunca baja de 0.01 sin importar la suerte', () => {
    expect(trapProbability(0.05, 1000)).toBe(0.01);
    expect(trapProbability(0.3, 10000)).toBe(0.01);
  });

  it('literal: max(0.01, base - suerte*0.002)', () => {
    expect(trapProbability(0.2, 10)).toBeCloseTo(0.18, 10);
    expect(trapProbability(0.3, 50)).toBeCloseTo(0.2, 10);
  });
});

describe('rediseño de stats (PLAN.md §2.3): cada stat mueve un número distinto', () => {
  it('Suerte sube con el nivel de la mejora', () => {
    const state = freshState();
    const before = getLuck(state, data);
    state.upgradeLevels.luck = 5;
    const after = getLuck(state, data);
    expect(after).toBeGreaterThan(before);
  });

  it('Fuerza baja el umbral de revelado y sube el bonus de valor por profundidad', () => {
    const state = freshState();
    const thresholdBefore = getRevealThreshold(state, data);
    const depthBefore = getDepthValueMult(state, data);
    state.upgradeLevels.digPower = 20;
    const thresholdAfter = getRevealThreshold(state, data);
    const depthAfter = getDepthValueMult(state, data);
    expect(thresholdAfter).toBeLessThan(thresholdBefore);
    expect(depthAfter).toBeGreaterThan(depthBefore);
  });

  it('el ritmo de escarbado (getDigRate) sube hacia 1 a medida que sube la Fuerza, contra un contenedor de alta resistencia (agentes/rework-escarbado-y-landing-prompt.md)', () => {
    const highResistance = containers.reduce((max, c) => (c.resistencia > max.resistencia ? c : max));
    const low = freshState();
    const mid = freshState();
    mid.upgradeLevels.digPower = 10;
    const high = freshState();
    high.upgradeLevels.digPower = 40;
    const rateLow = getDigRate(low, highResistance, data);
    const rateMid = getDigRate(mid, highResistance, data);
    const rateHigh = getDigRate(high, highResistance, data);
    expect(rateLow).toBeLessThan(rateMid);
    expect(rateMid).toBeLessThanOrEqual(rateHigh);
    expect(rateHigh).toBeLessThanOrEqual(1);
  });

  it('Área es independiente de Fuerza (no quedan redundantes)', () => {
    const state = freshState();
    state.upgradeLevels.digPower = 20;
    const areaWithDigPower = getAreaMult(state, data);
    const state2 = freshState();
    state2.upgradeLevels.area = 20;
    const areaWithAreaLevel = getAreaMult(state2, data);
    expect(areaWithDigPower).toBe(1); // Fuerza no mueve Área
    expect(areaWithAreaLevel).toBeGreaterThan(areaWithDigPower); // Área sí mueve Área
  });

  it('Capacidad sube la cola máxima de automatización', () => {
    const state = freshState();
    const before = getQueueMax(state, data);
    state.upgradeLevels.capacity = 3;
    const after = getQueueMax(state, data);
    expect(after).toBeGreaterThan(before);
  });
});

describe('getDigPowerMult compone automatización y prestigio', () => {
  it('guantes (+20%) y Brazos de Acero (+8%/nivel) multiplican sobre la base', () => {
    const state = freshState();
    const base = getDigPowerMult(state, data);
    state.automationOwned.guantes = true;
    const withGuantes = getDigPowerMult(state, data);
    expect(withGuantes).toBeCloseTo(base * 1.2, 10);
    state.prestigeTreeLevels.brazosDeAcero = 2;
    const withPrestige = getDigPowerMult(state, data);
    expect(withPrestige).toBeCloseTo(withGuantes * 1.16, 10);
  });
});
