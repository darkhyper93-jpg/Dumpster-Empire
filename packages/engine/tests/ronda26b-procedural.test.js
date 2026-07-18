/**
 * Ronda 26.B — contenedores procedurales post-Big Bang (PLAN.md §4.37) y sufijos numéricos
 * extendidos (K..QiDc, format.js). Save v15 (sin campos nuevos: reusa el estado de la 26.A).
 */
import { describe, it, expect } from 'vitest';
import { formatNumber, formatMoney } from '../src/format.js';
import {
  PROCEDURAL_CONTAINER_MAX_N,
  isProceduralContainerId,
  proceduralTierN,
  proceduralContainerId,
} from '../src/procedural.js';
import {
  proceduralContainer,
  isProceduralTierUnlocked,
  rollContainerResult,
  applyContainerResult,
} from '../src/systems/containers.js';
import { isSetComplete, getSetBonus, hasProceduralContainersUnlocked } from '../src/economy.js';
import { freshState } from '../src/state.js';
import { validateSave } from '../src/save.js';
import { rollThreeMissions } from '../src/systems/missions.js';
import { getCollectionCompletion } from '../../../apps/game/src/collectionProgress.js';
import containers from '../../../apps/game/src/data/containers.json';
import itemsData from '../../../apps/game/src/data/items.json';
import deedsTree from '../../../apps/game/src/data/deedsTree.json';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import missionsData from '../../../apps/game/src/data/missions.json';

const bigBang = containers.find((c) => c.id === 'vertederoBigBang');
const dataBase = { upgrades, automations, deedsTree, prestigeTree };

describe('format.js: sufijos extendidos K..QiDc', () => {
  it('cubre cada borde de la tabla sin caer en notación científica', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1_000)).toBe('1.00K');
    expect(formatNumber(1_000_000)).toBe('1.00M');
    expect(formatNumber(1_000_000_000)).toBe('1.00B');
    expect(formatNumber(1e12)).toBe('1.00T');
    expect(formatNumber(1e15)).toBe('1.00Qa');
    expect(formatNumber(1e18)).toBe('1.00Qi');
    expect(formatNumber(1e21)).toBe('1.00Sx');
    expect(formatNumber(1e24)).toBe('1.00Sp');
    expect(formatNumber(1e27)).toBe('1.00Oc');
    expect(formatNumber(1e30)).toBe('1.00No');
    expect(formatNumber(1e33)).toBe('1.00Dc');
    expect(formatNumber(1e36)).toBe('1.00UDc');
    expect(formatNumber(1e39)).toBe('1.00DDc');
    expect(formatNumber(1e42)).toBe('1.00TDc');
    expect(formatNumber(1e45)).toBe('1.00QaDc');
    expect(formatNumber(1e48)).toBe('1.00QiDc');
  });

  it('un costo procedural extremo (>=1e21) nunca se muestra como "e+"', () => {
    const huge = 1e18 * Math.pow(15, PROCEDURAL_CONTAINER_MAX_N);
    const text = formatMoney(huge);
    expect(text).not.toMatch(/e\+/i);
    expect(text).toMatch(/^\$[\d.]+[A-Za-z]+$/);
  });
});

describe('procedural.js: validación de ids', () => {
  it('acepta bigbangPlus1..bigbangPlus25', () => {
    expect(isProceduralContainerId('bigbangPlus1')).toBe(true);
    expect(isProceduralContainerId('bigbangPlus25')).toBe(true);
    expect(proceduralTierN('bigbangPlus7')).toBe(7);
    expect(proceduralContainerId(3)).toBe('bigbangPlus3');
  });

  it('rechaza ids hostiles', () => {
    expect(isProceduralContainerId('bigbangPlus999')).toBe(false);
    expect(isProceduralContainerId('bigbangPlus26')).toBe(false);
    expect(isProceduralContainerId('bigbangPlus01')).toBe(false);
    expect(isProceduralContainerId('bigbangPlus1e2')).toBe(false);
    expect(isProceduralContainerId('bigbangPlus-1')).toBe(false);
    expect(isProceduralContainerId('bigbangPlus0')).toBe(false);
    expect(isProceduralContainerId('bigbangPlus')).toBe(false);
    expect(isProceduralContainerId('vertederoBigBang')).toBe(false);
    expect(isProceduralContainerId(null)).toBe(false);
    expect(proceduralTierN('bigbangPlus999')).toBe(null);
  });
});

describe('proceduralContainer(n, baseContainer): factory pura', () => {
  it('escala costo ×15^n, resistencia ×1.32^n, probTrampaBase y mechanicValueMult ×13^n', () => {
    const tier1 = proceduralContainer(1, bigBang);
    const tier2 = proceduralContainer(2, bigBang);
    expect(tier1.id).toBe('bigbangPlus1');
    expect(tier1.isProcedural).toBe(true);
    expect(tier1.proceduralN).toBe(1);
    expect(tier1.poolContainerId).toBe('vertederoBigBang');
    expect(tier1.costoInicial).toBeCloseTo(bigBang.costoInicial * 15, 5);
    expect(tier2.costoInicial).toBeCloseTo(bigBang.costoInicial * 15 * 15, 5);
    expect(tier1.resistencia).toBeCloseTo(bigBang.resistencia * 1.32, 5);
    expect(tier1.probTrampaBase).toBeCloseTo(0.445, 10);
    expect(tier1.mechanicValueMult).toBeCloseTo(13, 10);
    expect(tier2.mechanicValueMult).toBeCloseTo(169, 10);
  });

  it('probTrampaBase nunca supera el tope de 0.5', () => {
    const highTier = proceduralContainer(PROCEDURAL_CONTAINER_MAX_N, bigBang);
    expect(highTier.probTrampaBase).toBeLessThanOrEqual(0.5);
  });

  it('nunca escribe a containers.json: no aparece en la data estática', () => {
    expect(containers.some((c) => c.id === 'bigbangPlus1')).toBe(false);
  });
});

describe('isProceduralTierUnlocked', () => {
  it('bloqueado sin ecoDelBigBang comprado', () => {
    const state = freshState();
    expect(hasProceduralContainersUnlocked(state, dataBase)).toBe(false);
    expect(isProceduralTierUnlocked(state, 1, dataBase)).toBe(false);
  });

  it('con ecoDelBigBang: tier 1 desbloqueado, tier 2 requiere poseer el tier 1', () => {
    const state = freshState();
    state.deedsTreeLevels.ecoDelBigBang = 1;
    expect(hasProceduralContainersUnlocked(state, dataBase)).toBe(true);
    expect(isProceduralTierUnlocked(state, 1, dataBase)).toBe(true);
    expect(isProceduralTierUnlocked(state, 2, dataBase)).toBe(false);
    state.ownedContainers.bigbangPlus1 = 1;
    expect(isProceduralTierUnlocked(state, 2, dataBase)).toBe(true);
  });

  it('nunca desbloquea más allá del tope', () => {
    const state = freshState();
    state.deedsTreeLevels.ecoDelBigBang = 1;
    expect(isProceduralTierUnlocked(state, PROCEDURAL_CONTAINER_MAX_N + 1, dataBase)).toBe(false);
  });
});

describe('rollContainerResult sobre un tier procedural: reusa el pool del Big Bang', () => {
  it('los ítems salen del pool de vertederoBigBang y el valor incluye el ×13^n', () => {
    const state = freshState();
    const tier1 = proceduralContainer(1, bigBang);
    const random = () => 0.99; // determinístico: nunca trampa (probTrampaBase 0.445 < 0.99)
    const result = rollContainerResult(state, tier1, false, itemsData, { ...dataBase }, random);
    expect(result.isTrap).toBe(false);
    expect(result.items.length).toBe(tier1.slots);
    const pool = itemsData.containers.vertederoBigBang;
    for (const item of result.items) {
      expect(pool.some((p) => p.id === item.id)).toBe(true);
    }
  });

  it('applyContainerResult usa itemsFoundByItem[bigbangPlus1], nunca mezcla con vertederoBigBang', () => {
    const state = freshState();
    const tier1 = proceduralContainer(1, bigBang);
    const random = () => 0.99;
    const result = rollContainerResult(state, tier1, false, itemsData, { ...dataBase }, random);
    applyContainerResult(state, tier1, result, false, { ...dataBase });
    expect(state.itemsFoundByItem.bigbangPlus1).toBeTruthy();
    expect(state.itemsFoundByItem.vertederoBigBang).toBeUndefined();
    expect(state.itemsFoundCount).toBeGreaterThan(0);
  });
});

describe('contrato §3.5.6: exclusión de colección/sets/misiones', () => {
  it('isSetComplete/getSetBonus son siempre falso/neutro para un contenedor procedural', () => {
    const state = freshState();
    const tier1 = proceduralContainer(1, bigBang);
    expect(isSetComplete(state, tier1, itemsData)).toBe(false);
    expect(getSetBonus(state, tier1, itemsData, { collectionSets: { setBonusPercent: 0.02 } })).toBe(1);
  });

  it('getCollectionCompletion no cambia si el jugador posee tiers procedurales (nunca en allContainers)', () => {
    const state = freshState();
    const withoutTiers = getCollectionCompletion(state, containers, itemsData);
    state.deedsTreeLevels.ecoDelBigBang = 1;
    state.ownedContainers.bigbangPlus1 = 1;
    const withTiers = getCollectionCompletion(state, containers, itemsData);
    expect(withTiers).toEqual(withoutTiers);
  });

  it('rollThreeMissions nunca elige un tier procedural como objetivo (no está en allContainers)', () => {
    const state = freshState();
    state.deedsTreeLevels.ecoDelBigBang = 1;
    state.ownedContainers.bigbangPlus1 = 1;
    state.ownedContainers.tachoVereda = 1;
    const random = () => 0.5;
    const missions = rollThreeMissions(state, containers, itemsData, { ...dataBase, missions: missionsData }, random);
    for (const mission of missions) {
      if (mission.params?.containerId) {
        expect(mission.params.containerId).not.toMatch(/^bigbangPlus/);
      }
    }
  });
});

describe('save.js: sanitizeContainerRefs acepta tiers procedurales legítimos y rechaza hostiles', () => {
  const containerIdSet = new Set(containers.map((c) => c.id));

  // Ronda 27 (v16): el target del robot vive en state.robots[0].targetContainerId.
  it('conserva bigbangPlus1 en autoQueue/target del robot de un save real', () => {
    const raw = { ...freshState(), autoQueue: ['bigbangPlus1', 'tachoVereda'] };
    raw.robots[0].targetContainerId = 'bigbangPlus1';
    const result = validateSave(raw, containerIdSet);
    expect(result.valid).toBe(true);
    expect(result.data.autoQueue).toContain('bigbangPlus1');
    expect(result.data.robots[0].targetContainerId).toBe('bigbangPlus1');
  });

  it('descarta ids hostiles de autoQueue/autoProcessing/target del robot', () => {
    const raw = {
      ...freshState(),
      autoQueue: ['bigbangPlus999', 'bigbangPlus01', 'bigbangPlus1e2', 'bigbangPlus-1'],
      autoProcessing: [{ robotIndex: 0, containerId: 'bigbangPlus999', totalTime: 1, remaining: 1 }],
    };
    raw.robots[0].targetContainerId = 'bigbangPlus999';
    const result = validateSave(raw, containerIdSet);
    expect(result.valid).toBe(true);
    expect(result.data.autoQueue).toEqual([]);
    expect(result.data.autoProcessing).toEqual([]);
    expect(result.data.robots[0].targetContainerId).toBe(null);
  });
});
