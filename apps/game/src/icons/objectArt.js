/**
 * Registro de objetos ILUSTRADOS para el canvas de escarbado (ronda 29, PLAN.md §5.5).
 * Hermano de `icons.js` pero con OTRO contrato: viewBox 96 (no 24) y composición por PARTES
 * en tres capas — body (silueta con gradientes de volumen) + material (overlay
 * semitransparente reutilizable, recortado a la silueta) + details (1-3 rasgos propios del
 * ítem). Cero DOM en la composición: `composeObjectArt` devuelve un string SVG y corre igual
 * en Node (Vitest) que en el navegador; solo `getObjectImage` toca `Image` (browser).
 *
 * Los `artKey` son los ids `icon` de la DATA ESTÁTICA (items.json / legendaries.json /
 * tools.json), nunca strings del save: el llamador (DigCanvas) recibe los ítems ya resueltos
 * por el engine desde la data. Un artKey sin entrada devuelve null y el canvas cae al render
 * clásico (círculo + glifo) — fallback incremental: las tandas de arte (agentes B y C de la
 * ronda 29) migran ids de PENDING_ART a ART sin big-bang y un ítem futuro nunca rompe el canvas.
 */

const ART_VIEWBOX = 96;

/** Rotación "enterrada" máxima, en grados (±). Parte del contrato visual de PLAN.md §5.5. */
export const ART_ROTATION_MAX_DEG = 15;

/** Rango de escala natural relativa por ítem (PLAN.md §5.5): SOLO estética, la huella jugable
 *  (`OBJECT_RADIUS` del canvas) no cambia — ver R29.2 del roadmap. */
const ART_SCALE_MIN = 0.7;
const ART_SCALE_MAX = 1.4;

// ---------------------------------------------------------------------------
// Color: paleta derivada de un único color base.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ArtPalette
 * @property {string} base - color principal del cuerpo
 * @property {string} light - cara iluminada (gradientes)
 * @property {string} dark - cara en sombra
 * @property {string} deep - sombra profunda / huecos
 * @property {string} accent - brillo especular / realce
 */

/** @param {string} hex - `#rrggbb` @returns {[number, number, number]} */
function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** @param {number[]} rgb @returns {string} `#rrggbb` */
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

/** Mezcla lineal `a`→`b` en fracción `t` (0 = a, 1 = b). */
function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((c, i) => c + (cb[i] - c) * t));
}

/**
 * Deriva la paleta completa de un objeto desde UN color base (tono de la categoría de rareza
 * con variación por ítem — PLAN.md §5.5). Determinística: los agentes de arte eligen un hex y
 * las cinco caras salen solas, coherentes entre todo el catálogo.
 * @param {string} baseHex - `#rrggbb`
 * @returns {ArtPalette}
 */
export function paletteFrom(baseHex) {
  return {
    base: baseHex.toLowerCase(),
    light: mixHex(baseHex, '#ffffff', 0.4),
    dark: mixHex(baseHex, '#000000', 0.35),
    deep: mixHex(baseHex, '#000000', 0.62),
    accent: mixHex(baseHex, '#ffffff', 0.75),
  };
}

// ---------------------------------------------------------------------------
// Capa 1 — BODIES: siluetas con volumen por gradiente.
// ---------------------------------------------------------------------------

/**
 * Contrato de un body (referencia para los agentes de arte B/C):
 * @typedef {Object} ArtBody
 * @property {(p: ArtPalette, uid: string) => string} defs - gradientes propios; TODO id interno
 *   va prefijado con `uid` (los SVG de la Vitrina pueden convivir inline en el mismo DOM).
 * @property {(p: ArtPalette, uid: string) => string} paint - las formas rellenas (el objeto).
 * @property {string} clip - la silueta como elementos SVG para `<clipPath>`: material y details
 *   se recortan a ella y nunca se salen del objeto.
 *
 * Los dos bodies de abajo son las implementaciones de REFERENCIA del sistema (agente A):
 * muestran gradiente lineal (cilindro) y radial+lineal (vidrio). Las tandas B/C agregan el
 * resto del vocabulario (engranaje, ancla, cuadro, …) siguiendo este mismo contrato.
 */

/**
 * Esquemas de gradiente compartidos por los bodies de las tandas de arte (ronda 29.B): cuatro
 * direcciones de volumen (cilindro horizontal, cara vertical, plano diagonal, esfera) cubren
 * casi todo el vocabulario; un body solo define gradientes propios si necesita otra dirección.
 * La luz viene SIEMPRE de arriba-izquierda (coherencia de catálogo).
 * @type {Record<string, (id: string, p: ArtPalette) => string>}
 */
const GRAD = {
  cyl: (id, p) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${p.dark}"/><stop offset="0.3" stop-color="${p.light}"/>` +
    `<stop offset="0.6" stop-color="${p.base}"/><stop offset="1" stop-color="${p.deep}"/>` +
    `</linearGradient>`,
  vert: (id, p) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${p.light}"/><stop offset="0.55" stop-color="${p.base}"/>` +
    `<stop offset="1" stop-color="${p.dark}"/></linearGradient>`,
  diag: (id, p) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${p.light}"/><stop offset="0.5" stop-color="${p.base}"/>` +
    `<stop offset="1" stop-color="${p.deep}"/></linearGradient>`,
  orb: (id, p) =>
    `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.8">` +
    `<stop offset="0" stop-color="${p.light}"/><stop offset="0.55" stop-color="${p.base}"/>` +
    `<stop offset="1" stop-color="${p.deep}"/></radialGradient>`,
};

/** Gradiente de acero fijo para hojas/filos (daga, espada, pala): el metal pulido no sale de
 *  la paleta del ítem (que colorea mango/empuñadura) — mismo criterio literal que MATERIALS. */
const steelGrad = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
  `<stop offset="0" stop-color="#8d9aa8"/><stop offset="0.45" stop-color="#eef3f8"/>` +
  `<stop offset="1" stop-color="#5c6a78"/></linearGradient>`;

const BODIES = {
  // Lata/cilindro: gradiente lineal horizontal (borde en sombra → centro iluminado → borde) +
  // tapa elíptica con su propio gradiente. La silueta de referencia del vocabulario.
  can: {
    defs: (p, uid) =>
      `<linearGradient id="${uid}-side" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${p.dark}"/><stop offset="0.28" stop-color="${p.light}"/>` +
      `<stop offset="0.55" stop-color="${p.base}"/><stop offset="1" stop-color="${p.deep}"/>` +
      `</linearGradient>` +
      `<linearGradient id="${uid}-lid" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${p.light}"/><stop offset="1" stop-color="${p.dark}"/>` +
      `</linearGradient>`,
    paint: (p, uid) =>
      `<path d="M24 22v52a24 10 0 0 0 48 0V22z" fill="url(#${uid}-side)"/>` +
      `<ellipse cx="48" cy="22" rx="24" ry="10" fill="url(#${uid}-lid)" stroke="${p.deep}" stroke-width="1.5"/>` +
      `<ellipse cx="48" cy="22" rx="18" ry="7" fill="none" stroke="${p.dark}" stroke-width="1.2"/>`,
    clip: '<path d="M24 22v52a24 10 0 0 0 48 0V22a24 10 0 0 0-48 0z"/>',
  },

  // Botella: cuello + hombros + cuerpo, gradiente lineal de volumen y brillo radial de vidrio.
  bottle: {
    defs: (p, uid) =>
      `<linearGradient id="${uid}-glass" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${p.dark}"/><stop offset="0.35" stop-color="${p.light}"/>` +
      `<stop offset="0.6" stop-color="${p.base}"/><stop offset="1" stop-color="${p.deep}"/>` +
      `</linearGradient>` +
      `<radialGradient id="${uid}-glow" cx="0.38" cy="0.3" r="0.5">` +
      `<stop offset="0" stop-color="${p.accent}" stop-opacity="0.9"/>` +
      `<stop offset="1" stop-color="${p.accent}" stop-opacity="0"/>` +
      `</radialGradient>`,
    paint: (p, uid) =>
      `<path d="M42 8h12v18c0 6 10 10 10 22v30a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V48c0-12 10-16 10-22z" fill="url(#${uid}-glass)"/>` +
      `<rect x="41" y="6" width="14" height="6" rx="2" fill="${p.deep}"/>` +
      `<ellipse cx="44" cy="38" rx="10" ry="16" fill="url(#${uid}-glow)"/>`,
    clip: '<path d="M42 8h12v18c0 6 10 10 10 22v30a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V48c0-12 10-16 10-22z"/>',
  },

  // --- Vocabulario tanda 1 (ronda 29.B): objetos cotidianos ---

  // Lata aplastada: silueta quebrada + boca elíptica ladeada + pliegues.
  canCrushed: {
    defs: (p, uid) => GRAD.cyl(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M22 34 L74 28 L70 44 L77 55 L69 66 L73 78 L25 82 L30 64 L19 52 L27 44 Z" fill="url(#${uid}-b)"/>` +
      `<ellipse cx="48" cy="31" rx="26" ry="6" transform="rotate(-7 48 31)" fill="${p.light}" stroke="${p.deep}" stroke-width="1.5"/>` +
      `<path d="M30 44 L66 40 M26 62 L70 58 M33 72 L69 70" stroke="${p.deep}" stroke-opacity="0.55" stroke-width="1.6" fill="none"/>`,
    clip: '<path d="M22 34 L74 28 L70 44 L77 55 L69 66 L73 78 L25 82 L30 64 L19 52 L27 44 Z"/>',
  },

  // Cáscara de banana: flaps abiertos desde el centro, puntas oscurecidas.
  peel: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M48 62 C38 50 28 30 34 16 C42 22 48 40 49 52 C52 36 60 20 70 16 C72 28 62 46 53 58 C62 52 74 50 82 58 C74 66 60 66 51 63 C44 68 30 68 18 60 C26 52 40 54 48 62 Z" fill="url(#${uid}-b)"/>` +
      `<g fill="${p.deep}"><circle cx="35" cy="18" r="2.6"/><circle cx="69" cy="18" r="2.6"/><circle cx="80" cy="57" r="2.4"/><circle cx="20" cy="59" r="2.4"/></g>` +
      `<path d="M40 34 Q45 46 48 56 M62 30 Q56 44 52 54" stroke="${p.dark}" stroke-opacity="0.5" stroke-width="1.4" fill="none"/>`,
    clip: '<path d="M48 62 C38 50 28 30 34 16 C42 22 48 40 49 52 C52 36 60 20 70 16 C72 28 62 46 53 58 C62 52 74 50 82 58 C74 66 60 66 51 63 C44 68 30 68 18 60 C26 52 40 54 48 62 Z"/>',
  },

  // Colilla: tubo de papel doblado con punta quemada; el filtro toma la paleta del ítem.
  cigarette: {
    defs: (p, uid) =>
      `<linearGradient id="${uid}-paper" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#f2ede2"/><stop offset="0.5" stop-color="#ddd5c4"/>` +
      `<stop offset="1" stop-color="#b3a98f"/></linearGradient>`,
    paint: (p, uid) =>
      `<path d="M34 48 L52 47 L59 62 L35 63 Z" fill="url(#${uid}-paper)"/>` +
      `<path d="M18 52 L34 48 L35 63 L19 64 Z" fill="${p.base}"/>` +
      `<path d="M18 52 L34 48 L34.6 53 L18.4 56 Z" fill="${p.light}" fill-opacity="0.6"/>` +
      `<path d="M52 47 L68 30 L76 38 L60 54 L59 62 Z" fill="#6f695e"/>` +
      `<path d="M66 32 L74 40" stroke="#4a453c" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
      `<circle cx="71" cy="34" r="2.6" fill="#d96a2f"/><circle cx="72" cy="33" r="1.2" fill="#f5b356"/>`,
    clip: '<path d="M18 52 L52 47 L68 30 L76 38 L60 54 L59 62 L19 64 Z"/>',
  },

  // Bolsa/paquete metalizado: almohada crimpada arriba y abajo.
  bag: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M30 22 Q48 15 66 22 L63 28 Q69 48 65 68 L68 76 Q48 83 28 76 L31 68 Q27 48 33 28 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M30 22 L36 26 L42 22 L48 26 L54 22 L60 26 L66 22" stroke="${p.deep}" stroke-width="1.5" fill="none"/>` +
      `<path d="M28 76 L34 72 L40 76 L46 72 L52 76 L58 72 L64 76 L68 76" stroke="${p.deep}" stroke-width="1.5" fill="none"/>` +
      `<path d="M35 30 Q33 48 36 66 M61 30 Q63 48 60 66" stroke="${p.dark}" stroke-opacity="0.5" stroke-width="1.3" fill="none"/>`,
    clip: '<path d="M30 22 Q48 15 66 22 L63 28 Q69 48 65 68 L68 76 Q48 83 28 76 L31 68 Q27 48 33 28 Z"/>',
  },

  // Papel arrugado (servilleta): poliedro de facetas con pliegues radiales.
  crumple: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M22 56 L32 34 L50 22 L70 30 L79 50 L70 68 L52 78 L30 72 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M32 34 L46 50 L70 30 M46 50 L52 78 M46 50 L22 56 M46 50 L79 50" stroke="${p.dark}" stroke-opacity="0.5" stroke-width="1.3" fill="none"/>` +
      `<path d="M32 34 L50 22 L70 30 L46 50 Z" fill="#ffffff" fill-opacity="0.14"/>`,
    clip: '<path d="M22 56 L32 34 L50 22 L70 30 L79 50 L70 68 L52 78 L30 72 Z"/>',
  },

  // Diario doblado en 3/4: la plana superior domina y queda CLARA (el papel tiene que leerse
  // blanco a 40px); solo el canto de páginas y la sombra de apoyo van oscuros.
  newspaper: {
    defs: (p, uid) =>
      `<linearGradient id="${uid}-top" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${p.accent}"/><stop offset="0.6" stop-color="${p.light}"/>` +
      `<stop offset="1" stop-color="${p.base}"/></linearGradient>`,
    paint: (p, uid) =>
      `<path d="M14 42 L58 26 L84 38 L40 56 Z" fill="url(#${uid}-top)"/>` +
      `<path d="M14 42 L40 56 L39 66 L13 52 Z" fill="${p.base}"/>` +
      `<path d="M84 38 L83 48 L39 66 L40 56 Z" fill="${p.dark}"/>` +
      `<path d="M14 45 L39 59 M14 48 L39 62 M84 41 L40 59 M84 44 L40 62" stroke="${p.deep}" stroke-opacity="0.45" stroke-width="0.8" fill="none"/>` +
      `<path d="M40 56 L39 66" stroke="${p.deep}" stroke-opacity="0.7" stroke-width="1.2" fill="none"/>`,
    clip: '<path d="M14 42 L58 26 L84 38 L83 48 L39 66 L13 52 Z"/>',
  },

  // Botín de perfil: caña alta a la izquierda con boca marcada, empeine en diagonal, puntera
  // reforzada a la derecha y suela CLARA de contraste (la silueta de zapato vive en el ángulo
  // caña→empeine→punta; la suela clara la separa del piso a 40px).
  shoe: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M22 66 L22 32 Q22 28 27 28 L42 28 Q46 28 46 33 L46 44 Q56 42 63 48 Q73 52 80 58 Q84 60 84 66 Z" fill="url(#${uid}-b)"/>` +
      `<ellipse cx="34" cy="30" rx="9" ry="3.5" fill="${p.deep}"/>` +
      `<path d="M63 48 Q73 52 80 58 Q84 60 84 66 L62 66 Q60 55 63 48 Z" fill="${p.dark}"/>` +
      `<path d="M20 66 L84 66 L83 75 Q50 79 21 75 Z" fill="#ddd4c0"/>` +
      `<path d="M20 66 L84 66 L83.7 69 L20.6 69 Z" fill="#a89c82"/>` +
      `<path d="M22 44 Q34 46 44 44" stroke="${p.deep}" stroke-opacity="0.55" stroke-width="1.4" fill="none"/>`,
    clip:
      '<path d="M22 66 L22 32 Q22 28 27 28 L42 28 Q46 28 46 33 L46 44 Q56 42 63 48 Q73 52 80 58 Q84 60 84 66 Z"/>' +
      '<path d="M20 66 L84 66 L83 75 Q50 79 21 75 Z"/>',
  },

  // Silla de frente: respaldo de dos parantes con travesaño flojo, asiento y patas.
  chair: {
    defs: (p, uid) => `${GRAD.vert(`${uid}-b`, p)}${GRAD.diag(`${uid}-s`, p)}`,
    paint: (p, uid) =>
      `<path d="M28 12 L68 12 L68 20 L28 20 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M28 12 L34 12 L34 50 L28 50 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M62 12 L68 12 L68 50 L62 50 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M34 28 L62 31 L62 37 L34 34 Z" fill="${p.base}"/>` +
      `<path d="M24 50 L72 50 L72 60 L24 60 Z" fill="url(#${uid}-s)"/>` +
      `<path d="M24 56 L72 56 L72 60 L24 60 Z" fill="${p.deep}" fill-opacity="0.55"/>` +
      `<path d="M27 60 L33 60 L32 84 L28 84 Z" fill="${p.dark}"/>` +
      `<path d="M63 60 L69 60 L68 84 L64 84 Z" fill="${p.dark}"/>`,
    clip:
      '<path d="M28 12 L68 12 L68 20 L28 20 Z"/><path d="M28 12 L34 12 L34 50 L28 50 Z"/>' +
      '<path d="M62 12 L68 12 L68 50 L62 50 Z"/><path d="M34 28 L62 31 L62 37 L34 34 Z"/>' +
      '<path d="M24 50 L72 50 L72 60 L24 60 Z"/><path d="M27 60 L33 60 L32 84 L28 84 Z"/>' +
      '<path d="M63 60 L69 60 L68 84 L64 84 Z"/>',
  },

  // Lámpara de mesa: pantalla trapezoidal, cuello y base acampanada.
  lamp: {
    defs: (p, uid) => `${GRAD.vert(`${uid}-b`, p)}${GRAD.cyl(`${uid}-n`, p)}`,
    paint: (p, uid) =>
      `<path d="M32 14 L64 14 L74 44 L22 44 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M22 44 L74 44 L73 47 L23 47 Z" fill="${p.deep}"/>` +
      `<path d="M45 47 L51 47 L51 68 L45 68 Z" fill="url(#${uid}-n)"/>` +
      `<path d="M36 84 L60 84 Q64 84 62 78 Q56 70 51 68 L45 68 Q40 70 34 78 Q32 84 36 84 Z" fill="url(#${uid}-n)"/>`,
    clip:
      '<path d="M32 14 L64 14 L74 44 L22 47 Z"/><path d="M45 44 L51 44 L51 68 L45 68 Z"/>' +
      '<path d="M36 84 L60 84 Q64 84 62 78 Q56 70 51 68 L45 68 Q40 70 34 78 Q32 84 36 84 Z"/>',
  },

  // Valija: caja redondeada con manija, esquineras y cierres.
  suitcase: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M40 34 L40 26 Q40 22 44 22 L52 22 Q56 22 56 26 L56 34 L50 34 L50 28 L46 28 L46 34 Z" fill="${p.deep}"/>` +
      `<rect x="18" y="34" width="60" height="42" rx="6" fill="url(#${uid}-b)"/>` +
      `<path d="M18 47 L78 47" stroke="${p.deep}" stroke-width="1.6" fill="none"/>` +
      `<rect x="26" y="44" width="7" height="6" rx="1" fill="${p.deep}"/><rect x="63" y="44" width="7" height="6" rx="1" fill="${p.deep}"/>` +
      `<path d="M18 40 Q18 34 24 34 L28 34 Q22 38 22 44 Z" fill="${p.light}" fill-opacity="0.5"/>`,
    clip:
      '<rect x="18" y="34" width="60" height="42" rx="6"/>' +
      '<path d="M40 34 L40 26 Q40 22 44 22 L52 22 Q56 22 56 26 L56 34 L50 34 L50 28 L46 28 L46 34 Z"/>',
  },

  // Espejo de pie ovalado: marco, luna plateada propia y patas.
  mirror: {
    defs: (p, uid) =>
      `${GRAD.diag(`${uid}-f`, p)}` +
      `<linearGradient id="${uid}-glass" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#e9f1f6"/><stop offset="0.5" stop-color="#b9c8d4"/>` +
      `<stop offset="1" stop-color="#84939f"/></linearGradient>`,
    paint: (p, uid) =>
      `<ellipse cx="48" cy="46" rx="27" ry="33" fill="url(#${uid}-f)"/>` +
      `<ellipse cx="48" cy="46" rx="20" ry="26" fill="url(#${uid}-glass)"/>` +
      `<path d="M36 30 Q42 24 50 24" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<path d="M30 74 L40 84 L24 84 Z" fill="${p.dark}"/><path d="M66 74 L72 84 L56 84 Z" fill="${p.dark}"/>`,
    clip: '<ellipse cx="48" cy="46" rx="27" ry="33"/><path d="M30 74 L40 84 L24 84 Z"/><path d="M66 74 L72 84 L56 84 Z"/>',
  },

  // --- Vocabulario tanda 1: industrial y electrónica ---

  // Bicicleta de perfil: ruedas anulares, cuadro en diamante, asiento y manubrio.
  // El clip son solo los discos de rueda (los tubos son trazos, sin área de relleno útil):
  // el material cae sobre las ruedas y el desgaste del cuadro va pintado en el body.
  bike: {
    defs: (p, uid) => GRAD.cyl(`${uid}-f`, p),
    paint: (p, uid) =>
      `<g fill="none" stroke="${p.deep}" stroke-width="4"><circle cx="25" cy="62" r="15"/><circle cx="71" cy="62" r="15"/></g>` +
      `<g fill="none" stroke="${p.dark}" stroke-width="1" stroke-opacity="0.8">` +
      `<path d="M25 47 L25 77 M10 62 L40 62 M15 52 L35 72 M35 52 L15 72"/>` +
      `<path d="M71 47 L71 77 M56 62 L86 62 M61 52 L81 72 M81 52 L61 72"/></g>` +
      `<path d="M25 62 L42 40 L64 40 M42 40 L51 62 L25 62 M51 62 L64 40 L71 62" stroke="url(#${uid}-f)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M64 40 L62 30 Q62 26 71 27" stroke="${p.dark}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<path d="M42 40 L40 31" stroke="${p.dark}" stroke-width="3" fill="none"/>` +
      `<ellipse cx="39" cy="30" rx="6" ry="2.5" fill="${p.deep}"/>` +
      `<circle cx="51" cy="62" r="4" fill="${p.dark}"/>` +
      `<g fill="#7a3d16" fill-opacity="0.55"><circle cx="43" cy="46" r="2.2"/><circle cx="60" cy="41" r="1.8"/><circle cx="49" cy="60" r="1.6"/></g>`,
    clip: '<circle cx="25" cy="62" r="16"/><circle cx="71" cy="62" r="16"/>',
  },

  // Radio capilla: arco de madera, grilla interior, dial y perillas.
  radio: {
    defs: (p, uid) => GRAD.vert(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M24 78 L24 40 Q24 16 48 16 Q72 16 72 40 L72 78 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M32 52 L32 44 Q32 26 48 26 Q64 26 64 44 L64 52 Z" fill="${p.deep}"/>` +
      `<path d="M38 29 L38 52 M48 26 L48 52 M58 29 L58 52" stroke="${p.light}" stroke-opacity="0.4" stroke-width="2" fill="none"/>` +
      `<rect x="24" y="74" width="48" height="4" fill="${p.deep}"/>` +
      `<circle cx="48" cy="63" r="8" fill="${p.light}" stroke="${p.deep}" stroke-width="1.5"/>` +
      `<path d="M48 63 L53 58" stroke="${p.deep}" stroke-width="1.5" fill="none"/>` +
      `<circle cx="32" cy="65" r="3.5" fill="${p.dark}"/><circle cx="64" cy="65" r="3.5" fill="${p.dark}"/>`,
    clip: '<path d="M24 78 L24 40 Q24 16 48 16 Q72 16 72 40 L72 78 Z"/>',
  },

  // Ventilador: aro protector con aspas y pie.
  fan: {
    defs: (p, uid) => `${GRAD.diag(`${uid}-bl`, p)}${GRAD.orb(`${uid}-h`, p)}${GRAD.vert(`${uid}-s`, p)}`,
    paint: (p, uid) =>
      `<circle cx="48" cy="42" r="27" fill="${p.deep}" fill-opacity="0.3"/>` +
      `<g fill="url(#${uid}-bl)">` +
      `<path d="M48 42 Q30 32 34 18 Q46 22 48 42 Z"/>` +
      `<path d="M48 42 Q58 24 72 28 Q68 40 48 42 Z"/>` +
      `<path d="M48 42 Q66 52 62 66 Q50 62 48 42 Z"/>` +
      `<path d="M48 42 Q38 60 24 56 Q28 44 48 42 Z"/></g>` +
      `<g stroke="${p.dark}" stroke-width="1" stroke-opacity="0.65" fill="none">` +
      `<path d="M48 15 L48 69 M21 42 L75 42 M29 23 L67 61 M67 23 L29 61"/></g>` +
      `<circle cx="48" cy="42" r="27" fill="none" stroke="${p.dark}" stroke-width="3"/>` +
      `<circle cx="48" cy="42" r="5.5" fill="url(#${uid}-h)"/>` +
      `<path d="M42 66 L54 66 L58 78 L38 78 Z" fill="url(#${uid}-s)"/>` +
      `<path d="M30 78 L66 78 L66 84 L30 84 Z" fill="${p.dark}"/>`,
    clip: '<circle cx="48" cy="42" r="28.5"/><path d="M42 66 L54 66 L58 78 L38 78 Z"/><path d="M30 78 L66 78 L66 84 L30 84 Z"/>',
  },

  // Rollo de cable: toro visto de frente (evenodd) con punta suelta pelada.
  cableCoil: {
    defs: (p, uid) => GRAD.cyl(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path fill-rule="evenodd" d="M22 48 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0 Z M38 48 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z" fill="url(#${uid}-b)"/>` +
      `<g fill="none" stroke="${p.deep}" stroke-opacity="0.55" stroke-width="1.3">` +
      `<circle cx="48" cy="48" r="14"/><circle cx="48" cy="48" r="18"/><circle cx="48" cy="48" r="22"/></g>` +
      `<path d="M62 64 Q74 70 80 80" stroke="${p.dark}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
      `<path d="M79 79 L86 84 M80 81 L84 88" stroke="${p.light}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    clip:
      '<path fill-rule="evenodd" d="M22 48 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0 Z M38 48 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z"/>' +
      '<path d="M58 62 Q74 68 84 82 L78 86 Q70 74 56 68 Z"/>',
  },

  // Placa electrónica: PCB con CPU, slots, pistas doradas y capacitores.
  board: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<rect x="20" y="26" width="56" height="48" rx="3" fill="url(#${uid}-b)"/>` +
      `<g fill="none" stroke="#d9b44e" stroke-opacity="0.7" stroke-width="1.2">` +
      `<path d="M24 66 L34 66 L38 60 L52 60 M28 30 L28 40 L36 46 M60 70 L60 62 L68 58"/></g>` +
      `<rect x="34" y="38" width="14" height="14" fill="${p.deep}"/>` +
      `<path d="M36 36 L36 38 M40 36 L40 38 M44 36 L44 38 M36 52 L36 54 M40 52 L40 54 M44 52 L44 54" stroke="#c9ccd2" stroke-width="1.2" fill="none"/>` +
      `<rect x="56" y="34" width="14" height="4" rx="1" fill="${p.dark}"/><rect x="56" y="42" width="14" height="4" rx="1" fill="${p.dark}"/>` +
      `<g fill="${p.deep}"><circle cx="28" cy="58" r="2.6"/><circle cx="66" cy="52" r="2.6"/><circle cx="70" cy="30" r="2"/></g>` +
      `<g fill="${p.deep}" fill-opacity="0.8"><circle cx="24" cy="30" r="1.6"/><circle cx="72" cy="70" r="1.6"/><circle cx="24" cy="70" r="1.6"/><circle cx="72" cy="30" r="1.6"/></g>`,
    clip: '<rect x="20" y="26" width="56" height="48" rx="3"/>',
  },

  // Teléfono a disco: base trapezoidal, tubo apoyado y disco de marcar.
  phone: {
    defs: (p, uid) =>
      `${GRAD.vert(`${uid}-b`, p)}` +
      `<linearGradient id="${uid}-h" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${p.base}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>`,
    paint: (p, uid) =>
      `<path d="M22 76 L18 56 Q18 42 34 42 L62 42 Q78 42 78 56 L74 76 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M20 36 Q16 24 30 24 Q38 26 40 32 L56 32 Q58 26 66 24 Q80 24 76 36 L72 40 L24 40 Z" fill="url(#${uid}-h)"/>` +
      `<path d="M40 32 L56 32 L56 36 L40 36 Z" fill="${p.deep}" fill-opacity="0.6"/>` +
      `<circle cx="48" cy="58" r="11" fill="${p.light}" stroke="${p.deep}" stroke-width="1.6"/>` +
      `<g fill="${p.deep}"><circle cx="48" cy="49.5" r="1.8"/><circle cx="55" cy="52" r="1.8"/><circle cx="57" cy="59" r="1.8"/><circle cx="53" cy="65" r="1.8"/><circle cx="43" cy="65" r="1.8"/><circle cx="39" cy="59" r="1.8"/></g>` +
      `<circle cx="48" cy="58" r="3.4" fill="${p.dark}"/>`,
    clip:
      '<path d="M22 76 L18 56 Q18 42 34 42 L62 42 Q78 42 78 56 L74 76 Z"/>' +
      '<path d="M20 36 Q16 24 30 24 Q38 26 40 32 L56 32 Q58 26 66 24 Q80 24 76 36 L72 40 L24 40 Z"/>',
  },

  // Consola: caja chata con cara superior en perspectiva, ranura de cartucho y botones.
  console: {
    defs: (p, uid) => GRAD.vert(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M20 44 L26 32 L70 32 L76 44 Z" fill="${p.light}"/>` +
      `<path d="M20 44 L76 44 L76 68 Q76 72 72 72 L24 72 Q20 72 20 68 Z" fill="url(#${uid}-b)"/>` +
      `<rect x="32" y="35" width="32" height="4" rx="2" fill="${p.deep}"/>` +
      `<circle cx="28" cy="52" r="3" fill="${p.deep}"/>` +
      `<circle cx="62" cy="58" r="3.5" fill="${p.dark}"/><circle cx="70" cy="58" r="3.5" fill="${p.dark}"/>` +
      `<path d="M24 62 L36 62 M24 66 L36 66" stroke="${p.deep}" stroke-opacity="0.6" stroke-width="1.4" fill="none"/>`,
    clip: '<path d="M20 44 L26 32 L70 32 L76 44 L76 68 Q76 72 72 72 L24 72 Q20 72 20 68 Z"/>',
  },

  // Cámara analógica: cuerpo con placa superior, visor prisma, flash y lente.
  camera: {
    defs: (p, uid) =>
      `${GRAD.vert(`${uid}-b`, p)}` +
      `<radialGradient id="${uid}-lens" cx="0.4" cy="0.35" r="0.75">` +
      `<stop offset="0" stop-color="#9db8d9"/><stop offset="0.55" stop-color="#31435e"/>` +
      `<stop offset="1" stop-color="#141c28"/></radialGradient>`,
    paint: (p, uid) =>
      `<path d="M28 30 L44 30 L46 38 L26 38 Z" fill="${p.dark}"/>` +
      `<rect x="58" y="30" width="12" height="8" rx="2" fill="${p.light}"/>` +
      `<rect x="20" y="38" width="56" height="34" rx="4" fill="url(#${uid}-b)"/>` +
      `<rect x="20" y="38" width="56" height="7" fill="${p.light}"/>` +
      `<circle cx="48" cy="57" r="13" fill="${p.deep}"/>` +
      `<circle cx="48" cy="57" r="9.5" fill="url(#${uid}-lens)"/>` +
      `<circle cx="45" cy="54" r="2" fill="#e6f0fa" fill-opacity="0.85"/>` +
      `<circle cx="48" cy="57" r="13" fill="none" stroke="${p.light}" stroke-opacity="0.5" stroke-width="1.2"/>`,
    clip: '<rect x="20" y="38" width="56" height="34" rx="4"/><path d="M28 30 L44 30 L46 38 L26 38 Z"/><rect x="58" y="30" width="12" height="8" rx="2"/>',
  },

  // Televisor CRT: gabinete, pantalla abombada con brillo, panel de perillas y patas.
  tvCrt: {
    defs: (p, uid) =>
      `${GRAD.vert(`${uid}-b`, p)}` +
      `<radialGradient id="${uid}-scr" cx="0.4" cy="0.35" r="0.9">` +
      `<stop offset="0" stop-color="#6a7d80"/><stop offset="1" stop-color="#252e30"/></radialGradient>`,
    paint: (p, uid) =>
      `<rect x="16" y="26" width="64" height="46" rx="5" fill="url(#${uid}-b)"/>` +
      `<rect x="22" y="32" width="42" height="34" rx="6" fill="url(#${uid}-scr)"/>` +
      `<path d="M26 36 Q34 33 42 35 L38 44 Q30 42 26 44 Z" fill="#ffffff" fill-opacity="0.18"/>` +
      `<rect x="66" y="32" width="10" height="34" rx="2" fill="${p.deep}"/>` +
      `<circle cx="71" cy="40" r="3" fill="${p.light}"/><circle cx="71" cy="50" r="3" fill="${p.light}"/>` +
      `<path d="M68 58 L74 58 M68 61 L74 61" stroke="${p.light}" stroke-opacity="0.55" stroke-width="1.2" fill="none"/>` +
      `<path d="M26 72 L34 72 L32 80 L24 80 Z" fill="${p.deep}"/><path d="M62 72 L70 72 L68 80 L60 80 Z" fill="${p.deep}"/>`,
    clip: '<rect x="16" y="26" width="64" height="46" rx="5"/><path d="M26 72 L34 72 L32 80 L24 80 Z"/><path d="M62 72 L70 72 L68 80 L60 80 Z"/>',
  },

  // Disquete 3.5: cuerpo con esquina biselada, obturador metálico y etiqueta.
  floppy: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M26 26 L66 26 L70 30 L70 70 L26 70 Z" fill="url(#${uid}-b)"/>` +
      `<rect x="36" y="26" width="24" height="14" fill="#aeb6bf"/>` +
      `<rect x="52" y="29" width="5" height="8" fill="${p.deep}"/>` +
      `<rect x="32" y="48" width="32" height="18" fill="#e8e2d2"/>` +
      `<path d="M36 54 L60 54 M36 59 L54 59" stroke="#8a8272" stroke-width="1.4" fill="none"/>` +
      `<rect x="28" y="63" width="4" height="4" fill="${p.deep}"/>`,
    clip: '<path d="M26 26 L66 26 L70 30 L70 70 L26 70 Z"/>',
  },

  // --- Vocabulario tanda 1: antigüedades e históricos ---

  // Reloj de bolsillo: caja esférica, esfera clara, corona y eslabones de cadena.
  pocketWatch: {
    defs: (p, uid) => GRAD.orb(`${uid}-b`, p),
    paint: (p, uid) =>
      `<rect x="44" y="24" width="8" height="8" rx="2" fill="${p.dark}"/>` +
      `<circle cx="48" cy="22" r="4" fill="none" stroke="${p.dark}" stroke-width="2.4"/>` +
      `<circle cx="60" cy="15" r="2.6" fill="none" stroke="${p.dark}" stroke-width="1.8"/>` +
      `<circle cx="68" cy="11" r="2.6" fill="none" stroke="${p.dark}" stroke-width="1.8"/>` +
      `<circle cx="48" cy="54" r="23" fill="url(#${uid}-b)"/>` +
      `<circle cx="48" cy="54" r="18" fill="#f2ead8"/>` +
      `<path d="M48 39 L48 42 M48 66 L48 69 M33 54 L36 54 M60 54 L63 54" stroke="#6a5f4a" stroke-width="1.6" fill="none"/>` +
      `<path d="M48 54 L48 44 M48 54 L56 58" stroke="#3a332a" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      `<circle cx="48" cy="54" r="1.8" fill="#3a332a"/>`,
    clip:
      '<circle cx="48" cy="54" r="23"/><rect x="44" y="24" width="8" height="8" rx="2"/>' +
      '<circle cx="48" cy="22" r="6"/><circle cx="60" cy="15" r="4"/><circle cx="68" cy="11" r="4"/>',
  },

  // Ánfora/jarrón: boca, hombros anchos y pie (cilindro con paleta del ítem).
  vase: {
    defs: (p, uid) => GRAD.cyl(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M38 14 L58 14 L55 22 Q72 28 71 48 Q70 70 48 78 Q26 70 25 48 Q24 28 41 22 Z" fill="url(#${uid}-b)"/>` +
      `<ellipse cx="48" cy="15" rx="10" ry="3.5" fill="${p.dark}"/>` +
      `<path d="M34 78 L62 78 L60 84 L36 84 Z" fill="${p.dark}"/>` +
      `<path d="M34 26 Q30 34 30 44" stroke="${p.light}" stroke-opacity="0.6" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    clip:
      '<path d="M38 14 L58 14 L55 22 Q72 28 71 48 Q70 70 48 78 Q26 70 25 48 Q24 28 41 22 Z"/>' +
      '<path d="M34 78 L62 78 L60 84 L36 84 Z"/>',
  },

  // Moneda: disco con anillo interior y busto de perfil en relieve.
  coin: {
    defs: (p, uid) => GRAD.orb(`${uid}-b`, p),
    paint: (p, uid) =>
      `<circle cx="48" cy="50" r="24" fill="url(#${uid}-b)"/>` +
      `<circle cx="48" cy="50" r="19" fill="none" stroke="${p.dark}" stroke-width="1.5"/>` +
      `<path d="M43 40 Q40 46 42 52 Q40 57 44 59 L52 59 Q56 53 54 47 Q56 41 50 38 Q45 36 43 40 Z" fill="${p.dark}" fill-opacity="0.75"/>` +
      `<path d="M38 64 Q48 68 58 64" stroke="${p.dark}" stroke-opacity="0.7" stroke-width="1.4" fill="none"/>`,
    clip: '<circle cx="48" cy="50" r="24"/>',
  },

  // Candelabro de tres brazos con velas a distinta altura y base elíptica.
  candelabrum: {
    defs: (p, uid) => GRAD.cyl(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M46 46 Q30 46 30 32 L36 32 Q36 40 46 40 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M50 46 Q66 46 66 32 L60 32 Q60 40 50 40 Z" fill="url(#${uid}-b)"/>` +
      `<rect x="45" y="34" width="6" height="42" fill="url(#${uid}-b)"/>` +
      `<ellipse cx="48" cy="80" rx="15" ry="4.5" fill="${p.dark}"/>` +
      `<path d="M36 74 L60 74 L62 80 L34 80 Z" fill="url(#${uid}-b)"/>` +
      `<rect x="28" y="26" width="10" height="7" rx="1.5" fill="${p.dark}"/>` +
      `<rect x="43" y="26" width="10" height="7" rx="1.5" fill="${p.dark}"/>` +
      `<rect x="58" y="26" width="10" height="7" rx="1.5" fill="${p.dark}"/>` +
      `<rect x="29.5" y="16" width="7" height="10" rx="1" fill="#efe8d4"/>` +
      `<rect x="44.5" y="12" width="7" height="14" rx="1" fill="#efe8d4"/>` +
      `<rect x="59.5" y="18" width="7" height="8" rx="1" fill="#efe8d4"/>` +
      `<path d="M31 20 q1.5 4 0 6 M46 16 q1.5 5 0 8" stroke="#d9cfb4" stroke-width="1.6" fill="none"/>` +
      `<path d="M33 16 L33 14 M48 12 L48 10 M63 18 L63 16" stroke="#3a332a" stroke-width="1.2" fill="none"/>`,
    clip:
      '<path d="M46 46 Q30 46 30 32 L36 32 Q36 40 46 40 Z"/><path d="M50 46 Q66 46 66 32 L60 32 Q60 40 50 40 Z"/>' +
      '<rect x="45" y="34" width="6" height="42"/><ellipse cx="48" cy="80" rx="15" ry="4.5"/>' +
      '<path d="M36 74 L60 74 L62 80 L34 80 Z"/><rect x="28" y="26" width="10" height="7" rx="1.5"/>' +
      '<rect x="43" y="26" width="10" height="7" rx="1.5"/><rect x="58" y="26" width="10" height="7" rx="1.5"/>' +
      '<rect x="29.5" y="12" width="7" height="14" rx="1"/><rect x="44.5" y="8" width="7" height="18" rx="1"/>' +
      '<rect x="59.5" y="14" width="7" height="12" rx="1"/>',
  },

  // Libro cerrado de frente: tapa, lomo con bandas doradas y canto de páginas.
  book: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M26 26 L68 26 Q72 26 72 30 L72 70 Q72 74 68 74 L26 74 Q22 72 22 68 L22 32 Q22 28 26 26 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M22 32 Q22 28 26 26 L30 26 L30 74 L26 74 Q22 72 22 68 Z" fill="${p.deep}"/>` +
      `<rect x="68" y="30" width="4" height="40" fill="#e9e0c8"/>` +
      `<path d="M69 34 L69 66 M71 36 L71 64" stroke="#b3a789" stroke-width="0.8" fill="none"/>` +
      `<path d="M24 34 L28 34 M24 40 L28 40 M24 62 L28 62 M24 68 L28 68" stroke="#d9b44e" stroke-width="1.6" fill="none"/>` +
      `<rect x="36" y="34" width="26" height="32" fill="none" stroke="${p.light}" stroke-opacity="0.45" stroke-width="1.4"/>`,
    clip: '<path d="M26 26 L68 26 Q72 26 72 30 L72 70 Q72 74 68 74 L26 74 Q22 72 22 68 L22 32 Q22 28 26 26 Z"/>',
  },

  // Máquina de escribir: hoja en el carro, rodillo con perillas, cuerpo y teclado en pendiente.
  typewriter: {
    defs: (p, uid) => `${GRAD.vert(`${uid}-b`, p)}${GRAD.vert(`${uid}-c`, { ...p, light: p.dark, base: p.deep, dark: p.deep })}`,
    paint: (p, uid) =>
      `<rect x="38" y="16" width="22" height="24" fill="#efe8d6"/>` +
      `<path d="M41 22 L57 22 M41 26 L53 26 M41 30 L56 30" stroke="#8a8272" stroke-width="1.2" fill="none"/>` +
      `<rect x="18" y="36" width="60" height="10" rx="4" fill="url(#${uid}-c)"/>` +
      `<circle cx="18" cy="41" r="3.5" fill="${p.deep}"/><circle cx="78" cy="41" r="3.5" fill="${p.deep}"/>` +
      `<path d="M22 50 Q22 44 30 44 L66 44 Q74 44 74 50 L76 66 Q76 72 70 72 L26 72 Q20 72 20 66 Z" fill="url(#${uid}-b)"/>` +
      `<rect x="40" y="46" width="16" height="4" rx="2" fill="${p.deep}"/>` +
      `<g fill="${p.light}" stroke="${p.deep}" stroke-width="0.8">` +
      `<circle cx="32" cy="56" r="2.4"/><circle cx="40" cy="56" r="2.4"/><circle cx="48" cy="56" r="2.4"/><circle cx="56" cy="56" r="2.4"/><circle cx="64" cy="56" r="2.4"/>` +
      `<circle cx="36" cy="62" r="2.4"/><circle cx="44" cy="62" r="2.4"/><circle cx="52" cy="62" r="2.4"/><circle cx="60" cy="62" r="2.4"/></g>` +
      `<rect x="38" y="66" width="20" height="3.5" rx="1.75" fill="${p.light}"/>`,
    clip:
      '<path d="M22 50 Q22 44 30 44 L66 44 Q74 44 74 50 L76 66 Q76 72 70 72 L26 72 Q20 72 20 66 Z"/>' +
      '<rect x="14" y="36" width="68" height="10" rx="4"/><rect x="38" y="16" width="22" height="22"/>',
  },

  // Estatuilla: cabeza, túnica acampanada y peana.
  figurine: {
    defs: (p, uid) => `${GRAD.orb(`${uid}-h`, p)}${GRAD.cyl(`${uid}-b`, p)}`,
    paint: (p, uid) =>
      `<circle cx="48" cy="24" r="9" fill="url(#${uid}-h)"/>` +
      `<path d="M44 31 L52 31 L53 38 Q60 42 58 52 Q62 62 60 70 L36 70 Q34 62 38 52 Q36 42 43 38 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M42 46 Q48 52 54 46" stroke="${p.dark}" stroke-opacity="0.6" stroke-width="1.6" fill="none"/>` +
      `<rect x="32" y="70" width="32" height="10" rx="2" fill="${p.dark}"/>` +
      `<path d="M32 74 L64 74" stroke="${p.deep}" stroke-width="1.2" fill="none"/>`,
    clip:
      '<circle cx="48" cy="24" r="9"/>' +
      '<path d="M44 31 L52 31 L53 38 Q60 42 58 52 Q62 62 60 70 L36 70 Q34 62 38 52 Q36 42 43 38 Z"/>' +
      '<rect x="32" y="70" width="32" height="10" rx="2"/>',
  },

  // Casco militar: cúpula con remaches, visera-ala y barbijo colgando.
  helmet: {
    defs: (p, uid) => GRAD.orb(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M22 52 Q22 22 48 22 Q74 22 74 52 L74 54 L22 54 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M16 55 Q16 50 22 50 L74 50 Q80 50 80 55 Q80 60 74 60 L22 60 Q16 60 16 55 Z" fill="${p.dark}"/>` +
      `<g fill="${p.deep}"><circle cx="26" cy="55" r="1.4"/><circle cx="38" cy="55" r="1.4"/><circle cx="58" cy="55" r="1.4"/><circle cx="70" cy="55" r="1.4"/></g>` +
      `<path d="M40 60 Q48 72 56 60 L56 64 Q48 78 40 64 Z" fill="${p.deep}"/>`,
    clip:
      '<path d="M22 52 Q22 22 48 22 Q74 22 74 54 L22 54 Z"/>' +
      '<path d="M16 55 Q16 50 22 50 L74 50 Q80 50 80 55 Q80 60 74 60 L22 60 Q16 60 16 55 Z"/>' +
      '<path d="M40 60 Q48 72 56 60 L56 64 Q48 78 40 64 Z"/>',
  },

  // Pergamino/mapa: rollos arriba y abajo con la lámina extendida entre ambos.
  scroll: {
    defs: (p, uid) =>
      `<linearGradient id="${uid}-roll" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${p.dark}"/><stop offset="0.4" stop-color="${p.light}"/>` +
      `<stop offset="1" stop-color="${p.deep}"/></linearGradient>` +
      `<linearGradient id="${uid}-sheet" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${p.dark}"/><stop offset="0.2" stop-color="${p.light}"/>` +
      `<stop offset="0.8" stop-color="${p.base}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>`,
    paint: (p, uid) =>
      `<rect x="28" y="32" width="40" height="34" fill="url(#${uid}-sheet)"/>` +
      `<rect x="24" y="22" width="48" height="12" rx="6" fill="url(#${uid}-roll)"/>` +
      `<ellipse cx="25" cy="28" rx="3" ry="6" fill="${p.deep}"/><ellipse cx="71" cy="28" rx="3" ry="6" fill="${p.deep}"/>` +
      `<rect x="24" y="64" width="48" height="12" rx="6" fill="url(#${uid}-roll)"/>` +
      `<ellipse cx="25" cy="70" rx="3" ry="6" fill="${p.deep}"/><ellipse cx="71" cy="70" rx="3" ry="6" fill="${p.deep}"/>`,
    clip:
      '<rect x="22" y="22" width="52" height="12" rx="6"/><rect x="28" y="32" width="40" height="34"/>' +
      '<rect x="22" y="64" width="52" height="12" rx="6"/>',
  },

  // Medalla: cinta acintada con moño de campaña y disco con estrella en relieve.
  medal: {
    defs: (p, uid) => GRAD.orb(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M38 14 L58 14 L58 38 L48 48 L38 38 Z" fill="#8a2f3a"/>` +
      `<path d="M41 14 L44 14 L44 40 L41 37 Z" fill="#d9cfc0" fill-opacity="0.9"/>` +
      `<path d="M52 14 L55 14 L55 37 L52 40 Z" fill="#d9cfc0" fill-opacity="0.9"/>` +
      `<circle cx="48" cy="46" r="3" fill="none" stroke="${p.dark}" stroke-width="2"/>` +
      `<circle cx="48" cy="58" r="17" fill="url(#${uid}-b)"/>` +
      `<circle cx="48" cy="58" r="13.5" fill="none" stroke="${p.dark}" stroke-width="1.2"/>` +
      `<path d="M48 48.5 L50.6 54 L56.6 54.8 L52.3 59 L53.3 65 L48 62.2 L42.7 65 L43.7 59 L39.4 54.8 L45.4 54 Z" fill="${p.dark}" fill-opacity="0.75"/>`,
    clip: '<path d="M38 14 L58 14 L58 38 L48 48 L38 38 Z"/><circle cx="48" cy="58" r="17"/>',
  },

  // Uniforme doblado: casaca con cuello en V, botonera y hombreras.
  uniform: {
    defs: (p, uid) => GRAD.vert(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M24 28 L44 24 L48 30 L52 24 L72 28 L76 72 L20 72 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M44 24 L48 30 L40 36 Z" fill="${p.deep}"/><path d="M52 24 L48 30 L56 36 Z" fill="${p.deep}"/>` +
      `<path d="M48 30 L48 72" stroke="${p.deep}" stroke-width="1.5" fill="none"/>` +
      `<g fill="#d9b44e"><circle cx="52" cy="42" r="1.8"/><circle cx="52" cy="52" r="1.8"/><circle cx="52" cy="62" r="1.8"/></g>` +
      `<rect x="24" y="28" width="13" height="5" rx="2" fill="${p.dark}"/><rect x="59" y="28" width="13" height="5" rx="2" fill="${p.dark}"/>` +
      `<path d="M20 56 L76 56" stroke="${p.dark}" stroke-opacity="0.5" stroke-width="2" fill="none"/>`,
    clip: '<path d="M24 28 L44 24 L48 30 L52 24 L72 28 L76 72 L20 72 Z"/>',
  },

  // --- Vocabulario tanda 1: arte, reliquias y futuristas ---

  // Daga: hoja de acero fijo (steelGrad), guarda, empuñadura y pomo con la paleta del ítem.
  dagger: {
    defs: (p, uid) => `${steelGrad(`${uid}-blade`)}${GRAD.cyl(`${uid}-h`, p)}${GRAD.orb(`${uid}-o`, p)}`,
    paint: (p, uid) =>
      `<path d="M45 10 L51 10 L55 40 L52 60 L44 60 L41 40 Z" fill="url(#${uid}-blade)"/>` +
      `<path d="M48 12 L48 58" stroke="#5c6a78" stroke-width="1" fill="none"/>` +
      `<rect x="33" y="58" width="30" height="7" rx="3" fill="url(#${uid}-h)"/>` +
      `<rect x="43" y="65" width="10" height="15" rx="3" fill="url(#${uid}-h)"/>` +
      `<path d="M44 69 L52 69 M44 73 L52 73 M44 77 L52 77" stroke="${p.deep}" stroke-width="1.2" fill="none"/>` +
      `<circle cx="48" cy="83" r="5" fill="url(#${uid}-o)"/>`,
    clip:
      '<path d="M45 10 L51 10 L55 40 L52 60 L44 60 L41 40 Z"/><rect x="33" y="58" width="30" height="7" rx="3"/>' +
      '<rect x="43" y="65" width="10" height="15" rx="3"/><circle cx="48" cy="83" r="5"/>',
  },

  // Marco (cuadro/foto/grabado): moldura con la paleta del ítem y fondo de lienzo crudo;
  // el contenido (paisaje, retrato sepia, hachurado) lo pintan los details de cada ítem
  // dentro de la ventana (30,30)-(66,66).
  frame: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<rect x="22" y="22" width="52" height="52" rx="2" fill="url(#${uid}-b)"/>` +
      `<rect x="30" y="30" width="36" height="36" fill="#efe6d2"/>` +
      `<rect x="28" y="28" width="40" height="40" fill="none" stroke="${p.deep}" stroke-width="1.6"/>` +
      `<g fill="${p.light}" fill-opacity="0.7"><rect x="22" y="22" width="6" height="6"/><rect x="68" y="22" width="6" height="6"/><rect x="22" y="68" width="6" height="6"/><rect x="68" y="68" width="6" height="6"/></g>`,
    clip: '<rect x="22" y="22" width="52" height="52" rx="2"/>',
  },

  // Bandera: mástil con moharra, paño flameando con borde raído.
  flag: {
    defs: (p, uid) => `${GRAD.diag(`${uid}-b`, p)}${GRAD.cyl(`${uid}-m`, p)}`,
    paint: (p, uid) =>
      `<rect x="24" y="10" width="5" height="74" rx="2" fill="${p.deep}"/>` +
      `<circle cx="26.5" cy="8" r="4" fill="#d9b44e"/>` +
      `<path d="M29 16 L78 22 L73 28 L77 34 L72 40 L76 46 L29 42 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M36 20 Q40 30 36 40 M52 22 Q56 31 52 41" stroke="${p.deep}" stroke-opacity="0.45" stroke-width="2" fill="none"/>`,
    clip: '<rect x="24" y="10" width="5" height="74" rx="2"/><circle cx="26.5" cy="8" r="4"/><path d="M29 16 L78 22 L73 28 L77 34 L72 40 L76 46 L29 42 Z"/>',
  },

  // Tapiz: barral con remates, paño colgante y flecos.
  tapestry: {
    defs: (p, uid) => `${GRAD.vert(`${uid}-b`, p)}${GRAD.cyl(`${uid}-r`, p)}`,
    paint: (p, uid) =>
      `<rect x="20" y="18" width="56" height="7" rx="3" fill="url(#${uid}-r)"/>` +
      `<circle cx="19" cy="21.5" r="4" fill="${p.deep}"/><circle cx="77" cy="21.5" r="4" fill="${p.deep}"/>` +
      `<rect x="24" y="25" width="48" height="50" fill="url(#${uid}-b)"/>` +
      `<path d="M24 75 L28 82 L32 75 L36 82 L40 75 L44 82 L48 75 L52 82 L56 75 L60 82 L64 75 L68 82 L72 75 Z" fill="${p.dark}"/>` +
      `<path d="M32 25 L32 75 M64 25 L64 75" stroke="${p.deep}" stroke-opacity="0.35" stroke-width="1.4" fill="none"/>`,
    clip:
      '<rect x="20" y="18" width="56" height="7" rx="3"/><circle cx="19" cy="21.5" r="4"/><circle cx="77" cy="21.5" r="4"/>' +
      '<rect x="24" y="25" width="48" height="50"/>' +
      '<path d="M24 75 L28 82 L32 75 L36 82 L40 75 L44 82 L48 75 L52 82 L56 75 L60 82 L64 75 L68 82 L72 75 Z"/>',
  },

  // Busto sobre plinto: cabeza, hombros y doble pedestal.
  bust: {
    defs: (p, uid) => `${GRAD.orb(`${uid}-h`, p)}${GRAD.cyl(`${uid}-t`, p)}${GRAD.vert(`${uid}-p`, p)}`,
    paint: (p, uid) =>
      `<circle cx="48" cy="28" r="11" fill="url(#${uid}-h)"/>` +
      `<path d="M44 24 Q46 22 48 24 M45 30 Q48 33 51 30" stroke="${p.deep}" stroke-opacity="0.55" stroke-width="1.4" fill="none"/>` +
      `<path d="M43 37 L53 37 L54 44 Q66 48 68 60 L28 60 Q30 48 42 44 Z" fill="url(#${uid}-t)"/>` +
      `<rect x="38" y="60" width="20" height="8" fill="${p.dark}"/>` +
      `<rect x="32" y="68" width="32" height="10" rx="2" fill="url(#${uid}-p)"/>`,
    clip:
      '<circle cx="48" cy="28" r="11"/><path d="M43 37 L53 37 L54 44 Q66 48 68 60 L28 60 Q30 48 42 44 Z"/>' +
      '<rect x="38" y="60" width="20" height="8"/><rect x="32" y="68" width="32" height="10" rx="2"/>',
  },

  // Máscara: rostro alargado con cuencas profundas, nariz y boca con dientes.
  mask: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M48 14 Q70 18 68 46 Q66 70 48 82 Q30 70 28 46 Q26 18 48 14 Z" fill="url(#${uid}-b)"/>` +
      `<ellipse cx="39" cy="42" rx="5" ry="7" fill="#14100c"/><ellipse cx="57" cy="42" rx="5" ry="7" fill="#14100c"/>` +
      `<path d="M33 34 Q39 30 44 34 M52 34 Q57 30 63 34" stroke="${p.deep}" stroke-width="2" fill="none"/>` +
      `<path d="M48 44 L46 56 L50 56 Z" fill="${p.deep}"/>` +
      `<rect x="41" y="62" width="14" height="5" rx="1" fill="#14100c"/>` +
      `<path d="M44 62 L44 67 M48 62 L48 67 M52 62 L52 67" stroke="${p.light}" stroke-width="1.6" fill="none"/>`,
    clip: '<path d="M48 14 Q70 18 68 46 Q66 70 48 82 Q30 70 28 46 Q26 18 48 14 Z"/>',
  },

  // Corona: aro con puntas rematadas en esferas.
  crown: {
    defs: (p, uid) => `${GRAD.vert(`${uid}-b`, p)}${GRAD.cyl(`${uid}-band`, p)}`,
    paint: (p, uid) =>
      `<path d="M24 68 L26 38 L38 50 L48 28 L58 50 L70 38 L72 68 Z" fill="url(#${uid}-b)"/>` +
      `<circle cx="26" cy="36" r="3.2" fill="${p.light}"/><circle cx="48" cy="26" r="3.2" fill="${p.light}"/><circle cx="70" cy="36" r="3.2" fill="${p.light}"/>` +
      `<path d="M22 62 Q22 60 26 60 L70 60 Q74 60 74 62 L74 72 Q74 74 70 74 L26 74 Q22 74 22 72 Z" fill="url(#${uid}-band)"/>`,
    clip:
      '<path d="M24 68 L26 38 L38 50 L48 28 L58 50 L70 38 L72 68 Z"/>' +
      '<circle cx="26" cy="36" r="3.2"/><circle cx="48" cy="26" r="3.2"/><circle cx="70" cy="36" r="3.2"/>' +
      '<path d="M22 62 Q22 60 26 60 L70 60 Q74 60 74 62 L74 72 Q74 74 70 74 L26 74 Q22 74 22 72 Z"/>',
  },

  // Colgante: cordón en V, engarce y medallón (la gema central la pone el detail del ítem).
  pendant: {
    defs: (p, uid) => GRAD.orb(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M30 12 L34 12 L47 32 L49 32 L62 12 L66 12 L50 37 L46 37 Z" fill="${p.deep}"/>` +
      `<rect x="45" y="34" width="6" height="6" rx="2" fill="${p.dark}"/>` +
      `<circle cx="48" cy="54" r="17" fill="url(#${uid}-b)"/>` +
      `<circle cx="48" cy="54" r="12.5" fill="none" stroke="${p.dark}" stroke-width="1.4"/>`,
    clip: '<path d="M30 12 L34 12 L47 32 L49 32 L62 12 L66 12 L50 37 L46 37 Z"/><rect x="45" y="34" width="6" height="6" rx="2"/><circle cx="48" cy="54" r="17"/>',
  },

  // Cetro: orbe, collar, vara y contera.
  scepter: {
    defs: (p, uid) => `${GRAD.cyl(`${uid}-s`, p)}${GRAD.orb(`${uid}-o`, p)}`,
    paint: (p, uid) =>
      `<circle cx="48" cy="22" r="11" fill="url(#${uid}-o)"/>` +
      `<circle cx="44" cy="18" r="2.4" fill="${p.accent}" fill-opacity="0.85"/>` +
      `<rect x="41" y="32" width="14" height="5" rx="2" fill="${p.dark}"/>` +
      `<rect x="45" y="36" width="6" height="46" rx="2" fill="url(#${uid}-s)"/>` +
      `<path d="M44 82 L52 82 L50 89 L46 89 Z" fill="${p.dark}"/>`,
    clip:
      '<circle cx="48" cy="22" r="11"/><rect x="41" y="32" width="14" height="5" rx="2"/>' +
      '<rect x="45" y="36" width="6" height="46" rx="2"/><path d="M44 82 L52 82 L50 89 L46 89 Z"/>',
  },

  // Hoja suelta (boceto): lámina apaisada con esquina doblada.
  paperSheet: {
    defs: (p, uid) => GRAD.vert(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M28 20 L70 24 L66 74 L24 70 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M66 74 L58 72 L64 64 Z" fill="${p.dark}"/>` +
      `<path d="M28 20 L70 24" stroke="${p.deep}" stroke-opacity="0.4" stroke-width="1.2" fill="none"/>`,
    clip: '<path d="M28 20 L70 24 L66 74 L24 70 Z"/>',
  },

  // Cofre/arca sellada: tapa abombada, frente, flejes y chapa de cerradura.
  chest: {
    defs: (p, uid) =>
      `${GRAD.vert(`${uid}-lid`, p)}` +
      `<linearGradient id="${uid}-front" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${p.base}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>`,
    paint: (p, uid) =>
      `<path d="M20 42 Q20 24 48 24 Q76 24 76 44 L20 44 Z" fill="url(#${uid}-lid)"/>` +
      `<rect x="20" y="44" width="56" height="30" rx="3" fill="url(#${uid}-front)"/>` +
      `<path d="M20 44 L76 44" stroke="${p.deep}" stroke-width="1.6" fill="none"/>` +
      `<rect x="29" y="26" width="7" height="48" fill="${p.deep}"/><rect x="60" y="26" width="7" height="48" fill="${p.deep}"/>` +
      `<g fill="${p.light}" fill-opacity="0.6"><circle cx="32.5" cy="32" r="1.2"/><circle cx="32.5" cy="52" r="1.2"/><circle cx="32.5" cy="68" r="1.2"/><circle cx="63.5" cy="32" r="1.2"/><circle cx="63.5" cy="52" r="1.2"/><circle cx="63.5" cy="68" r="1.2"/></g>` +
      `<rect x="43" y="40" width="10" height="12" rx="2" fill="#d9b44e"/>` +
      `<circle cx="48" cy="45" r="2" fill="#5f4a1e"/><path d="M48 45 L48 49" stroke="#5f4a1e" stroke-width="2" fill="none"/>`,
    clip: '<path d="M20 42 Q20 24 48 24 Q76 24 76 44 L20 44 Z"/><rect x="20" y="44" width="56" height="30" rx="3"/>',
  },

  // Espada: hoja larga con vaceo, guarda recta, empuñadura y pomo.
  sword: {
    defs: (p, uid) => `${steelGrad(`${uid}-blade`)}${GRAD.cyl(`${uid}-h`, p)}${GRAD.orb(`${uid}-o`, p)}`,
    paint: (p, uid) =>
      `<path d="M45 8 L51 8 L53 52 L48 60 L43 52 Z" fill="url(#${uid}-blade)"/>` +
      `<path d="M48 10 L48 56" stroke="#5c6a78" stroke-width="1.2" fill="none"/>` +
      `<rect x="32" y="52" width="32" height="7" rx="3" fill="url(#${uid}-h)"/>` +
      `<rect x="44" y="59" width="8" height="17" rx="3" fill="url(#${uid}-h)"/>` +
      `<path d="M45 63 L51 63 M45 67 L51 67 M45 71 L51 71" stroke="${p.deep}" stroke-width="1.2" fill="none"/>` +
      `<circle cx="48" cy="80" r="6" fill="url(#${uid}-o)"/>`,
    clip:
      '<path d="M45 8 L51 8 L53 52 L48 60 L43 52 Z"/><rect x="32" y="52" width="32" height="7" rx="3"/>' +
      '<rect x="44" y="59" width="8" height="17" rx="3"/><circle cx="48" cy="80" r="6"/>',
  },

  // Cápsula/núcleo: cilindro vertical con bandas y ventana (el glow lo pone el detail).
  core: {
    defs: (p, uid) => GRAD.cyl(`${uid}-b`, p),
    paint: (p, uid) =>
      `<rect x="34" y="18" width="28" height="62" rx="14" fill="url(#${uid}-b)"/>` +
      `<rect x="34" y="26" width="28" height="6" fill="${p.deep}"/>` +
      `<rect x="34" y="66" width="28" height="6" fill="${p.deep}"/>` +
      `<g fill="${p.light}" fill-opacity="0.7"><circle cx="39" cy="29" r="1.3"/><circle cx="57" cy="29" r="1.3"/><circle cx="39" cy="69" r="1.3"/><circle cx="57" cy="69" r="1.3"/></g>` +
      `<ellipse cx="48" cy="49" rx="8" ry="15" fill="#10141a"/>`,
    clip: '<rect x="34" y="18" width="28" height="62" rx="14"/>',
  },

  // Chip: encapsulado con die central y pines laterales.
  chip: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<g fill="#c9ccd2"><rect x="24" y="37" width="6" height="4"/><rect x="24" y="44" width="6" height="4"/><rect x="24" y="51" width="6" height="4"/><rect x="24" y="58" width="6" height="4"/>` +
      `<rect x="66" y="37" width="6" height="4"/><rect x="66" y="44" width="6" height="4"/><rect x="66" y="51" width="6" height="4"/><rect x="66" y="58" width="6" height="4"/></g>` +
      `<rect x="30" y="32" width="36" height="34" rx="2" fill="url(#${uid}-b)"/>` +
      `<circle cx="34" cy="36" r="1.5" fill="${p.deep}"/>` +
      `<rect x="40" y="42" width="16" height="14" fill="${p.deep}"/>`,
    clip:
      '<rect x="30" y="32" width="36" height="34" rx="2"/>' +
      '<rect x="24" y="37" width="6" height="4"/><rect x="24" y="44" width="6" height="4"/><rect x="24" y="51" width="6" height="4"/><rect x="24" y="58" width="6" height="4"/>' +
      '<rect x="66" y="37" width="6" height="4"/><rect x="66" y="44" width="6" height="4"/><rect x="66" y="51" width="6" height="4"/><rect x="66" y="58" width="6" height="4"/>',
  },

  // Implante: cápsula ovoide con electrodos colgantes.
  implant: {
    defs: (p, uid) => GRAD.orb(`${uid}-b`, p),
    paint: (p, uid) =>
      `<ellipse cx="48" cy="44" rx="20" ry="16" fill="url(#${uid}-b)"/>` +
      `<path d="M30 44 Q48 50 66 44" stroke="${p.deep}" stroke-opacity="0.6" stroke-width="1.4" fill="none"/>` +
      `<g fill="#c9ccd2"><path d="M38 58 L41 58 L40 74 L38 74 Z"/><path d="M47 60 L50 60 L49 78 L47 78 Z"/><path d="M56 58 L59 58 L58 72 L56 72 Z"/></g>` +
      `<g fill="${p.deep}"><rect x="38" y="71" width="2.5" height="3"/><rect x="47" y="75" width="2.5" height="3"/><rect x="56" y="69" width="2.5" height="3"/></g>`,
    clip:
      '<ellipse cx="48" cy="44" rx="20" ry="16"/><path d="M38 58 L41 58 L40 74 L38 74 Z"/>' +
      '<path d="M47 60 L50 60 L49 78 L47 78 Z"/><path d="M56 58 L59 58 L58 72 L56 72 Z"/>',
  },

  // Esquirla/cristal facetado: prisma con caras en luz y sombra.
  shard: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M48 8 L64 32 L59 72 L48 86 L37 68 L32 30 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M48 8 L48 86 L37 68 L32 30 Z" fill="${p.dark}" fill-opacity="0.55"/>` +
      `<path d="M48 8 L64 32 L59 72 L48 86 Z" fill="${p.light}" fill-opacity="0.3"/>` +
      `<path d="M48 8 L48 86 M32 30 L48 40 L64 32 M37 68 L48 60 L59 72" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="1" fill="none"/>`,
    clip: '<path d="M48 8 L64 32 L59 72 L48 86 L37 68 L32 30 Z"/>',
  },

  // --- Vocabulario tanda 1: herramientas (se lucen en el selector de Escarbar) ---

  // Guante/mano de trabajo: manopla con dedos marcados y puño.
  hand: {
    defs: (p, uid) => GRAD.diag(`${uid}-b`, p),
    paint: (p, uid) =>
      `<path d="M31 42 Q30 26 39 23 L41 34 L44 20 L50 20 L52 34 L56 21 Q66 24 66 40 L65 60 Q65 72 48 72 Q31 72 31 60 Z" fill="url(#${uid}-b)"/>` +
      `<path d="M41 34 Q42 30 42 24 M52 34 Q52 28 53 23" stroke="${p.deep}" stroke-opacity="0.55" stroke-width="1.4" fill="none"/>` +
      `<rect x="33" y="70" width="30" height="12" rx="4" fill="${p.dark}"/>` +
      `<path d="M33 75 L63 75" stroke="${p.deep}" stroke-width="1.4" fill="none"/>`,
    clip:
      '<path d="M31 42 Q30 26 39 23 L41 34 L44 20 L50 20 L52 34 L56 21 Q66 24 66 40 L65 60 Q65 72 48 72 Q31 72 31 60 Z"/>' +
      '<rect x="33" y="70" width="30" height="12" rx="4"/>',
  },

  // Pala ancha: manija en D, mango y hoja de acero con hombros.
  shovel: {
    defs: (p, uid) => `${GRAD.cyl(`${uid}-s`, p)}${steelGrad(`${uid}-blade`)}`,
    paint: (p, uid) =>
      `<path d="M40 8 L56 8 L56 20 L52 20 L52 14 L44 14 L44 20 L40 20 Z" fill="${p.dark}"/>` +
      `<rect x="45" y="14" width="6" height="34" rx="2" fill="url(#${uid}-s)"/>` +
      `<path d="M42 44 L54 44 L54 48 L42 48 Z" fill="${p.deep}"/>` +
      `<path d="M32 52 Q32 44 48 44 Q64 44 64 52 L61 76 Q56 84 48 84 Q40 84 35 76 Z" fill="url(#${uid}-blade)"/>` +
      `<path d="M32 52 L40 52 L40 48 M64 52 L56 52 L56 48" stroke="#5c6a78" stroke-width="2" fill="none"/>` +
      `<path d="M48 48 L48 80" stroke="#5c6a78" stroke-opacity="0.6" stroke-width="1.2" fill="none"/>`,
    clip:
      '<path d="M40 8 L56 8 L56 20 L52 20 L52 14 L44 14 L44 20 L40 20 Z"/><rect x="45" y="14" width="6" height="34" rx="2"/>' +
      '<path d="M32 52 Q32 44 48 44 Q64 44 64 52 L61 76 Q56 84 48 84 Q40 84 35 76 Z"/>',
  },

  // Pincel fino: mango torneado, virola metálica y cerdas en punta.
  brush: {
    defs: (p, uid) =>
      `${GRAD.cyl(`${uid}-h`, p)}` +
      `<linearGradient id="${uid}-bristle" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#8a6a42"/><stop offset="1" stop-color="#3a2c1a"/></linearGradient>`,
    paint: (p, uid) =>
      `<path d="M44 8 L52 8 L51 46 L45 46 Z" fill="url(#${uid}-h)"/>` +
      `<rect x="41" y="46" width="14" height="12" rx="2" fill="#c9ccd2"/>` +
      `<path d="M41 58 Q41 74 48 82 Q55 74 55 58 Z" fill="url(#${uid}-bristle)"/>` +
      `<path d="M48 62 Q47 72 48 78" stroke="#20180e" stroke-opacity="0.6" stroke-width="1" fill="none"/>`,
    clip: '<path d="M44 8 L52 8 L51 46 L45 46 Z"/><rect x="41" y="46" width="14" height="12" rx="2"/><path d="M41 58 Q41 74 48 82 Q55 74 55 58 Z"/>',
  },
};

// ---------------------------------------------------------------------------
// Capa 2 — MATERIALS: overlays semitransparentes reutilizables (se recortan a la silueta
// del body, así que trabajan la caja 96×96 completa sin preocuparse por la forma).
// ---------------------------------------------------------------------------

/** @type {Record<string, (uid: string) => string>} */
const MATERIALS = {
  // Metal rayado: vetas especulares diagonales + rayones finos oscuros.
  metal: () =>
    '<g stroke-linecap="round" fill="none">' +
    '<path d="M10 70L70 10" stroke="#ffffff" stroke-opacity="0.16" stroke-width="7"/>' +
    '<path d="M28 88L88 28" stroke="#ffffff" stroke-opacity="0.10" stroke-width="4"/>' +
    '<path d="M20 60l30-30M40 78l24-24" stroke="#000000" stroke-opacity="0.14" stroke-width="1.2"/>' +
    '</g>',
  // Vidrio: brillo especular fuerte arriba-izquierda + línea de reflejo vertical.
  glass: () =>
    '<g fill="none">' +
    '<ellipse cx="34" cy="30" rx="9" ry="16" fill="#ffffff" fill-opacity="0.28"/>' +
    '<path d="M60 18v56" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M30 78a30 10 0 0 0 36 0" stroke="#000000" stroke-opacity="0.15" stroke-width="2"/>' +
    '</g>',
  // Madera vetada: ondas oscuras horizontales + un nudo.
  wood: () =>
    '<g stroke="#000000" stroke-opacity="0.2" fill="none" stroke-width="1.6">' +
    '<path d="M8 30c20-4 60 4 80 0M8 48c24 5 56-5 80 0M8 66c20-4 60 4 80 0"/>' +
    '<ellipse cx="38" cy="56" rx="5" ry="3"/>' +
    '<path d="M12 20c18 3 54-3 72 0" stroke="#ffffff" stroke-opacity="0.12"/>' +
    '</g>',
  // Tela: trama cruzada tenue.
  fabric: () =>
    '<g stroke-width="1" fill="none">' +
    '<path d="M0 24h96M0 44h96M0 64h96M0 84h96" stroke="#000000" stroke-opacity="0.10"/>' +
    '<path d="M24 0v96M44 0v96M64 0v96M84 0v96" stroke="#ffffff" stroke-opacity="0.07"/>' +
    '</g>',
  // Cerámica craquelada: grietas finas ramificadas + esmalte brillante arriba.
  ceramic: () =>
    '<g fill="none">' +
    '<path d="M30 22l8 14-5 12 9 16M58 30l-6 10 10 12" stroke="#000000" stroke-opacity="0.22" stroke-width="1"/>' +
    '<path d="M38 36l7 2M62 52l6-3" stroke="#000000" stroke-opacity="0.16" stroke-width="0.8"/>' +
    '<ellipse cx="40" cy="22" rx="14" ry="6" fill="#ffffff" fill-opacity="0.2"/>' +
    '</g>',
  // Papel envejecido: fibras horizontales tenues + manchas de foxing (tanda 1, ronda 29.B).
  paper: () =>
    '<g fill="none">' +
    '<path d="M10 22h76M10 38h76M10 54h76M10 70h76" stroke="#000000" stroke-opacity="0.06" stroke-width="1"/>' +
    '<g fill="#8a6a3a" stroke="none"><circle cx="30" cy="30" r="3" fill-opacity="0.18"/><circle cx="64" cy="58" r="4" fill-opacity="0.15"/><circle cx="46" cy="76" r="2.5" fill-opacity="0.18"/></g>' +
    '</g>',
  // Óxido: manchas irregulares cálidas que carcomen los bordes.
  rust: () =>
    '<g fill="#7a3d16" fill-opacity="0.4" stroke="none">' +
    '<path d="M18 58c6-2 8 4 4 7s-10-4-4-7z"/>' +
    '<path d="M64 26c7-3 11 3 6 7-4 3-12-4-6-7z"/>' +
    '<path d="M50 74c5-2 9 2 6 6s-11-3-6-6z"/>' +
    '<circle cx="34" cy="40" r="3"/><circle cx="70" cy="56" r="2.4"/>' +
    '</g>',
};

// ---------------------------------------------------------------------------
// Capa 3 + registro: composiciones por ítem.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ArtDefinition
 * @property {string} body - clave de BODIES
 * @property {string} [material] - clave de MATERIALS
 * @property {ArtPalette|string} palette - paleta completa, o un hex base (pasa por paletteFrom)
 * @property {Array<string|((p: ArtPalette, uid: string) => string)>} [details] - 1-3 rasgos
 *   propios del ítem (abolladura, etiqueta despegada, gema…), recortados a la silueta.
 * @property {number} [scale] - escala natural relativa (clamp 0.7-1.4); default 1.
 */

/**
 * Composiciones por `icon` id de la data. La llenan las tandas de arte de la ronda 29:
 * agente B (pools de contenedores 1-8 + herramientas), agente C (pools 9-16 + especiales de
 * ronda 20 + legendarios). Los tiers procedurales del lategame (ronda 26) NO necesitan entrada
 * propia: reusan los pools reales (su `poolContainerId` apunta a vertederoBigBang), así que el
 * arte del pool del Big Bang los cubre por diseño (contrato §3.5.7 del roadmap v4).
 * @type {Record<string, ArtDefinition>}
 */
const ART = {
  // --- tachoVereda (tanda 1, ronda 29.B) ---
  'can-crushed': {
    body: 'canCrushed',
    material: 'metal',
    palette: '#a6adb8',
    details: [
      '<path d="M24 48 L74 42 L73 58 L23 62 Z" fill="#b8443f" fill-opacity="0.85"/>',
      '<path d="M30 51 L58 48" stroke="#f0e8d8" stroke-width="3" stroke-opacity="0.8" fill="none"/>',
    ],
    scale: 0.8,
  },
  'banana-peel': {
    body: 'peel',
    palette: '#e3c24e',
    details: [
      '<g fill="#6a4e22" fill-opacity="0.65"><circle cx="40" cy="30" r="2.2"/><circle cx="62" cy="28" r="2"/><circle cx="70" cy="56" r="2.2"/><circle cx="30" cy="58" r="1.8"/></g>',
    ],
    scale: 0.85,
  },
  'cigarette-butt': {
    body: 'cigarette',
    palette: '#d9a45e',
    details: ['<path d="M33 48 L34 63" stroke="#b8443f" stroke-width="1.5" fill="none" stroke-opacity="0.8"/>'],
    scale: 0.7,
  },
  'chip-bag': {
    body: 'bag',
    material: 'metal',
    palette: '#c24b52',
    details: [
      '<ellipse cx="48" cy="50" rx="14" ry="9" fill="#f0d8a8" fill-opacity="0.92"/>',
      '<path d="M40 51 Q48 44 56 51" stroke="#b8443f" stroke-width="2.2" fill="none"/>',
    ],
    scale: 0.85,
  },
  'cork-bottle': {
    body: 'can',
    material: 'wood',
    palette: '#bd9059',
    details: [
      '<g fill="#5f4526" fill-opacity="0.5"><circle cx="38" cy="40" r="1.5"/><circle cx="55" cy="52" r="1.8"/><circle cx="44" cy="66" r="1.4"/><circle cx="60" cy="34" r="1.3"/></g>',
    ],
    scale: 0.7,
  },
  'napkin-used': {
    body: 'crumple',
    material: 'paper',
    palette: '#e2dbcb',
    details: ['<path d="M52 44 q8 -2 10 6 q6 2 2 8 q-8 4 -12 -2 q-6 -4 0 -12 z" fill="#a8894e" fill-opacity="0.4"/>'],
    scale: 0.8,
  },

  // --- contenedorBarrio ---
  'newspaper-old': {
    body: 'newspaper',
    material: 'paper',
    palette: '#d5cebc',
    details: [
      '<path d="M22 41 L48 32" stroke="#3a342a" stroke-width="4" fill="none" stroke-opacity="0.8"/>',
      '<path d="M24 46 L46 38 M27 50 L48 42" stroke="#3a342a" stroke-width="1.4" fill="none" stroke-opacity="0.55"/>',
      '<path d="M56 34 L68 30 L72 36 L60 41 Z" fill="#3a342a" fill-opacity="0.4"/>',
    ],
    scale: 0.95,
  },
  'shoe-odd': {
    body: 'shoe',
    material: 'fabric',
    palette: '#8a6544',
    details: [
      '<path d="M26 50 L42 46 M26 55 L43 51 M27 60 L44 56" stroke="#e8e0d0" stroke-width="2" fill="none" stroke-opacity="0.85"/>',
      '<g fill="#3a2c1a" fill-opacity="0.8"><circle cx="26" cy="50" r="1.3"/><circle cx="26" cy="55" r="1.3"/><circle cx="27" cy="60" r="1.3"/></g>',
      '<path d="M72 56 Q78 58 81 62" stroke="#3a2c1a" stroke-width="2" stroke-opacity="0.5" fill="none"/>',
    ],
    scale: 0.9,
  },
  'bottle-plastic': {
    body: 'bottle',
    material: 'glass',
    palette: '#a9d8e4',
    details: [
      '<path d="M34 48 Q48 52 62 48" stroke="#5b8a96" stroke-opacity="0.45" stroke-width="1.5" fill="none"/>',
      '<rect x="33" y="54" width="30" height="12" fill="#e8f0f2" fill-opacity="0.9"/>',
      '<path d="M37 60 L58 60" stroke="#4a7d8a" stroke-width="2" fill="none"/>',
      '<path d="M34 70 Q48 74 62 70" stroke="#5b8a96" stroke-opacity="0.45" stroke-width="1.5" fill="none"/>',
    ],
    scale: 0.9,
  },
  'chair-broken': {
    body: 'chair',
    material: 'wood',
    palette: '#8a5f37',
    details: ['<path d="M50 50 L46 60 L52 60 L44 72" stroke="#241a10" stroke-width="1.6" fill="none"/>'],
    scale: 1.25,
  },
  'lamp-old': {
    body: 'lamp',
    material: 'fabric',
    palette: '#97a052',
    details: [
      '<path d="M40 16 L34 44 M56 16 L62 44" stroke="#4e5228" stroke-opacity="0.5" stroke-width="1.4" fill="none"/>',
      '<path d="M60 24 l4 8 l-6 2 z" fill="#4e5228" fill-opacity="0.45"/>',
    ],
    scale: 1.05,
  },
  'suitcase-worn': {
    body: 'suitcase',
    material: 'fabric',
    palette: '#96703f',
    details: [
      '<rect x="30" y="34" width="7" height="42" fill="#5f4526" fill-opacity="0.75"/>',
      '<rect x="59" y="34" width="7" height="42" fill="#5f4526" fill-opacity="0.75"/>',
      '<circle cx="48" cy="62" r="6" fill="#d9cfb8"/>',
      '<path d="M44 62 Q48 57 52 62 Q48 66 44 62 Z" fill="#b8443f" fill-opacity="0.8"/>',
    ],
    scale: 1.1,
  },
  'mirror-cracked': {
    body: 'mirror',
    palette: '#c0954a',
    details: [
      '<path d="M48 30 L42 44 L52 56 L46 68 M42 44 L34 50 M52 56 L62 52" stroke="#3a4650" stroke-width="1.4" fill="none" stroke-opacity="0.8"/>',
      '<path d="M48 30 L54 40" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1" fill="none"/>',
    ],
    scale: 1.1,
  },

  // --- containerIndustrial ---
  'bike-rusty': { body: 'bike', material: 'rust', palette: '#5b6d78', scale: 1.4 },
  'radio-antique': {
    body: 'radio',
    material: 'wood',
    palette: '#8a5f37',
    details: ['<path d="M40 58 L56 58" stroke="#d9b44e" stroke-width="1.5" fill="none" stroke-opacity="0.8"/>'],
    scale: 1.0,
  },
  'fan-old': {
    body: 'fan',
    material: 'metal',
    palette: '#7fa08e',
    details: ['<g fill="#7a3d16" fill-opacity="0.45"><circle cx="30" cy="30" r="2"/><circle cx="66" cy="52" r="2.4"/></g>'],
    scale: 1.0,
  },
  'copper-cable': {
    body: 'cableCoil',
    material: 'metal',
    palette: '#c07b3a',
    details: ['<rect x="43" y="22" width="10" height="7" rx="2" fill="#3a3f45"/>'],
    scale: 0.9,
  },
  motherboard: {
    body: 'board',
    material: 'metal',
    palette: '#3f7d58',
    details: [
      '<g fill="#2a3438"><circle cx="28" cy="34" r="2.5"/><circle cx="34" cy="34" r="2.5"/></g>',
      '<rect x="24" y="56" width="8" height="12" fill="#1f2a30"/>',
    ],
    scale: 0.95,
  },
  'phone-old': {
    body: 'phone',
    material: 'ceramic',
    palette: '#7d3540',
    details: ['<path d="M24 60 q-3 3 0 6 q3 3 0 6" stroke="#2a1518" stroke-width="2" fill="none"/>'],
    scale: 0.9,
  },
  'console-broken': {
    body: 'console',
    material: 'metal',
    palette: '#6b7480',
    details: [
      '<path d="M58 34 L52 46 L60 52 L54 64" stroke="#1c2126" stroke-width="1.6" fill="none"/>',
      '<circle cx="28" cy="52" r="1.5" fill="#52c2ff"/>',
    ],
    scale: 0.95,
  },

  // --- depositoAbandonado ---
  'camera-analog': {
    body: 'camera',
    material: 'metal',
    palette: '#5c6572',
    details: ['<circle cx="68" cy="48" r="2" fill="#b8443f"/>'],
    scale: 0.85,
  },
  'tv-crt': { body: 'tvCrt', material: 'wood', palette: '#7d5a3a', scale: 1.2 },
  'floppy-disk': {
    body: 'floppy',
    material: 'metal',
    palette: '#3d4b7d',
    details: ['<path d="M36 54 Q44 52 60 54 M36 60 Q46 58 56 60" stroke="#6a6250" stroke-width="1.4" fill="none"/>'],
    scale: 0.75,
  },
  'pocket-watch': { body: 'pocketWatch', material: 'metal', palette: '#cfa64a', scale: 0.7 },
  'porcelain-vase': {
    body: 'vase',
    material: 'ceramic',
    palette: '#e7e1d3',
    details: [
      '<path d="M32 46 Q40 40 48 46 Q56 52 64 46 M34 56 Q41 51 48 56 Q55 61 62 56" stroke="#3e5f8a" stroke-width="2.2" fill="none" stroke-opacity="0.85"/>',
      '<circle cx="48" cy="34" r="3" fill="#3e5f8a" fill-opacity="0.8"/>',
    ],
    scale: 1.0,
  },
  'coin-old': {
    body: 'coin',
    material: 'metal',
    palette: '#c09a48',
    details: ['<path d="M28 40 A24 24 0 0 1 36 30" stroke="#5f4a1e" stroke-width="3" fill="none" stroke-opacity="0.5"/>'],
    scale: 0.7,
  },
  candelabrum: {
    body: 'candelabrum',
    material: 'metal',
    palette: '#b08d3e',
    details: ['<g fill="#5f8a6a" fill-opacity="0.4"><circle cx="47" cy="58" r="2.5"/><circle cx="34" cy="42" r="2"/></g>'],
    scale: 1.1,
  },

  // --- mudanzaMansion ---
  'antique-book': {
    body: 'book',
    material: 'fabric',
    palette: '#7d3b2f',
    details: [
      '<circle cx="49" cy="50" r="6" fill="none" stroke="#d9b44e" stroke-width="1.5"/>',
      '<circle cx="49" cy="50" r="2" fill="#d9b44e"/>',
    ],
    scale: 0.9,
  },
  typewriter: {
    body: 'typewriter',
    material: 'metal',
    palette: '#46525c',
    details: ['<rect x="42" y="50" width="12" height="4" rx="2" fill="#d9b44e" fill-opacity="0.85"/>'],
    scale: 1.05,
  },
  'ivory-figurine': {
    body: 'figurine',
    material: 'ceramic',
    palette: '#e8e0cb',
    details: ['<rect x="32" y="72" width="32" height="3" fill="#b09a6e" fill-opacity="0.7"/>'],
    scale: 0.9,
  },
  'war-helmet': {
    body: 'helmet',
    material: 'metal',
    palette: '#68724f',
    details: [
      '<path d="M36 32 q6 -4 12 0 q-6 4 -12 0 z" fill="#39402c" fill-opacity="0.55"/>',
      '<path d="M56 34 L66 42" stroke="#2e3322" stroke-width="1.4" stroke-opacity="0.7" fill="none"/>',
    ],
    scale: 0.95,
  },
  'map-antique': {
    body: 'scroll',
    material: 'paper',
    palette: '#d3b878',
    details: [
      '<path d="M34 40 Q44 48 40 56 Q52 60 60 52" stroke="#8a2f2a" stroke-width="1.6" stroke-dasharray="3 2" fill="none"/>',
      '<path d="M58 50 L62 54 M62 50 L58 54" stroke="#8a2f2a" stroke-width="2" fill="none"/>',
      '<path d="M32 60 Q40 62 44 60" stroke="#6a5a32" stroke-width="1.2" fill="none" stroke-opacity="0.7"/>',
    ],
    scale: 0.9,
  },
  'military-medal': { body: 'medal', material: 'metal', palette: '#c9a24a', scale: 0.8 },
  'uniform-historic': {
    body: 'uniform',
    material: 'fabric',
    palette: '#455e4c',
    details: ['<rect x="38" y="40" width="8" height="4" fill="#b8443f"/><rect x="47" y="40" width="8" height="4" fill="#3e5f8a"/>'],
    scale: 1.0,
  },

  // --- galeriaLiquidacion ---
  'dagger-ceremonial': {
    body: 'dagger',
    material: 'metal',
    palette: '#b0873e',
    details: [
      '<circle cx="48" cy="83" r="2.6" fill="#b8443f"/>',
      '<path d="M47 16 L48 40" stroke="#c9d4de" stroke-width="0.8" fill="none" stroke-opacity="0.9"/>',
    ],
    scale: 0.85,
  },
  'photo-historic': {
    body: 'frame',
    material: 'paper',
    palette: '#7d5f3a',
    details: [
      '<rect x="30" y="30" width="36" height="36" fill="#c4a878"/>',
      '<circle cx="42" cy="46" r="5" fill="#7d6038"/><path d="M35 60 q7 -9 13 0 z" fill="#7d6038"/>',
      '<circle cx="56" cy="44" r="4.4" fill="#7d6038"/><path d="M50 60 q6 -8 12 0 z" fill="#7d6038"/>',
    ],
    scale: 0.95,
  },
  'regiment-flag': {
    body: 'flag',
    material: 'fabric',
    palette: '#8a2f3a',
    details: [
      '<circle cx="52" cy="30" r="6.5" fill="none" stroke="#d9b44e" stroke-width="1.6"/>',
      '<path d="M52 26 L53.5 29 L57 29.5 L54.5 31.8 L55 35 L52 33.5 L49 35 L49.5 31.8 L47 29.5 L50.5 29 Z" fill="#d9b44e"/>',
    ],
    scale: 1.15,
  },
  'oil-painting': {
    body: 'frame',
    material: 'wood',
    palette: '#c0954a',
    details: [
      '<rect x="30" y="30" width="36" height="36" fill="#a8c4d4"/>',
      '<path d="M30 54 L40 44 L48 52 L58 40 L66 50 L66 66 L30 66 Z" fill="#5f7d4a"/>',
      '<circle cx="58" cy="37" r="4" fill="#f0d890"/>',
    ],
    scale: 1.2,
  },
  'bronze-sculpture': {
    body: 'bust',
    material: 'metal',
    palette: '#8a6a35',
    details: [
      '<path d="M44 22 q6 -3 10 2 q-4 4 -10 -2 z" fill="#5f8a6a" fill-opacity="0.5"/>',
      '<circle cx="60" cy="56" r="2.5" fill="#5f8a6a" fill-opacity="0.5"/>',
    ],
    scale: 1.05,
  },
  'engraving-original': {
    body: 'frame',
    material: 'paper',
    palette: '#5c6572',
    details: [
      '<rect x="30" y="30" width="36" height="36" fill="#e9e2d0"/>',
      '<path d="M32 38 h32 M32 44 h32 M32 50 h32 M32 56 h32 M32 62 h28" stroke="#3a342a" stroke-width="0.8" fill="none" stroke-opacity="0.6"/>',
      '<path d="M38 32 l14 34 M50 32 l10 24" stroke="#3a342a" stroke-width="0.7" fill="none" stroke-opacity="0.45"/>',
    ],
    scale: 0.95,
  },
  'tapestry-antique': {
    body: 'tapestry',
    material: 'fabric',
    palette: '#7d4459',
    details: [
      '<circle cx="48" cy="48" r="11" fill="none" stroke="#d9b44e" stroke-width="1.6" stroke-opacity="0.8"/>',
      '<path d="M48 40 Q54 48 48 56 Q42 48 48 40 Z" fill="#d9b44e" fill-opacity="0.6"/>',
      '<rect x="27" y="28" width="42" height="44" fill="none" stroke="#d9b44e" stroke-width="1.4" stroke-opacity="0.55"/>',
    ],
    scale: 1.25,
  },

  // --- bovedaPerdida ---
  'vase-decorative': {
    body: 'vase',
    material: 'ceramic',
    palette: '#b06a3a',
    details: [
      '<path d="M30 50 h6 v-5 h5 v5 h6 v-5 h5 v5 h6 v-5 h5 v5" stroke="#3a2c1a" stroke-width="1.8" fill="none" stroke-opacity="0.8"/>',
    ],
    scale: 1.0,
  },
  'sketch-master': {
    body: 'paperSheet',
    material: 'paper',
    palette: '#e5dcc6',
    details: [
      '<circle cx="44" cy="36" r="6" fill="none" stroke="#5a4a32" stroke-width="1.4"/>',
      '<path d="M44 42 Q42 54 38 62 M44 42 Q50 52 56 58 M40 48 L52 46" stroke="#5a4a32" stroke-width="1.4" fill="none"/>',
      '<path d="M58 68 l8 -2" stroke="#5a4a32" stroke-width="1" fill="none" stroke-opacity="0.7"/>',
    ],
    scale: 0.9,
  },
  'ritual-mask': {
    body: 'mask',
    material: 'wood',
    palette: '#8a5f2f',
    details: [
      '<path d="M38 26 Q48 22 58 26" stroke="#4a8a8a" stroke-width="3" fill="none" stroke-opacity="0.8"/>',
      '<path d="M34 52 L42 54 M62 52 L54 54" stroke="#b8443f" stroke-width="2.5" fill="none" stroke-opacity="0.8"/>',
    ],
    scale: 0.9,
  },
  'crown-lost': {
    body: 'crown',
    material: 'metal',
    palette: '#d0a848',
    details: [
      '<circle cx="34" cy="67" r="2.6" fill="#b8443f"/><circle cx="48" cy="67" r="2.6" fill="#3e5f8a"/><circle cx="62" cy="67" r="2.6" fill="#4a8a5a"/>',
    ],
    scale: 0.85,
  },
  'amulet-sacred': {
    body: 'pendant',
    material: 'metal',
    palette: '#c9a24a',
    details: [
      '<circle cx="48" cy="54" r="8" fill="#a583ff" fill-opacity="0.35"/>',
      '<circle cx="48" cy="54" r="5" fill="#a583ff"/><circle cx="46" cy="52" r="1.6" fill="#e8dcff"/>',
    ],
    scale: 0.75,
  },
  'scroll-arcane': {
    body: 'scroll',
    material: 'paper',
    palette: '#cdbfa4',
    details: [
      '<rect x="30" y="36" width="36" height="26" fill="#a583ff" fill-opacity="0.12"/>',
      '<path d="M34 42 h4 m-2 -2 v4 M42 46 l4 4 m0 -4 l-4 4 M53 40 h4 l-2 4 z M58 48 h4 m-4 4 h4" stroke="#7d5fd0" stroke-width="1.6" fill="none"/>',
    ],
    scale: 0.9,
  },
  'scepter-royal': {
    body: 'scepter',
    material: 'metal',
    palette: '#c9a24a',
    details: [
      '<circle cx="48" cy="22" r="5" fill="#a583ff"/><circle cx="46" cy="20" r="1.5" fill="#e8dcff"/>',
      '<path d="M45 46 h6 M45 62 h6" stroke="#8a6a20" stroke-width="2" fill="none"/>',
    ],
    scale: 1.0,
  },

  // --- containerExtradimensional ---
  'idol-jade': {
    body: 'figurine',
    material: 'ceramic',
    palette: '#4f9e6a',
    details: [
      '<circle cx="45" cy="23" r="1.5" fill="#c8ffe0"/><circle cx="51" cy="23" r="1.5" fill="#c8ffe0"/>',
      '<path d="M40 54 h16 M39 60 h18" stroke="#1e4a30" stroke-width="1.6" fill="none" stroke-opacity="0.7"/>',
    ],
    scale: 0.9,
  },
  'relic-sealed': {
    body: 'chest',
    material: 'metal',
    palette: '#665a85',
    details: [
      '<circle cx="48" cy="61" r="10" fill="#50ffd6" fill-opacity="0.12"/>',
      '<circle cx="48" cy="61" r="7" fill="none" stroke="#50ffd6" stroke-width="1.6"/>',
      '<path d="M48 54 L48 68 M41 61 L55 61" stroke="#50ffd6" stroke-width="1.4" fill="none"/>',
    ],
    scale: 1.0,
  },
  'legendary-sword': {
    body: 'sword',
    material: 'metal',
    palette: '#b09a50',
    details: [
      '<path d="M45.5 10 L47.5 52" stroke="#50ffd6" stroke-width="1.2" stroke-opacity="0.8" fill="none"/>',
      '<path d="M48 18 l2 4 l-2 4 l-2 -4 z M48 32 l2 4 l-2 4 l-2 -4 z" fill="#50ffd6" fill-opacity="0.85"/>',
      '<circle cx="48" cy="55.5" r="2.2" fill="#50ffd6"/>',
    ],
    scale: 1.2,
  },
  'fusion-core': {
    body: 'core',
    material: 'metal',
    palette: '#5c6a7d',
    details: [
      '<ellipse cx="48" cy="49" rx="7" ry="14" fill="#50ffd6" fill-opacity="0.25"/>',
      '<ellipse cx="48" cy="49" rx="4.5" ry="10" fill="#50ffd6" fill-opacity="0.5"/>',
      '<ellipse cx="48" cy="49" rx="2" ry="6" fill="#d8fff4"/>',
      '<path d="M38 22.5 h6 M48 22.5 h6" stroke="#d9b44e" stroke-width="3" fill="none"/>',
    ],
    scale: 0.9,
  },
  'quantum-chip': {
    body: 'chip',
    material: 'metal',
    palette: '#37414f',
    details: [
      '<path d="M40 44 h-8 M40 49 h-8 M40 54 h-8 M56 44 h8 M56 49 h8 M56 54 h8" stroke="#50ffd6" stroke-width="1.2" fill="none" stroke-opacity="0.9"/>',
      '<rect x="43" y="45" width="10" height="8" fill="none" stroke="#50ffd6" stroke-width="1"/>',
    ],
    scale: 0.75,
  },
  'neural-implant': {
    body: 'implant',
    material: 'metal',
    palette: '#8a94a3',
    details: [
      '<path d="M38 40 Q48 36 58 40 M38 48 Q48 44 58 48" stroke="#ef6bd3" stroke-width="1.4" fill="none" stroke-opacity="0.85"/>',
      '<circle cx="48" cy="44" r="2" fill="#ef6bd3"/>',
    ],
    scale: 0.8,
  },
  'stellar-fragment': {
    body: 'shard',
    material: 'glass',
    palette: '#3e5f8a',
    details: [
      '<circle cx="48" cy="48" r="9" fill="#7da8ff" fill-opacity="0.3"/>',
      '<path d="M48 40 L50 46 L56 48 L50 50 L48 56 L46 50 L40 48 L46 46 Z" fill="#cfe0ff"/>',
      '<path d="M40 24 L44 30 M54 62 L52 68" stroke="#cfe0ff" stroke-width="1.2" stroke-opacity="0.8" fill="none"/>',
    ],
    scale: 0.95,
  },

  // --- herramientas (ronda 20; el selector de Escarbar las muestra ilustradas) ---
  'hands-bare': {
    body: 'hand',
    material: 'fabric',
    palette: '#b3805a',
    details: [
      '<path d="M38 42 q3 -3 6 0 M46 40 q3 -3 6 0 M54 42 q3 -3 6 0" stroke="#6a4a2e" stroke-width="1.3" fill="none" stroke-opacity="0.7"/>',
    ],
    scale: 0.9,
  },
  'shovel-wide': {
    body: 'shovel',
    material: 'metal',
    palette: '#96703f',
    details: [
      '<path d="M40 58 L46 70 M52 56 L56 68" stroke="#5c6a78" stroke-width="1.2" fill="none" stroke-opacity="0.8"/>',
    ],
    scale: 1.2,
  },
  'brush-fine': {
    body: 'brush',
    material: 'wood',
    palette: '#a8794e',
    details: ['<path d="M42 49 h12 M42 52 h12" stroke="#6a7280" stroke-width="1" fill="none"/>'],
    scale: 0.85,
  },
  'glove-hydraulic': {
    body: 'hand',
    material: 'metal',
    palette: '#c9722e',
    details: [
      '<path d="M38 44 L38 62 M58 44 L58 62" stroke="#3a3f45" stroke-width="2.5" fill="none"/>',
      '<g fill="#3a3f45"><circle cx="44" cy="58" r="1.6"/><circle cx="52" cy="58" r="1.6"/></g>',
      '<circle cx="48" cy="66" r="2.5" fill="#ffb627"/>',
    ],
    scale: 1.0,
  },
};

/**
 * Ids de la data que TODAVÍA no tienen composición en ART. El test de cobertura
 * (tests/objectArt.test.js) exige que todo `icon` id de items.json + legendaries.json esté en
 * un lado o el otro: un ítem nuevo obliga a decidir (ilustrar o encolar). Las tandas B/C
 * VACÍAN esta lista al cerrar la ronda 29 — el orden sigue los pools de containers.json para
 * poder cortar por tanda.
 */
export const PENDING_ART = [
  // Tanda 1 (contenedores 1-8 + herramientas) COMPLETA — ronda 29.B. Quedan los pools de la
  // tanda 2 (agente C): contenedores 9-16, especiales de la ronda 20 y legendarios.
  // convoyFantasma
  'cargo-manifest',
  'ghost-lantern',
  'route-compass',
  'sealed-strongbox',
  'captain-ring',
  'cursed-cargo',
  'phantom-bell',
  // criptaColeccionista
  'framed-forgery',
  'marble-bust',
  'lost-masterpiece',
  'burial-mask',
  'grail-replica',
  'saint-reliquary',
  'collector-heart',
  // estacionOrbital
  'heat-shield',
  'zero-g-tool',
  'cosmonaut-log',
  'orbital-gyro',
  'plasma-cell',
  'ai-core-salvaged',
  'station-heart',
  // vertederoDivino
  'titan-bolt',
  'chrono-shard',
  'ambrosia-flask',
  'olympus-circuit',
  'godling-idol',
  'thunder-coil',
  'creation-seed',
  // chatarreriaTitanes
  'rivet-colossal',
  'chain-titanic',
  'anvil-titan',
  'gear-colossus',
  'piston-seismic',
  'core-starforge',
  'heart-automaton',
  // naufragioTemporal
  'compass-reversed',
  'map-extinct',
  'figurehead-ghost',
  'hourglass-frozen',
  'anchor-lostsea',
  'chronometer-eternal',
  'helm-time',
  // archivoMultiverso
  'portrait-alternate',
  'score-silent',
  'sculpture-impossible',
  'tome-unhappened',
  'key-infinite',
  'mirror-timelines',
  'catalog-multiverse',
  // vertederoBigBang (los tiers procedurales de la ronda 26 reusan este pool)
  'dust-firststar',
  'bubble-void',
  'fragment-horizon',
  'echo-bigbang',
  'atom-primordial',
  'spark-genesis',
  'relic-dayzero',
  // bovedaContrarreloj (ronda 20, tanda del Agente C)
  'clock-countdown',
  'vault-door-ajar',
  'ledger-burnt',
  'key-timelock',
  'seal-wax-ancient',
  'coin-uncounted',
  'gem-frozen-time',
  // sotanoSinLuz (ronda 20, tanda del Agente C)
  'painting-unseen',
  'sketch-blind',
  'sculpture-shadow',
  'lantern-extinguished',
  'eye-glass-dark',
  'key-blackened',
  'relic-unlit',
  // legendarios (ronda 22, tanda del Agente C — nivel de detalle máximo del juego)
  'legend-can',
  'legend-bike',
  'legend-core',
  'legend-watch',
  'legend-anchor',
  'legend-muse',
  'legend-relic',
  'legend-seed',
];

// ---------------------------------------------------------------------------
// Composición y pipeline.
// ---------------------------------------------------------------------------

/**
 * Compone el SVG ilustrado de una definición. Pura (sin DOM), exportada para los tests y para
 * que las tandas de arte previsualicen composiciones sueltas.
 * @param {ArtDefinition} def
 * @param {{ size?: number, uid?: string }} [opts] - `uid` namespacia los ids internos
 *   (gradientes/clipPath) para poder inyectar varios SVG inline en el mismo DOM (Vitrina).
 * @returns {string|null} markup `<svg>` (SIEMPRE con xmlns — regla dura: un SVG standalone en
 *   data-URL sin xmlns falla en SILENCIO con naturalWidth 0), o null si el body no existe.
 */
export function composeObjectArt(def, opts = {}) {
  const { size = ART_VIEWBOX, uid = 'oa' } = opts;
  const body = Object.hasOwn(BODIES, def.body) ? BODIES[def.body] : null;
  if (!body) return null;
  const palette = typeof def.palette === 'string' ? paletteFrom(def.palette) : def.palette;
  const clipId = `${uid}-clip`;
  const material = def.material && Object.hasOwn(MATERIALS, def.material) ? MATERIALS[def.material] : null;
  const details = (def.details || [])
    .map((detail) => (typeof detail === 'function' ? detail(palette, uid) : detail))
    .join('');
  const overlay = `${material ? material(uid) : ''}${details}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_VIEWBOX} ${ART_VIEWBOX}" ` +
    `width="${size}" height="${size}" aria-hidden="true">` +
    `<defs>${body.defs(palette, uid)}<clipPath id="${clipId}">${body.clip}</clipPath></defs>` +
    body.paint(palette, uid) +
    (overlay ? `<g clip-path="url(#${clipId})">${overlay}</g>` : '') +
    `</svg>`
  );
}

/**
 * @param {string} artKey - id `icon` de la data estática (jamás un string del save).
 * @returns {boolean} true si el ítem tiene composición ilustrada registrada.
 */
export function hasObjectArt(artKey) {
  return Object.hasOwn(ART, artKey);
}

/**
 * @param {string} artKey
 * @param {{ size?: number }} [opts]
 * @returns {string|null} SVG compuesto del ítem, o null limpio (activa el fallback del canvas).
 */
export function getObjectArtMarkup(artKey, opts = {}) {
  if (!hasObjectArt(artKey)) return null;
  return composeObjectArt(ART[artKey], { size: opts.size ?? ART_VIEWBOX, uid: `oa-${artKey}` });
}

/** Clamp puro del rango de escala de PLAN.md §5.5; no-finito degrada a escala neutra 1. */
export function clampArtScale(scale) {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(ART_SCALE_MAX, Math.max(ART_SCALE_MIN, scale));
}

/**
 * @param {string} artKey
 * @returns {number} escala natural del ítem (clampeada), o 1 si no tiene arte.
 */
export function getObjectScale(artKey) {
  if (!hasObjectArt(artKey)) return 1;
  return clampArtScale(ART[artKey].scale ?? 1);
}

/**
 * Rotación "enterrada" del objeto, determinística por posición YA rolleada por el modelo de
 * revelado (PLAN.md §5.5): el canvas nunca decide presentación por su cuenta — el repintado
 * completo en focus/visibilitychange reproduce el frame idéntico porque esta función siempre
 * devuelve lo mismo para la misma posición. Hash entero (xorshift/imul) → [-15°, +15°] en
 * radianes.
 * @param {number} x
 * @param {number} y
 * @returns {number} radianes en [-ART_ROTATION_MAX_DEG°, +ART_ROTATION_MAX_DEG°]
 */
export function artRotationFor(x, y) {
  let h = Math.imul(Math.round(x * 10), 73856093) ^ Math.imul(Math.round(y * 10), 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  const unit = h / 0xffffffff;
  const maxRad = (ART_ROTATION_MAX_DEG * Math.PI) / 180;
  return (unit * 2 - 1) * maxRad;
}

const artImageCache = new Map();

/**
 * Versión rasterizable del arte (HTMLImageElement con data-URL SVG) para dibujar en el canvas
 * de escarbado. Mismo mecanismo que `getIconImage`, con caché por `artKey|size`.
 * Presupuesto de memoria (auditoría D de la ronda 29): a 128px un bitmap decodificado pesa
 * 128×128×4 ≈ 64 KiB; el catálogo completo (~140 ítems) daría ~9 MiB SI se pidiera entero,
 * pero el pre-rasterizado de DigCanvas.start() solo pide los ítems del escarbado en curso, así
 * que el caché crece con los pools que el jugador realmente visita.
 * @param {string} artKey
 * @param {{ size?: number }} [opts]
 * @returns {HTMLImageElement|null} imagen cacheada, o null si el ítem no tiene arte.
 */
export function getObjectImage(artKey, opts = {}) {
  if (!hasObjectArt(artKey)) return null;
  const { size = 128 } = opts;
  const cacheKey = `${artKey}|${size}`;
  let img = artImageCache.get(cacheKey);
  if (img) return img;
  const svg = getObjectArtMarkup(artKey, { size });
  img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  artImageCache.set(cacheKey, img);
  return img;
}

// exportados para tests (y para que las tandas B/C previsualicen el vocabulario)
export { ART, BODIES, MATERIALS };
