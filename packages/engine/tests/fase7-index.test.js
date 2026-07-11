import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { applyContainerResult } from '../src/systems/containers.js';
import { validateSave } from '../src/save.js';
import containers from '../../../apps/game/src/data/containers.json';

const tachoVereda = containers.find((c) => c.id === 'tachoVereda');

describe('PLAN.md §11.5 — tracking de hallazgos por ítem (itemsFoundByItem)', () => {
  it('applyContainerResult cuenta cada ítem hallado por id, agrupado por contenedor', () => {
    const state = freshState();
    const result = {
      isTrap: false,
      items: [
        { id: 'can-crushed', icon: 'can-crushed', name: 'Lata aplastada', categoria: 'common', value: 1 },
        { id: 'can-crushed', icon: 'can-crushed', name: 'Lata aplastada', categoria: 'common', value: 1 },
        { id: 'banana-peel', icon: 'banana-peel', name: 'Cáscara de banana', categoria: 'common', value: 1 },
      ],
      moneyDelta: 3,
    };
    applyContainerResult(state, tachoVereda, result, false, {});
    expect(state.itemsFoundByItem.tachoVereda['can-crushed']).toBe(2);
    expect(state.itemsFoundByItem.tachoVereda['banana-peel']).toBe(1);
  });

  it('no mezcla contadores entre contenedores distintos', () => {
    const state = freshState();
    const otro = containers.find((c) => c.id === 'contenedorBarrio');
    applyContainerResult(
      state,
      tachoVereda,
      { isTrap: false, items: [{ id: 'item-a', icon: 'x', name: 'Item A', categoria: 'common', value: 1 }], moneyDelta: 1 },
      false,
      {}
    );
    applyContainerResult(
      state,
      otro,
      { isTrap: false, items: [{ id: 'item-a', icon: 'y', name: 'Item A', categoria: 'common', value: 1 }], moneyDelta: 1 },
      false,
      {}
    );
    expect(state.itemsFoundByItem.tachoVereda['item-a']).toBe(1);
    expect(state.itemsFoundByItem.contenedorBarrio['item-a']).toBe(1);
  });
});

describe('save v2 -> v3 migra sin perder partidas viejas', () => {
  it('un save v2 sin itemsFoundByItem se acepta y se completa con {}', () => {
    const oldSave = freshState();
    oldSave.saveVersion = 2;
    oldSave.money = 500;
    delete oldSave.itemsFoundByItem;
    const result = validateSave(oldSave);
    expect(result.valid).toBe(true);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect(result.data.money).toBe(500);
    expect(result.data.itemsFoundByItem).toEqual({});
  });
});
