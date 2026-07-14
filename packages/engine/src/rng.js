/**
 * Toda la aleatoriedad del juego vive acá: rareza, trampa, fluctuación de mercado.
 * Aislado del resto del engine para poder testear con una función `random` inyectada (seed-able).
 */

/**
 * Pesos de probabilidad entre la categoría común y la rara de un contenedor (2 categorías).
 * Factorizado de rollCategory para que economy.js (Suerte recomendada) y offline.js (estimación
 * de ganancia automática) puedan calcular el mismo reparto sin duplicar la fórmula (PLAN.md §11.2/§11.3).
 * @param {Array<string>} categorias - categorías posibles del contenedor, en orden de rareza creciente.
 * @param {number} luck
 * @param {number} [levelShift] - puntos porcentuales extra hacia la categoría rara por nivel de contenedor (§11.3).
 * @returns {Object<string, number>} peso (0-1) por id de categoría
 */
export function categoryWeights(categorias, luck, levelShift = 0) {
  if (categorias.length === 1) return { [categorias[0]]: 1 };
  // Peso base 70/30 entre la categoría común y la rara del contenedor; la Suerte desplaza
  // hasta +20 puntos porcentuales, y el nivel del contenedor (§11.3) suma encima, con un
  // tope conjunto de 70% para que la categoría común nunca desaparezca del todo.
  const luckShift = Math.min(20, luck * 0.15);
  const pHigh = Math.min(70, 30 + luckShift + levelShift);
  return {
    [categorias[0]]: (100 - pHigh) / 100,
    [categorias[categorias.length - 1]]: pHigh / 100,
  };
}

/**
 * @param {Array<string>} categorias - categorías posibles del contenedor, en orden de rareza creciente.
 * @param {number} luck
 * @param {number} [levelShift] - ver categoryWeights.
 * @param {() => number} [random]
 * @returns {string} id de la categoría elegida
 */
export function rollCategory(categorias, luck, levelShift = 0, random = Math.random) {
  if (categorias.length === 1) return categorias[0];
  const weights = categoryWeights(categorias, luck, levelShift);
  const pHigh = weights[categorias[categorias.length - 1]] * 100;
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

/** Orden de evaluación acumulativa de rollTrapGrade — fijo, no depende del orden de claves del JSON. */
const TRAP_GRADE_ORDER = ['leve', 'normal', 'grave'];

/**
 * §4.21 — roll secundario e independiente del grado de una trampa ya confirmada. NUNCA cambia
 * la probabilidad de caer en trampa (eso lo decide rollIsTrap antes); solo decide cuánto duele.
 * @param {{ leve: number, normal: number, grave: number }} gradosProb - data/traps.json, suman 1
 * @param {() => number} [random]
 * @returns {'leve' | 'normal' | 'grave'}
 */
export function rollTrapGrade(gradosProb, random = Math.random) {
  const r = random();
  let cumulative = 0;
  for (const grade of TRAP_GRADE_ORDER) {
    cumulative += gradosProb[grade];
    if (r < cumulative) return grade;
  }
  return 'grave'; // fallback de punto flotante (cumulative ligeramente < 1 por redondeo)
}

/**
 * §4.26 — tira si aparece un legendario en este escarbado (roll independiente, solo se
 * consume cuando el llamador decide rollear: escarbado manual exitoso, ver rollContainerResult).
 * @param {number} legendaryChance
 * @param {() => number} [random]
 * @returns {boolean}
 */
export function rollLegendary(legendaryChance, random = Math.random) {
  return random() < legendaryChance;
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
