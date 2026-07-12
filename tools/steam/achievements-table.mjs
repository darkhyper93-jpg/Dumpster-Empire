/**
 * Genera la tabla Markdown de logros para el panel de Steamworks (Stats & Achievements)
 * a partir de la data real del juego. Se corre desde la raíz del repo:
 *
 *   node tools/steam/achievements-table.mjs
 *
 * La salida (stdout) se pega en tools/steam/RELEASE.md cada vez que cambia
 * apps/game/src/data/achievements.json. NO hardcodea conteos: recorre la data
 * (regla de ROADMAPv3.md §0 — los conteos son indicativos).
 *
 * DECISIÓN: script versionado en vez del "one-liner" literal del roadmap — el mapeo de
 * condiciones legibles no sobrevive al quoting de PowerShell en una sola línea; el comando
 * para regenerar sigue siendo una línea.
 */
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf-8'));
const achievements = read('apps/game/src/data/achievements.json');
const containers = read('apps/game/src/data/containers.json');
const items = read('apps/game/src/data/items.json');

const containerName = (id) => containers.find((c) => c.id === id)?.name ?? id;
const categoryName = (id) => items.rarities.find((r) => r.id === id)?.name ?? id;
const num = (n) => n.toLocaleString('es-AR');

/** @type {Record<string, (cond: any) => string>} Render legible por tipo de condición. */
const COND = {
  totalMoneyEarnedAtLeast: (c) => `Ganar $${num(c.value)} en total`,
  itemsFoundCountAtLeast: (c) => `Encontrar ${num(c.value)} objeto${c.value === 1 ? '' : 's'}`,
  categoryFoundAtLeast: (c) => `Encontrar ${num(c.value)} objeto${c.value === 1 ? '' : 's'} de ${categoryName(c.categoria)}`,
  allContainersOwned: () => 'Poseer todos los contenedores',
  allAutomationsOwned: () => 'Comprar todas las máquinas de automatización',
  prestigeCountAtLeast: (c) => `Prestigiar ${num(c.value)} ${c.value === 1 ? 'vez' : 'veces'}`,
  trapsHitAtLeast: (c) => `Caer en ${num(c.value)} trampas`,
  autoProcessedCountAtLeast: (c) => `Que el robot procese ${num(c.value)} contenedores`,
  allUpgradeLevelsAtLeast: (c) => `Todas las mejoras rápidas a nivel ${num(c.value)}+`,
  trapsDiscardedAtLeast: (c) => `Que el robot descarte ${num(c.value)} contenedores con trampa`,
  containerOwnedAtLeast: (c) => `Poseer ${num(c.value)} × ${containerName(c.containerId)}`,
};

const reward = (r) => (r.type === 'keys'
  ? `${num(r.amount)} Llave${r.amount === 1 ? '' : 's'} de Ciudad`
  : `$${num(r.amount)}`);

const rows = achievements.map((a) => {
  const render = COND[a.cond.type];
  if (!render) throw new Error(`Tipo de condición sin render legible: ${a.cond.type} (${a.id})`);
  return `| \`${a.id}\` | ${a.name} | ${render(a.cond)} | ${reward(a.reward)} |`;
});

console.log(`Total: ${achievements.length} logros (API Name = id del engine, en orden de data)\n`);
console.log('| API Name | Nombre | Condición | Recompensa |');
console.log('|---|---|---|---|');
console.log(rows.join('\n'));
