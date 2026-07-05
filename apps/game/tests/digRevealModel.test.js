/**
 * Tests del modelo puro de revelado por-objeto (PUNTOS_A_MEJORAR_5 §3).
 * El modelo es la ÚNICA fuente de verdad del completado del escarbado: el canvas es
 * presentación. Corre en Node sin DOM (mismo criterio que packages/engine).
 */
import { describe, it, expect } from 'vitest';
import {
  createRevealModel,
  applyStroke,
  getProgress,
  isComplete,
  getPositions,
  getRevealed,
  getStrokes,
  REVEAL_COVERAGE,
} from '../src/dig/digRevealModel.js';

/** LCG determinista para inyectar como `random` (mismo seed → mismas posiciones). */
function makeLcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const BASE_OPTS = {
  width: 600,
  height: 330,
  objectRadius: 28,
  minSpacing: 110,
};

function makeModel(count, seed = 7, overrides = {}) {
  return createRevealModel({ ...BASE_OPTS, count, random: makeLcg(seed), ...overrides });
}

describe('createRevealModel — posiciones', () => {
  it('genera `count` posiciones dentro del área útil (márgenes de círculo y etiqueta)', () => {
    for (const count of [1, 3, 6]) {
      const model = makeModel(count);
      const positions = getPositions(model);
      expect(positions).toHaveLength(count);
      for (const pos of positions) {
        expect(pos.x).toBeGreaterThanOrEqual(model.marginX);
        expect(pos.x).toBeLessThanOrEqual(BASE_OPTS.width - model.marginX);
        expect(pos.y).toBeGreaterThanOrEqual(model.marginTop);
        expect(pos.y).toBeLessThanOrEqual(BASE_OPTS.height - model.marginBottom);
      }
    }
  });

  it('no solapa: distancia entre centros >= minSpacing', () => {
    const model = makeModel(6);
    const positions = getPositions(model);
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThanOrEqual(BASE_OPTS.minSpacing);
      }
    }
  });

  it('es determinista con el mismo `random` inyectado', () => {
    expect(getPositions(makeModel(5, 42))).toEqual(getPositions(makeModel(5, 42)));
  });

  it('distintos seeds dan distintas posiciones (aleatorio por escarbado)', () => {
    expect(getPositions(makeModel(5, 1))).not.toEqual(getPositions(makeModel(5, 2)));
  });

  it('termina y no solapa aunque `random` sea degenerado (fallback de colocación)', () => {
    const model = createRevealModel({ ...BASE_OPTS, count: 6, random: () => 0.5 });
    const positions = getPositions(model);
    expect(positions).toHaveLength(6);
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThanOrEqual(BASE_OPTS.minSpacing);
      }
    }
  });
});

describe('applyStroke — cobertura por objeto', () => {
  it('sin trazos: progreso 0, nada revelado, incompleto', () => {
    const model = makeModel(3);
    expect(getProgress(model)).toBe(0);
    expect(getRevealed(model)).toEqual([false, false, false]);
    expect(isComplete(model)).toBe(false);
  });

  it('un trazo lejos de todos los objetos no revela nada', () => {
    const model = makeModel(3);
    const positions = getPositions(model);
    // Punto a >90px de todo centro: probamos las 4 esquinas del área útil y usamos la primera libre.
    const corners = [
      { x: model.marginX, y: model.marginTop },
      { x: BASE_OPTS.width - model.marginX, y: model.marginTop },
      { x: model.marginX, y: BASE_OPTS.height - model.marginBottom },
      { x: BASE_OPTS.width - model.marginX, y: BASE_OPTS.height - model.marginBottom },
    ];
    const far = corners.find((c) =>
      positions.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > 90)
    );
    expect(far).toBeDefined();
    const { newlyRevealed } = applyStroke(model, null, far, 20);
    expect(newlyRevealed).toEqual([]);
    expect(getProgress(model)).toBe(0);
  });

  it('cobertura parcial por debajo de REVEAL_COVERAGE no revela', () => {
    const model = makeModel(3);
    const pos = getPositions(model)[0];
    // Un toque con pincel de medio radio cubre solo el corazón de la huella (< REVEAL_COVERAGE).
    const { newlyRevealed } = applyStroke(model, null, pos, BASE_OPTS.objectRadius * 0.5);
    expect(newlyRevealed).toEqual([]);
    expect(getRevealed(model)[0]).toBe(false);
  });

  it('un toque con pincel del tamaño del objeto lo revela (y solo a él)', () => {
    const model = makeModel(3);
    const pos = getPositions(model)[0];
    const { newlyRevealed } = applyStroke(model, null, pos, BASE_OPTS.objectRadius);
    expect(newlyRevealed).toEqual([0]);
    expect(getRevealed(model)).toEqual([true, false, false]);
    expect(getProgress(model)).toBeCloseTo(1 / 3);
  });

  it('un arrastre que cruza el centro del objeto lo revela (cobertura por segmento)', () => {
    const model = makeModel(3);
    const pos = getPositions(model)[1];
    const from = { x: pos.x - 80, y: pos.y };
    const to = { x: pos.x + 80, y: pos.y };
    const { newlyRevealed } = applyStroke(model, from, to, BASE_OPTS.objectRadius);
    expect(newlyRevealed).toContain(1);
    expect(getRevealed(model)[1]).toBe(true);
  });

  it('un objeto ya revelado no vuelve a aparecer en newlyRevealed', () => {
    const model = makeModel(2);
    const pos = getPositions(model)[0];
    applyStroke(model, null, pos, BASE_OPTS.objectRadius);
    const { newlyRevealed } = applyStroke(model, null, pos, BASE_OPTS.objectRadius);
    expect(newlyRevealed).toEqual([]);
  });

  it('registra los trazos aplicados para poder repintar la capa desde el modelo', () => {
    const model = makeModel(2);
    applyStroke(model, null, { x: 100, y: 100 }, 20);
    applyStroke(model, { x: 100, y: 100 }, { x: 150, y: 120 }, 20);
    const strokes = getStrokes(model);
    expect(strokes).toHaveLength(2);
    expect(strokes[1]).toEqual({ from: { x: 100, y: 100 }, to: { x: 150, y: 120 }, radius: 20 });
  });
});

describe('completado — SOLO al revelar todos los objetos (PUNTOS_A_MEJORAR_5 §3)', () => {
  it('progreso = revelados/total y completa recién con el último objeto', () => {
    const model = makeModel(3);
    const positions = getPositions(model);
    applyStroke(model, null, positions[0], BASE_OPTS.objectRadius);
    applyStroke(model, null, positions[1], BASE_OPTS.objectRadius);
    expect(getProgress(model)).toBeCloseTo(2 / 3);
    expect(isComplete(model)).toBe(false);
    applyStroke(model, null, positions[2], BASE_OPTS.objectRadius);
    expect(getProgress(model)).toBe(1);
    expect(isComplete(model)).toBe(true);
  });

  it('caso trampa: un solo "objeto", revelarlo completa', () => {
    const model = makeModel(1);
    expect(isComplete(model)).toBe(false);
    applyStroke(model, null, getPositions(model)[0], BASE_OPTS.objectRadius);
    expect(isComplete(model)).toBe(true);
  });

  it('regresión "un click": un único toque nunca completa con 2+ objetos, ni con pincel enorme', () => {
    const probes = (model) => [
      ...getPositions(model),
      { x: BASE_OPTS.width / 2, y: BASE_OPTS.height / 2 },
    ];
    for (const seed of [1, 7, 99]) {
      for (const probe of probes(makeModel(3, seed))) {
        const fresh = makeModel(3, seed);
        applyStroke(fresh, null, probe, 60);
        expect(isComplete(fresh)).toBe(false);
      }
    }
  });

  it('REVEAL_COVERAGE está en un rango jugable (documentado en el módulo)', () => {
    expect(REVEAL_COVERAGE).toBeGreaterThan(0.4);
    expect(REVEAL_COVERAGE).toBeLessThan(0.9);
  });
});
