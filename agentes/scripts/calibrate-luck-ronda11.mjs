/**
 * Calibración ronda 11: sube la Suerte recomendada de los 4 contenedores de prestigio nuevos
 * a un target más alto escalando SOLO los valorBase de su pool en items.json (fórmulas y
 * containers intactos).
 *
 * Método: el ENGINE es el oráculo. getRecommendedLuck(neutral, c, items, data) es monótona
 * decreciente respecto de un factor de escala f aplicado a los valorBase del pool (el bruto
 * es lineal en valorBase). Se busca por bisección el intervalo de f donde rec == target y se
 * toma su centro geométrico, para que el redondeo a 3 cifras significativas no lo saque del
 * intervalo. Al final se VERIFICA rec == target exacto; si algo no coincide, NO escribe nada
 * y sale con código 1.
 *
 * Uso: node agentes/scripts/calibrate-luck-ronda11.mjs   (desde cualquier cwd)
 * Salida: scratchpad (NUNCA directo a apps/game/src/data) — se copia a mano si CALIBRACION OK.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { freshState } from '../../packages/engine/src/state.js';
import { getRecommendedLuck } from '../../packages/engine/src/economy.js';

const dataUrl = (name) => new URL(`../../apps/game/src/data/${name}`, import.meta.url);
const j = (name) => JSON.parse(readFileSync(dataUrl(name), 'utf8'));
const containers = j('containers.json');
const items = j('items.json');
const data = { upgrades: j('upgrades.json'), automations: j('automations.json'), prestigeTree: j('prestigeTree.json') };

const OUTPUT_PATH = 'C:\\Users\\SANTI\\AppData\\Local\\Temp\\claude\\C--Users-SANTI-Desktop-dumpire\\d1772ee9-531d-45a5-b699-3b435007de44\\scratchpad\\items.calibrated.ronda11.json';

const TARGETS = {
  convoyFantasma: 340,
  criptaColeccionista: 420,
  estacionOrbital: 500,
  vertederoDivino: 580,
};

const neutral = freshState();

// AJUSTE (ronda 11): 4 cifras significativas en vez de 3 — con costoInicial de hasta 2e13 los
// valorBase escalados caen en el orden de millones (round3sig redondearía a decenas de miles,
// una grilla demasiado gruesa para clavar un target exacto de Suerte recomendada; total dinero
// en pantalla igual se formatea K/M/B, así que la cifra de más no afecta legibilidad real).
function round3sig(x) {
  const exp = Math.floor(Math.log10(x)) - 3;
  if (exp <= -1) return Math.round(x * 10) / 10;
  const mag = Math.pow(10, exp);
  return Math.round(x / mag) * mag;
}

// AJUSTE (ronda 11): rec se evalúa sobre los valores YA REDONDEADOS a 3 cifras significativas
// (no sobre el escalado exacto) — con costoInicial en el orden de 1e10-1e13 el redondeo por sí
// solo puede mover el rec en ±1, y la ronda 10 no lo notó porque sus costos eran mucho más chicos.
function recAtScale(container, f) {
  const scaled = {
    rarities: items.rarities,
    containers: {
      ...items.containers,
      [container.id]: items.containers[container.id].map((it) => ({
        ...it,
        valorBase: round3sig(it.valorBase * f),
      })),
    },
  };
  return getRecommendedLuck(neutral, container, scaled, data);
}

/** Menor f (bisección) tal que rec(f) <= recWanted. rec es decreciente en f. */
function minScaleFor(container, recWanted) {
  let lo = 1e-4; // rec(lo) altísima (pool casi sin valor)
  // AJUSTE (ronda 11): hi sube de 100 a 1e8 — los costoInicial de los contenedores de prestigio
  // (5e9 a 2e13) son órdenes de magnitud más grandes que los de ronda 10; el factor de escala
  // necesario para que el pool los compense es mucho mayor que en los tiers anteriores.
  let hi = 1e8; // rec(hi) = 0 (pool carísimo)
  for (let i = 0; i < 120; i++) {
    const mid = Math.sqrt(lo * hi);
    if (recAtScale(container, mid) <= recWanted) hi = mid;
    else lo = mid;
  }
  return hi;
}

// AJUSTE (ronda 11): con costoInicial de 1e10-1e13 el redondeo a 3 cifras significativas puede
// hacer que rec "salte" de target+1 a target-1 sin pasar por target exacto en el punto medio
// geométrico de la bisección (no pasa en ronda 10 porque sus costos son mucho más chicos). Se
// hace un escaneo fino alrededor del intervalo de bisección para encontrar un f que SÍ dé
// rec === target exacto antes de rendirse.
function findExactScale(container, target) {
  const fEnter = minScaleFor(container, target); // desde acá rec <= target
  const fExit = minScaleFor(container, target - 1); // desde acá rec <= target-1
  if (recAtScale(container, fEnter) === target) return fEnter;
  const lo = Math.log(Math.min(fEnter, fExit) * 0.5);
  const hi = Math.log(Math.max(fEnter, fExit) * 2);
  const STEPS = 20000;
  for (let i = 0; i <= STEPS; i++) {
    const f = Math.exp(lo + ((hi - lo) * i) / STEPS);
    if (recAtScale(container, f) === target) return f;
  }
  return null;
}

let ok = true;
for (const container of containers) {
  const target = TARGETS[container.id];
  if (target === undefined) continue;
  const f = findExactScale(container, target);
  if (f === null) {
    ok = false;
    console.log(container.id.padEnd(26), `target=${String(target).padStart(3)}`, '** NO SE ENCONTRO f EXACTO **');
    continue;
  }
  for (const item of items.containers[container.id]) {
    item.valorBase = round3sig(item.valorBase * f);
  }
  const rec = getRecommendedLuck(neutral, container, items, data);
  const pass = rec === target;
  if (!pass) ok = false;
  console.log(
    container.id.padEnd(26),
    `target=${String(target).padStart(3)}`,
    `rec=${String(rec).padStart(3)}`,
    `f=${f.toFixed(4)}`,
    pass ? 'OK' : '** NO COINCIDE **'
  );
}

if (!ok) {
  console.error('\nCALIBRACION FALLIDA — NO se escribió nada');
  process.exit(1);
}
writeFileSync(OUTPUT_PATH, JSON.stringify(items, null, 2) + '\n', 'utf8');
console.log(`\nCALIBRACION OK — escrito en ${OUTPUT_PATH}`);
