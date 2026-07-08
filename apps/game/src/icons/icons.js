/**
 * Registro de íconos SVG (reemplaza los ~60 emojis del prototipo, CLAUDE.md/PLAN.md §5.3).
 * Cada ícono es SVG inline original (sin fuentes externas, sin licencia que declarar en
 * créditos de Steam) construido a partir de un vocabulario chico de formas reutilizables.
 * Prioridad de esta fase: que cada clave de ícono de la data (Agente 1) tenga un símbolo
 * propio y reconocible. El pulido fino de trazo/proporción es del Agente 4 (PLAN.md §5.3).
 */

const VIEWBOX = '0 0 24 24';

/** Cada forma es una lista de elementos SVG internos (paths/circles/rects/polygons). */
const SHAPES = {
  coin: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  coinStack: '<ellipse cx="12" cy="17" rx="8" ry="3"/><ellipse cx="12" cy="12" rx="8" ry="3"/><ellipse cx="12" cy="7" rx="8" ry="3"/>',
  cashStack: '<rect x="5" y="6" width="14" height="4" rx="1"/><rect x="5" y="11" width="14" height="4" rx="1"/><rect x="5" y="16" width="14" height="4" rx="1"/>',
  crescent: '<path d="M8 4c-3 3-3 13 2 16 4 2 9-1 10-5-4 2-9 0-11-4-1.5-3-1.5-5-1-7z"/>',
  document: '<rect x="6" y="3" width="12" height="18" rx="1"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
  shoe: '<path d="M4 18v-3c0-2 2-3 4-3l3-4 6 1c2 .5 3 2 3 4v5H4z"/>',
  bottle: '<path d="M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3V2z"/><line x1="8" y1="12" x2="16" y2="12"/>',
  box: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9l8-5 8 5"/><line x1="12" y1="9" x2="12" y2="20"/>',
  chair: '<path d="M7 3v10h10V3"/><path d="M7 13v8"/><path d="M17 13v8"/><line x1="7" y1="17" x2="17" y2="17"/>',
  lamp: '<path d="M7 5h10l-2 6H9L7 5z"/><line x1="12" y1="11" x2="12" y2="19"/><line x1="8" y1="21" x2="16" y2="21"/>',
  bike: '<circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17l4-9h4l3 9"/><path d="M10 8h5"/><path d="M9.5 17h5.5"/>',
  radio: '<rect x="4" y="9" width="16" height="10" rx="1"/><circle cx="9" cy="14" r="2"/><line x1="14" y1="12" x2="18" y2="12"/><line x1="14" y1="16" x2="18" y2="16"/><line x1="6" y1="9" x2="9" y2="4"/>',
  suitcase: '<rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
  mirror: '<ellipse cx="12" cy="10" rx="7" ry="8"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/><path d="M8 7l8 6"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="1.5"/><line x1="7" y1="18" x2="17" y2="18"/>',
  console: '<rect x="3" y="8" width="18" height="9" rx="2"/><circle cx="7" cy="12.5" r="1.4"/><circle cx="17" cy="11" r="1"/><circle cx="17" cy="14" r="1"/>',
  cable: '<path d="M5 5c4 0 3 5 7 5s3-5 7-5"/><path d="M5 19c4 0 3-5 7-5s3 5 7 5"/><circle cx="5" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1"/><line x1="9" y1="3" x2="9" y2="7"/><line x1="15" y1="3" x2="15" y2="7"/><line x1="9" y1="17" x2="9" y2="21"/><line x1="15" y1="17" x2="15" y2="21"/><line x1="3" y1="9" x2="7" y2="9"/><line x1="3" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="21" y2="9"/><line x1="17" y1="15" x2="21" y2="15"/>',
  camera: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M9 7l1.5-2h3L15 7"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="1"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="17" x2="12" y2="20"/>',
  watch: '<circle cx="12" cy="12" r="7"/><path d="M12 8v4l3 2"/><path d="M9 3h6l-1 3H10z"/><path d="M9 21h6l-1-3H10z"/>',
  vase: '<path d="M9 3h6v3l3 6c1 3-1 9-6 9s-7-6-6-9l3-6V3z"/>',
  typewriter: '<rect x="3" y="12" width="18" height="6" rx="1"/><rect x="5" y="6" width="14" height="6" rx="1"/><line x1="9" y1="18" x2="9" y2="21"/><line x1="15" y1="18" x2="15" y2="21"/>',
  helmet: '<path d="M4 15a8 8 0 0 1 16 0z"/><line x1="4" y1="15" x2="20" y2="15"/><path d="M9 15v2a3 3 0 0 0 6 0v-2"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M9 10 6 3M15 10l3-7" />',
  dagger: '<line x1="12" y1="2" x2="12" y2="15"/><path d="M8 6h8"/><path d="M9 15l3 6 3-6"/>',
  shirt: '<path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2h-4z"/>',
  painting: '<rect x="3" y="4" width="18" height="14" rx="1"/><path d="M3 15l5-5 4 4 3-3 6 6"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/>',
  statue: '<circle cx="12" cy="6" r="2.5"/><path d="M9 21V11c0-2 1-3 3-3s3 1 3 3v10"/><line x1="7" y1="21" x2="17" y2="21"/>',
  crown: '<path d="M4 18h16l-1-9-4 4-3-6-3 6-4-4-1 9z"/><line x1="4" y1="20" x2="20" y2="20"/>',
  amulet: '<circle cx="12" cy="14" r="6"/><path d="M9 8l3-5 3 5"/><circle cx="12" cy="14" r="2"/>',
  scepter: '<line x1="12" y1="6" x2="12" y2="22"/><circle cx="12" cy="4" r="3"/>',
  drone: '<rect x="9" y="9" width="6" height="6" rx="1"/><line x1="4" y1="4" x2="9" y2="9"/><line x1="20" y1="4" x2="15" y2="9"/><line x1="4" y1="20" x2="9" y2="15"/><line x1="20" y1="20" x2="15" y2="15"/><circle cx="4" cy="4" r="1.5"/><circle cx="20" cy="4" r="1.5"/><circle cx="4" cy="20" r="1.5"/><circle cx="20" cy="20" r="1.5"/>',
  crystal: '<path d="M12 2l6 6-6 14-6-14z"/><line x1="6" y1="8" x2="18" y2="8"/>',
  implant: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="2" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="22" y2="12"/>',
  clover: '<path d="M12 12c-2-4-6-4-6-1s4 3 6 1zm0 0c2-4 6-4 6-1s-4 3-6 1zm0 0c-4-2-4-6-1-6s3 4 1 6zm0 0c4 2 4 6 1 6s-3-4-1-6z"/><line x1="12" y1="12" x2="12" y2="21"/>',
  fist: '<rect x="7" y="9" width="10" height="8" rx="2"/><line x1="9" y1="9" x2="9" y2="17"/><line x1="12" y1="9" x2="12" y2="17"/><line x1="15" y1="9" x2="15" y2="17"/><path d="M7 12H4v3h3"/>',
  hand: '<path d="M8 21V10a1.5 1.5 0 0 1 3 0v5"/><path d="M11 15V8a1.5 1.5 0 0 1 3 0v6"/><path d="M14 14V9a1.5 1.5 0 0 1 3 0v7"/><path d="M17 16v-3a1.5 1.5 0 0 1 3 0v6c0 3-2 5-5 5h-3c-2 0-3-1-4-2l-3-4 1.5-1.5L9 18"/>',
  crate: '<rect x="4" y="6" width="16" height="14" rx="1"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="12" y1="6" x2="12" y2="20"/>',
  gloves: '<path d="M6 22V11a2 2 0 0 1 4 0v3"/><path d="M10 22V8a2 2 0 0 1 4 0v6"/><path d="M14 22V9a2 2 0 0 1 4 0v6c0 4-2 7-6 7z"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 12h11.2L21 8H7"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="3" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="21" y2="12"/>',
  robot: '<rect x="6" y="8" width="12" height="10" rx="2"/><circle cx="9.5" cy="12.5" r="1.2"/><circle cx="14.5" cy="12.5" r="1.2"/><line x1="12" y1="8" x2="12" y2="4"/><circle cx="12" cy="3" r="1.2"/><line x1="4" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="20" y2="12"/>',
  conveyor: '<rect x="3" y="14" width="18" height="4" rx="1"/><circle cx="6" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><rect x="8" y="8" width="4" height="4"/><circle cx="16" cy="10" r="2"/>',
  recycle: '<path d="M12 4l3 5h-6z"/><path d="M6 15l-3-5 3-5"/><path d="M18 15l3-5-3-5"/><path d="M9 20l3-5 3 5z"/>',
  gavel: '<line x1="4" y1="21" x2="12" y2="13"/><rect x="12" y="4" width="4" height="10" rx="1" transform="rotate(45 14 9)"/><line x1="17" y1="6" x2="21" y2="10"/>',
  bin: '<path d="M6 8h12l-1 12H7z"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="9" y1="5" x2="15" y2="5"/>',
  dumpster: '<path d="M4 9h16l-2 10H6z"/><path d="M4 9l3-4h10l3 4"/><line x1="12" y1="9" x2="12" y2="19"/>',
  container: '<rect x="3" y="7" width="18" height="11" rx="1"/><line x1="3" y1="12.5" x2="21" y2="12.5"/><line x1="8" y1="7" x2="8" y2="18"/><line x1="16" y1="7" x2="16" y2="18"/>',
  warehouse: '<path d="M3 11l9-6 9 6"/><rect x="5" y="11" width="14" height="9"/><rect x="10" y="14" width="4" height="6"/>',
  house: '<path d="M4 12l8-7 8 7"/><rect x="6" y="12" width="12" height="8"/><rect x="10" y="15" width="4" height="5"/>',
  gallery: '<rect x="3" y="6" width="18" height="12" rx="1"/><circle cx="8" cy="11" r="1.5"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
  vault: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="12" x2="15" y2="10"/>',
  portal: '<ellipse cx="12" cy="12" rx="4" ry="9"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(45 12 12)"/>',
  truck: '<rect x="2" y="10" width="11" height="7" rx="1"/><path d="M13 12h4l3 3v2h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  loupe: '<circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/>',
  steelArm: '<line x1="4" y1="20" x2="10" y2="12"/><circle cx="10" cy="12" r="1.5"/><line x1="10" y1="12" x2="14" y2="6"/><circle cx="14" cy="6" r="1.5"/><path d="M4 20h4"/>',
  eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>',
  handshake: '<path d="M2 12l5-4 4 3 3-3 5 4"/><path d="M7 8l4 4-1.5 1.5a1.6 1.6 0 0 1-2.2 0"/><path d="M17 8l-4 4 1.5 1.5a1.6 1.6 0 0 0 2.2 0"/>',
  shield: '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"/><path d="M12 8v5l3 2"/>',
  city: '<rect x="2" y="10" width="5" height="11"/><rect x="9" y="5" width="6" height="16"/><rect x="17" y="12" width="5" height="9"/>',
  bone: '<circle cx="5" cy="7" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="19" cy="17" r="2"/><line x1="6.5" y1="8" x2="17.5" y2="16"/><line x1="6.5" y1="16" x2="17.5" y2="8"/>',
  chart: '<polyline points="3,18 9,10 13,14 21,4"/><polyline points="15,4 21,4 21,10"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="1"/><rect x="9" y="2" width="6" height="4" rx="1"/><polyline points="8,13 11,16 16,9"/>',
  gear2: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6"/>',
  settings: '<circle cx="12" cy="12" r="3.4"/><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2.8-1.6L13.3 2h-2.6l-.4 2.7a7 7 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .5 0 1 .2 1.6l-2 1.6 2 3.4 2.3-.9c.8.7 1.8 1.3 2.8 1.6l.4 2.7h2.6l.4-2.7a7 7 0 0 0 2.8-1.6l2.3.9 2-3.4-2-1.6c.1-.5.2-1 .2-1.6z"/>',
  touchApp: '<path d="M10 3v9"/><path d="M10 12l3-1c1.5-.5 3 .3 3 2v3c0 2.5-2 5-5 5h-1c-2 0-3-.5-4-2l-3-4 1.4-1.4c.6-.6 1.5-.6 2.1 0L8 15"/>',
  artifact: '<path d="M12 2l8 5-3 13H7L4 7z"/>',
  key: '<circle cx="7" cy="12" r="4"/><line x1="11" y1="12" x2="21" y2="12"/><line x1="17" y1="12" x2="17" y2="16"/><line x1="20" y1="12" x2="20" y2="15"/>',
  crypt: '<path d="M6 21V10l6-6 6 6v11"/><line x1="4" y1="21" x2="20" y2="21"/><rect x="10" y="14" width="4" height="7"/><line x1="12" y1="6" x2="12" y2="10"/><line x1="10" y1="8" x2="14" y2="8"/>',
  satellite: '<rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><rect x="2" y="10" width="5" height="4" rx="0.5"/><rect x="17" y="10" width="5" height="4" rx="0.5"/><path d="M14 8l4-4"/><circle cx="18.5" cy="3.5" r="1.2"/>',
  temple: '<path d="M4 9l8-5 8 5"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="6" y1="9" x2="6" y2="18"/><line x1="10" y1="9" x2="10" y2="18"/><line x1="14" y1="9" x2="14" y2="18"/><line x1="18" y1="9" x2="18" y2="18"/><line x1="4" y1="18" x2="20" y2="18"/><line x1="3" y1="21" x2="21" y2="21"/>',
};

/** Mapea cada clave `icon` de la data (items/containers/upgrades/automations/prestigeTree/achievements) a una forma. */
const ICON_MAP = {
  // Items — común
  'can-crushed': 'coin',
  'banana-peel': 'crescent',
  'newspaper-old': 'document',
  'shoe-odd': 'shoe',
  'bottle-plastic': 'bottle',
  'cardboard-box': 'box',
  // Items — reutilizables
  'chair-broken': 'chair',
  'lamp-old': 'lamp',
  'bike-rusty': 'bike',
  'radio-antique': 'radio',
  'suitcase-worn': 'suitcase',
  'mirror-cracked': 'mirror',
  // Items — electrónica
  'phone-old': 'phone',
  'console-broken': 'console',
  'copper-cable': 'cable',
  motherboard: 'chip',
  'camera-analog': 'camera',
  'tv-crt': 'tv',
  // Items — antigüedades
  'pocket-watch': 'watch',
  'porcelain-vase': 'vase',
  'antique-book': 'document',
  candelabrum: 'lamp',
  typewriter: 'typewriter',
  'coin-old': 'coin',
  // Items — históricos
  'war-helmet': 'helmet',
  'map-antique': 'document',
  'military-medal': 'medal',
  'dagger-ceremonial': 'dagger',
  'uniform-historic': 'shirt',
  'photo-historic': 'document',
  // Items — arte
  'oil-painting': 'painting',
  'bronze-sculpture': 'statue',
  'engraving-original': 'document',
  'tapestry-antique': 'painting',
  'vase-decorative': 'vase',
  'sketch-master': 'document',
  // Items — reliquias
  'crown-lost': 'crown',
  'amulet-sacred': 'amulet',
  'scroll-arcane': 'document',
  'scepter-royal': 'scepter',
  'idol-jade': 'vase',
  'relic-sealed': 'amulet',
  // Items — futuro
  'fusion-core': 'chip',
  'quantum-chip': 'chip',
  'neural-implant': 'implant',
  'drone-rescued': 'drone',
  'energy-crystal': 'crystal',
  'stellar-fragment': 'crystal',

  // Contenedores
  'trash-bin-street': 'bin',
  'dumpster-street': 'dumpster',
  'container-industrial': 'container',
  'warehouse-abandoned': 'warehouse',
  'mansion-move': 'house',
  'gallery-liquidation': 'gallery',
  'vault-lost': 'vault',
  'container-portal': 'portal',
  'convoy-ghost': 'truck',
  'crypt-collector': 'crypt',
  'station-fallen': 'satellite',
  'dump-gods': 'temple',

  // Mejoras repetibles
  clover: 'clover',
  'fist-dig': 'fist',
  'hand-spread': 'hand',
  'crate-stack': 'crate',

  // Automatizaciones
  'gloves-work': 'gloves',
  'cart-push': 'cart',
  'metal-detector': 'radar',
  'robot-sorter': 'robot',
  'conveyor-belt': 'conveyor',
  'recycling-plant': 'recycle',
  'auction-house': 'gavel',
  'drone-network': 'drone',

  // Árbol de prestigio
  'cash-stack': 'cashStack',
  'clover-glow': 'clover',
  'eagle-eye': 'radar',
  'moon-watch': 'watch',
  'truck-fleet': 'truck',
  'appraiser-loupe': 'loupe',
  'steel-arm': 'steelArm',
  'eye-wide': 'eye',
  'handshake-deal': 'handshake',
  'archive-box': 'box',
  'shield-clock': 'shield',
  'portal-swirl': 'portal',

  // Logros (algunos reusan íconos de arriba)
  'medal-bronze': 'medal',
  'coin-stack-small': 'coinStack',
  'coin-stack-medium': 'coinStack',
  'bank-vault': 'vault',
  'crown-gold': 'crown',
  magnifier: 'loupe',
  'clipboard-check': 'clipboard',
  'gear-set': 'gear',
  'city-skyline': 'city',
  'bone-cracked': 'bone',
  'chart-up': 'chart',

  // UI genérica (no viene de la data, se usa directo en las vistas)
  settings: 'settings',
  money: 'cashStack',
  keys: 'key',
  'touch-app': 'touchApp',
  'tab-escarbar': 'touchApp',
  'tab-tienda': 'dumpster',
  'tab-automatizacion': 'gear',
  'tab-logros': 'medal',
  'tab-prestigio': 'crown',
  'tab-index': 'clipboard',
  locked: 'shield',

  // Items — contenedores de prestigio (ronda 11)
  'cargo-manifest': 'document',
  'ghost-lantern': 'lamp',
  'route-compass': 'watch',
  'sealed-strongbox': 'crate',
  'captain-ring': 'coin',
  'cursed-cargo': 'box',
  'phantom-bell': 'amulet',
  'framed-forgery': 'painting',
  'marble-bust': 'statue',
  'lost-masterpiece': 'painting',
  'burial-mask': 'helmet',
  'grail-replica': 'vase',
  'saint-reliquary': 'amulet',
  'collector-heart': 'crystal',
  'heat-shield': 'shield',
  'zero-g-tool': 'fist',
  'cosmonaut-log': 'document',
  'orbital-gyro': 'radar',
  'plasma-cell': 'chip',
  'ai-core-salvaged': 'implant',
  'station-heart': 'satellite',
  'titan-bolt': 'gear',
  'chrono-shard': 'crystal',
  'ambrosia-flask': 'bottle',
  'olympus-circuit': 'chip',
  'godling-idol': 'statue',
  'thunder-coil': 'cable',
  'creation-seed': 'crystal',
};

/**
 * @param {string} key - clave `icon` de la data, o clave genérica de UI.
 * @param {{ size?: number, className?: string, color?: string }} [opts]
 * @returns {string} markup `<svg>` listo para innerHTML.
 */
export function iconMarkup(key, opts = {}) {
  const { size = 24, className = '', color = '' } = opts;
  const shapeId = ICON_MAP[key] || 'artifact';
  const inner = SHAPES[shapeId] || SHAPES.artifact;
  const style = color ? ` style="color:${color}"` : '';
  // AJUSTE (ronda 5): `xmlns` es obligatorio cuando el SVG se carga como documento standalone
  // (el data URL de getIconImage dentro de un <img>); sin él, TODOS los íconos rasterizados
  // del canvas fallaban en silencio ('error', naturalWidth 0) desde el origen del proyecto.
  // En innerHTML (parser HTML) el atributo es inocuo.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="icon${className ? ` ${className}` : ''}" data-icon="${key}" width="${size}" height="${size}" ` +
    `viewBox="${VIEWBOX}" fill="none" stroke="currentColor" stroke-width="1.6"${style} ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
  );
}

/** @returns {boolean} true si la clave tiene una forma dedicada (no cae en el genérico "artifact"). */
export function hasIcon(key) {
  return Boolean(ICON_MAP[key]);
}

const imageCache = new Map();

/**
 * Versión rasterizable del ícono (HTMLImageElement con un data URL SVG) para usarlo
 * dentro de un `<canvas>` (DigCanvas no puede dibujar `iconMarkup` directo). Cachea por
 * `key+color` porque el color cambia según rareza/estado (trampa en rojo, ítems en claro).
 * @param {string} key
 * @param {{ size?: number, color?: string }} [opts]
 * @returns {HTMLImageElement}
 */
export function getIconImage(key, opts = {}) {
  const { size = 64, color = '#f4ede1' } = opts;
  const cacheKey = `${key}|${color}|${size}`;
  let img = imageCache.get(cacheKey);
  if (img) return img;
  const svg = iconMarkup(key, { size, color });
  img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  imageCache.set(cacheKey, img);
  return img;
}
