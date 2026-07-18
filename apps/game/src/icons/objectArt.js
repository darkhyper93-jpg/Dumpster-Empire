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
const ART = {};

/**
 * Ids de la data que TODAVÍA no tienen composición en ART. El test de cobertura
 * (tests/objectArt.test.js) exige que todo `icon` id de items.json + legendaries.json esté en
 * un lado o el otro: un ítem nuevo obliga a decidir (ilustrar o encolar). Las tandas B/C
 * VACÍAN esta lista al cerrar la ronda 29 — el orden sigue los pools de containers.json para
 * poder cortar por tanda.
 */
export const PENDING_ART = [
  // tachoVereda
  'can-crushed',
  'banana-peel',
  'cigarette-butt',
  'chip-bag',
  'cork-bottle',
  'napkin-used',
  // contenedorBarrio
  'newspaper-old',
  'shoe-odd',
  'bottle-plastic',
  'chair-broken',
  'lamp-old',
  'suitcase-worn',
  'mirror-cracked',
  // containerIndustrial
  'bike-rusty',
  'radio-antique',
  'fan-old',
  'copper-cable',
  'motherboard',
  'phone-old',
  'console-broken',
  // depositoAbandonado
  'camera-analog',
  'tv-crt',
  'floppy-disk',
  'pocket-watch',
  'porcelain-vase',
  'coin-old',
  'candelabrum',
  // mudanzaMansion
  'antique-book',
  'typewriter',
  'ivory-figurine',
  'war-helmet',
  'map-antique',
  'military-medal',
  'uniform-historic',
  // galeriaLiquidacion
  'dagger-ceremonial',
  'photo-historic',
  'regiment-flag',
  'oil-painting',
  'bronze-sculpture',
  'engraving-original',
  'tapestry-antique',
  // bovedaPerdida
  'vase-decorative',
  'sketch-master',
  'ritual-mask',
  'crown-lost',
  'amulet-sacred',
  'scroll-arcane',
  'scepter-royal',
  // containerExtradimensional
  'idol-jade',
  'relic-sealed',
  'legendary-sword',
  'fusion-core',
  'quantum-chip',
  'neural-implant',
  'stellar-fragment',
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
  // herramientas (ronda 20, tanda del Agente B — se lucen en el selector de Escarbar)
  'hands-bare',
  'shovel-wide',
  'brush-fine',
  'glove-hydraulic',
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
