/**
 * Módulo mínimo de i18n (RONDA14-PLAN.md, Agente D). Buildless: se importa por ruta relativa
 * (`../i18n/i18n.js`), sin tocar el importmap ni la CSP de index.html. Sin selector de idioma
 * visible todavía — `setLanguage` se llama una sola vez al bootear con `state.language`.
 */

import { SUPPORTED_LANGUAGES } from '@dumpster/engine';
import es from './es.js';
import en from './en.js';

const DICTIONARIES = { es, en };

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
