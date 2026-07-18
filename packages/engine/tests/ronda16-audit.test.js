/**
 * Auditoría de la ronda 16 (tarea 16.E, Verif&Audit.md): la migración v6->v7 de
 * `itemsFoundByItem` corre ANTES de validateDeepContent, así que no puede confiar en la forma
 * del save. Regresiones cubiertas (todas reproducidas contra la versión previa del remap):
 *  - byItem null tiraba TypeError no capturado (brick de boot con localStorage manipulado);
 *  - un array como byItem se "lavaba" a objeto válido y pasaba la validación;
 *  - una clave __proto__ seteaba el prototipo de remapped: su contenido quedaba heredado e
 *    invisible para validateDeepContent (bypass de la capa primaria anti-XSS del save);
 *  - una clave 'constructor' resolvía contra el prototipo de nameMap y persistía
 *    "function Object() { [native code] }" como clave del estado.
 * Además: foco extra del roadmap — un save v5 REAL importado conserva la colección a través
 * de la doble migración v5->v6->v7.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave, deserializeState, importSave } from '../src/save.js';

const itemsData = JSON.parse(
  readFileSync(path.join(__dirname, '../../../apps/game/src/data/items.json'), 'utf8')
);
// El mismo mapa `containerId -> { nombreEspañol -> id }` que construye apps/game/src/store.js
// desde la data pristina (ver R-16.3).
const itemNameToId = {};
for (const [containerId, pool] of Object.entries(itemsData.containers)) {
  itemNameToId[containerId] = Object.fromEntries(pool.map((it) => [it.name, it.id]));
}

/** Save v6 válido en todo, listo para override de itemsFoundByItem (napkin: nunca delete). */
function v6Base() {
  const v6 = freshState();
  v6.saveVersion = 6;
  // Ronda 27 (v16): un save v6 real traía autoTargetContainerId (existía desde la v5); se
  // repone porque freshState ya no lo tiene (campo borrado por la migración v16).
  v6.autoTargetContainerId = null;
  return v6;
}

describe('auditoría ronda 16 — la migración v6->v7 no confía en la forma del save', () => {
  it('un byItem null se rechaza limpio, sin excepción (antes: TypeError y brick de boot)', () => {
    const v6 = v6Base();
    v6.itemsFoundByItem = { tachoVereda: null };
    const raw = JSON.stringify(v6);
    // deserializeState es el camino real de store.loadState: no debe lanzar jamás.
    const result = deserializeState(raw, undefined, itemNameToId);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/itemsFoundByItem/);
  });

  it('un byItem array se rechaza (antes: se lavaba a objeto {0:..,1:..} válido)', () => {
    const v6 = v6Base();
    v6.itemsFoundByItem = { tachoVereda: [1, 2] };
    const result = validateSave(v6, undefined, itemNameToId);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/itemsFoundByItem/);
  });

  it('un itemsFoundByItem null o faltante en v6 se rechaza (la migración no fabrica un {})', () => {
    const conNull = v6Base();
    conNull.itemsFoundByItem = null;
    expect(validateSave(conNull, undefined, itemNameToId).valid).toBe(false);

    // Un save etiquetado v6 ya pasó la migración v2->v3 que agrega el campo: si no está, es
    // manipulación — pre-ronda-16 se rechazaba y debe seguir rechazándose.
    const sinCampo = JSON.parse(JSON.stringify(v6Base()));
    delete sinCampo.itemsFoundByItem;
    expect(validateSave(sinCampo, undefined, itemNameToId).valid).toBe(false);
  });

  it('una clave __proto__ no esconde contenido de la validación (antes: bypass anti-XSS)', () => {
    const v6 = v6Base();
    // JSON.parse crea "__proto__" como propiedad PROPIA (igual que un save real manipulado);
    // el remap ingenuo la asignaba con [] y seteaba el prototipo de remapped: los strings
    // maliciosos quedaban heredados en state.itemsFoundByItem sin que Object.values los viera.
    v6.itemsFoundByItem = JSON.parse(
      '{"__proto__": {"tachoVereda": {"<img src=x onerror=alert(1)>": "boom"}}}'
    );
    const result = validateSave(v6, undefined, itemNameToId);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/itemsFoundByItem/);
  });

  it("una clave 'constructor' pasa tal cual, sin resolver contra el prototipo del mapa", () => {
    const v6 = v6Base();
    v6.itemsFoundByItem = { tachoVereda: { constructor: 3 } };
    const result = validateSave(v6, undefined, itemNameToId);
    expect(result.valid).toBe(true);
    // Antes: nameMap['constructor'] devolvía Object (heredado) y la clave persistida era
    // "function Object() { [native code] }".
    expect(Object.keys(result.data.itemsFoundByItem.tachoVereda)).toEqual(['constructor']);
    expect(result.data.itemsFoundByItem.tachoVereda.constructor).toBe(3);
  });

  it('el caso feliz sigue intacto: claves en español migran a ids y sobreviven ida y vuelta', () => {
    const v6 = v6Base();
    v6.itemsFoundByItem = { tachoVereda: { 'Lata aplastada': 3, 'Objeto fantasma': 2 } };
    const result = validateSave(v6, undefined, itemNameToId);
    expect(result.valid).toBe(true);
    expect(result.data.itemsFoundByItem.tachoVereda).toEqual({
      'can-crushed': 3,
      'Objeto fantasma': 2,
    });
    // El resultado (mapas sin prototipo) debe serializar y re-validar sin pérdida.
    const roundTrip = deserializeState(JSON.stringify(result.data), undefined, itemNameToId);
    expect(roundTrip.ok).toBe(true);
    expect(roundTrip.state.itemsFoundByItem.tachoVereda).toEqual({
      'can-crushed': 3,
      'Objeto fantasma': 2,
    });
  });
});

describe('auditoría ronda 16 — import de un save v5 real conserva la colección (foco extra)', () => {
  it('v5 con colección por nombre español importa y llega a v7 con ids, vía v5->v6->v7', () => {
    // Save v5 "real": esquema de la ronda 14 — sin trapsDiscarded (lo agrega la migración
    // v5->v6 incondicionalmente, así que acá el delete es seguro; NO borrar campos que la
    // migración de esa versión no backfillea — ver napkin).
    const v5 = JSON.parse(JSON.stringify(freshState()));
    v5.saveVersion = 5;
    // Ronda 27 (v16): se repone autoTargetContainerId — un save v5 real lo traía (nació con la
    // v5) y freshState ya no lo tiene (la migración v16 lo borró del esquema).
    v5.autoTargetContainerId = null;
    delete v5.trapsDiscarded;
    v5.money = 1234;
    v5.itemsFoundByItem = {
      tachoVereda: { 'Lata aplastada': 4, 'Cáscara de banana': 1 },
      contenedorBarrio: { 'Periódico viejo': 2 },
    };

    const encoded = Buffer.from(JSON.stringify(v5), 'utf-8').toString('base64');
    const result = importSave(encoded, undefined, itemNameToId);
    expect(result.ok).toBe(true);
    expect(result.state.saveVersion).toBe(SAVE_VERSION);
    expect(result.state.trapsDiscarded).toBe(0);
    expect(result.state.money).toBe(1234);
    expect(result.state.itemsFoundByItem.tachoVereda).toEqual({
      'can-crushed': 4,
      'banana-peel': 1,
    });
    expect(result.state.itemsFoundByItem.contenedorBarrio).toEqual({ 'newspaper-old': 2 });
  });
});
