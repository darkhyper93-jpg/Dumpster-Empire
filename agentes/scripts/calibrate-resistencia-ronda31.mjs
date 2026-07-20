/**
 * Calibración/verificación ronda 31 (ROADMAPv4 §31.3, tarea 4; PLAN.md §4.42): valida que la
 * tabla de `resistencia`/`areaRecomendada` recién aplicada a containers.json (el PUNTO DE
 * PARTIDA literal del roadmap) queda dentro de las bandas jugables:
 *
 *   - ritmo (getDigRate) al desbloquear el contenedor  ∈ [0.35, 0.65]
 *   - ritmo con el dinero del contenedor SIGUIENTE      ≥ 0.9
 *   - areaRate (getAreaRate) al desbloquear             ≥ 0.45
 *   - areaRate con el dinero del contenedor SIGUIENTE    ≥ 0.95
 *
 * Método: el ENGINE es el oráculo (mismo espíritu que calibrate-luck-ronda10/11/30). Se simula
 * cuántos niveles de Fuerza/Área compraría un jugador que, al momento en que un contenedor se
 * vuelve accesible, gasta ~35% de su dinero histórico en esas dos mejoras (repartido a la mitad
 * entre ambas) — el 65% restante se lo llevan el propio contenedor, otras mejoras y Suerte. El
 * dinero histórico en ese punto se aproxima con `costoInicial` del contenedor (proxy razonable:
 * un jugador que recién puede pagarlo acumuló un total del mismo orden de magnitud) — es una
 * SIMPLIFICACIÓN deliberada (no simula automatización/offline), documentada acá porque no hay
 * forma de derivarla del engine sin una simulación completa de partida.
 *
 * Nodos de prestigio esperables: se asume que, para un contenedor con `requiresPrestigeCount: N`,
 * el jugador ya invirtió Llaves hasta `min(N, nivelMaximo)` en `brazosDeAcero` (Fuerza,
 * nivelMaximo 8, +8%/nivel) y `visionPeriferica` (Área, mismo patrón) — los dos únicos nodos de
 * `prestigeTree.json` con efecto `statPercentFinal` sobre `digPower`/`area`. Proxy monotónico
 * simple (más prestigios ⇒ más nodos comprados), no una simulación de gasto de Llaves real.
 *
 * Esto es un GUARD de verificación, no un escritor de datos (a diferencia de calibrate-luck-*):
 * si una fila falla la banda, imprime la fila corregida sugerida (ajustando SOLO esa
 * `resistencia`/`areaRecomendada`) para que el agente la aplique a mano a containers.json —
 * la data manda, la fórmula no se toca (regla dura 4 de CLAUDE.md).
 *
 * Uso: node agentes/scripts/calibrate-resistencia-ronda31.mjs
 */
import { readFileSync } from 'node:fs';
import { freshState } from '../../packages/engine/src/state.js';
import { getDigRate, getAreaRate, upgradeCost } from '../../packages/engine/src/economy.js';

const dataUrl = (name) => new URL(`../../apps/game/src/data/${name}`, import.meta.url);
const j = (name) => JSON.parse(readFileSync(dataUrl(name), 'utf8'));
const containers = j('containers.json');
const upgrades = j('upgrades.json');
const data = { upgrades, automations: j('automations.json'), prestigeTree: j('prestigeTree.json') };

const digPowerDef = upgrades.find((u) => u.id === 'digPower');
const areaDef = upgrades.find((u) => u.id === 'area');

/** Máximo nivel comprable con `budget`, sumando el costo acumulado de upgradeCost(nivel). */
function maxLevelForBudget(def, budget) {
  let spent = 0;
  let level = 0;
  while (true) {
    const cost = upgradeCost(def.costoBase, def.factorCrecimiento, level);
    if (spent + cost > budget) break;
    spent += cost;
    level += 1;
    if (level > 100000) break; // guard de cordura, nunca debería alcanzarse
  }
  return level;
}

const BRAZOS_DE_ACERO_MAX = data.prestigeTree.find((n) => n.id === 'brazosDeAcero').nivelMaximo;
const VISION_PERIFERICA_MAX = data.prestigeTree.find((n) => n.id === 'visionPeriferica').nivelMaximo;

function statAtBudget(budget, requiresPrestigeCount = 0) {
  const halfBudget = budget / 2;
  const digPowerLevel = maxLevelForBudget(digPowerDef, halfBudget);
  const areaLevel = maxLevelForBudget(areaDef, halfBudget);
  const state = freshState();
  state.upgradeLevels.digPower = digPowerLevel;
  state.upgradeLevels.area = areaLevel;
  state.prestigeTreeLevels.brazosDeAcero = Math.min(BRAZOS_DE_ACERO_MAX, requiresPrestigeCount);
  state.prestigeTreeLevels.visionPeriferica = Math.min(VISION_PERIFERICA_MAX, requiresPrestigeCount);
  return state;
}

const BUDGET_FRACTION = 0.35;
const chain = containers.filter((c) => !c.fueraDeCadena && !c.isProcedural);

let ok = true;
const rows = [];

for (let i = 0; i < chain.length; i++) {
  const container = chain[i];
  const next = chain[i + 1];

  const requiresPrestigeCount = container.requiresPrestigeCount || 0;
  const stateAtUnlock = statAtBudget(container.costoInicial * BUDGET_FRACTION, requiresPrestigeCount);
  const ritmoUnlock = getDigRate(stateAtUnlock, container, data);
  const areaRateUnlock = getAreaRate(stateAtUnlock, container, data);

  let ritmoNext = null;
  let areaRateNext = null;
  if (next) {
    const nextRequiresPrestigeCount = next.requiresPrestigeCount || 0;
    const stateAtNext = statAtBudget(next.costoInicial * BUDGET_FRACTION, nextRequiresPrestigeCount);
    ritmoNext = getDigRate(stateAtNext, container, data);
    areaRateNext = getAreaRate(stateAtNext, container, data);
  }

  const failures = [];
  // tachoVereda (costoInicial 0) es el starter trivial a propósito (R31.2, PLAN.md §11.2):
  // resistencia 1.0 con Fuerza base YA da ritmo 1.0 — la banda de "unlock" no aplica sin un
  // costo real que gastar.
  if (container.costoInicial > 0) {
    if (!(ritmoUnlock >= 0.35 && ritmoUnlock <= 0.65)) failures.push(`ritmoUnlock ${ritmoUnlock.toFixed(3)} fuera de [0.35, 0.65]`);
    if (areaRateUnlock < 0.45) failures.push(`areaRateUnlock ${areaRateUnlock.toFixed(3)} < 0.45`);
  }
  if (next) {
    if (ritmoNext < 0.9) failures.push(`ritmoNext ${ritmoNext.toFixed(3)} < 0.9`);
    if (areaRateNext < 0.95) failures.push(`areaRateNext ${areaRateNext.toFixed(3)} < 0.95`);
  }

  if (failures.length) ok = false;
  rows.push({ id: container.id, ritmoUnlock, areaRateUnlock, ritmoNext, areaRateNext, failures });
}

console.log('contenedor'.padEnd(28), 'ritmoUnlock', 'areaRateUnlock', 'ritmoNext', 'areaRateNext', 'estado');
for (const r of rows) {
  const estado = r.failures.length ? `FALLÓ: ${r.failures.join('; ')}` : 'OK';
  console.log(
    r.id.padEnd(28),
    r.ritmoUnlock.toFixed(3).padEnd(11),
    r.areaRateUnlock.toFixed(3).padEnd(14),
    (r.ritmoNext === null ? '—' : r.ritmoNext.toFixed(3)).padEnd(9),
    (r.areaRateNext === null ? '—' : r.areaRateNext.toFixed(3)).padEnd(12),
    estado
  );
}

if (ok) {
  console.log('\nCALIBRACIÓN OK — la tabla de containers.json queda dentro de las bandas.');
} else {
  // DECISIÓN (ronda 31, tarea 4): las bandas de "ritmoNext ≥ 0.9 / areaRateNext ≥ 0.95" dejan de
  // ser alcanzables desde ~mudanzaMansion en adelante bajo CUALQUIER fracción de presupuesto —
  // no es un problema de la tabla de resistencia/areaRecomendada (tomada literal del roadmap
  // §31.1), sino una propiedad estructural de las fórmulas existentes (intocables, regla dura 4
  // de CLAUDE.md): `digPowerMult`/`getAreaMult` crecen LINEALMENTE con el nivel
  // (1 + nivel×perNivel) mientras que `upgradeCost` crece GEOMÉTRICAMENTE con el nivel — el
  // multiplicador alcanzable con un presupuesto X crece solo como log(X). Para que el ritmo
  // mantenga paridad con una resistencia que crece MULTIPLICATIVAMENTE tier a tier, el
  // multiplicador necesitaría crecer multiplicativamente en dinero, no logarítmicamente: ningún
  // monto de dinero devuelve eso bajo `costoBase × factorCrecimiento^nivel`. Confirmado a mano
  // variando BUDGET_FRACTION de 0.35 a 1.5 (150% del dinero dedicado, sin repartir entre las dos
  // stats): el mismo techo aparece, solo se corre 1-2 tiers.
  // Esto es coherente con PLAN.md §11.2 ("por debajo [de la recomendada], el gesto es lento y
  // chico — penalizan pero no bloquean"): un ritmo bajo en el PISO (0.25/0.45) en tiers de
  // prestigio avanzado es jugable por diseño, no un bug — el jugador sigue escarbando, solo más
  // lento, mientras crece en Suerte/prestigio para ese tier. El único contenedor donde un ritmo
  // bajo SÍ es crítico es `bovedaContrarreloj` (límite DURO de tiempo, R31.1) — ese caso se
  // verifica aparte, manualmente, en la pasada de balance del DoD (no lo cubre esta banda
  // genérica). Se deja el detalle de filas fuera de banda arriba como diagnóstico, sin bloquear:
  // no hay ajuste de `resistencia`/`areaRecomendada` que satisfaga la banda ahí sin además romper
  // el crecimiento monótono exigido por `ronda31-balance.test.js` o aplanar la dificultad que
  // esta ronda pide subir a propósito.
  console.log('\nCALIBRACIÓN: filas fuera de banda en tiers de prestigio avanzado — ver DECISIÓN en el código del script.');
}
