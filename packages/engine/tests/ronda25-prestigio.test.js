/**
 * Ronda 25 — prestigio profundo: especializaciones (§4.31), desafíos (§4.32) y nodos infinitos
 * del árbol de prestigio (§4.33). Save v14.
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave } from '../src/save.js';
import {
  getSellMult,
  getLuck,
  getDigPowerMult,
  getEffectiveTrapProbability,
  resolveMarketFluctuation,
  activeChallengeModifier,
} from '../src/economy.js';
import { doPrestige, buyPrestigeNode, nextPrestigeNodeCost } from '../src/systems/prestige.js';
import { buyAutomation } from '../src/systems/automation.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import specializations from '../../../apps/game/src/data/specializations.json';
import challenges from '../../../apps/game/src/data/challenges.json';

const dataBase = { upgrades, automations, prestigeTree };
const dataFull = { ...dataBase, specializations, challenges };

function primedState(money = 2_000_000_000) {
  const state = freshState();
  state.money = money;
  state.totalMoneyEarned = money;
  return state;
}

describe('save v14: prestigio profundo', () => {
  // AJUSTE (ronda 26): SAVE_VERSION ya no es 14 (bump a 15 por la Mudanza de Galaxia,
  // ronda26-lategame.test.js) — se recuenta desde el import en vez de un literal roto por el
  // bump, mismo patrón que dejaron las rondas 24/25 en sus propios tests anteriores.
  it('SAVE_VERSION >= 14 y freshState trae los campos nuevos de la ronda 25', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(14);
    const state = freshState();
    expect(state.specialization).toBeNull();
    expect(state.activeChallenge).toBeNull();
    expect(state.challengesCompleted).toEqual([]);
    expect(state.specializationsUsed).toBe(0);
    expect(state.totalKeysEarned).toBe(0);
  });

  it('migra un save v13 sin campos nuevos rellenándolos con los defaults', () => {
    const v13 = { ...freshState(), saveVersion: 13, prestigeKeys: 7 };
    delete v13.specialization;
    delete v13.activeChallenge;
    delete v13.challengesCompleted;
    delete v13.specializationsUsed;
    delete v13.totalKeysEarned;
    const result = validateSave(v13, undefined, undefined, prestigeTree);
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.specialization).toBeNull();
    expect(result.data.activeChallenge).toBeNull();
    expect(result.data.challengesCompleted).toEqual([]);
    expect(result.data.specializationsUsed).toBe(0);
    // Sin niveles comprados en el árbol: totalKeysEarned = prestigeKeys (7) + 0 invertido.
    expect(result.data.totalKeysEarned).toBe(7);
  });

  it('backfillea totalKeysEarned sumando el costo ya invertido en prestigeTreeLevels', () => {
    const v13 = { ...freshState(), saveVersion: 13, prestigeKeys: 3, prestigeTreeLevels: { capitalInicial: 2 } };
    delete v13.totalKeysEarned;
    const result = validateSave(v13, undefined, undefined, prestigeTree);
    // capitalInicial: costoBase 1, factor 1.5 -> nivel0: ceil(1*1.5^0)=1, nivel1: ceil(1*1.5^1)=2 => 3
    expect(result.data.totalKeysEarned).toBe(3 + 3);
  });

  it('sin prestigeTreeData, totalKeysEarned backfillea solo con prestigeKeys (subestima, nunca crashea)', () => {
    const v13 = { ...freshState(), saveVersion: 13, prestigeKeys: 5, prestigeTreeLevels: { capitalInicial: 2 } };
    delete v13.totalKeysEarned;
    const result = validateSave(v13);
    expect(result.valid).toBe(true);
    expect(result.data.totalKeysEarned).toBe(5);
  });

  it('rechaza un save con specialization y activeChallenge seteados a la vez (excluyentes)', () => {
    const bad = { ...freshState(), specialization: 'coleccionista', activeChallenge: 'campoMinado' };
    const result = validateSave(bad);
    expect(result.valid).toBe(false);
  });

  it('rechaza un save con specialization de tipo inválido', () => {
    const bad = { ...freshState(), specialization: 42 };
    const result = validateSave(bad);
    expect(result.valid).toBe(false);
  });

  it('rechaza un save con totalKeysEarned negativo', () => {
    const bad = { ...freshState(), totalKeysEarned: -1 };
    const result = validateSave(bad);
    expect(result.valid).toBe(false);
  });
});

describe('§4.31 — especializaciones: sellMult', () => {
  it('sin especialización, sellMult no cambia (neutro)', () => {
    const state = freshState();
    expect(getSellMult(state, 'antiques', dataFull)).toBe(1);
  });

  it('coleccionista: ×1.5 en antiques/art/relics, ×0.85 en el resto', () => {
    const state = freshState();
    state.specialization = 'coleccionista';
    expect(getSellMult(state, 'antiques', dataFull)).toBeCloseTo(1.5);
    expect(getSellMult(state, 'art', dataFull)).toBeCloseTo(1.5);
    expect(getSellMult(state, 'relics', dataFull)).toBeCloseTo(1.5);
    expect(getSellMult(state, 'common', dataFull)).toBeCloseTo(0.85);
    expect(getSellMult(state, 'future', dataFull)).toBeCloseTo(0.85);
  });

  it('chatarrero: ×1.5 en common/reusable/electronics, ×0.85 en el resto', () => {
    const state = freshState();
    state.specialization = 'chatarrero';
    expect(getSellMult(state, 'common', dataFull)).toBeCloseTo(1.5);
    expect(getSellMult(state, 'reusable', dataFull)).toBeCloseTo(1.5);
    expect(getSellMult(state, 'electronics', dataFull)).toBeCloseTo(1.5);
    expect(getSellMult(state, 'art', dataFull)).toBeCloseTo(0.85);
  });

  it('sin data.specializations, no rompe (opcional, comportamiento previo intacto)', () => {
    const state = freshState();
    state.specialization = 'coleccionista';
    expect(getSellMult(state, 'antiques', dataBase)).toBe(1);
  });
});

describe('§4.31/§4.32 — el flujo de prestigio elige/expira especialización o desafío', () => {
  it('doPrestige sin choice deja specialization/activeChallenge en null ("Sin especialización")', () => {
    const state = primedState();
    const result = doPrestige(state, dataFull);
    expect(result.ok).toBe(true);
    expect(state.specialization).toBeNull();
    expect(state.activeChallenge).toBeNull();
  });

  it('doPrestige con choice de especialización la aplica DESPUÉS del reset (sobrevive) y cuenta specializationsUsed', () => {
    const state = primedState();
    doPrestige(state, dataFull, { type: 'specialization', id: 'chatarrero' });
    expect(state.specialization).toBe('chatarrero');
    expect(state.activeChallenge).toBeNull();
    expect(state.specializationsUsed).toBe(1);
    // sobrevive al reset de la run que arranca (no la vuelve a pisar un segundo notify/tick)
    expect(state.upgradeLevels.luck).toBe(0);
  });

  it('doPrestige con choice de desafío la aplica y es excluyente de especialización', () => {
    const state = primedState();
    doPrestige(state, dataFull, { type: 'challenge', id: 'campoMinado' });
    expect(state.activeChallenge).toBe('campoMinado');
    expect(state.specialization).toBeNull();
    expect(state.specializationsUsed).toBe(0);
  });

  it('un id de especialización/desafío desconocido no se aplica (queda "Sin especialización")', () => {
    const state = primedState();
    doPrestige(state, dataFull, { type: 'specialization', id: 'inventado' });
    expect(state.specialization).toBeNull();
  });

  it('doPrestige acumula totalKeysEarned (histórico, nunca se resetea)', () => {
    const state = primedState();
    const before = state.totalKeysEarned;
    const { keysEarned } = doPrestige(state, dataFull);
    expect(state.totalKeysEarned).toBe(before + keysEarned);
    expect(keysEarned).toBeGreaterThan(0);
  });
});

describe('§4.32 — desafíos: goal chequeado al prestigiar, recompensa permanente única', () => {
  it('campoMinado (goal "always"): prestigiar con el desafío activo lo completa y otorga +1 Suerte flat', () => {
    const state = primedState();
    state.activeChallenge = 'campoMinado';
    const luckBefore = getLuck(state, dataFull);
    doPrestige(state, dataFull); // prestigia SIN re-elegir el desafío para la próxima run
    expect(state.challengesCompleted).toContain('campoMinado');
    expect(getLuck(state, dataFull)).toBeCloseTo(luckBefore + 1);
  });

  it('pulsoDebil (goal "always"): completarlo otorga +10% Fuerza permanente', () => {
    const state = primedState();
    state.activeChallenge = 'pulsoDebil';
    doPrestige(state, dataFull);
    expect(state.challengesCompleted).toContain('pulsoDebil');
    const digPowerAfter = getDigPowerMult(state, dataFull);
    const neutral = freshState();
    // sin el modificador activo (ya no está activo tras el prestigio) pero con la recompensa +10%
    expect(digPowerAfter).toBeCloseTo(getDigPowerMult(neutral, dataFull) * 1.1);
  });

  it('manosVacias: su goal (1e9) coincide con el umbral base de prestigio, así que se completa apenas se prestigia', () => {
    const state = primedState(1_000_000_000); // exactamente el umbral de prestigio Y del goal
    state.activeChallenge = 'manosVacias';
    doPrestige(state, dataFull);
    expect(state.challengesCompleted).toContain('manosVacias');
  });

  it('mercadoNegro: goal 1e10 no se cumple si solo se llegó al umbral base de prestigio (1e9)', () => {
    const state = primedState(1_000_000_000);
    state.activeChallenge = 'mercadoNegro';
    doPrestige(state, dataFull);
    expect(state.challengesCompleted).not.toContain('mercadoNegro');
  });

  it('mercadoNegro: se completa con totalMoneyEarned >= 1e10 y sube el piso de fluctuación', () => {
    const state = primedState(10_000_000_000);
    state.activeChallenge = 'mercadoNegro';
    doPrestige(state, dataFull);
    expect(state.challengesCompleted).toContain('mercadoNegro');
    state.marketFluctuationAt = 0; // fuerza el refresh
    const many = Array.from({ length: 200 }, () => {
      state.marketFluctuationAt = 0;
      return resolveMarketFluctuation(state, dataFull, 100000, Math.random).marketFluctuation;
    });
    expect(Math.min(...many)).toBeGreaterThanOrEqual(0.95);
  });

  it('un desafío completado no repite su recompensa (sin recompensa doble)', () => {
    const state = primedState();
    state.activeChallenge = 'campoMinado';
    doPrestige(state, dataFull); // completa campoMinado
    state.money = 2_000_000_000;
    state.totalMoneyEarned = 2_000_000_000;
    state.activeChallenge = 'campoMinado'; // se elige de nuevo
    doPrestige(state, dataFull); // ya estaba completo
    const count = state.challengesCompleted.filter((id) => id === 'campoMinado').length;
    expect(count).toBe(1);
  });
});

describe('§4.32 — modificadores ACTIVOS de desafío (solo durante la run)', () => {
  it('manosVacias activo: buyAutomation se rechaza', () => {
    const state = freshState();
    state.money = 1_000_000;
    state.activeChallenge = 'manosVacias';
    const automation = automations[0];
    const result = buyAutomation(state, automation, dataFull);
    expect(result.ok).toBe(false);
    expect(state.automationOwned[automation.id]).toBeFalsy();
  });

  it('sin manosVacias activo, buyAutomation funciona normalmente', () => {
    const state = freshState();
    const automation = automations[0];
    state.money = automation.cost;
    const result = buyAutomation(state, automation, dataFull);
    expect(result.ok).toBe(true);
  });

  it('campoMinado activo: la probabilidad de trampa se dobla y clampa a 0.95', () => {
    const state = freshState();
    const container = containers[0];
    const base = getEffectiveTrapProbability(state, container, false, dataFull);
    state.activeChallenge = 'campoMinado';
    const doubled = getEffectiveTrapProbability(state, container, false, dataFull);
    expect(doubled).toBeCloseTo(Math.min(0.95, base * 2));
  });

  it('pulsoDebil activo: Fuerza de Escarbado a la mitad', () => {
    const state = freshState();
    const base = getDigPowerMult(state, dataFull);
    state.activeChallenge = 'pulsoDebil';
    expect(getDigPowerMult(state, dataFull)).toBeCloseTo(base * 0.5);
  });

  it('mercadoNegro activo: la fluctuación de mercado queda fija en 0.8 (no randomiza)', () => {
    const state = freshState();
    state.activeChallenge = 'mercadoNegro';
    const results = Array.from({ length: 20 }, () => {
      const r = resolveMarketFluctuation(state, dataFull, Date.now() + Math.random() * 1e6, Math.random);
      return r.marketFluctuation;
    });
    expect(results.every((v) => v === 0.8)).toBe(true);
  });

  it('activeChallengeModifier devuelve null sin desafío activo o sin data.challenges', () => {
    const state = freshState();
    expect(activeChallengeModifier(state, dataFull, 'trapProbMultiplier')).toBeNull();
    state.activeChallenge = 'campoMinado';
    expect(activeChallengeModifier(state, dataBase, 'trapProbMultiplier')).toBeNull();
  });
});

describe('§4.33 — nodos infinitos del árbol de prestigio', () => {
  const infiniteIds = ['codiciaEterna', 'paladaEterna', 'imanDeSuerte'];

  it('los 3 nodos infinitos existen sin nivelMaximo', () => {
    for (const id of infiniteIds) {
      const node = prestigeTree.find((n) => n.id === id);
      expect(node).toBeTruthy();
      expect(node.nivelMaximo).toBeUndefined();
    }
  });

  it('nunca topean: comprar muchos niveles sigue funcionando', () => {
    const node = prestigeTree.find((n) => n.id === 'codiciaEterna');
    const state = freshState();
    state.prestigeTreeLevels.tasadorExperto = 1; // prerrequisito de codiciaEterna
    state.prestigeKeys = 1e9;
    for (let i = 0; i < 15; i++) {
      const result = buyPrestigeNode(state, node);
      expect(result.ok).toBe(true);
    }
    expect(state.prestigeTreeLevels.codiciaEterna).toBe(15);
  });

  it('el costo sigue creciendo geométricamente sin tope', () => {
    const node = prestigeTree.find((n) => n.id === 'paladaEterna');
    const state = freshState();
    state.prestigeTreeLevels.brazosDeAcero = 1;
    state.prestigeTreeLevels.paladaEterna = 20;
    const cost = nextPrestigeNodeCost(state, node);
    expect(cost).toBeGreaterThan(node.costoBase);
  });

  it('imanDeSuerte suma Suerte FLAT por nivel (no porcentaje)', () => {
    const state = freshState();
    state.prestigeTreeLevels.suerteAncestral = 1;
    state.prestigeTreeLevels.imanDeSuerte = 4;
    const withNode = getLuck(state, dataFull);
    state.prestigeTreeLevels.imanDeSuerte = 0;
    const without = getLuck(state, dataFull);
    expect(withNode).toBeCloseTo(without + 4);
  });
});
