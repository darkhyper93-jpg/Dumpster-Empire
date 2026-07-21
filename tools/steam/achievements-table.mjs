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
const prestigeTree = read('apps/game/src/data/prestigeTree.json');

/**
 * Nombre de display de un contenedor. Los tiers PROCEDURALES post-Big Bang (`bigbangPlus<n>`,
 * ronda 26.B) no están en containers.json — se derivan del contenedor base más el sufijo de
 * §4.37, igual que hace la Tienda. Sin esto la tabla mostraba el id crudo (`bigbangPlus5`), que
 * no es copy de jugador (napkin: "ids internos de data mostrados crudos al jugador").
 * @param {string} id
 * @returns {string}
 */
const containerName = (id) => {
  const known = containers.find((c) => c.id === id);
  if (known) return known.name;
  const procedural = /^bigbangPlus([1-9][0-9]?)$/.exec(id);
  if (procedural) return `${containerName('vertederoBigBang')} (Eco ${procedural[1]})`;
  return id;
};
const categoryName = (id) => items.rarities.find((r) => r.id === id)?.name ?? id;
const prestigeNodeName = (id) => prestigeTree.find((n) => n.id === id)?.name ?? id;
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
  // Ronda 33: los tipos que sumaron las rondas 19-27. El `throw` de abajo los venía marcando
  // como faltantes desde la ronda 19 — la tabla no se regeneraba desde entonces (§3.4: solo la
  // ronda de release la regenera).
  digStreakAtLeast: (c) => `Llegar a una racha de ${num(c.value)} escarbados sin trampa`,
  gravesHitAtLeast: (c) => `Caer en ${num(c.value)} trampas graves`,
  allToolsOwned: () => 'Comprar todas las herramientas de escarbado',
  legendariesFoundAtLeast: (c) => `Encontrar ${num(c.value)} objeto${c.value === 1 ? '' : 's'} legendario${c.value === 1 ? '' : 's'}`,
  setsCompletedAtLeast: (c) => `Completar ${num(c.value)} set${c.value === 1 ? '' : 's'} de colección`,
  stallInventoryAtLeast: (c) => `Guardar ${num(c.value)} objeto${c.value === 1 ? '' : 's'} en el Puesto de Chatarra`,
  ordersFulfilledAtLeast: (c) => `Cumplir ${num(c.value)} pedido${c.value === 1 ? '' : 's'} de Salomón`,
  stallLevelAtLeast: (c) => `Subir el Puesto de Chatarra a nivel ${num(c.value)}`,
  missionsCompletedAtLeast: (c) => `Completar ${num(c.value)} misión${c.value === 1 ? '' : 'es'} diaria${c.value === 1 ? '' : 's'}`,
  eventsUsedAtLeast: (c) => `Aprovechar ${num(c.value)} evento${c.value === 1 ? '' : 's'} de contenedor (dorado o en llamas)`,
  challengesCompletedAtLeast: (c) => `Completar ${num(c.value)} desafío${c.value === 1 ? '' : 's'} de prestigio`,
  anyPrestigeNodeLevelAtLeast: (c) =>
    `Llevar a nivel ${num(c.value)} alguno de: ${c.nodeIds.map(prestigeNodeName).join(', ')}`,
  specializationsUsedAtLeast: (c) => `Usar ${num(c.value)} especializacion${c.value === 1 ? '' : 'es'} distintas al prestigiar`,
  galaxyMoveCountAtLeast: (c) => `Hacer ${num(c.value)} Mudanza${c.value === 1 ? '' : 's'} de Galaxia`,
  fleetSizeAtLeast: (c) => `Tener una flota de ${num(c.value)} robots`,
  filteredProcessedCountAtLeast: (c) => `Que los filtros de la flota descarten ${num(c.value)} contenedores`,
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
