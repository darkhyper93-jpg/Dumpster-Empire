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
  motherboard: '<rect x="7" y="7" width="10" height="10" rx="1"/><line x1="9" y1="3" x2="9" y2="7"/><line x1="15" y1="3" x2="15" y2="7"/><line x1="9" y1="17" x2="9" y2="21"/><line x1="15" y1="17" x2="15" y2="21"/><line x1="3" y1="9" x2="7" y2="9"/><line x1="3" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="21" y2="9"/><line x1="17" y1="15" x2="21" y2="15"/>',
  fusionCore: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="7" stroke-dasharray="2 2"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>',
  quantumChip: '<rect x="9" y="9" width="6" height="6" rx="1"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>',
  plasmaCell: '<rect x="7" y="5" width="10" height="16" rx="2"/><line x1="10" y1="2" x2="10" y2="5"/><line x1="14" y1="2" x2="14" y2="5"/><path d="M13 9l-3 5h3l-1 5 4-6h-3z"/>',
  olympusCircuit: '<rect x="8" y="8" width="8" height="8" rx="1"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="8.5" y2="8.5"/><line x1="19" y1="5" x2="15.5" y2="8.5"/><line x1="5" y1="19" x2="8.5" y2="15.5"/><line x1="19" y1="19" x2="15.5" y2="15.5"/>',
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
  closeX: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',

  // Ronda 14 — Fase A: los 10 ítems que caían en el fallback "artifact" + candelabro rehecho
  cigaretteButt: '<rect x="3" y="14" width="13" height="4" rx="2" transform="rotate(-20 9.5 16)"/><line x1="8" y1="12.3" x2="9.6" y2="15.6" transform="rotate(-20 9.5 16)"/><path d="M17 7c1.2 1-1 2.2 0 3.2s-1 2.2 0 3.2"/>',
  chipBag: '<path d="M6 5l1 3-2 2 2 2-2 2 2 2-1 3h12l-1-3 2-2-2-2 2-2-2-2 1-3z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="14" x2="15" y2="14"/>',
  corkBottle: '<path d="M9 3h6l-1 15a2 2 0 0 1-4 0z"/><line x1="9.3" y1="7" x2="14.7" y2="7"/><line x1="9.6" y1="11" x2="14.4" y2="11"/><line x1="9.9" y1="15" x2="14.1" y2="15"/>',
  napkinUsed: '<path d="M4 6h16v12L4 6z"/><path d="M9.5 6.9l4.3 7.4" stroke-dasharray="1.4 1.4"/>',
  fanOld: '<circle cx="12" cy="9" r="6.5"/><path d="M12 9c0-3 2-4 3-3s-1 3-3 3z"/><path d="M12 9c2.6 1.5 2 3.8 .5 4.3s-2.5-2-.5-4.3z"/><path d="M12 9c-2.6 1.5-4.5 0-4-1.8s2.4-1 4 1.8z"/><line x1="12" y1="15.5" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/>',
  floppyDisk: '<path d="M5 4h11l3 3v13H5z"/><rect x="8" y="4" width="6" height="5"/><rect x="7" y="13" width="10" height="6"/>',
  ivoryFigurine: '<circle cx="12" cy="6" r="2"/><path d="M9 17c0-4 1-6 3-6s3 2 3 6"/><rect x="8" y="17" width="8" height="2"/><rect x="9" y="19" width="6" height="2"/>',
  regimentFlag: '<line x1="6" y1="3" x2="6" y2="21"/><path d="M6 4c4-1.5 6 1.5 10 0v9c-4 1.5-6-1.5-10 0z"/><circle cx="11" cy="8.5" r="1.6"/>',
  ritualMask: '<path d="M12 3c-4 0-6 3-6 7 0 5 2.5 9 6 9s6-4 6-9c0-4-2-7-6-7z"/><circle cx="9.3" cy="10" r="1.3"/><circle cx="14.7" cy="10" r="1.3"/><path d="M9 15c1 1 5 1 6 0"/><line x1="7" y1="7" x2="9" y2="8"/><line x1="17" y1="7" x2="15" y2="8"/>',
  legendarySword: '<line x1="12" y1="2" x2="12" y2="15"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="10" y1="4" x2="12" y2="2"/><line x1="14" y1="4" x2="12" y2="2"/><line x1="12" y1="15" x2="12" y2="19"/><circle cx="12" cy="21" r="1.3"/>',
  candelabrum: '<line x1="12" y1="14" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/><path d="M12 14c0-3-3-2-3-5"/><path d="M12 14c0-3 3-2 3-5"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="9" y1="9" x2="9" y2="6"/><line x1="12" y1="9" x2="12" y2="5"/><line x1="15" y1="9" x2="15" y2="6"/><path d="M9 6c-.5-1 .5-1.5 0-2.5"/><path d="M12 5c-.5-1 .5-1.5 0-2.5"/><path d="M15 6c-.5-1 .5-1.5 0-2.5"/>',

  // Ronda 14 — Fase B: desambiguación de formas compartidas (document/chip/vase/crystal/
  // painting/amulet/statue/coin/watch/lamp) — ver ICON_MAP para qué ítem usa cada una.
  newspaper: '<path d="M4 5h16v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z"/><line x1="4" y1="5" x2="20" y2="5"/><line x1="7" y1="8" x2="11" y2="8"/><line x1="7" y1="10" x2="11" y2="10"/><line x1="7" y1="12" x2="11" y2="12"/><line x1="13" y1="8" x2="17" y2="8"/><line x1="13" y1="10" x2="17" y2="10"/>',
  book: '<path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><line x1="8" y1="4" x2="8" y2="20"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="10" y1="11" x2="14" y2="11"/>',
  foldedMap: '<path d="M4 6l6-2 4 2 6-2v14l-6 2-4-2-6 2z"/><line x1="10" y1="4" x2="10" y2="18"/><line x1="14" y1="6" x2="14" y2="20"/><path d="M6 12c2 1 3-2 5-1s3 3 5 1" stroke-dasharray="1.2 1.6"/>',
  photoFrame: '<rect x="4" y="4" width="16" height="14" rx="1"/><circle cx="9" cy="9" r="1.6"/><path d="M4 16l5-5 4 4 3-3 4 4"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/>',
  engravingPlate: '<rect x="5" y="5" width="14" height="14" rx="1"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="8" y1="11" x2="13" y2="16"/><line x1="8" y1="14" x2="10" y2="16"/><line x1="11" y1="8" x2="16" y2="13"/><line x1="14" y1="8" x2="16" y2="10"/>',
  sketch: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 9c2-2 3 2 5 0s3 2 5 0"/><line x1="15" y1="16" x2="19" y2="12"/><line x1="17" y1="18" x2="19" y2="16"/>',
  scroll: '<path d="M5 8a2 2 0 1 1 0-4h1v16H5a2 2 0 1 1 0-4"/><path d="M19 8a2 2 0 1 0 0-4h-1v16h1a2 2 0 1 0 0-4"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="15" x2="14" y2="15"/>',
  manifest: '<rect x="6" y="4" width="12" height="17" rx="1"/><rect x="9" y="2" width="6" height="4" rx="1"/><line x1="8" y1="10" x2="14" y2="10"/><line x1="8" y1="13" x2="14" y2="13"/><line x1="8" y1="16" x2="12" y2="16"/><circle cx="16.5" cy="16" r="2"/>',
  logbook: '<rect x="5" y="4" width="14" height="16" rx="1"/><circle cx="8" cy="7" r="0.7"/><circle cx="8" cy="12" r="0.7"/><circle cx="8" cy="17" r="0.7"/><line x1="11" y1="7" x2="17" y2="7"/><line x1="11" y1="12" x2="17" y2="12"/><path d="M13 16.5c1.5-1 3.5-1 4 .5" stroke-dasharray="1 1.4"/>',
  decorativeVase: '<path d="M9 3h6v3l3 6c1 3-1 9-6 9s-7-6-6-9l3-6V3z"/><line x1="7.5" y1="13" x2="16.5" y2="13"/><line x1="8" y1="16" x2="16" y2="16"/>',
  idol: '<circle cx="12" cy="5" r="2"/><path d="M9 21V12c0-2 .5-3 1.5-3.5L12 7l1.5 1.5C14.5 9 15 10 15 12v9"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="10" y1="11" x2="14" y2="11"/>',
  grail: '<path d="M7 3h10l-1 6a4 4 0 0 1-8 0z"/><line x1="12" y1="9" x2="12" y2="17"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="9" y1="17" x2="15" y2="17"/>',
  shard: '<path d="M12 2l4 7-2 5 3 8-7-6-4 2 2-9z"/>',
  crystalHeart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><line x1="12" y1="7" x2="12" y2="17"/>',
  chronoShard: '<path d="M12 2l6 6-6 14-6-14z"/><circle cx="12" cy="9" r="2.2"/><line x1="12" y1="9" x2="12" y2="7.3"/><line x1="12" y1="9" x2="13.3" y2="9.7"/>',
  seed: '<path d="M12 22c-5-2-6-8-3-13 2-3 3-5 3-7 0 2 1 4 3 7 3 5 2 11-3 13z"/><line x1="12" y1="6" x2="12" y2="18"/>',
  tapestry: '<rect x="4" y="3" width="16" height="13" rx="1"/><path d="M4 16l5-5 4 4 3-3 4 4"/><line x1="6" y1="18" x2="6" y2="21"/><line x1="9" y1="18" x2="9" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="15" y1="18" x2="15" y2="21"/><line x1="18" y1="18" x2="18" y2="21"/>',
  sealedRelic: '<rect x="6" y="8" width="12" height="12" rx="1"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><rect x="10.5" y="12" width="3" height="4" rx="0.5"/>',
  bell: '<path d="M12 3v2"/><path d="M6 15c0-4 1.5-7 6-7s6 3 6 7l1.5 3h-15z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/>',
  reliquary: '<path d="M8 21V13a4 4 0 0 1 8 0v8z"/><path d="M8 13a4 4 0 0 1 8 0"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="8" y1="21" x2="16" y2="21"/>',
  bust: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-4c0-3 3-5 6-5s6 2 6 5v4z"/><line x1="4" y1="21" x2="20" y2="21"/>',
  crushedCan: '<path d="M8 5h8l-1 4 2 2-3 2 2 2-2 2 1 4H9l1-4-2-2 2-2-3-2 2-2z"/><line x1="8.5" y1="5" x2="15.5" y2="5"/>',
  ring: '<circle cx="12" cy="13" r="6"/><circle cx="12" cy="13" r="3.2"/><path d="M9 8l3-5 3 5"/><circle cx="12" cy="5" r="1.1"/>',
  compass: '<circle cx="12" cy="12" r="8"/><path d="M15 9l-2 5-5 2 2-5z"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>',
  lantern: '<path d="M9 4h6l1 3H8z"/><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="9" y1="17" x2="9" y2="20"/><line x1="15" y1="17" x2="15" y2="20"/><circle cx="12" cy="12" r="2" stroke-dasharray="1 1.2"/>',

  // Ronda 15 — Agente B: 4 contenedores de prestigio 6-9 + sus 28 ítems.
  junkyard: '<path d="M4 21h16"/><path d="M7 21l1.5-7 3 1.5 2-5 2.5 4 2-2.5 1 9"/><line x1="18" y1="4" x2="18" y2="10"/><path d="M15 4h3"/>',
  shipwreck: '<path d="M3 15c3 3 15 3 18 0l-2 6H5z"/><line x1="12" y1="15" x2="12" y2="3"/><path d="M12 6l5 2"/><path d="M8 15l1-4"/>',
  archive: '<rect x="5" y="3" width="14" height="18" rx="1"/><line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/><circle cx="12" cy="6" r="0.8"/><circle cx="12" cy="12" r="0.8"/><circle cx="12" cy="18" r="0.8"/>',
  bigbang: '<circle cx="12" cy="12" r="2.5"/><line x1="12" y1="2" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="2" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="8.5" y2="8.5"/><line x1="19" y1="5" x2="15.5" y2="8.5"/><line x1="5" y1="19" x2="8.5" y2="15.5"/><line x1="19" y1="19" x2="15.5" y2="15.5"/>',
  rivetColossal: '<path d="M12 3l7 4v10l-7 4-7-4V7z"/><circle cx="12" cy="12" r="3"/>',
  chainLink: '<ellipse cx="9" cy="9" rx="4" ry="5" transform="rotate(-20 9 9)"/><ellipse cx="15" cy="15" rx="4" ry="5" transform="rotate(-20 15 15)"/>',
  anvilTitan: '<path d="M3 13h6l2-3h6l3 3v2H3z"/><rect x="10" y="15" width="4" height="5"/><line x1="7" y1="20" x2="17" y2="20"/>',
  pistonSeismic: '<rect x="9" y="3" width="6" height="8" rx="1"/><line x1="12" y1="11" x2="12" y2="17"/><rect x="7" y="17" width="10" height="4" rx="1"/>',
  figurehead: '<path d="M12 2c2 3 5 4 5 8 0 5-3 8-5 12-2-4-5-7-5-12 0-4 3-5 5-8z"/><line x1="8" y1="10" x2="16" y2="10"/><circle cx="12" cy="7" r="1"/>',
  hourglass: '<line x1="6" y1="3" x2="18" y2="3"/><line x1="6" y1="21" x2="18" y2="21"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9"/><path d="M17 3c0 5-5 6-5 9s5 4 5 9"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="19"/><path d="M6 13a6 6 0 0 0 12 0"/><line x1="7" y1="10" x2="17" y2="10"/>',
  helm: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="5" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="19"/><line x1="5" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="19" y2="12"/><line x1="7" y1="7" x2="9" y2="9"/><line x1="15" y1="15" x2="17" y2="17"/><line x1="7" y1="17" x2="9" y2="15"/><line x1="15" y1="9" x2="17" y2="7"/>',
  musicScore: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="8" cy="16" r="1.6"/><line x1="9.5" y1="16" x2="9.5" y2="8"/><circle cx="15" cy="18" r="1.6"/><line x1="16.5" y1="18" x2="16.5" y2="8"/>',
  stardust: '<circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="7" r="1"/><circle cx="18" cy="8" r="1"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
  voidBubble: '<circle cx="12" cy="12" r="8" stroke-dasharray="2 2"/><circle cx="9" cy="9" r="1.5"/>',
  echoWave: '<circle cx="12" cy="18" r="1.3"/><path d="M8 18a4 4 0 0 1 8 0"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M2 18a10 10 0 0 1 20 0"/>',
  atomPrimordial: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)"/>',
  sparkGenesis: '<path d="M13 2 7 13h4l-2 9 8-13h-5z"/>',
  relicDayzero: '<circle cx="12" cy="12" r="8"/><line x1="12" y1="12" x2="12" y2="5"/><line x1="12" y1="12" x2="16" y2="14"/><path d="M4 4l4 4M20 4l-4 4M4 20l4-4M20 20l-4-4" stroke-dasharray="1 2"/>',

  // Ronda 20 — Agente B: contenedores con mecánica propia + indicios de grado de trampa +
  // herramientas de escarbado (PLAN.md §4.24).
  vaultTimed: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="5"/><line x1="12" y1="12" x2="12" y2="9"/><line x1="12" y1="12" x2="14.5" y2="13.5"/>',
  basementDark: '<path d="M4 21V10l8-6 8 6v11"/><line x1="4" y1="21" x2="20" y2="21"/><circle cx="12" cy="15" r="3" stroke-dasharray="1.4 1.4"/>',
  clockCountdown: '<circle cx="12" cy="13" r="7"/><line x1="12" y1="13" x2="12" y2="8"/><line x1="12" y1="13" x2="15" y2="15"/><line x1="9" y1="3" x2="15" y2="3"/><line x1="12" y1="3" x2="12" y2="6"/>',
  waxSeal: '<circle cx="12" cy="12" r="7"/><path d="M12 7l1.5 3 3 .5-2.2 2 .5 3-2.8-1.5-2.8 1.5 .5-3-2.2-2 3-.5z"/>',
  gemFrozenTime: '<path d="M12 2l6 6-6 14-6-14z"/><circle cx="12" cy="9" r="2" stroke-dasharray="1 1.2"/><line x1="6" y1="8" x2="18" y2="8"/>',
  lanternExtinguished: '<path d="M9 4h6l1 3H8z"/><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="9" y1="17" x2="9" y2="20"/><line x1="15" y1="17" x2="15" y2="20"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/>',
  eyeGlassDark: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" stroke-dasharray="1.4 1.4"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="12" x2="16" y2="16"/>',
  shovelWide: '<line x1="12" y1="3" x2="12" y2="14"/><path d="M9.3 4a3 3 0 0 1 5.4 0"/><path d="M7 14h10l-2 6a3 3 0 0 1-6 0z"/>',
  brushFine: '<path d="M16 3l5 5-9 9-5-5z"/><path d="M12 12c-3 1-4 4-5 9 3-2 6-3 9-5z"/>',
  gloveHydraulic: '<path d="M6 22V11a2 2 0 0 1 4 0v3"/><path d="M10 22V8a2 2 0 0 1 4 0v6"/><path d="M14 22V9a2 2 0 0 1 4 0v6c0 4-2 7-6 7z"/><line x1="17" y1="3" x2="17" y2="9"/><rect x="15.5" y="1" width="3" height="3" rx="0.5"/>',
  waterStain: '<path d="M12 4c3 2 6 6 6 10a6 6 0 0 1-12 0c0-4 3-8 6-10z" stroke-dasharray="2 2"/><path d="M12 10c1.5 1 3 3 3 5a3 3 0 0 1-6 0c0-2 1.5-4 3-5z" stroke-dasharray="1 1.4"/>',
  crackedGround: '<path d="M2 16h4l2-5 2 7 2-4 2 6h4"/><line x1="8" y1="11" x2="6" y2="14"/><line x1="16" y1="18" x2="18" y2="21"/>',
  clawMarks: '<line x1="5" y1="3" x2="10" y2="21"/><line x1="10" y1="2" x2="14" y2="22"/><line x1="15" y1="3" x2="19" y2="21"/>',

  // Ronda 23 — Agente B: Puesto de Chatarra (puesto, estantería del inventario, cartel de pedido).
  marketStall: '<path d="M3 9l2-5h14l2 5z"/><line x1="3" y1="9" x2="21" y2="9"/><rect x="5" y="9" width="14" height="10"/><line x1="9" y1="9" x2="9" y2="19"/><line x1="15" y1="9" x2="15" y2="19"/>',
  shelf: '<rect x="4" y="3" width="16" height="18" rx="1"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><rect x="6.5" y="5" width="3" height="3"/><rect x="14.5" y="11" width="3" height="3"/>',
  orderSign: '<path d="M6 21V11l6-4 6 4v10z"/><line x1="4" y1="11" x2="20" y2="11"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="13" y2="18"/>',

  // Ronda 24 — misiones diarias, ciclo día/noche y eventos de contenedor (PLAN.md §4.30-§4.33).
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.5" y1="4.5" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="19.5" y2="19.5"/><line x1="4.5" y1="19.5" x2="6.6" y2="17.4"/><line x1="17.4" y1="6.6" x2="19.5" y2="4.5"/>',
  flame: '<path d="M12 2c2 4-2 5-2 9a4 4 0 0 0 8 0c0-2-1-3-1-5 2 2 3 5 3 8a6 6 0 0 1-12 0c0-5 3-6 4-12z"/>',
};

/** Mapea cada clave `icon` de la data (items/containers/upgrades/automations/prestigeTree/achievements) a una forma. */
const ICON_MAP = {
  // Items — común
  'can-crushed': 'crushedCan',
  'banana-peel': 'crescent',
  'cigarette-butt': 'cigaretteButt',
  'chip-bag': 'chipBag',
  'cork-bottle': 'corkBottle',
  'napkin-used': 'napkinUsed',
  'newspaper-old': 'newspaper',
  'shoe-odd': 'shoe',
  'bottle-plastic': 'bottle',
  'cardboard-box': 'box',
  // Items — reutilizables
  'chair-broken': 'chair',
  'lamp-old': 'lamp',
  'bike-rusty': 'bike',
  'radio-antique': 'radio',
  'fan-old': 'fanOld',
  'suitcase-worn': 'suitcase',
  'mirror-cracked': 'mirror',
  // Items — electrónica
  'phone-old': 'phone',
  'console-broken': 'console',
  'copper-cable': 'cable',
  motherboard: 'motherboard',
  'camera-analog': 'camera',
  'tv-crt': 'tv',
  'floppy-disk': 'floppyDisk',
  // Items — antigüedades
  'pocket-watch': 'watch',
  'porcelain-vase': 'vase',
  'antique-book': 'book',
  candelabrum: 'candelabrum',
  typewriter: 'typewriter',
  'coin-old': 'coin',
  'ivory-figurine': 'ivoryFigurine',
  // Items — históricos
  'war-helmet': 'helmet',
  'map-antique': 'foldedMap',
  'military-medal': 'medal',
  'uniform-historic': 'shirt',
  'dagger-ceremonial': 'dagger',
  'photo-historic': 'photoFrame',
  'regiment-flag': 'regimentFlag',
  // Items — arte
  'oil-painting': 'painting',
  'bronze-sculpture': 'statue',
  'engraving-original': 'engravingPlate',
  'tapestry-antique': 'tapestry',
  'vase-decorative': 'decorativeVase',
  'sketch-master': 'sketch',
  // Items — reliquias
  'crown-lost': 'crown',
  'amulet-sacred': 'amulet',
  'scroll-arcane': 'scroll',
  'scepter-royal': 'scepter',
  'idol-jade': 'idol',
  'relic-sealed': 'sealedRelic',
  'ritual-mask': 'ritualMask',
  'legendary-sword': 'legendarySword',
  // Items — futuro
  'fusion-core': 'fusionCore',
  'quantum-chip': 'quantumChip',
  'neural-implant': 'implant',
  'drone-rescued': 'drone',
  'stellar-fragment': 'shard',

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
  // DECISIÓN: moon-watch reusa la forma 'watch' de pocket-watch — ambos son relojes, se
  // diferencian por color de rareza/contexto (uno es hallazgo, el otro nodo de prestigio).
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
  // Ronda 21: botón de Estadísticas del header — reusa la forma de 'chart-up' (mismo ícono
  // que ya usan los logros de racha), sin inventar una silueta nueva para un simple gráfico.
  stats: 'chart',
  money: 'cashStack',
  keys: 'key',
  'touch-app': 'touchApp',
  'tab-escarbar': 'touchApp',
  'tab-tienda': 'dumpster',
  // AJUSTE (ronda 14): TitleScreen.js llama iconMarkup('dumpster', ...) directo para el logo
  // de la pantalla de inicio — sin esta clave caía en el fallback "artifact" (el pentágono que
  // reportó el usuario), porque antes solo existían alias INDIRECTOS ('dumpster-street',
  // 'tab-tienda') que apuntan A la forma 'dumpster', no una clave 'dumpster' en sí.
  dumpster: 'dumpster',
  'tab-automatizacion': 'gear',
  'tab-logros': 'medal',
  'tab-prestigio': 'crown',
  'tab-index': 'clipboard',
  // Ronda 23.C: la pestaña Puesto reusa la forma 'marketStall' (mismo puesto que 'stall-chatarra',
  // ronda 23.B) — un ícono de tab siempre apunta a una forma ya definida, nunca duplica el path.
  'tab-puesto': 'marketStall',
  locked: 'shield',
  'close-x': 'closeX',

  // Items — contenedores de prestigio (ronda 11)
  'cargo-manifest': 'manifest',
  'ghost-lantern': 'lantern',
  'route-compass': 'compass',
  'sealed-strongbox': 'crate',
  'captain-ring': 'ring',
  'cursed-cargo': 'box',
  'phantom-bell': 'bell',
  // DECISIÓN: framed-forgery y lost-masterpiece reusan 'painting' (misma forma que oil-painting)
  // porque los tres son, literalmente, cuadros — se diferencian por color de rareza.
  'framed-forgery': 'painting',
  'marble-bust': 'bust',
  'lost-masterpiece': 'painting',
  'burial-mask': 'helmet',
  'grail-replica': 'grail',
  'saint-reliquary': 'reliquary',
  'collector-heart': 'crystalHeart',
  'heat-shield': 'shield',
  'zero-g-tool': 'fist',
  'cosmonaut-log': 'logbook',
  'orbital-gyro': 'radar',
  'plasma-cell': 'plasmaCell',
  'ai-core-salvaged': 'implant',
  'station-heart': 'satellite',
  'titan-bolt': 'gear',
  'chrono-shard': 'chronoShard',
  'ambrosia-flask': 'bottle',
  'olympus-circuit': 'olympusCircuit',
  // DECISIÓN: godling-idol reusa 'idol' (misma forma que idol-jade) — ambos son estatuillas
  // idolatradas; se diferencian por color de rareza.
  'godling-idol': 'idol',
  'thunder-coil': 'cable',
  'creation-seed': 'seed',

  // Ronda 15 — Agente B: 4 contenedores de prestigio 6-9 + sus 28 ítems.
  'junkyard-titans': 'junkyard',
  'shipwreck-temporal': 'shipwreck',
  'archive-multiverse': 'archive',
  'dump-bigbang': 'bigbang',
  'rivet-colossal': 'rivetColossal',
  'chain-titanic': 'chainLink',
  'anvil-titan': 'anvilTitan',
  // DECISIÓN: gear-colossus reusa 'gear' (mismo objeto, escala mayor) — se diferencia por
  // color de rareza, igual que otros reusos ya documentados en este archivo.
  'gear-colossus': 'gear',
  'piston-seismic': 'pistonSeismic',
  // DECISIÓN: core-starforge reusa 'fusionCore' (mismo concepto de núcleo energético).
  'core-starforge': 'fusionCore',
  // DECISIÓN: heart-automaton reusa 'crystalHeart' (misma forma que collector-heart).
  'heart-automaton': 'crystalHeart',
  'compass-reversed': 'compass',
  'map-extinct': 'foldedMap',
  'figurehead-ghost': 'figurehead',
  'hourglass-frozen': 'hourglass',
  'anchor-lostsea': 'anchor',
  'chronometer-eternal': 'watch',
  'helm-time': 'helm',
  'portrait-alternate': 'painting',
  'score-silent': 'musicScore',
  'sculpture-impossible': 'statue',
  'tome-unhappened': 'book',
  'key-infinite': 'key',
  'mirror-timelines': 'mirror',
  'catalog-multiverse': 'manifest',
  'dust-firststar': 'stardust',
  'bubble-void': 'voidBubble',
  'fragment-horizon': 'shard',
  'echo-bigbang': 'echoWave',
  'atom-primordial': 'atomPrimordial',
  'spark-genesis': 'sparkGenesis',
  'relic-dayzero': 'relicDayzero',

  // Ronda 15 — Agente C: máquinas del robot + nodo Escáner de Trampas.
  // DECISIÓN: servo-arm/servo-arm-titanium reusan 'steelArm' (mismo brazo mecánico del nodo de
  // prestigio Brazos de Acero) — se diferencian por color de rareza/contexto de tarjeta.
  'servo-arm': 'steelArm',
  'servo-arm-titanium': 'steelArm',
  // DECISIÓN: chip-overclock reusa 'quantumChip' (mismo chip que el ítem quantum-chip).
  'chip-overclock': 'quantumChip',
  // DECISIÓN: core-quantum reusa 'olympusCircuit' (núcleo con líneas de energía radiales).
  'core-quantum': 'olympusCircuit',
  // DECISIÓN: scanner-trap reusa 'radar' (mismo símbolo de detección que metal-detector/eagle-eye).
  'scanner-trap': 'radar',

  // Ronda 20 — Agente B: contenedores con mecánica propia + sus 14 ítems.
  'vault-timed': 'vaultTimed',
  'basement-dark': 'basementDark',
  'clock-countdown': 'clockCountdown',
  // DECISIÓN: vault-door-ajar reusa 'vault' (misma puerta blindada que bank-vault/vault-lost).
  'vault-door-ajar': 'vault',
  // DECISIÓN: ledger-burnt reusa 'logbook' (mismo libro de registro que cosmonaut-log).
  'ledger-burnt': 'logbook',
  // DECISIÓN: key-timelock/key-blackened reusan 'key' (misma llave, se diferencian por color de rareza).
  'key-timelock': 'key',
  'key-blackened': 'key',
  'seal-wax-ancient': 'waxSeal',
  // DECISIÓN: coin-uncounted reusa 'coin' (misma moneda que coin-old).
  'coin-uncounted': 'coin',
  'gem-frozen-time': 'gemFrozenTime',
  // DECISIÓN: painting-unseen reusa 'painting' (mismo cuadro que oil-painting/portrait-alternate).
  'painting-unseen': 'painting',
  // DECISIÓN: sketch-blind reusa 'sketch' (mismo boceto que sketch-master).
  'sketch-blind': 'sketch',
  // DECISIÓN: sculpture-shadow reusa 'statue' (misma escultura que bronze-sculpture).
  'sculpture-shadow': 'statue',
  'lantern-extinguished': 'lanternExtinguished',
  'eye-glass-dark': 'eyeGlassDark',
  // DECISIÓN: relic-unlit reusa 'sealedRelic' (misma reliquia sellada que relic-sealed).
  'relic-unlit': 'sealedRelic',

  // Ronda 23 — Agente B: Puesto de Chatarra (data/stall.json, achievements.json, automations.json).
  'stall-chatarra': 'marketStall',
  'shelf-inventory': 'shelf',
  'order-sign': 'orderSign',
  // DECISIÓN: robot-vendor reusa 'robot' (mismo robot que robot-sorter) — se diferencia por
  // contexto de tarjeta (Automatización) y color, mismo criterio que servo-arm/servo-arm-titanium.
  'robot-vendor': 'robot',

  // Ronda 24 — misiones diarias (Chispa), ciclo día/noche (Zoraida) y eventos de contenedor.
  'quest-board': 'clipboard',
  'sun-day': 'sun',
  'moon-night': 'crescent',
  'event-golden': 'coinStack',
  'event-fire': 'flame',
  // DECISIÓN: el logro "primer evento aprovechado" reusa 'sparkGenesis' (mismo destello que
  // spark-genesis) — un evento aprovechado es, literalmente, una chispa de suerte.
  'event-spark': 'sparkGenesis',

  // Ronda 20 — Agente B: indicios visuales de grado de trampa (PLAN.md §4.24).
  'hint-leve': 'waterStain',
  'hint-normal': 'crackedGround',
  'hint-grave': 'clawMarks',

  // Ronda 20 — Agente B: herramientas de escarbado.
  // DECISIÓN: hands-bare reusa 'hand' (mismas manos que el nodo de prestigio hand-spread).
  'hands-bare': 'hand',
  'shovel-wide': 'shovelWide',
  'brush-fine': 'brushFine',
  'glove-hydraulic': 'gloveHydraulic',

  // Ronda 22: legendarios de la Vitrina (data/legendaries.json). Reusan formas ya existentes
  // (mismo criterio de "reuso con color de rareza distinto" documentado arriba) — el bloom de
  // rareza alta (PLAN.md §5.2) lo aporta el CSS de la vitrina, no una silueta nueva por ítem.
  'legend-can': 'crushedCan',
  'legend-bike': 'bike',
  'legend-core': 'fusionCore',
  'legend-watch': 'watch',
  'legend-anchor': 'anchor',
  'legend-muse': 'crystalHeart',
  'legend-relic': 'sealedRelic',
  'legend-seed': 'seed',
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

// exportados para tests
export { SHAPES, ICON_MAP };

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
