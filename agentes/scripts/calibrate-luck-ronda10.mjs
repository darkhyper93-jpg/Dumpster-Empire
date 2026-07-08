/**
 * Calibración ronda 10: sube la Suerte recomendada de cada contenedor pago a un target más
 * alto escalando SOLO los valorBase de su pool en items.json (fórmulas y containers intactos).
 *
 * Método: el ENGINE es el oráculo. getRecommendedLuck(neutral, c, items, data) es monótona
 * decreciente respecto de un factor de escala f aplicado a los valorBase del pool (el bruto
 * es lineal en valorBase). Se busca por bisección el intervalo de f donde rec == target y se
 * toma su centro geométrico, para que el redondeo a 3 cifras significativas no lo saque del
 * intervalo. Al final se VERIFICA rec == target exacto; si algo no coincide, NO escribe nada
 * y sale con código 1.
 *
 * Uso: node agentes/scripts/calibrate-luck-ronda10.mjs   (desde cualquier cwd)
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

const OUTPUT_PATH = 'C:\\Users\\SANTI\\AppData\\Local\\Temp\\claude\\C--Users-SANTI-Desktop-dumpire\\de151f00-4a31-4865-8e7f-2f1a574ee2e2\\scratchpad\\items.calibrated.ronda10.json';

const TARGETS = {
  contenedorBarrio: 8,
  containerIndustrial: 20,
  depositoAbandonado: 40,
  mudanzaMansion: 72,
  galeriaLiquidacion: 120,
  bovedaPerdida: 190,
  containerExtradimensional: 290,
};

const neutral = freshState();

/** rec del contenedor con su pool escalado por f (sin redondear, para la búsqueda). */
function recAtScale(container, f) {
  const scaled = {
    rarities: items.rarities,
    containers: {
      ...items.containers,
      [container.id]: items.containers[container.id].map((it) => ({ ...it, valorBase: it.valorBase * f })),
    },
  };
  return getRecommendedLuck(neutral, container, scaled, data);
}

/** Redondeo a 3 cifras significativas, granularidad mínima 0.1 (legible en UI; el tacho ya usa 2.2). */
function round3sig(x) {
  const exp = Math.floor(Math.log10(x)) - 2;
  // Para x < 100 se redondea vía enteros/décimas (dividir, no multiplicar por 0.1) para que
  // el JSON quede limpio (1.9, no 1.9000000000000001).
  if (exp <= -1) return Math.round(x * 10) / 10;
  const mag = Math.pow(10, exp);
  return Math.round(x / mag) * mag;
}

/** Menor f (bisección) tal que rec(f) <= recWanted. rec es decreciente en f. */
function minScaleFor(container, recWanted) {
  let lo = 1e-4; // rec(lo) altísima (pool casi sin valor)
  let hi = 100; // rec(hi) = 0 (pool carísimo)
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (recAtScale(container, mid) <= recWanted) hi = mid;
    else lo = mid;
  }
  return hi;
}

let ok = true;
for (const container of containers) {
  const target = TARGETS[container.id];
  if (target === undefined) continue;
  const fEnter = minScaleFor(container, target); // desde acá rec == target
  const fExit = minScaleFor(container, target - 1); // desde acá rec < target
  const f = Math.sqrt(fEnter * fExit); // centro geométrico del intervalo rec == target
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
