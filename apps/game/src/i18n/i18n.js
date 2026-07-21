/**
 * Módulo mínimo de i18n (RONDA14-PLAN.md, Agente D). Buildless: se importa por ruta relativa
 * (`../i18n/i18n.js`), sin tocar el importmap ni la CSP de index.html. Sin selector de idioma
 * visible todavía — `setLanguage` se llama una sola vez al bootear con `state.language`.
 */

import { SUPPORTED_LANGUAGES } from '@dumpster/engine';
import es from './es.js';
import en from './en.js';
import pt from './pt.js';
import fr from './fr.js';
import de from './de.js';

/**
 * Diccionarios de UI por idioma. Exportado (ronda 33) para que los tests de paridad los deriven
 * de `SUPPORTED_LANGUAGES` en vez de importarlos a mano: si el allow-list del engine y este mapa
 * dejan de coincidir, el test falla.
 * @type {Object<string, Object<string, string>>}
 */
export const DICTIONARIES = { es, en, pt, fr, de };

let current = 'es';

/**
 * Cambia el idioma activo. Se ignora silenciosamente si `lang` no está en `SUPPORTED_LANGUAGES`
 * (mismo allow-list que valida `save.js` — nunca deja pasar un valor fuera de la lista).
 * @param {string} lang
 */
export function setLanguage(lang) {
  if (SUPPORTED_LANGUAGES.includes(lang)) current = lang;
}

/** @returns {string} */
export function getLanguage() {
  return current;
}

/**
 * Idioma inicial para una partida NUEVA a partir del locale del navegador. Ronda 33: el mapeo
 * cubre los cinco idiomas soportados (es/en/pt/fr/de) y cae a inglés para cualquier otro locale.
 * Pura a propósito (R-16.8): recibe el valor por parámetro y nunca toca `navigator`, así es
 * testeable en Node — el caller (main.js) le pasa `globalThis.navigator?.language`.
 *
 * El match es por SUBTAG primario (lo anterior al primer '-'), no por prefijo de string: así
 * 'et-EE' (estonio) no se confunde con 'es' ni 'nl-NL' con alemán.
 * @param {string | undefined} navLang - típicamente navigator.language
 * @returns {string} siempre un valor de SUPPORTED_LANGUAGES
 */
export function resolveInitialLanguage(navLang) {
  if (typeof navLang !== 'string') return 'en';
  const primarySubtag = navLang.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(primarySubtag) ? primarySubtag : 'en';
}

/**
 * Traduce una clave del diccionario activo e interpola `{param}` con `params.param`.
 * NO sanitiza el resultado: los `params` que vengan de `state` siguen las reglas de siempre
 * antes de llegar a `innerHTML` (números con `Number(x) || 0`, strings resueltos contra data
 * estática ANTES de pasarlos — nunca un id crudo del jugador).
 * @param {string} key - clave del diccionario, ej. 'automation.explainer'
 * @param {Object<string,string|number>} [params] - interpola {name} → params.name
 * @returns {string} el texto traducido; si la clave no existe, devuelve la clave tal cual
 *   (detectable en tests/e2e en vez de mostrar un hueco vacío en pantalla)
 */
export function t(key, params) {
  const dict = DICTIONARIES[current] || DICTIONARIES.es;
  const template = dict[key];
  if (typeof template !== 'string') return key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}
