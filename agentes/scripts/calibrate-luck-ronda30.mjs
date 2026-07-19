/**
 * Calibración ronda 30: fija la Suerte recomendada de los DOS contenedores especiales nuevos
 * (Reactor de Cuásar, Horizonte de Sucesos) escalando SOLO los `valorBase` de su pool en
 * items.json — fórmulas y containers.json intactos (regla dura 4 de CLAUDE.md).
 *
 * Por qué hace falta: `fase9-balance.test.js` exige que la Suerte recomendada CREZCA
 * estrictamente contenedor a contenedor en el orden del array y se mantenga < 1000. Los dos
 * nuevos van al final, después de `sotanoSinLuz` (930), así que su ventana es 931..999.
 *
 * Método (mismo que ronda 10/11): el ENGINE es el oráculo. `getRecommendedLuck` es monótona
 * DECRECIENTE respecto del factor de escala `f` aplicado a los valorBase del pool (el bruto es
 * lineal en valorBase). Se busca por bisección el intervalo de `f` donde rec == target y se
 * toma su centro geométrico, para que el redondeo a 4 cifras significativas no lo saque del
 * intervalo. Al final se VERIFICA rec == target exacto; si algo no coincide, NO escribe nada.
 *
 * Uso: node agentes/scripts/calibrate-luck-ronda30.mjs [rutaDeSalida]
 * Salida: la ruta pedida (o el items.calibrated.json de al lado) — NUNCA escribe directo la data.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { freshState } from '../../packages/engine/src/state.js';
import { getRecommendedLuck } from '../../packages/engine/src/economy.js';

const dataUrl = (name) => new URL(`../../apps/game/src/data/${name}`, import.meta.url);
const j = (name) => JSON.parse(readFileSync(dataUrl(name), 'utf8'));
const containers = j('containers.json');
const items = j('items.json');
const data = { upgrades: j('upgrades.json'), automations: j('automations.json'), prestigeTree: j('prestigeTree.json') };

const OUTPUT_PATH = process.argv[2] || new URL('./items.calibrated.ronda30.json', import.meta.url).pathname;

// AJUSTE (ronda 30): la ventana entre sotanoSinLuz (930) y el techo de 1000 del test es
// angosta; 950/970 la reparten dejando aire arriba por si una ronda futura suma otro especial.
const TARGETS = {
  reactorDeCuasar: 950,
  horizonteDeSucesos: 970,
};

const neutral = freshState();

/** 4 cifras significativas: la grilla fina que ya usó la ronda 11 para clavar el target exacto. */
function round4sig(x) {
  if (x === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(x)));
  const factor = 10 ** (3 - mag);
  return Math.round(x * factor) / factor;
}

/** Recommended luck del contenedor con su pool escalado por `f`. */
function recWithScale(containerId, base, f) {
  const scaled = { ...items, containers: { ...items.containers } };
  scaled.containers[containerId] = base.map((it) => ({ ...it, valorBase: it.valorBase * f }));
  const container = containers.find((c) => c.id === containerId);
  return getRecommendedLuck(neutral, container, scaled, data);
}

const out = { ...items, containers: { ...items.containers } };
let ok = true;

for (const [containerId, target] of Object.entries(TARGETS)) {
  const base = items.containers[containerId];
  if (!base) {
    console.error(`FALTA el pool de ${containerId} en items.json`);
    ok = false;
    continue;
  }

  // Bisección sobre el EXPONENTE (escala logarítmica): rec(f) es decreciente en f.
  // Se buscan los bordes del intervalo [fLow, fHigh] donde rec == target.
  const bounds = (predicate) => {
    let lo = -40;
    let hi = 40;
    for (let i = 0; i < 200; i += 1) {
      const mid = (lo + hi) / 2;
      if (predicate(recWithScale(containerId, base, 2 ** mid))) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  };
  // Primer f con rec <= target (borde superior de f para ese target).
  const fAtOrBelow = 2 ** bounds((rec) => rec <= target);
  // Primer f con rec < target (o sea: donde se pasa de largo).
  const fBelow = 2 ** bounds((rec) => rec < target);
  const fMid = Math.sqrt(fAtOrBelow * fBelow);

  const scaled = base.map((it) => ({ ...it, valorBase: round4sig(it.valorBase * fMid) }));
  const rec = recWithScale(containerId, scaled, 1);
  const estado = rec === target ? 'OK' : 'FALLÓ';
  if (rec !== target) ok = false;
  console.log(
    `${containerId.padEnd(20)} f=${fMid.toExponential(4)}  rec=${rec} (target ${target})  ${estado}`
  );
  out.containers[containerId] = scaled;
}

// Verificación global: la secuencia completa tiene que crecer estrictamente y no llegar a 1000.
const recs = containers
  .filter((c) => c.costoInicial > 0)
  .map((c) => ({ id: c.id, rec: getRecommendedLuck(neutral, c, out, data) }));
for (let i = 1; i < recs.length; i += 1) {
  if (recs[i].rec <= recs[i - 1].rec) {
    console.error(`NO CRECE: ${recs[i - 1].id}=${recs[i - 1].rec} -> ${recs[i].id}=${recs[i].rec}`);
    ok = false;
  }
}
for (const r of recs) {
  if (r.rec >= 1000) {
    console.error(`FUERA DE RANGO: ${r.id}=${r.rec} (el test exige < 1000)`);
    ok = false;
  }
}

if (!ok) {
  console.error('\nCALIBRACIÓN FALLÓ — no se escribe nada.');
  process.exit(1);
}
writeFileSync(OUTPUT_PATH, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nCALIBRACIÓN OK -> ${OUTPUT_PATH}`);
console.log(recs.map((r) => `  ${r.id.padEnd(28)} ${r.rec}`).join('\n'));
