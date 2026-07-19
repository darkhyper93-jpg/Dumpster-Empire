/**
 * Ronda 30.B — dos contenedores especiales nuevos (Reactor de Cuásar, Horizonte de Sucesos).
 *
 * Decisión del usuario (2026-07-19): entran FUERA DE CADENA, como Bóveda a Contrarreloj y
 * Sótano Sin Luz, para no mover el ancla de los tiers procedurales (§4.37, que se cuelgan de
 * `vertederoBigBang`) ni la curva de la cadena principal.
 *
 * Los conteos se derivan de la data (regla §0: nunca hardcodear un conteo).
 */

import { describe, it, expect } from 'vitest';
import containers from '../../../apps/game/src/data/containers.json' with { type: 'json' };
import itemsData from '../../../apps/game/src/data/items.json' with { type: 'json' };
import { isContainerUnlocked, proceduralContainer } from '../src/index.js';
import { freshState } from '../src/state.js';

const NUEVOS = ['reactorDeCuasar', 'horizonteDeSucesos'];
const byId = (id) => containers.find((c) => c.id === id);

describe('los dos contenedores nuevos existen y están bien formados', () => {
  for (const id of NUEVOS) {
    it(`${id}: campos obligatorios con los mismos tipos que el resto de la data`, () => {
      const c = byId(id);
      expect(c, `falta el contenedor "${id}" en containers.json`).toBeTruthy();
      // Se compara contra un contenedor YA existente: si la data gana un campo obligatorio
      // nuevo, este test lo exige también para los nuevos en vez de quedar desactualizado.
      // La referencia es `archivoMultiverso` (contenedor "pelado") y no un especial, porque
      // `mode`/`mechanicValueMult` son OPCIONALES: los dos nuevos no traen mecánica propia y no
      // tienen por qué declararlos.
      const referencia = byId('archivoMultiverso');
      for (const campo of Object.keys(referencia)) {
        expect(c, `"${id}" no tiene el campo "${campo}" que sí tiene sotanoSinLuz`).toHaveProperty(campo);
        expect(typeof c[campo], `"${id}.${campo}" con tipo distinto al de sotanoSinLuz`).toBe(
          typeof referencia[campo]
        );
      }
      for (const num of ['costoInicial', 'probTrampaBase', 'digTime', 'slots', 'resistencia', 'areaRecomendada']) {
        expect(Number.isFinite(c[num]), `"${id}.${num}" no es finito`).toBe(true);
        expect(c[num]).toBeGreaterThan(0);
      }
      expect(c.probTrampaBase).toBeLessThan(1);
    });

    it(`${id}: es fuera de cadena (no toca la progresión ni el ancla procedural)`, () => {
      expect(byId(id).fueraDeCadena).toBe(true);
    });

    it(`${id}: su pool tiene el mismo tamaño que el de los otros especiales y categorías declaradas`, () => {
      const c = byId(id);
      const pool = itemsData.containers[id];
      expect(pool, `falta el pool de "${id}" en items.json`).toBeTruthy();
      expect(pool.length).toBe(itemsData.containers.sotanoSinLuz.length);
      const validas = new Set(itemsData.rarities.map((r) => r.id));
      const enPool = new Set(pool.map((i) => i.categoria));
      for (const cat of c.categorias) {
        expect(validas.has(cat), `categoría desconocida "${cat}" en ${id}`).toBe(true);
        // Si una categoría declarada no tiene ítems, `rollItem` no tendría de dónde sacar.
        expect(enPool.has(cat), `${id} declara "${cat}" pero ningún ítem del pool la usa`).toBe(true);
      }
      for (const item of pool) {
        expect(c.categorias, `"${item.id}" tiene una categoría que el contenedor no declara`).toContain(item.categoria);
        expect(Number.isFinite(item.valorBase)).toBe(true);
        expect(item.valorBase).toBeGreaterThan(0);
      }
    });
  }

  it('ids de ítem únicos en TODO el juego (un id repetido pisa la colección del otro)', () => {
    const vistos = new Map();
    for (const [containerId, pool] of Object.entries(itemsData.containers)) {
      for (const item of pool) {
        expect(vistos.has(item.id), `id de ítem duplicado: "${item.id}" (${vistos.get(item.id)} y ${containerId})`).toBe(false);
        vistos.set(item.id, containerId);
      }
    }
  });

  it('ids de contenedor únicos', () => {
    const ids = containers.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('los nuevos NO alteran lo que ya existía', () => {
  it('vertederoBigBang sigue siendo el final de la CADENA (ancla de los procedurales, §4.37)', () => {
    const cadena = containers.filter((c) => !c.fueraDeCadena);
    expect(cadena[cadena.length - 1].id).toBe('vertederoBigBang');
  });

  it('el tier procedural 1 sigue derivando del Big Bang y no de un contenedor nuevo', () => {
    const bigBang = byId('vertederoBigBang');
    const tier = proceduralContainer(1, bigBang);
    expect(tier.id).toBe('bigbangPlus1');
    expect(tier.costoInicial).toBeGreaterThan(bigBang.costoInicial);
  });

  it('sin prestigio suficiente siguen bloqueados (no se cuelan en una partida nueva)', () => {
    const state = freshState();
    for (const id of NUEVOS) {
      expect(isContainerUnlocked(state, byId(id), containers), `${id} no debería estar desbloqueado`).toBe(false);
    }
  });

  it('con el prestigio pedido se desbloquean sin depender de la cadena', () => {
    for (const id of NUEVOS) {
      const c = byId(id);
      const state = freshState();
      state.prestigeCount = c.requiresPrestigeCount;
      expect(isContainerUnlocked(state, c, containers), `${id} debería desbloquearse`).toBe(true);
    }
  });

  it('son los especiales más caros: cuestan más que el Sótano Sin Luz', () => {
    const sotano = byId('sotanoSinLuz').costoInicial;
    for (const id of NUEVOS) expect(byId(id).costoInicial).toBeGreaterThan(sotano);
  });
});
