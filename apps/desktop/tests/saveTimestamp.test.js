/**
 * Auditoría ronda 18: la reconciliación local-vs-nube de saveFile.js decide por `lastSavedAt`
 * ANTES de que el engine valide el save. `typeof === 'number'` dejaba pasar Infinity —
 * `JSON.parse` no produce NaN, pero SÍ produce Infinity con un literal desbordado (`1e999`) —
 * y un save de nube corrupto con `lastSavedAt: 1e999` ganaba la reconciliación para siempre,
 * pisando el archivo local bueno en cada boot (viola PLAN.md §6.3). Misma lección del napkin
 * que motivó Number.isFinite en validateSave: el typeof solo no alcanza.
 */
import { describe, it, expect } from 'vitest';
import { extractTimestamp } from '../saveTimestamp.js';

describe('extractTimestamp (reconciliación de saves por lastSavedAt)', () => {
  it('devuelve el lastSavedAt de un save válido', () => {
    expect(extractTimestamp('{"lastSavedAt": 1783819756597}')).toBe(1783819756597);
  });

  it('rechaza (-1) un lastSavedAt desbordado a Infinity (1e999) — la regresión', () => {
    expect(extractTimestamp('{"lastSavedAt": 1e999}')).toBe(-1);
    expect(extractTimestamp('{"lastSavedAt": -1e999}')).toBe(-1);
  });

  it('rechaza (-1) lastSavedAt no numérico, ausente o de un JSON que no es objeto', () => {
    expect(extractTimestamp('{"lastSavedAt": "163"}')).toBe(-1);
    expect(extractTimestamp('{"money": 5}')).toBe(-1);
    expect(extractTimestamp('null')).toBe(-1);
    expect(extractTimestamp('123')).toBe(-1);
    expect(extractTimestamp('[1,2]')).toBe(-1);
  });

  it('rechaza (-1) JSON roto, string vacío y tipos no-string', () => {
    expect(extractTimestamp('{no es json')).toBe(-1);
    expect(extractTimestamp('')).toBe(-1);
    expect(extractTimestamp(null)).toBe(-1);
    expect(extractTimestamp(undefined)).toBe(-1);
    expect(extractTimestamp(42)).toBe(-1);
  });
});
