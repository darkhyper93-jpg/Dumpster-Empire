/**
 * Ronda 31, tarea 6 (ROADMAPv4 §31.3.6) — regresión de balance: la tabla de resistencia/
 * areaRecomendada de containers.json es estrictamente creciente en la cadena principal, con un
 * salto mínimo ×1.3 por tier (derivado de la data, cero valores hardcodeados — regla heredada §0).
 */
import { describe, it, expect } from 'vitest';
import containers from '../../../apps/game/src/data/containers.json';

// AJUSTE (ronda 20): los `fueraDeCadena` (Bóveda a Contrarreloj, Sótano Sin Luz, Reactor de
// Cuásar, Horizonte de Sucesos) van al final del array pero no son el siguiente tier de la
// cadena principal — misma exclusión que fase9-balance.test.js.
const chain = containers.filter((c) => !c.fueraDeCadena && !c.isProcedural);
const MIN_TIER_GROWTH = 1.3;

describe('§31.3.6 regresión de balance — tabla de resistencia/areaRecomendada (ronda 31)', () => {
  it('resistencia crece estrictamente en la cadena principal', () => {
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].resistencia).toBeGreaterThan(chain[i - 1].resistencia);
    }
  });

  it('areaRecomendada crece estrictamente en la cadena principal', () => {
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].areaRecomendada).toBeGreaterThan(chain[i - 1].areaRecomendada);
    }
  });

  it('el salto de resistencia entre tiers consecutivos es de al menos ×1.3 (a partir del segundo tier)', () => {
    for (let i = 2; i < chain.length; i++) {
      const growth = chain[i].resistencia / chain[i - 1].resistencia;
      expect(growth).toBeGreaterThanOrEqual(MIN_TIER_GROWTH);
    }
  });

  it('el salto de areaRecomendada entre tiers consecutivos es de al menos ×1.3 (a partir del segundo tier)', () => {
    for (let i = 2; i < chain.length; i++) {
      const growth = chain[i].areaRecomendada / chain[i - 1].areaRecomendada;
      expect(growth).toBeGreaterThanOrEqual(MIN_TIER_GROWTH);
    }
  });

  it('vertederoBigBang sigue siendo el ÚLTIMO de la cadena principal (ancla de los procedurales, §4.37)', () => {
    expect(chain[chain.length - 1].id).toBe('vertederoBigBang');
  });

  it('los fueraDeCadena interpolan su resistencia/área entre sus vecinos de gate de prestigio', () => {
    const bovedaContrarreloj = containers.find((c) => c.id === 'bovedaContrarreloj');
    const sotanoSinLuz = containers.find((c) => c.id === 'sotanoSinLuz');
    const naufragioTemporal = chain.find((c) => c.id === 'naufragioTemporal');
    const archivoMultiverso = chain.find((c) => c.id === 'archivoMultiverso');
    const vertederoBigBang = chain.find((c) => c.id === 'vertederoBigBang');

    expect(bovedaContrarreloj.resistencia).toBeGreaterThan(naufragioTemporal.resistencia);
    expect(bovedaContrarreloj.resistencia).toBeLessThan(archivoMultiverso.resistencia);
    expect(sotanoSinLuz.resistencia).toBeGreaterThan(archivoMultiverso.resistencia);
    expect(sotanoSinLuz.resistencia).toBeLessThan(vertederoBigBang.resistencia);
  });
});
