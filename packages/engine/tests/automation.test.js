import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { automationTick } from '../src/systems/automation.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import containers from '../../../apps/game/src/data/containers.json';
import itemsData from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };

// robotClasificador es la automatización con effect `enablesAutoDig` (automations.json); sin ella
// automationTick retorna temprano y no ejercitaría el bucle de procesamiento.
function stateWithAutoDig() {
  const state = freshState();
  state.automationOwned.robotClasificador = true;
  return state;
}

describe('automationTick — resiliencia ante containerId huérfano (auditoría §M1)', () => {
  it('NO crashea cuando un slot en proceso apunta a un contenedor inexistente y lo descarta', () => {
    const state = stateWithAutoDig();
    // save viejo/manipulado: id que ya no existe en containers.json, con el tiempo ya cumplido.
    state.autoProcessing = [{ containerId: 'contenedorFantasma', totalTime: 5, remaining: 0.1 }];
    const moneyBefore = state.money;

    expect(() => automationTick(state, 1, containers, itemsData, data, () => 0.5)).not.toThrow();

    // el slot huérfano se descartó (no quedó atascado) y no se generó ganancia de la nada.
    expect(state.autoProcessing.some((s) => s.containerId === 'contenedorFantasma')).toBe(false);
    expect(state.money).toBe(moneyBefore);
  });

  it('NO crashea cuando la cola tiene un id inexistente y no lo mete a procesar', () => {
    const state = stateWithAutoDig();
    state.autoQueue = ['contenedorFantasma'];

    expect(() => automationTick(state, 1, containers, itemsData, data, () => 0.5)).not.toThrow();

    // el id huérfano se consumió de la cola sin crear un slot inválido.
    expect(state.autoProcessing.some((s) => s.containerId === 'contenedorFantasma')).toBe(false);
  });

  it('un id huérfano en proceso no bloquea el procesamiento de uno válido en el mismo tick', () => {
    const state = stateWithAutoDig();
    const real = containers[0];
    state.autoProcessing = [
      { containerId: 'contenedorFantasma', totalTime: 5, remaining: 0.1 },
      { containerId: real.id, totalTime: 5, remaining: 0.1 },
    ];

    expect(() => automationTick(state, 1, containers, itemsData, data, () => 0.5)).not.toThrow();
    // ambos slots terminados se consumieron; el válido se procesó, el huérfano se descartó.
    expect(state.autoProcessing.length).toBe(0);
  });
});
