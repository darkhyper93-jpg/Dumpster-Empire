/**
 * Auditoría de release (post-ronda 33) — regresiones de seguridad/estabilidad.
 *
 * Raíz común (napkin #8, mitad sin cerrar): los mapas de niveles de árbol
 * (`prestigeTreeLevels`, `deedsTreeLevels`) se validaban como "número finito" pero NUNCA como
 * entero acotado. Dos bricks de ARRANQUE irrecuperables (PoC ejecutado en la auditoría):
 *   - 🔴 migrateTo14: bucle `for lvl<level` acotado por el save -> cuelgue infinito en boot.
 *   - 🔴 getFleetSize: nivel finito-gigante -> flota de millones -> ensureFleet agota memoria.
 * Más el cierre de la clase de acumulaciones sin clamp (prestigeKeys/fragments) y cotas de
 * arrays que faltaban (stallOrders y los STRING_ARRAY_FIELDS).
 */
import { describe, it, expect } from 'vitest';
import {
  freshState,
  ROBOTS_MAX_SAFETY,
  TREE_LEVEL_MAX_SAFETY,
  ARRAY_MAX_SAFETY,
} from '../src/state.js';
import { getFleetSize, addKeys, addMoney } from '../src/economy.js';
import { validateSave, serializeState, deserializeState } from '../src/save.js';
import { doPrestige } from '../src/systems/prestige.js';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import deedsTree from '../../../apps/game/src/data/deedsTree.json';
import automations from '../../../apps/game/src/data/automations.json';
import upgrades from '../../../apps/game/src/data/upgrades.json';

const dataReal = { upgrades, automations, prestigeTree, deedsTree };

/** Save v16 (esquema actual) partiendo de freshState y overrideando solo lo bajo prueba (napkin #5). */
function saveWith(overrides) {
  return { ...freshState(), ...overrides };
}

describe('auditoría de release — 🔴 flota no acotada (getFleetSize / ensureFleet)', () => {
  it('un deedsTreeLevels finito-gigante NO produce una flota de millones (clamp a ROBOTS_MAX_SAFETY)', () => {
    const state = freshState();
    // `flotaFundadora` suma +1 robot por nivel; un save válido-pero-hostil con un nivel enorme
    // (pasa la finitud) hacía getFleetSize -> ~1e9 y ensureFleet reventaba la memoria en el boot.
    state.deedsTreeLevels = { flotaFundadora: 1e9 };
    const fleet = getFleetSize(state, dataReal);
    expect(Number.isFinite(fleet)).toBe(true);
    expect(fleet).toBeLessThanOrEqual(ROBOTS_MAX_SAFETY);
    expect(fleet).toBeGreaterThanOrEqual(1);
  });

  it('la flota legítima (sin niveles hostiles) sigue siendo 1 en una partida nueva', () => {
    expect(getFleetSize(freshState(), dataReal)).toBe(1);
  });
});

describe('auditoría de release — 🔴 migrateTo14 no cuelga con un nivel de árbol gigante', () => {
  it(
    'migrar un save v13 con prestigeTreeLevels enorme termina rápido y NO acepta el save',
    () => {
      // Sin el guard del bucle, migrateTo14 iteraba 1e9 veces -> cuelgue infinito ANTES incluso
      // de que validateDeepContent pudiera rechazarlo. El testTimeout protege la suite.
      const hostile = saveWith({ saveVersion: 13, prestigeTreeLevels: { capitalInicial: 1e9 } });
      const result = validateSave(hostile, undefined, undefined, prestigeTree);
      expect(result.valid).toBe(false);
    },
    3000
  );
});

describe('auditoría de release — 🔴/capa-3 niveles de árbol validados como enteros acotados', () => {
  it('rechaza un prestigeTreeLevels con un nivel por encima del techo de seguridad', () => {
    const result = validateSave(saveWith({ prestigeTreeLevels: { capitalInicial: TREE_LEVEL_MAX_SAFETY + 1 } }));
    expect(result.valid).toBe(false);
  });

  it('rechaza un deedsTreeLevels con un nivel por encima del techo de seguridad', () => {
    const result = validateSave(saveWith({ deedsTreeLevels: { flotaFundadora: TREE_LEVEL_MAX_SAFETY + 1 } }));
    expect(result.valid).toBe(false);
  });

  it('rechaza un nivel de árbol fraccionario o negativo', () => {
    expect(validateSave(saveWith({ prestigeTreeLevels: { capitalInicial: 2.5 } })).valid).toBe(false);
    expect(validateSave(saveWith({ deedsTreeLevels: { flotaFundadora: -3 } })).valid).toBe(false);
  });

  it('acepta niveles de árbol legítimos (enteros en rango)', () => {
    const result = validateSave(saveWith({ prestigeTreeLevels: { capitalInicial: 10 }, deedsTreeLevels: { flotaFundadora: 2 } }));
    expect(result.valid).toBe(true);
  });
});

describe('auditoría de release — 🟡 clamp de acumulación de Llaves (addKeys)', () => {
  it('addKeys clampea prestigeKeys a MAX_VALUE en vez de desbordar a Infinity', () => {
    const state = freshState();
    state.prestigeKeys = Number.MAX_VALUE;
    addKeys(state, Number.MAX_VALUE); // MAX + MAX -> Infinity sin el clamp
    expect(state.prestigeKeys).toBe(Number.MAX_VALUE);
    expect(Number.isFinite(state.prestigeKeys)).toBe(true);
  });

  it('addKeys normaliza una ganancia no finita (Infinity -> MAX, NaN -> 0)', () => {
    const a = freshState();
    addKeys(a, Infinity);
    expect(a.prestigeKeys).toBe(Number.MAX_VALUE);
    const b = freshState();
    b.prestigeKeys = 5;
    addKeys(b, NaN);
    expect(b.prestigeKeys).toBe(5);
  });

  it('un save al tope, tras doPrestige, sigue re-cargable (ningún campo numérico serializa a null)', () => {
    const state = saveWith({
      totalMoneyEarned: Number.MAX_VALUE,
      money: Number.MAX_VALUE,
      prestigeKeys: Number.MAX_VALUE,
      totalKeysEarned: Number.MAX_VALUE,
      totalKeysEarnedRun: Number.MAX_VALUE,
      prestigeCount: 1000,
    });
    doPrestige(state, dataReal, null);
    for (const key of ['prestigeKeys', 'totalKeysEarned', 'totalKeysEarnedRun', 'money', 'totalMoneyEarned']) {
      expect(Number.isFinite(state[key])).toBe(true);
    }
    // JSON.stringify(Infinity) === 'null'; un campo numérico null hace rechazar el save entero al
    // próximo boot (wipe). El save serializado tiene que seguir deserializando limpio.
    expect(deserializeState(serializeState(state), undefined, undefined, prestigeTree).ok).toBe(true);
  });
});

describe('auditoría de release — 🟡 cotas de arrays del save', () => {
  function stallOrder(i) {
    return { id: `o${i}`, npcId: 'salomon', categoria: 'common', cantidad: 3, mult: 1.5, progress: 0 };
  }

  it('rechaza un stallOrders absurdamente largo (save manipulado)', () => {
    const orders = Array.from({ length: ARRAY_MAX_SAFETY + 1 }, (_, i) => stallOrder(i));
    expect(validateSave(saveWith({ stallOrders: orders })).valid).toBe(false);
  });

  it('acepta una cantidad legítima de pedidos activos', () => {
    expect(validateSave(saveWith({ stallOrders: [stallOrder(0), stallOrder(1)] })).valid).toBe(true);
  });

  it('rechaza un array de strings (achievementsUnlocked) absurdamente largo', () => {
    const huge = Array.from({ length: ARRAY_MAX_SAFETY + 1 }, (_, i) => `a${i}`);
    expect(validateSave(saveWith({ achievementsUnlocked: huge })).valid).toBe(false);
  });
});
