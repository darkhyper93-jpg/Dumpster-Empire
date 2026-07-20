/**
 * Ronda 20, Agente A (engine) — PLAN.md §4.21 (grados de trampa), §4.23 (herramientas).
 * §4.22 (energía/espionaje) se removió en la ronda 21 (ver ronda21-migracion-v10.test.js) —
 * la migración v8->v9->v10 abajo refleja que esos campos ya no sobreviven al load.
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave } from '../src/save.js';
import { clampedElapsedMs, localDayStamp } from '../src/time.js';
import { rollTrapGrade } from '../src/rng.js';
import { rollContainerResult, applyContainerResult } from '../src/systems/containers.js';
import { buyTool, equipTool } from '../src/systems/tools.js';
import { getToolRadiusMult, getToolRhythmMult, getLuck, itemSaleValue, getAreaMult, getDigRate } from '../src/economy.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';
import traps from '../../../apps/game/src/data/traps.json';
import tools from '../../../apps/game/src/data/tools.json';

const barrio = containers.find((c) => c.id === 'contenedorBarrio');
const dataBase = { upgrades, automations, prestigeTree };
const dataConTraps = { ...dataBase, traps };
const dataConTools = { ...dataBase, tools };

function successResult() {
  return { isTrap: false, items: [{ id: 'x', icon: 'coin', name: 'X', categoria: 'common', value: 10 }], moneyDelta: 10 };
}

describe('time.js — relojes seguros (§3.3)', () => {
  it('clampedElapsedMs nunca es negativo, aunque el reloj retroceda', () => {
    expect(clampedElapsedMs(1000, 500)).toBe(500);
    expect(clampedElapsedMs(500, 1000)).toBe(0);
  });

  it('clampedElapsedMs devuelve 0 si algún operando no es finito (Infinity de un save manipulado)', () => {
    expect(clampedElapsedMs(Number.POSITIVE_INFINITY, 0)).toBe(0);
    expect(clampedElapsedMs(1000, Number.NaN)).toBe(0);
  });

  it('localDayStamp formatea YYYY-MM-DD en hora local', () => {
    const d = new Date(2026, 6, 12, 23, 59); // 12 de julio de 2026, mes 0-indexado
    expect(localDayStamp(d.getTime())).toBe('2026-07-12');
  });
});

describe('§4.21 grados de trampa', () => {
  it('rollTrapGrade respeta las proporciones de data/traps.json con random sembrado', () => {
    expect(rollTrapGrade(traps.gradosProb, () => 0)).toBe('leve');
    expect(rollTrapGrade(traps.gradosProb, () => 0.39)).toBe('leve');
    expect(rollTrapGrade(traps.gradosProb, () => 0.4)).toBe('normal');
    expect(rollTrapGrade(traps.gradosProb, () => 0.84)).toBe('normal');
    expect(rollTrapGrade(traps.gradosProb, () => 0.86)).toBe('grave');
    expect(rollTrapGrade(traps.gradosProb, () => 0.999999)).toBe('grave');
  });

  it('rollContainerResult adjunta trapGrade solo si data.traps existe (opcional, patrón digStreak)', () => {
    const state = freshState();
    const random = (() => {
      const seq = [0.99, 0.1]; // primero rollIsTrap (cae en trampa con probTrampaBase alto), luego grado
      let i = 0;
      return () => seq[Math.min(i++, seq.length - 1)];
    })();
    const trapContainer = { ...barrio, probTrampaBase: 1 };
    // AJUSTE (ronda 31, PLAN.md §4.42): la trampa deja de ser excluyente con el loot — el roll
    // ahora TAMBIÉN tira la lista normal de ítems (entry-trampa aparte), así que necesita
    // itemsData real (antes, con `items: []` en el camino de trampa, un stub vacío alcanzaba).
    const withoutTraps = rollContainerResult(state, trapContainer, false, itemsData, dataBase, () => 0.5);
    expect(withoutTraps.isTrap).toBe(true);
    expect(withoutTraps.trapGrade).toBeUndefined();

    const withTraps = rollContainerResult(state, trapContainer, false, itemsData, dataConTraps, random);
    expect(withTraps.isTrap).toBe(true);
    expect(withTraps.trapGrade).toBe('leve');
  });

  it('el grado NO cambia la probabilidad de trampa (R20.1): probTrampaBase 0 sigue en el piso del 3% (§4.6), intacto', () => {
    const state = freshState();
    const seguro = { ...barrio, probTrampaBase: 0 };
    // random() = 0.5 está muy por encima del piso del 3%: no cae en trampa, con o sin data.traps.
    const result = rollContainerResult(state, seguro, false, itemsData, dataConTraps, () => 0.5);
    expect(result.isTrap).toBe(false);
  });

  it('leve: sin castigo de dinero, pero cuenta para el nivel del contenedor y corta la racha manual', () => {
    const state = freshState();
    state.money = 1000;
    state.digStreak = 3;
    const result = { isTrap: true, trapGrade: 'leve', items: [], moneyDelta: 0 };
    applyContainerResult(state, barrio, result, false, dataConTraps);
    expect(state.money).toBe(1000);
    expect(state.trapsHit).toBe(1);
    expect(state.digStreak).toBe(0);
    expect(state.containerLevelProgress[barrio.id]).toBe(1);
  });

  it('normal: castigo actual (§4.6), sin cambios', () => {
    const state = freshState();
    state.money = 1000000;
    const result = { isTrap: true, trapGrade: 'normal', items: [], moneyDelta: 0 };
    const before = state.money;
    applyContainerResult(state, barrio, result, false, dataConTraps);
    const penaltyEsperada = Math.max(1, barrio.costoInicial * barrio.trapPenaltyMult);
    expect(before - state.money).toBe(penaltyEsperada);
    expect(state.gravesHit).toBe(0);
  });

  it('grave: castigo ×2 (gravePenaltyMult), clamp a money, y suma gravesHit', () => {
    const state = freshState();
    state.money = 1000000;
    const result = { isTrap: true, trapGrade: 'grave', items: [], moneyDelta: 0 };
    const before = state.money;
    applyContainerResult(state, barrio, result, false, dataConTraps);
    const penaltyNormal = Math.max(1, barrio.costoInicial * barrio.trapPenaltyMult);
    expect(before - state.money).toBe(penaltyNormal * traps.gravePenaltyMult);
    expect(state.gravesHit).toBe(1);
  });

  it('grave clampea al dinero disponible (nunca deja money negativo)', () => {
    const state = freshState();
    state.money = 1;
    const result = { isTrap: true, trapGrade: 'grave', items: [], moneyDelta: 0 };
    applyContainerResult(state, barrio, result, false, dataConTraps);
    expect(state.money).toBe(0);
  });

  it('sin trapGrade (llamadores previos a la ronda 20) se comporta como "normal" — compat total', () => {
    const state = freshState();
    state.money = 1000000;
    const before = state.money;
    applyContainerResult(state, barrio, { isTrap: true, items: [], moneyDelta: 0 }, false, dataConTraps);
    const penaltyEsperada = Math.max(1, barrio.costoInicial * barrio.trapPenaltyMult);
    expect(before - state.money).toBe(penaltyEsperada);
  });

  it('el robot (isAuto=true) no corta ni sube racha en ningún grado', () => {
    const state = freshState();
    state.digStreak = 3;
    state.money = 1000000;
    applyContainerResult(state, barrio, { isTrap: true, trapGrade: 'grave', items: [], moneyDelta: 0 }, true, dataConTraps);
    expect(state.digStreak).toBe(3);
  });
});

describe('§4.23 herramientas de escarbado', () => {
  it('buyTool descuenta dinero y marca toolsOwned; falla sin dinero o si ya se posee', () => {
    const state = freshState();
    state.money = 100000;
    const palaAncha = tools.find((t) => t.id === 'palaAncha');
    const result = buyTool(state, palaAncha);
    expect(result.ok).toBe(true);
    expect(state.money).toBe(100000 - palaAncha.costo);
    expect(state.toolsOwned.palaAncha).toBe(true);

    const again = buyTool(state, palaAncha);
    expect(again.ok).toBe(false);

    const state2 = freshState();
    state2.money = 0;
    expect(buyTool(state2, palaAncha).ok).toBe(false);
  });

  it('equipTool solo permite equipar herramientas ya poseídas', () => {
    const state = freshState();
    expect(equipTool(state, 'palaAncha').ok).toBe(false);
    expect(state.equippedTool).toBe('manos');
    state.toolsOwned.palaAncha = true;
    const result = equipTool(state, 'palaAncha');
    expect(result.ok).toBe(true);
    expect(state.equippedTool).toBe('palaAncha');
  });

  it('getToolRadiusMult/getToolRhythmMult reflejan la herramienta equipada; "manos" es neutro', () => {
    const state = freshState();
    expect(getToolRadiusMult(state, dataConTools)).toBe(1.0);
    expect(getToolRhythmMult(state, dataConTools)).toBe(1.0);
    state.toolsOwned.pincelFino = true;
    state.equippedTool = 'pincelFino';
    const pincelFino = tools.find((t) => t.id === 'pincelFino');
    expect(getToolRadiusMult(state, dataConTools)).toBe(pincelFino.radioMult);
    expect(getToolRhythmMult(state, dataConTools)).toBe(pincelFino.ritmoMult);
  });

  it('las herramientas nunca tocan getLuck ni itemSaleValue (solo modifican el pincel)', () => {
    const state = freshState();
    const luckAntes = getLuck(state, dataConTools);
    const areaAntes = getAreaMult(state, dataConTools);
    const rateAntes = getDigRate(state, barrio, dataConTools);
    state.toolsOwned.guanteHidraulico = true;
    state.equippedTool = 'guanteHidraulico';
    expect(getLuck(state, dataConTools)).toBe(luckAntes);
    // getAreaMult/getDigRate (el "pincel" real) tampoco cambian: el multiplicador de herramienta
    // es un factor aparte (getToolRadiusMult/getToolRhythmMult) que la UI compone encima.
    expect(getAreaMult(state, dataConTools)).toBe(areaAntes);
    expect(getDigRate(state, barrio, dataConTools)).toBe(rateAntes);
    expect(
      itemSaleValue({ valorBaseObjeto: 100, multiplicadorRareza: 2, suerte: 10, fluctuacionMercado: 1 })
    ).toBe(itemSaleValue({ valorBaseObjeto: 100, multiplicadorRareza: 2, suerte: 10, fluctuacionMercado: 1 }));
  });
});

describe('migración de save v8 -> v10 (encadena v9 y la remoción de energía de la ronda 21)', () => {
  it('un save v8 sin campos nuevos migra con defaults y sin energía/espionaje', () => {
    const v8 = { ...freshState(), saveVersion: 8, autoTargetContainerId: null }; // repuesto: freshState v16 ya no lo trae (ronda 27)
    delete v8.equippedTool;
    delete v8.toolsOwned;
    delete v8.gravesHit;
    const result = validateSave(v8);
    expect(result.valid).toBe(true);
    expect(result.data.equippedTool).toBe('manos');
    expect(result.data.toolsOwned).toEqual({ manos: true });
    expect(result.data.gravesHit).toBe(0);
    expect(result.data.saveVersion).toBe(SAVE_VERSION);
    expect('energy' in result.data).toBe(false);
    expect('energyAt' in result.data).toBe(false);
    expect('spiesUsed' in result.data).toBe(false);
  });

  it('rechaza gravesHit inválido', () => {
    expect(validateSave({ ...freshState(), gravesHit: Number.POSITIVE_INFINITY }).valid).toBe(false);
  });

  it('rechaza equippedTool que no está presente en toolsOwned', () => {
    expect(validateSave({ ...freshState(), equippedTool: 'palaAncha' }).valid).toBe(false);
  });

  it('rechaza toolsOwned con valores no booleanos', () => {
    expect(validateSave({ ...freshState(), toolsOwned: { manos: 'si' } }).valid).toBe(false);
  });

  it('un save fresco (freshState) es válido tal cual', () => {
    expect(validateSave(freshState()).valid).toBe(true);
    // AJUSTE (ronda 22): ya no se fija en 10 — SAVE_VERSION sigue subiendo con rondas futuras;
    // lo que importa acá es que la migración v9->v10 de esta ronda 21 sigue intacta.
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(10);
  });
});
