/**
 * Auditoría ronda 18: gemelo ESM del test de apps/desktop/tests/saveTimestamp.test.js.
 * `resolveInitialSaveText()` (main.js) compara localStorage vs archivo de Electron por
 * `lastSavedAt` antes de que el engine valide nada: un save con `lastSavedAt: 1e999`
 * (JSON.parse lo desborda a Infinity, que pasa `typeof === 'number'`) ganaba siempre.
 */
import { describe, it, expect } from 'vitest';
import { extractLastSavedAt } from '../src/saveTimestamp.js';

describe('extractLastSavedAt (reconciliación localStorage vs archivo)', () => {
  it('devuelve el lastSavedAt de un save válido', () => {
    expect(extractLastSavedAt('{"lastSavedAt": 1783819756597}')).toBe(1783819756597);
  });

  it('rechaza (-1) un lastSavedAt desbordado a Infinity (1e999) — la regresión', () => {
    expect(extractLastSavedAt('{"lastSavedAt": 1e999}')).toBe(-1);
    expect(extractLastSavedAt('{"lastSavedAt": -1e999}')).toBe(-1);
  });

  it('rechaza (-1) lastSavedAt no numérico, JSON roto, vacío y tipos no-string', () => {
    expect(extractLastSavedAt('{"lastSavedAt": "163"}')).toBe(-1);
    expect(extractLastSavedAt('{no es json')).toBe(-1);
    expect(extractLastSavedAt('null')).toBe(-1);
    expect(extractLastSavedAt('')).toBe(-1);
    expect(extractLastSavedAt(null)).toBe(-1);
    expect(extractLastSavedAt(undefined)).toBe(-1);
  });
});
