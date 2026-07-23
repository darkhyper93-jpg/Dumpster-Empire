/**
 * Auditoría de release (cuarta pasada, post-merge #39) — dos regresiones del engine.
 *
 * 🔴 El reloj que RETROCEDE borraba la partida. `loop.js` calculaba `dt = (Date.now() - last)/1000`
 * sin clamp y se lo pasaba a `automationTick`, que hace `slot.remaining -= dt × mult`. Con el reloj
 * hacia atrás entre dos ticks (corrección NTP, resume de suspensión en el Steam Deck, cambio manual
 * de hora) el dt es NEGATIVO y `remaining` CRECE por encima de `totalTime` — justo la invariante que
 * `isValidAutoProcessing` exige. El autoguardado de 15s persistía ese estado y el arranque siguiente
 * rechazaba el save ENTERO → `store.loadState()` cae a `freshState()`: partida borrada sin que nadie
 * atacara nada. Es napkin #3 dirección 2 ("escribir una acumulación sin clamp") sobre la coherencia
 * de campos de napkin #2 ("remaining <= totalTime"), y el ÚNICO sistema temporal que se había
 * quedado sin el clamp que `time.js` existe para dar.
 *
 * 🟡 `autoProcessing` era el único array del save SIN cota de longitud (inventory 200, robots 8,
 * stallOrders y los STRING_ARRAY_FIELDS ARRAY_MAX_SAFETY, dailyMissions 5). Un save importado con
 * cientos de miles de slots pasaba la validación y después congelaba el juego por dos vías:
 * `automationTick` itera todos los slots una vez por segundo y `AutomationView` renderiza una
 * tarjeta por slot. Mismo fallo que ya se había cerrado en `isValidStallOrders`.
 */
import { describe, it, expect } from 'vitest';
import { freshState, ARRAY_MAX_SAFETY } from '../src/state.js';
import { serializeState, deserializeState, validateSave } from '../src/save.js';
import { clampedDeltaSeconds } from '../src/time.js';
import { automationTick } from '../src/systems/automation.js';
import containers from '../../../apps/game/src/data/containers.json';
import items from '../../../apps/game/src/data/items.json';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';

const data = { upgrades, automations, prestigeTree };
const containerIds = new Set(containers.map((c) => c.id));

/** Estado con auto-escarbado comprado y UN slot en curso, como lo deja un tick normal. */
function estadoConSlotEnCurso() {
  const state = freshState();
  state.automationOwned.robotClasificador = true;
  state.autoProcessing = [
    { robotIndex: 0, containerId: containers[0].id, totalTime: 10, remaining: 4 },
  ];
  return state;
}

/** Ida y vuelta por el guardado real: es donde el daño se volvía irreversible. */
function sobreviveElGuardado(state) {
  return deserializeState(serializeState(state), containerIds);
}

describe('clampedDeltaSeconds — gemelo de clampedElapsedMs para sistemas por delta', () => {
  it('deja pasar un delta normal sin tocarlo', () => {
    expect(clampedDeltaSeconds(1)).toBe(1);
    expect(clampedDeltaSeconds(0.016)).toBe(0.016);
  });

  it('lleva a 0 un delta negativo (reloj del sistema hacia atrás)', () => {
    expect(clampedDeltaSeconds(-3600)).toBe(0);
    expect(clampedDeltaSeconds(-0.001)).toBe(0);
  });

  it('lleva a 0 un delta no finito', () => {
    expect(clampedDeltaSeconds(NaN)).toBe(0);
    expect(clampedDeltaSeconds(Infinity)).toBe(0);
    expect(clampedDeltaSeconds(undefined)).toBe(0);
  });

  it('NO pone cota superior: un delta grande legítimo se paga entero (PLAN.md §6.4)', () => {
    // Una pestaña en segundo plano recibe el setInterval estrangulado; la economía no puede
    // depender de que la pestaña esté en foco, así que ese delta grande NO se recorta.
    expect(clampedDeltaSeconds(600)).toBe(600);
  });
});

describe('automationTick — un reloj que retrocede no puede corromper el save', () => {
  it('con delta negativo NO hace crecer `remaining` por encima de `totalTime`', () => {
    const state = estadoConSlotEnCurso();
    automationTick(state, -3600, containers, items, data, () => 0.5);
    const slot = state.autoProcessing[0];
    expect(slot.remaining).toBeLessThanOrEqual(slot.totalTime);
    // El tick retrocedido es un no-op temporal, no una inversión del progreso.
    expect(slot.remaining).toBe(4);
  });

  it('el save sigue siendo válido tras un tick con delta negativo (era pérdida total)', () => {
    const state = estadoConSlotEnCurso();
    automationTick(state, -3600, containers, items, data, () => 0.5);
    const result = sobreviveElGuardado(state);
    expect(result.ok).toBe(true);
  });

  it('el save sigue siendo válido tras un tick con delta no finito', () => {
    const state = estadoConSlotEnCurso();
    automationTick(state, NaN, containers, items, data, () => 0.5);
    expect(state.autoProcessing[0].remaining).toBe(4);
    expect(sobreviveElGuardado(state).ok).toBe(true);
  });

  it('un delta positivo normal sigue avanzando el slot como siempre', () => {
    const state = estadoConSlotEnCurso();
    automationTick(state, 1, containers, items, data, () => 0.5);
    // No se asume el multiplicador de velocidad: lo que importa es que AVANZÓ y sigue coherente.
    const slot = state.autoProcessing[0];
    expect(slot.remaining).toBeLessThan(4);
    expect(sobreviveElGuardado(state).ok).toBe(true);
  });
});

describe('isValidAutoProcessing — cota de longitud (era el único array del save sin la suya)', () => {
  /** Save por lo demás legítimo con `n` slots en curso, todos individualmente válidos. */
  function saveConSlots(n) {
    const state = freshState();
    state.autoProcessing = Array.from({ length: n }, () => ({
      robotIndex: 0,
      containerId: containers[0].id,
      totalTime: 10,
      remaining: 5,
    }));
    return JSON.parse(serializeState(state));
  }

  it('acepta una cantidad de slots dentro de la cota', () => {
    expect(validateSave(saveConSlots(ARRAY_MAX_SAFETY), containerIds).valid).toBe(true);
  });

  it('rechaza un save con más slots que la cota, sin tocar la partida en curso', () => {
    const result = validateSave(saveConSlots(ARRAY_MAX_SAFETY + 1), containerIds);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/autoProcessing/);
  });

  it('la cantidad de slots de una partida real queda muy por debajo de la cota', () => {
    // La cota es de SEGURIDAD, no de diseño: el techo real es ROBOTS_MAX_SAFETY × brazos.
    expect(validateSave(saveConSlots(8), containerIds).valid).toBe(true);
  });
});
