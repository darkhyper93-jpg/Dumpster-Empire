/**
 * Formato de números grandes para pantalla. Nunca notación científica cruda.
 */

// AJUSTE: PLAN.md §6.4/§10 exige K/M/B/T; se agrega Qa (cuatrillón) para que números
// de late-game post-prestigio (que pueden superar 1e15) sigan sin caer en notación científica.
const SUFFIXES = [
  ['Qa', 1e15],
  ['T', 1e12],
  ['B', 1e9],
  ['M', 1e6],
  ['K', 1e3],
];

/**
 * Formatea un número grande con sufijo K/M/B/T (y Qa para cuatrillones).
 * @param {number} n
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatNumber(n, decimals = 2) {
  const value = Math.floor(n);
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
