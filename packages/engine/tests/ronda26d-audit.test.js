/**
 * Ronda 26.D — auditoría (Verif&Audit.md) sobre el diff de la ronda 26. Cubre los focos del
 * roadmap §26.D que 26.A/26.B dejaron abiertos:
 * 1. La factory procedural con `n` hostil (0, negativo, 1e9, NaN, fraccionario) — rechazo.
 * 2. Overflow de la fórmula de Escrituras con contadores manipulados pero VÁLIDOS (finitos):
 *    sin guard, `deeds: Infinity` se serializa como `null` y el próximo boot rechaza el save
 *    entero (wipe de la partida).
 * 3. Coherencia de save (regla dura §1.13 de ROADMAPv4): `totalKeysEarnedRun <= totalKeysEarned`
 *    y `prestigeCount` entero >= 0 — ambos inputs de la fórmula de Escrituras.
 * (El foco "mudanza durante desafío activo" ya quedó cubierto por 26.A en
 * ronda26-lategame.test.js, "el desafío activo se CANCELA sin evaluar su goal".)
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { validateSave } from '../src/save.js';
import { proceduralContainer } from '../src/systems/containers.js';
import { PROCEDURAL_CONTAINER_MAX_N } from '../src/procedural.js';
import { galaxyMoveDeedsPreview, doGalaxyMove } from '../src/systems/prestige.js';
import containers from '../../../apps/game/src/data/containers.json';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import deedsTree from '../../../apps/game/src/data/deedsTree.json';

const bigBang = containers.find((c) => c.id === 'vertederoBigBang');
const dataFull = { upgrades, automations, prestigeTree, deedsTree };

/** Estado válido (coherente) listo para mudarse, con contadores configurables. */
function movableState({ prestigeCount = 10, totalKeysEarnedRun = 300 } = {}) {
  const state = freshState();
  state.prestigeCount = prestigeCount;
  state.totalKeysEarnedRun = totalKeysEarnedRun;
  // Coherencia: todo save legítimo cumple run <= total (se incrementan juntos en doPrestige).
  state.totalKeysEarned = totalKeysEarnedRun;
  return state;
}

describe('26.D — proceduralContainer(n) rechaza n hostil (foco 1 del roadmap)', () => {
  it('rechaza 0, negativos, fraccionarios, gigantes y NaN con RangeError', () => {
    for (const hostile of [0, -1, 1.5, 1e9, PROCEDURAL_CONTAINER_MAX_N + 1, NaN, Infinity, '3']) {
      expect(() => proceduralContainer(hostile, bigBang), `n=${String(hostile)}`).toThrow(RangeError);
    }
  });

  it('sigue aceptando los bordes válidos 1 y PROCEDURAL_CONTAINER_MAX_N', () => {
    expect(proceduralContainer(1, bigBang).id).toBe('bigbangPlus1');
    const top = proceduralContainer(PROCEDURAL_CONTAINER_MAX_N, bigBang);
    expect(top.proceduralN).toBe(PROCEDURAL_CONTAINER_MAX_N);
    expect(Number.isFinite(top.costoInicial)).toBe(true);
  });
});

describe('26.D — overflow de Escrituras con contadores finitos pero astronómicos (focos 3 y 4)', () => {
  it('galaxyMoveDeedsPreview queda finito aunque prestigeCount × totalKeysEarnedRun desborde float64', () => {
    // 1e308 × 1e308 = Infinity como producto directo, pero ambos campos son FINITOS y pasan
    // la validación del save — el guard tiene que vivir en la fórmula, no en validateSave.
    const state = movableState({ prestigeCount: 1e308, totalKeysEarnedRun: 1e308 });
    const preview = galaxyMoveDeedsPreview(state);
    expect(Number.isFinite(preview)).toBe(true);
    expect(preview).toBeGreaterThanOrEqual(1);
  });

  it('la fórmula literal de PLAN.md §4.35 no cambia en el rango normal', () => {
    // sqrt(10*300)=54.77 / 5 = 10.95 -> floor 10 (mismo caso de referencia que 26.A)
    expect(galaxyMoveDeedsPreview(movableState({ prestigeCount: 10, totalKeysEarnedRun: 300 }))).toBe(10);
  });

  it('doGalaxyMove nunca deja deeds no finito: el save resultante sigue siendo válido (sin wipe)', () => {
    const state = movableState({ prestigeCount: 1e308, totalKeysEarnedRun: 1e308 });
    const result = doGalaxyMove(state, dataFull);
    expect(result.ok).toBe(true);
    expect(Number.isFinite(state.deeds)).toBe(true);
    // El escenario del wipe: deeds Infinity -> JSON.stringify lo vuelve null -> el próximo
    // boot rechaza el save entero y cae a freshState. Con el guard, el round-trip sobrevive.
    const roundTrip = validateSave(JSON.parse(JSON.stringify(state)), undefined, undefined, prestigeTree);
    expect(roundTrip.valid).toBe(true);
  });

  it('deeds se clampea a Number.MAX_VALUE si la acumulación desborda (deeds previo astronómico)', () => {
    const state = movableState({ prestigeCount: 1e308, totalKeysEarnedRun: 1e308 });
    state.deeds = Number.MAX_VALUE;
    const result = doGalaxyMove(state, dataFull);
    expect(result.ok).toBe(true);
    expect(Number.isFinite(state.deeds)).toBe(true);
  });
});

describe('26.D — coherencia de save: contadores de la fórmula de Escrituras (regla dura §1.13)', () => {
  it('rechaza totalKeysEarnedRun > totalKeysEarned (run inflado para inflar Escrituras)', () => {
    const bad = { ...freshState(), totalKeysEarnedRun: 300, totalKeysEarned: 0 };
    expect(validateSave(bad).valid).toBe(false);
  });

  it('acepta totalKeysEarnedRun == totalKeysEarned (estado real tras la migración v15)', () => {
    const good = { ...freshState(), totalKeysEarnedRun: 42, totalKeysEarned: 42 };
    expect(validateSave(good).valid).toBe(true);
  });

  it('rechaza prestigeCount negativo o fraccionario (antes solo se exigía finitud)', () => {
    expect(validateSave({ ...freshState(), prestigeCount: -1 }).valid).toBe(false);
    expect(validateSave({ ...freshState(), prestigeCount: 2.5 }).valid).toBe(false);
  });
});
