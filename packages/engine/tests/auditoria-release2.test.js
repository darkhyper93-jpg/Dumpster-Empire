/**
 * Auditoría de release (segunda pasada, post-ronda 33) — regresiones del engine.
 *
 * 🔴 Raíz común de la ronda: `mapa[claveDelSave]` sin `Object.hasOwn` (napkin #7). La migración
 * v6→v7 y `pickVendorSaleIndex` ya lo tenían resuelto; `counterValue` de misiones no. Con
 * `params.categoria: 'constructor'` el lookup resolvía contra `Object.prototype`, devolvía la
 * FUNCIÓN `Object` (truthy, así que el `|| 0` no salvaba nada) y el progreso quedaba en NaN →
 * `JSON.stringify` lo persiste como `null` → el siguiente arranque RECHAZA el save entero →
 * `store.loadState()` cae a `freshState()`: partida borrada (PoC de dos sesiones en navegador).
 *
 * 🟡 `getRecommendedLuck` sin memoizar: 73 ms por render de la Tienda, que se re-renderiza una
 * vez por segundo (long task de ~60 ms/s medida en Chromium). Es una meta FIJA por contenedor
 * desde la ronda 7 (se evalúa contra `freshState()`), así que el resultado no puede depender del
 * estado — estos tests fijan esa invariante, que es la que habilita el cache.
 *
 * 🟡 `averageItemValueForContainer` era el único lookup de pool sin `poolContainerId || id` +
 * `|| []`: un tier procedural lo hacía explotar con `undefined.filter`.
 *
 * 🔵 Techo de presentación de `formatNumber` y `resolveContainerById` (deduplicación de las tres
 * copias que vivían en la UI).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { serializeState, deserializeState } from '../src/save.js';
import { formatNumber, formatMoney } from '../src/format.js';
import { getRecommendedLuck } from '../src/economy.js';
import { resolveContainerById, proceduralContainer } from '../src/systems/containers.js';
import { updateMissionsProgress, rollThreeMissions, ownedCategories } from '../src/systems/missions.js';
import { PROCEDURAL_CONTAINER_MAX_N } from '../src/procedural.js';
import containers from '../../../apps/game/src/data/containers.json';
import items from '../../../apps/game/src/data/items.json';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import missionsData from '../../../apps/game/src/data/missions.json';

const data = { upgrades, prestigeTree, automations: [], missions: missionsData };
const containerIds = new Set(containers.map((c) => c.id));

/** Claves que resuelven contra `Object.prototype` en un objeto literal. */
const CLAVES_DEL_PROTOTIPO = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'];

/**
 * Save por lo demás legítimo con UNA misión cuyo `params.categoria` es hostil. Pasa
 * `validateSave` tal cual: `isValidDailyMissions` solo exige `typeof categoria === 'string'`.
 */
function saveConMisionHostil(categoria) {
  const state = freshState();
  state.money = 777777;
  state.totalMoneyEarned = 777777;
  state.missionsRolledAt = Date.now();
  state.dailyMissions = [
    {
      id: 'm1',
      type: 'findCategoryCount',
      difficulty: 'easy',
      params: { categoria },
      target: 10,
      progress: 0,
      claimed: false,
      snapshot: 0,
      reward: { type: 'money', amount: 100 },
    },
  ];
  return state;
}

describe('🔴 misiones: una clave del save que resuelve contra el prototipo ya no brickea el arranque', () => {
  it('el save hostil SIGUE siendo aceptado por la validación (el fix no es rechazarlo)', () => {
    for (const categoria of CLAVES_DEL_PROTOTIPO) {
      const result = deserializeState(JSON.stringify(saveConMisionHostil(categoria)), containerIds);
      expect(result.ok, `categoria=${categoria}`).toBe(true);
    }
  });

  it('updateMissionsProgress deja `progress` finito con cualquier clave del prototipo', () => {
    for (const categoria of CLAVES_DEL_PROTOTIPO) {
      const state = saveConMisionHostil(categoria);
      updateMissionsProgress(state, containers);
      expect(Number.isFinite(state.dailyMissions[0].progress), `categoria=${categoria}`).toBe(true);
      expect(state.dailyMissions[0].progress).toBe(0);
    }
  });

  it('la cadena completa jugar → guardar → volver a abrir NO pierde la partida', () => {
    for (const categoria of CLAVES_DEL_PROTOTIPO) {
      const state = saveConMisionHostil(categoria);
      // Sesión 1: el juego corre sus ticks y autoguarda.
      updateMissionsProgress(state, containers);
      const persistido = serializeState(state);
      expect(persistido, `categoria=${categoria}`).not.toContain('"progress":null');
      // Sesión 2: el jugador vuelve a abrir el juego con ESE save.
      const reabierto = deserializeState(persistido, containerIds);
      expect(reabierto.ok, `categoria=${categoria}`).toBe(true);
      expect(reabierto.state.money).toBe(777777);
    }
  });

  it('una categoría REAL sigue contando el progreso como siempre (el fix no rompe la mecánica)', () => {
    const state = saveConMisionHostil('common');
    state.itemsFoundByCategory = { common: 4 };
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(4);
    state.itemsFoundByCategory.common = 99;
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(10); // topado por `target`
  });

  it('un valor no numérico en el mapa (save manipulado) cuenta 0, nunca NaN', () => {
    const state = saveConMisionHostil('common');
    state.itemsFoundByCategory = { common: '<img src=x onerror=alert(1)>' };
    updateMissionsProgress(state, containers);
    expect(state.dailyMissions[0].progress).toBe(0);
  });
});

describe('🟡 getRecommendedLuck: meta fija por contenedor (invariante que habilita el cache)', () => {
  it('el resultado no depende del estado del jugador ni del orden de las llamadas', () => {
    const avanzado = freshState();
    avanzado.prestigeCount = 30;
    avanzado.upgradeLevels = { luck: 500, digPower: 500, area: 500, capacity: 500 };
    for (const c of containers) avanzado.ownedContainers[c.id] = 40;
    for (const container of containers) {
      const conAvanzado = getRecommendedLuck(avanzado, container, items, data);
      const conFresco = getRecommendedLuck(freshState(), container, items, data);
      expect(conAvanzado, container.id).toBe(conFresco);
      // Segunda llamada (ya cacheada): mismo valor, y es un entero >= 0.
      expect(getRecommendedLuck(avanzado, container, items, data)).toBe(conAvanzado);
      expect(Number.isInteger(conAvanzado) && conAvanzado >= 0).toBe(true);
    }
  });

  it('dos balances distintos no se contaminan entre sí (cache por itemsData)', () => {
    // Un contenedor con costo real: `tachoVereda` es gratis, así que recomienda 0 con cualquier
    // balance y no serviría para detectar contaminación entre datas.
    const barato = containers.find((c) => getRecommendedLuck(freshState(), c, items, data) > 0);
    const original = getRecommendedLuck(freshState(), barato, items, data);
    // Copia profunda con los valores base a la décima parte: la recomendación TIENE que subir.
    const itemsPobres = JSON.parse(JSON.stringify(items));
    for (const pool of Object.values(itemsPobres.containers)) {
      for (const item of pool) item.valorBase /= 10;
    }
    const pobre = getRecommendedLuck(freshState(), barato, itemsPobres, data);
    expect(pobre).toBeGreaterThan(original);
    // Y el balance original sigue devolviendo lo suyo (no lo pisó la segunda data).
    expect(getRecommendedLuck(freshState(), barato, items, data)).toBe(original);
  });

  it('un tier procedural no explota al pedirle la recomendación (pool heredado del Big Bang)', () => {
    const bigBang = containers.find((c) => c.id === 'vertederoBigBang');
    const tier = proceduralContainer(1, bigBang);
    expect(() => getRecommendedLuck(freshState(), tier, items, data)).not.toThrow();
    expect(Number.isFinite(getRecommendedLuck(freshState(), tier, items, data))).toBe(true);
  });
});

describe('🔵 formatNumber: techo de presentación', () => {
  it('Number.MAX_VALUE no imprime un número de cientos de dígitos', () => {
    const salida = formatNumber(Number.MAX_VALUE);
    expect(salida).toBe('999.99QiDc+');
    expect(salida.length).toBeLessThan(20);
    expect(formatMoney(Number.MAX_VALUE)).toBe('$999.99QiDc+');
  });

  it('todo valor por debajo del techo conserva el formato de siempre', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1500)).toBe('1.50K');
    expect(formatNumber(2.5e47)).toBe('250.00QaDc'); // tope alcanzable jugando (tier 25)
    expect(formatNumber(1e48)).toBe('1.00QiDc');
    expect(formatNumber(9.99e50)).toBe('999.00QiDc');
  });

  it('nunca devuelve notación científica cruda (regla dura de CLAUDE.md)', () => {
    for (const n of [1e21, 1e48, 1e60, 1e120, Number.MAX_VALUE]) {
      expect(formatNumber(n)).not.toMatch(/e\+?\d/);
    }
  });
});

describe('🔵 resolveContainerById: una sola resolución id → contenedor', () => {
  it('resuelve un contenedor real', () => {
    expect(resolveContainerById('tachoVereda', containers).id).toBe('tachoVereda');
  });

  it('reconstruye un tier procedural válido', () => {
    const tier = resolveContainerById('bigbangPlus3', containers);
    expect(tier.id).toBe('bigbangPlus3');
    expect(tier.isProcedural).toBe(true);
    expect(tier.poolContainerId).toBe('vertederoBigBang');
  });

  it('devuelve null para ids inexistentes u hostiles, sin lanzar', () => {
    const hostiles = [
      'noExiste',
      'bigbangPlus0',
      'bigbangPlus01',
      'bigbangPlus-1',
      'bigbangPlus1e2',
      `bigbangPlus${PROCEDURAL_CONTAINER_MAX_N + 1}`,
      'constructor',
      '__proto__',
      '',
      null,
      undefined,
      42,
    ];
    for (const id of hostiles) {
      expect(resolveContainerById(id, containers), String(id)).toBeNull();
    }
  });
});

describe('🔵 ownedCategories: una sola implementación (engine), consumida también por el store', () => {
  it('devuelve solo las categorías de contenedores efectivamente poseídos', () => {
    const state = freshState();
    expect(ownedCategories(state, containers)).toEqual([]);
    const tacho = containers.find((c) => c.id === 'tachoVereda');
    state.ownedContainers[tacho.id] = 1;
    expect(ownedCategories(state, containers).sort()).toEqual([...tacho.categorias].sort());
  });

  it('rollThreeMissions sigue rolleando solo sobre contenido alcanzable', () => {
    const state = freshState();
    const tacho = containers.find((c) => c.id === 'tachoVereda');
    state.ownedContainers[tacho.id] = 1;
    const misiones = rollThreeMissions(state, containers, items, { missions: missionsData }, () => 0.5);
    for (const m of misiones) {
      if (m.params.categoria) expect(tacho.categorias).toContain(m.params.categoria);
      if (m.params.containerId) expect(m.params.containerId).toBe(tacho.id);
      expect(Number.isFinite(m.target) && m.target > 0).toBe(true);
    }
  });
});
