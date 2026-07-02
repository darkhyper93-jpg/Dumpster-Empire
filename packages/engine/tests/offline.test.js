import { describe, it, expect } from 'vitest';
import { offlineEarnings } from '../src/economy.js';
import { freshState } from '../src/state.js';
import { applyOfflineProgress, estimateAutomationRatePerSecond } from '../src/systems/offline.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };

describe('§4.5 fórmula literal de progreso offline', () => {
  it('gananciaOffline = tasa * segundos * factor, sin tope', () => {
    const result = offlineEarnings({
      gananciaAutomaticaPorSegundo: 10,
      segundosAusente: 100,
      factorOffline: 0.5,
      capSegundos: 8 * 3600,
    });
    expect(result.ganancia).toBe(10 * 100 * 0.5);
    expect(result.segundosEfectivos).toBe(100);
  });

  it('topea a las 8 horas (28800s) por defecto', () => {
    const capSegundos = 8 * 3600;
    const result = offlineEarnings({
      gananciaAutomaticaPorSegundo: 5,
      segundosAusente: 100 * 3600,
      factorOffline: 0.5,
      capSegundos,
    });
    expect(result.segundosEfectivos).toBe(capSegundos);
    expect(result.ganancia).toBe(5 * capSegundos * 0.5);
  });

  it('el factor por defecto es 0.5: ausente da la mitad que estar activo', () => {
    const activo = offlineEarnings({
      gananciaAutomaticaPorSegundo: 20,
      segundosAusente: 10,
      factorOffline: 1,
      capSegundos: 8 * 3600,
    });
    const ausente = offlineEarnings({
      gananciaAutomaticaPorSegundo: 20,
      segundosAusente: 10,
      factorOffline: 0.5,
      capSegundos: 8 * 3600,
    });
    expect(ausente.ganancia).toBe(activo.ganancia / 2);
  });
});

describe('applyOfflineProgress (integración)', () => {
  it('sin Robot Clasificador, no genera ganancia offline', () => {
    const state = freshState();
    state.money = 100;
    const result = applyOfflineProgress(state, 3600, containers, itemsData, data);
    expect(result.ganancia).toBe(0);
    expect(state.money).toBe(100);
  });

  it('con Robot Clasificador y contenedores comprables, genera ganancia > 0 y topeada a 8h', () => {
    const state = freshState();
    state.money = 1_000_000;
    state.automationOwned.robotClasificador = true;
    state.automationOwned.guantes = true;

    const rate = estimateAutomationRatePerSecond(state, containers, itemsData, data);
    expect(rate).toBeGreaterThan(0);

    const moneyBefore = state.money;
    const result = applyOfflineProgress(state, 100 * 3600, containers, itemsData, data);

    expect(result.segundosEfectivos).toBe(8 * 3600);
    expect(result.ganancia).toBeGreaterThan(0);
    expect(state.money).toBeCloseTo(moneyBefore + result.ganancia, 6);
  });
});
