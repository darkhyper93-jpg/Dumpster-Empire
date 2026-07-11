/**
 * Ronda 16 (PLAN.md §16, tarea 16.A): ids estables de ítems + save v7. La colección
 * (`itemsFoundByItem`) pasa de indexarse por nombre-español a indexarse por id de ítem, para
 * que sobreviva a la traducción sin perder el progreso del jugador.
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave, serializeState, deserializeState, exportSave, importSave } from '../src/save.js';

const itemNameToId = {
  tachoVereda: { 'Lata aplastada': 'can-crushed', 'Cáscara de banana': 'banana-peel' },
};

describe('save v6 -> v7 migra itemsFoundByItem de nombre a id (ronda 16)', () => {
  it('un save v6 con claves en español migra a ids con itemNameToId', () => {
    const v6 = freshState();
    v6.saveVersion = 6;
    v6.itemsFoundByItem = { tachoVereda: { 'Lata aplastada': 3, 'Cáscara de banana': 1 } };

    const result = validateSave(v6, undefined, itemNameToId);
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.itemsFoundByItem.tachoVereda).toEqual({ 'can-crushed': 3, 'banana-peel': 1 });
  });

  it('una clave desconocida (sin entrada en itemNameToId) pasa tal cual', () => {
    const v6 = freshState();
    v6.saveVersion = 6;
    v6.itemsFoundByItem = { tachoVereda: { 'Objeto fantasma': 2 } };

    const result = validateSave(v6, undefined, itemNameToId);
    expect(result.valid).toBe(true);
    expect(result.data.itemsFoundByItem.tachoVereda).toEqual({ 'Objeto fantasma': 2 });
  });

  it('doble migración es idempotente', () => {
    const v6 = freshState();
    v6.saveVersion = 6;
    v6.itemsFoundByItem = { tachoVereda: { 'Lata aplastada': 3 } };

    const once = validateSave(v6, undefined, itemNameToId);
    const twice = validateSave(v6, undefined, itemNameToId);
    expect(once.data.itemsFoundByItem).toEqual(twice.data.itemsFoundByItem);
    expect(once.data.itemsFoundByItem.tachoVereda).toEqual({ 'can-crushed': 3 });
  });

  it('ida y vuelta v7 conserva las claves por id sin pérdida', () => {
    const state = freshState();
    state.itemsFoundByItem = { tachoVereda: { 'can-crushed': 5 } };

    const encoded = exportSave(state);
    const result = importSave(encoded, undefined, itemNameToId);
    expect(result.ok).toBe(true);
    expect(result.state.itemsFoundByItem.tachoVereda).toEqual({ 'can-crushed': 5 });
  });

  it('sin itemNameToId las claves de un save v6 quedan como están (compat)', () => {
    const v6 = freshState();
    v6.saveVersion = 6;
    v6.itemsFoundByItem = { tachoVereda: { 'Lata aplastada': 3 } };

    const result = validateSave(v6);
    expect(result.valid).toBe(true);
    expect(result.data.itemsFoundByItem.tachoVereda).toEqual({ 'Lata aplastada': 3 });
  });

  it('un save v6 completo migra vía deserializeState con itemNameToId', () => {
    const v6 = freshState();
    v6.saveVersion = 6;
    v6.itemsFoundByItem = { tachoVereda: { 'Lata aplastada': 2 } };
    const raw = JSON.stringify(v6);

    const result = deserializeState(raw, undefined, itemNameToId);
    expect(result.ok).toBe(true);
    expect(result.state.saveVersion).toBe(SAVE_VERSION);
    expect(result.state.itemsFoundByItem.tachoVereda).toEqual({ 'can-crushed': 2 });
  });
});
