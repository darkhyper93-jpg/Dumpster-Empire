/**
 * Ronda 31, tarea 2 (ROADMAPv4 §31.3.2) — diagnóstico de "los logros de racha no se
 * auto-reclaman". Reproduce 10 escarbados manuales exitosos (sin trampa) contra el motor real
 * de checkAchievements y verifica que a36 ("Racha de Diez") se desbloquea exactamente en el
 * décimo y paga su recompensa una sola vez.
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { rollContainerResult, applyContainerResult } from '../src/systems/containers.js';
import { checkAchievements } from '../src/systems/achievements.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import itemsData from '../../../apps/game/src/data/items.json';
import achievementsData from '../../../apps/game/src/data/achievements.json';

const tachoVereda = containers.find((c) => c.id === 'tachoVereda');
const data = { upgrades, automations, prestigeTree };
const a36 = achievementsData.find((a) => a.id === 'a36');

/** random() que nunca cae en trampa (siempre 0.99, muy por encima de cualquier probTrampaBase). */
function neverTrapRandom() {
  return 0.99;
}

describe('§31.3.2 fix de logros de racha (a36/a37/a38)', () => {
  it('a36 se desbloquea EXACTAMENTE en el décimo escarbado manual exitoso y paga una sola vez', () => {
    const state = freshState();
    state.money = 1e9; // suficiente para comprar tachoVereda 10 veces sin bloquear el flujo
    const ctx = { allContainers: containers, allAutomations: automations, itemsData, data };

    for (let i = 1; i <= 10; i++) {
      const result = rollContainerResult(state, tachoVereda, false, itemsData, data, neverTrapRandom);
      expect(result.isTrap).toBe(false);
      applyContainerResult(state, tachoVereda, result, false, data);
      const unlocked = checkAchievements(state, achievementsData, ctx);
      if (i < 10) {
        expect(unlocked).not.toContain('a36');
      } else {
        expect(unlocked).toContain('a36');
      }
    }

    expect(state.bestDigStreak).toBeGreaterThanOrEqual(10);
    expect(state.achievementsUnlocked.filter((id) => id === 'a36')).toHaveLength(1);

    // a36 no se re-otorga en revisiones posteriores (aunque una cascada de OTROS logros — p. ej.
    // uno de dinero total que cruza su umbral gracias a la recompensa de a36 — sí puede seguir
    // desbloqueándose; eso es comportamiento esperado, no el bug de esta tarea).
    const second = checkAchievements(state, achievementsData, ctx);
    expect(second).not.toContain('a36');
    expect(a36.reward.type).toBe('money');
  });

  it('una trampa de CUALQUIER grado corta la racha antes de los 10 y a36 no se desbloquea', () => {
    const state = freshState();
    state.money = 1e9;
    const ctx = { allContainers: containers, allAutomations: automations, itemsData, data };

    for (let d = 1; d <= 4; d++) {
      const result = rollContainerResult(state, tachoVereda, false, itemsData, data, neverTrapRandom);
      applyContainerResult(state, tachoVereda, result, false, data);
      checkAchievements(state, achievementsData, ctx);
    }
    expect(state.digStreak).toBe(4);

    // Trampa sintética directa (evita depender de la secuencia exacta de random() del roll):
    // el punto de esta prueba es que applyContainerResult corta la racha, no reproducir el roll.
    applyContainerResult(state, tachoVereda, { isTrap: true, items: [], moneyDelta: 0 }, false, data);
    checkAchievements(state, achievementsData, ctx);

    expect(state.digStreak).toBe(0);
    expect(state.achievementsUnlocked).not.toContain('a36');
  });
});
