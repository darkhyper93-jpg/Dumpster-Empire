/**
 * Formato de números grandes para pantalla. Nunca notación científica cruda.
 */

// AJUSTE (ronda 26.B, PLAN.md §4.37, regla CLAUDE.md "nunca notación científica cruda"): los
// tiers procedurales post-Big Bang (costoInicial × 15^n) pueden superar 1e15 ya desde tiers bajos
// — se extiende la tabla hasta 1e48 (escala corta: Qa=cuatrillón, Qi=quintillón, Sx=sextillón,
// Sp=septillón, Oc=octillón, No=nonillón, Dc=decillón, UDc/DDc/TDc=un-/duo-/tredecillón,
// QaDc/QiDc=cuatuor-/quindecillón). El tope de tier procedural (PROCEDURAL_CONTAINER_MAX_N=25,
// procedural.js) se eligió para que ningún costo/valor visible necesite un sufijo más allá de
// QiDc.
const SUFFIXES = [
  ['QiDc', 1e48],
  ['QaDc', 1e45],
  ['TDc', 1e42],
  ['DDc', 1e39],
  ['UDc', 1e36],
  ['Dc', 1e33],
  ['No', 1e30],
  ['Oc', 1e27],
  ['Sp', 1e24],
  ['Sx', 1e21],
  ['Qi', 1e18],
  ['Qa', 1e15],
  ['T', 1e12],
  ['B', 1e9],
  ['M', 1e6],
  ['K', 1e3],
];

// AJUSTE (auditoría de release): techo de PRESENTACIÓN. `addMoney`/`addKeys` clampean a
// `Number.MAX_VALUE` (~1.8e308) para no desbordar a Infinity —que `JSON.stringify` serializa como
// `null` y brickearía el save—, pero formatear ESE valor daba `(1.8e308 / 1e48).toFixed(2)`: un
// string de ~261 dígitos seguido de "QiDc", ilegible y capaz de reventar el layout del topbar.
// Por encima de 1000×QiDc (el último sufijo de la tabla) se muestra el tope con "+". El máximo
// alcanzable JUGANDO es ~2.5e47 (tier procedural 25, ver procedural.js), así que ningún valor
// legítimo llega acá: solo un save manipulado o el propio clamp anti-Infinity.
const DISPLAY_CEILING = 1e51;
const DISPLAY_CEILING_LABEL = '999.99QiDc+';

/**
 * Formatea un número grande con sufijo K/M/B/T/Qa/Qi/Sx/Sp/Oc/No/Dc/UDc/DDc/TDc/QaDc/QiDc.
 * @param {number} n
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatNumber(n, decimals = 2) {
  const value = Math.floor(n);
  if (value >= DISPLAY_CEILING) return DISPLAY_CEILING_LABEL;
  if (value < 1000) return String(value);
  for (const [suffix, threshold] of SUFFIXES) {
    if (value >= threshold) return (value / threshold).toFixed(decimals) + suffix;
  }
  return String(value);
}

/**
 * Formatea un monto de dinero con el símbolo `$`.
 * @param {number} n
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatMoney(n, decimals = 2) {
  return '$' + formatNumber(n, decimals);
}
