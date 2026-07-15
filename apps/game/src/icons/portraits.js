/**
 * Registro de retratos SVG de los NPCs (ronda 23, PLAN.md §2.9, roadmap §3.1). Hermano de
 * icons.js: mismo vocabulario de shapes (trazo `currentColor`, viewBox 24), cero emojis. Cada
 * NPC se diferencia por un accesorio simple (peinado/anteojos/turbante/gorra/bigote), no por
 * un retrato fotorrealista — coherente con el resto del arte del juego (ronda 29 lo reemplaza
 * por ilustración real si corresponde, mismo criterio que los íconos de ítems).
 */

const VIEWBOX = '0 0 24 24';

/** Cara base compartida (óvalo + ojos + boca neutra) que cada retrato completa con su accesorio. */
const FACE_BASE = '<ellipse cx="12" cy="13" rx="6" ry="7"/><circle cx="9.5" cy="12" r="0.8"/><circle cx="14.5" cy="12" r="0.8"/><path d="M9.5 16c1 1 4 1 5 0"/>';

const PORTRAITS = {
  // Doña Rita: rodete + anteojos redondos, jubilada coleccionista.
  rita:
    FACE_BASE +
    '<circle cx="12" cy="4.5" r="2"/>' +
    '<circle cx="9.5" cy="12" r="2" fill="none"/><circle cx="14.5" cy="12" r="2" fill="none"/><line x1="11.5" y1="12" x2="12.5" y2="12"/>',
  // El Turco Salomón: turbante + bigote grande, regateador teatral.
  salomon:
    FACE_BASE +
    '<path d="M6 8a6 6 0 0 1 12 0z"/><circle cx="12" cy="5" r="1.2"/>' +
    '<path d="M8.5 15.5c1-1.2 2-1.2 3.5-1.2s2.5 0 3.5 1.2"/>',
  // Chispa: gorra con visera + goggles, pibe fanático de robots.
  chispa:
    FACE_BASE +
    '<path d="M6 9a6 6 0 0 1 12 0h-12z"/><path d="M6 9h-2.5l1-2z"/>' +
    '<circle cx="9.5" cy="12" r="1.8" fill="none"/><circle cx="14.5" cy="12" r="1.8" fill="none"/><line x1="11.3" y1="12" x2="12.7" y2="12"/>',
  // Madame Zoraida: pañuelo con nudo + aros colgantes, vidente del barrio.
  zoraida:
    FACE_BASE +
    '<path d="M6 8a6 6 0 0 1 12 0v1.5h-12z"/><path d="M16 8l2.5 2"/>' +
    '<line x1="6.5" y1="14" x2="6.5" y2="16.5"/><circle cx="6.5" cy="17.3" r="0.7"/>' +
    '<line x1="17.5" y1="14" x2="17.5" y2="16.5"/><circle cx="17.5" cy="17.3" r="0.7"/>',
  // El Intendente: gorra de funcionario con visera recta + bigote prolijo.
  intendente:
    FACE_BASE +
    '<rect x="6.5" y="5.5" width="11" height="3" rx="0.5"/><rect x="5.5" y="8" width="4" height="1.2"/>' +
    '<path d="M9 15.5c1-1 2-1 3-1s2 0 3 1"/>',
};

/**
 * @param {string} npcId - clave `portrait` de npcs.json (con o sin el prefijo `portrait-`).
 * @param {{ size?: number, className?: string, color?: string }} [opts]
 * @returns {string} markup `<svg>` listo para innerHTML.
 */
export function portraitMarkup(npcId, opts = {}) {
  const { size = 48, className = '', color = '' } = opts;
  const key = npcId.replace(/^portrait-/, '');
  const inner = PORTRAITS[key] || FACE_BASE;
  const style = color ? ` style="color:${color}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="portrait${className ? ` ${className}` : ''}" data-portrait="${key}" width="${size}" height="${size}" ` +
    `viewBox="${VIEWBOX}" fill="none" stroke="currentColor" stroke-width="1.4"${style} ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
  );
}

/** @returns {boolean} true si el NPC tiene un retrato dedicado (no cae en la cara base genérica). */
export function hasPortrait(npcId) {
  return Boolean(PORTRAITS[npcId.replace(/^portrait-/, '')]);
}

// exportado para tests
export { PORTRAITS };
