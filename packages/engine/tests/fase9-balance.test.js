/**
 * PLAN.md §3 (ritmo) y §11.2/§11.6 (objetivos de jugabilidad) — Agente 9, pase de balance.
 * Cubre lo que un cambio futuro de `data/*.json` podría romper sin que nadie lo note: que los
 * contenedores sigan siendo rentables a la Suerte recomendada, que perder duela pero se suavice
 * con la Suerte, que escarbar cueste esfuerzo, que las recompensas de logros no sean OP, y que la
 * automatización nunca sea más rentable por segundo que jugar manual (arriesgando trampa más alta).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import {
  getContainerCost,
  getEffectiveTrapProbability,
  getTrapPenalty,
  getDigRate,
  getRecommendedLuck,
  upgradeCost,
} from '../src/economy.js';
import { expectedContainerValue } from '../src/systems/offline.js';
import { proceduralContainer } from '../src/systems/containers.js';
import { proceduralTierN } from '../src/procedural.js';
import tools from '../../../apps/game/src/data/tools.json';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import achievements from '../../../apps/game/src/data/achievements.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };

/** Valor esperado neto de comprar+escarbar `container` a mano con `luck` fija (sin RNG). */
function expectedNetValueAtLuck(container, luck) {
  const state = freshState();
  const luckDef = upgrades.find((u) => u.id === 'luck');
  state.upgradeLevels.luck = Math.round((luck - luckDef.baseValue) / luckDef.perNivel);
  const cost = getContainerCost(state, container, data);
  const gross = expectedContainerValue(state, container, items, data);
  const trapProb = getEffectiveTrapProbability(state, container, false, data);
  const penalty = getTrapPenalty(state, container, data);
  return gross - trapProb * penalty - cost;
}

describe('PLAN.md §11.2 — con la Suerte recomendada, el contenedor es rentable en promedio', () => {
  for (const container of containers) {
    it(`${container.id}: valor esperado neto >= 0 a la Suerte recomendada`, () => {
      const state = freshState();
      const recLuck = getRecommendedLuck(state, container, items, data);
      expect(expectedNetValueAtLuck(container, recLuck)).toBeGreaterThanOrEqual(-0.01);
    });
  }
});

// Ronda 6: con precio fijo y tiers ×10–×15, la Suerte recomendada dejó de ser 0 para todo
// contenedor pago — "un contenedor recién comprado debe ser una ruina segura" (PLAN.md §11.2)
// hasta juntar la Suerte del tier. Guarda el rebalanceo de items.json contra regresiones de data.
describe('Ronda 6 — la Suerte recomendada es real (no 0) y crece por tier', () => {
  const state = freshState();
  const recommended = containers.map((c) => getRecommendedLuck(state, c, items, data));

  for (let i = 0; i < containers.length; i++) {
    const container = containers[i];
    if (container.costoInicial === 0) continue;
    // AJUSTE (ronda 15): el tope "alcanzable" sube de 650 a 1000 — los 4 contenedores nuevos
    // (prestigio 6-9) recomiendan hasta 920 (vertederoBigBang) con la calibración de esta ronda.
    it(`${container.id}: recomendada > 0, alcanzable (< 1000) y en pérdida a Suerte 0`, () => {
      expect(recommended[i]).toBeGreaterThan(0);
      expect(recommended[i]).toBeLessThan(1000);
      expect(expectedNetValueAtLuck(container, 0)).toBeLessThan(0);
    });
  }

  it('la recomendada crece estrictamente de tier en tier (entre contenedores pagos)', () => {
    const paid = recommended.filter((_, i) => containers[i].costoInicial > 0);
    for (let i = 1; i < paid.length; i++) {
      expect(paid[i]).toBeGreaterThan(paid[i - 1]);
    }
  });
});

// Ronda 10: los requerimientos de Suerte subieron de nuevo (~×1.6 por tier) recalibrando SOLO
// los valorBase de items.json (fórmulas y containers.json intactos) con el script
// agentes/scripts/calibrate-luck-ronda10.mjs. Este test fija los targets EXACTOS: si un
// rebalanceo futuro de data los mueve, tiene que verse acá a propósito.
describe('Ronda 10/11 — requerimientos de Suerte por contenedor (targets exactos)', () => {
  it('la Suerte recomendada de los primeros 12 contenedores (rondas 1-11) sigue siendo la tabla exacta de las rondas 10 y 11', () => {
    // AJUSTE (ronda 15): acotado a los primeros 12 — es la regresión histórica de esa data.
    // Los 4 contenedores nuevos de la ronda 15 tienen su propio target exacto abajo.
    const state = freshState();
    const recommended = containers.slice(0, 12).map((c) => getRecommendedLuck(state, c, items, data));
    expect(recommended).toEqual([0, 8, 20, 40, 72, 120, 190, 290, 340, 420, 500, 580]);
  });

  it('la Suerte recomendada de los 4 contenedores nuevos de la ronda 15 es exactamente la calibrada en esta ronda', () => {
    const state = freshState();
    const NEW_IDS = ['chatarreriaTitanes', 'naufragioTemporal', 'archivoMultiverso', 'vertederoBigBang'];
    const recommended = NEW_IDS.map((id) => getRecommendedLuck(state, containers.find((c) => c.id === id), items, data));
    expect(recommended).toEqual([651, 740, 831, 920]);
  });
});

describe('PLAN.md §11.2 — la pérdida esperada baja a medida que sube la Suerte', () => {
  for (const container of containers) {
    it(`${container.id}: pérdida esperada (probTrampa * penalización) es menor a Suerte alta que a Suerte 0`, () => {
      const low = freshState();
      const high = freshState();
      high.upgradeLevels.luck = 100;
      const lossLow =
        getEffectiveTrapProbability(low, container, false, data) * getTrapPenalty(low, container, data);
      const lossHigh =
        getEffectiveTrapProbability(high, container, false, data) * getTrapPenalty(high, container, data);
      expect(lossHigh).toBeLessThan(lossLow);
    });
  }
});

describe('PLAN.md §11.2 — el escarbado cuesta esfuerzo y escala con el tier', () => {
  it('con Fuerza base (nivel 0), todo contenedor con resistencia > 1 escarba más lento que el ritmo normal', () => {
    const state = freshState();
    for (const container of containers) {
      if (container.resistencia > 1) {
        expect(getDigRate(state, container, data)).toBeLessThan(1);
      }
    }
  });

  // AJUSTE (ronda 20): filtra los contenedores `fueraDeCadena` (Bóveda a Contrarreloj, Sótano
  // Sin Luz) — van al final del array pero son contenido lateral gateado por prestigio 7/8, no
  // el siguiente tier de la cadena principal (que sigue terminando en vertederoBigBang,
  // prestigio 9); su resistencia interpolada entre naufragioTemporal y vertederoBigBang no tiene
  // por qué seguir creciendo respecto al ÚLTIMO elemento del array (PLAN.md §4.24).
  it('la resistencia requerida crece con el tier (orden de PLAN.md §2.6, cadena principal)', () => {
    const chain = containers.filter((c) => !c.fueraDeCadena);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].resistencia).toBeGreaterThanOrEqual(chain[i - 1].resistencia);
    }
  });
});

describe('PLAN.md §11.2 — trampas más caras por tier, nunca injustas', () => {
  // AJUSTE (ronda 20): mismo criterio que la resistencia arriba — los `fueraDeCadena` no
  // continúan el castigo del último tier de la cadena principal (PLAN.md §4.24).
  it('el castigo de trampa crece monotónicamente con el tier del contenedor (cadena principal)', () => {
    const state = freshState();
    const chain = containers.filter((c) => !c.fueraDeCadena);
    for (let i = 1; i < chain.length; i++) {
      expect(getTrapPenalty(state, chain[i], data)).toBeGreaterThanOrEqual(
        getTrapPenalty(state, chain[i - 1], data)
      );
    }
  });

  // AJUSTE (ronda 15): el tope sube de 40% a 44% — vertederoBigBang (el contenedor de mayor
  // riesgo, gateado por Prestigio 9) sube a 44% a propósito para justificar su Suerte recomendada.
  it('incluso en el contenedor de mayor riesgo, la probabilidad base de trampa nunca supera 44%', () => {
    for (const container of containers) {
      expect(container.probTrampaBase).toBeLessThanOrEqual(0.44);
    }
  });
});

// ---------------------------------------------------------------------------
// PLAN.md §11.6, ronda de balance de logros lategame (2026-07-22): los guardrails de dinero
// pasan a DOS clases. La invariante real es "una recompensa no debe financiar la puerta de
// progresión que la precede": un logro cuya condición IMPLICA (derivable de la data) haber
// ganado ya ≥ 10× su recompensa no puede distorsionar nada, aunque el monto sea billonario.
// ---------------------------------------------------------------------------

/** Umbral de Prestigio (PLAN.md §2.8) y puerta de la Mudanza (§4.34): 10 prestigios × $1B. */
const PRESTIGE_MONEY_THRESHOLD = 1_000_000_000;
const GALAXY_MOVE_MONEY_GATE = 10 * PRESTIGE_MONEY_THRESHOLD;
/** Una puerta implícita cuenta como "lategame" recién desde 10× el umbral de Prestigio. */
const LATEGAME_GATE_MIN = 10 * PRESTIGE_MONEY_THRESHOLD;

/**
 * Puerta de dinero mínima que la condición del logro implica sobre `totalMoneyEarned` de toda la
 * partida (dinero gastado ⊆ dinero ganado), derivada SOLO de la data — o `null` si la condición
 * no implica ninguna cota de dinero demostrable.
 * @param {{ cond: Object }} a
 * @returns {number|null}
 */
function impliedMoneyGate(a) {
  const cond = a.cond;
  if (cond.type === 'totalMoneyEarnedAtLeast') return cond.value;
  // Comprar TODAS las herramientas exige haber gastado la suma de tools.json.
  if (cond.type === 'allToolsOwned') return tools.reduce((s, tool) => s + tool.costo, 0);
  if (cond.type === 'containerOwnedAtLeast') {
    // Poseer el contenedor exige (al menos) su costo base: el real de containers.json, o el
    // procedural reconstruido con la fórmula literal de §4.37 (costoInicial × 15^n).
    const real = containers.find((c) => c.id === cond.containerId);
    if (real) return real.costoInicial;
    const n = proceduralTierN(cond.containerId);
    if (n === null) return null;
    return proceduralContainer(n, containers.find((c) => c.id === 'vertederoBigBang')).costoInicial;
  }
  // Una flota > 1 robot solo existe vía el árbol de Escrituras ⇒ ≥ 1 Mudanza ⇒ 10 prestigios.
  if (cond.type === 'fleetSizeAtLeast' && cond.value > 1) return GALAXY_MOVE_MONEY_GATE;
  if (cond.type === 'galaxyMoveCountAtLeast') return cond.value * GALAXY_MOVE_MONEY_GATE;
  return null;
}

const moneyAchievements = achievements.filter((a) => a.reward.type === 'money');
const lategameClass = moneyAchievements.filter((a) => {
  const gate = impliedMoneyGate(a);
  return gate !== null && gate >= LATEGAME_GATE_MIN;
});
const earlyClass = moneyAchievements.filter((a) => !lategameClass.includes(a));

describe('PLAN.md §11.6 — recompensas de logros no rompen la economía (clase temprana)', () => {
  it('la suma de recompensas en dinero de la clase temprana es una fracción chica del umbral de Prestigio', () => {
    const totalMoney = earlyClass.reduce((s, a) => s + a.reward.amount, 0);
    // PLAN.md §2.8: el umbral de Prestigio es 1.000.000.000. Los logros alcanzables antes del
    // primer prestigio no deben regalar una fracción significativa de eso — techo generoso: 5%.
    expect(totalMoney).toBeLessThan(PRESTIGE_MONEY_THRESHOLD * 0.05);
  });

  it('la clase lategame es exactamente la esperada (si un logro cambia de clase, tiene que verse acá)', () => {
    // Guarda la CLASIFICACIÓN: si una edición futura de data mueve un logro de clase (p. ej. le
    // baja el hito a a41 o le sube la puerta a uno temprano), este test lo hace visible.
    expect(lategameClass.map((a) => a.id).sort()).toEqual(['a41', 'a58', 'a59']);
  });

  it('las recompensas lategame son ≈10% de su puerta implícita (banda 1%-12%, ni simbólicas ni rotas)', () => {
    // El piso del 1% es el bug que motivó la ronda: a41 pagaba $2M (0,00002% de su hito de
    // ~$11T) — una recompensa simbólica castiga el esfuerzo igual que una rota lo regala.
    for (const a of lategameClass) {
      const gate = impliedMoneyGate(a);
      expect(a.reward.amount).toBeGreaterThanOrEqual(gate * 0.01);
      expect(a.reward.amount).toBeLessThanOrEqual(gate * 0.12);
    }
  });

  it('targets exactos de la ronda de balance 2026-07-22 (a41/a58/a59)', () => {
    // AJUSTE: montos elegidos ≈10% de cada puerta, redondeados a un número legible en pantalla
    // ($1.10T / 75.00Sx / $1.00B). Si un rebalanceo futuro los mueve, tiene que verse acá.
    expect(achievements.find((a) => a.id === 'a41').reward).toEqual({ type: 'money', amount: 1_100_000_000_000 });
    expect(achievements.find((a) => a.id === 'a58').reward).toEqual({ type: 'money', amount: 7.5e22 });
    expect(achievements.find((a) => a.id === 'a59').reward).toEqual({ type: 'money', amount: 1_000_000_000 });
  });

  // AJUSTE (ronda 15): el árbol de prestigio creció a 1.588 llaves de costo total (13 nodos hasta
  // Escáner de Trampas) y la progresión de logros ahora cubre hasta Prestigio 9 (a31) y dinero
  // total 1e15 (a29) — comparar contra "una sola tanda de Prestigio" (10 llaves) ya no es
  // representativo del alcance real del juego. El techo nuevo se deriva de la data: los logros no
  // deberían, sumados, cubrir más de un ~15% del árbol completo (no pueden "comprar" el árbol solos).
  it('la suma de recompensas en Llaves de todos los logros es una fracción chica del costo total del árbol de Prestigio', () => {
    const totalKeys = achievements.filter((a) => a.reward.type === 'keys').reduce((s, a) => s + a.reward.amount, 0);
    // AJUSTE (ronda 25, R25.2): los 3 nodos infinitos (§4.33) no tienen `nivelMaximo` — el loop
    // con `lvl < undefined` nunca itera, así que aportan 0 a este total (correcto: son un
    // sumidero infinito de Llaves, no tienen un "costo total" finito que comparar).
    const totalTreeCost = prestigeTree.reduce((sum, node) => {
      let nodeCost = 0;
      for (let lvl = 0; lvl < node.nivelMaximo; lvl++) {
        nodeCost += Math.ceil(node.costoBase * Math.pow(node.factorCrecimiento, lvl));
      }
      return sum + nodeCost;
    }, 0);
    expect(totalKeys).toBeLessThanOrEqual(totalTreeCost * 0.15);
  });

  // AJUSTE (ronda 15): el principio de balance cambió — PLAN.md ahora pide que los hitos de dinero
  // paguen ~10% de SU PROPIO umbral (antes decrecía de 20% a 4%, castigando el esfuerzo). El techo
  // absoluto sigue existiendo para que ningún logro individual sea desproporcionado frente al
  // umbral de Prestigio, pero pasa de 1% estricto a 1% inclusive (a8/a33 caen justo en el borde).
  it('ningún logro individual de la clase temprana regala, de una, más de una fracción relevante del umbral de Prestigio', () => {
    // La clase lategame queda EXENTA del techo absoluto a propósito: su techo es proporcional a
    // su puerta implícita (test de la banda 1%-12% arriba), no al primer prestigio.
    for (const a of earlyClass) {
      expect(a.reward.amount).toBeLessThanOrEqual(PRESTIGE_MONEY_THRESHOLD * 0.01);
    }
  });
});

describe('PLAN.md §2.7 — la automatización nunca es más rentable por segundo que jugar manual óptimo', () => {
  it('con el Robot Clasificador comprado, la probabilidad de trampa automática siempre es >= a la manual', () => {
    const state = freshState();
    state.automationOwned.robotClasificador = true;
    for (const container of containers) {
      const manual = getEffectiveTrapProbability(state, container, false, data);
      const auto = getEffectiveTrapProbability(state, container, true, data);
      expect(auto).toBeGreaterThanOrEqual(manual);
    }
  });

  it('el multiplicador de trampa automática (autoTrapMultiplier) es mayor a 1 (nunca ventaja para el robot)', () => {
    const robot = automations.find((a) => a.id === 'robotClasificador');
    const effect = robot.effects.find((e) => e.type === 'autoTrapMultiplier');
    expect(effect.mult).toBeGreaterThan(1);
  });
});

describe('PLAN.md §3 — ritmo temprano (determinístico, sin depender de una estrategia simulada)', () => {
  it('el valor esperado de un escarbado del Tacho de Vereda alcanza la primera mejora de Suerte en <= 30s', () => {
    const tacho = containers.find((c) => c.id === 'tachoVereda');
    const state = freshState();
    const perDig = expectedContainerValue(state, tacho, items, data);
    const perSecond = perDig / tacho.digTime;
    const luckDef = upgrades.find((u) => u.id === 'luck');
    const firstUpgradeCost = upgradeCost(luckDef.costoBase, luckDef.factorCrecimiento, 0);
    expect(firstUpgradeCost / perSecond).toBeLessThanOrEqual(30);
  });

  it('el Contenedor de Barrio es afordable dentro de los primeros 2 minutos escarbando el Tacho', () => {
    const tacho = containers.find((c) => c.id === 'tachoVereda');
    const barrio = containers.find((c) => c.id === 'contenedorBarrio');
    const state = freshState();
    const perSecond = expectedContainerValue(state, tacho, items, data) / tacho.digTime;
    const cost = getContainerCost(state, barrio, data);
    expect(cost / perSecond).toBeLessThanOrEqual(120);
  });
});
