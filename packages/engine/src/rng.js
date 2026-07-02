/**
 * Toda la aleatoriedad del juego vive acá: rareza, trampa, fluctuación de mercado.
 * Aislado del resto del engine para poder testear con una función `random` inyectada (seed-able).
 */

/**
 * @param {Array<string>} categorias - categorías posibles del contenedor, en orden de rareza creciente.
 * @param {number} luck
 * @param {() => number} [random]
 * @returns {string} id de la categoría elegida
 */
export function rollCategory(categorias, luck, random = Math.random) {
  if (categorias.length === 1) return categorias[0];
  // Peso base 70/30 entre la categoría común y la rara del contenedor; la Suerte desplaza
  // hasta +20 puntos porcentuales hacia la categoría rara.
  const shift = Math.min(20, luck * 0.15);
  const pHigh = 30 + shift;
  return random() * 100 < pHigh ? categorias[categorias.length - 1] : categorias[0];
}

/**
 * @param {Array<Object>} pool - lista de definiciones de ítem de una categoría (con `valorBase`).
 * @param {() => number} [random]
 * @returns {Object}
 */
export function rollItem(pool, random = Math.random) {
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Variación aleatoria del valor base de un ítem individual (0.85 - 1.15).
 * @param {() => number} [random]
 * @returns {number}
 */
export function rollItemVariance(random = Math.random) {
  return 0.85 + random() * 0.3;
}

/**
 * §4.6 (fuente de aleatoriedad) — tira si el contenedor cae en trampa.
 * @param {number} probTrampaEfectiva
 * @param {() => number} [random]
 * @returns {boolean}
 */
export function rollIsTrap(probTrampaEfectiva, random = Math.random) {
  return random() < probTrampaEfectiva;
}

/**
 * §4.4 — recalcula la fluctuación de mercado si pasaron 60s desde la última vez.
 * @param {number} marketFluctuation
 * @param {number} marketFluctuationAt
 * @param {number} now - epoch ms
 * @param {() => number} [random]
 * @returns {{ marketFluctuation: number, marketFluctuationAt: number }}
 */
export function refreshMarketFluctuation(marketFluctuation, marketFluctuationAt, now, random = Math.random) {
  if (now - marketFluctuationAt <= 60000) {
    return { marketFluctuation, marketFluctuationAt };
  }
  return { marketFluctuation: 0.85 + random() * 0.35, marketFluctuationAt: now };
}
