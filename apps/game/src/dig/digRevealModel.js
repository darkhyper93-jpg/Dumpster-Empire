/**
 * Modelo puro del revelado por-objeto (PUNTOS_A_MEJORAR_5 §3): la ÚNICA fuente de verdad
 * de qué objetos del contenedor ya fueron destapados y de cuándo se completa el escarbado.
 *
 * DECISIÓN (ronda 5): el completado NUNCA se deriva de leer píxeles del canvas
 * (getImageData). Cuatro rondas de bugs (umbral por área, distancia mínima, reparación de
 * anomalía) vinieron de tratar al buffer del canvas como estado: un buffer descartado por el
 * compositor (Electron/Chromium) autocompletaba o destapaba solo. Acá el estado vive en JS:
 * el canvas solo PINTA lo que este modelo dice, y puede repintarse entero desde él.
 *
 * Sin DOM: corre igual en Node (Vitest) que en el navegador.
 */

/**
 * Cobertura de la huella de un objeto (fracción de sus puntos de muestreo limpios) a partir
 * de la cual el objeto "hace pop" y se considera revelado. 0.6 da sensación de rasca-y-gana:
 * hay que rascar de verdad encima del objeto, pero no limpiarlo píxel a píxel.
 */
export const REVEAL_COVERAGE = 0.6;

/** Intentos de colocación aleatoria por objeto antes de caer a la grilla determinista. */
const PLACEMENT_ATTEMPTS = 200;

/**
 * @typedef {{x: number, y: number}} Point
 * @typedef {{from: Point|null, to: Point, radius: number}} Stroke
 * @typedef {Object} RevealObject
 * @property {number} x
 * @property {number} y
 * @property {Point[]} points - puntos de muestreo de la huella (disco de objectRadius)
 * @property {boolean[]} cleared - por punto: ya quedó bajo un trazo
 * @property {boolean} revealed
 * @typedef {Object} RevealModel
 * @property {number} width
 * @property {number} height
 * @property {number} objectRadius
 * @property {number} marginX
 * @property {number} marginTop
 * @property {number} marginBottom
 * @property {RevealObject[]} objects
 * @property {Stroke[]} strokes - trazos aplicados, en orden, para repintar la capa
 */

/**
 * Crea el modelo de un escarbado: `count` objetos en posiciones aleatorias sin solape.
 * @param {Object} opts
 * @param {number} opts.count - cantidad de objetos (trampa = 1)
 * @param {number} opts.width - ancho lógico del canvas
 * @param {number} opts.height - alto lógico del canvas
 * @param {number} opts.objectRadius - radio del círculo del objeto
 * @param {number} [opts.minSpacing] - distancia mínima entre centros
 * @param {number} [opts.marginX] - margen lateral del área de colocación
 * @param {number} [opts.marginTop] - margen superior
 * @param {number} [opts.marginBottom] - margen inferior (deja lugar a la etiqueta bajo el círculo)
 * @param {() => number} [opts.random] - RNG inyectable (tests deterministas); default Math.random
 * @returns {RevealModel}
 */
export function createRevealModel({
  count,
  width,
  height,
  objectRadius,
  minSpacing = 110,
  marginX = objectRadius + 12,
  marginTop = objectRadius + 12,
  // La etiqueta se dibuja ~44px bajo el centro (DigCanvas.drawEntry): el margen inferior
  // garantiza que el nombre entre completo en el canvas.
  marginBottom = objectRadius + 36,
  random = Math.random,
}) {
  const positions = placePositions({
    count,
    width,
    height,
    minSpacing,
    marginX,
    marginTop,
    marginBottom,
    random,
  });
  return {
    width,
    height,
    objectRadius,
    marginX,
    marginTop,
    marginBottom,
    objects: positions.map((pos) => {
      const points = footprintPoints(pos, objectRadius);
      return {
        x: pos.x,
        y: pos.y,
        points,
        cleared: points.map(() => false),
        revealed: false,
      };
    }),
    strokes: [],
  };
}

function footprintPoints(pos, radius) {
  const points = [{ x: pos.x, y: pos.y }];
  // Anillo interno (5 puntos a 0.45r) + anillo externo (8 puntos a 0.85r): 14 puntos por
  // huella. Suficiente resolución para que la cobertura discrimine "pasé por arriba" de
  // "apenas lo rocé", y barato de evaluar por trazo.
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    points.push({ x: pos.x + Math.cos(angle) * radius * 0.45, y: pos.y + Math.sin(angle) * radius * 0.45 });
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    points.push({ x: pos.x + Math.cos(angle) * radius * 0.85, y: pos.y + Math.sin(angle) * radius * 0.85 });
  }
  return points;
}

/**
 * Coloca `count` centros con muestreo por rechazo dentro del rect útil; si el RNG no logra
 * separarlos (degenerado o área muy justa), cae a una grilla determinista que garantiza
 * terminar y respetar `minSpacing` (con los datos del V1 — máx. 6 slots en 600×330 — el
 * rechazo alcanza siempre; la grilla es la red de seguridad).
 */
function placePositions({ count, width, height, minSpacing, marginX, marginTop, marginBottom, random }) {
  const usableW = width - marginX * 2;
  const usableH = height - marginTop - marginBottom;
  const accepted = [];
  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
      const candidate = { x: marginX + random() * usableW, y: marginTop + random() * usableH };
      if (accepted.every((p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) >= minSpacing)) {
        accepted.push(candidate);
        placed = true;
        break;
      }
    }
    if (!placed) return gridPositions({ count, width, height, marginX, marginTop, marginBottom });
  }
  return accepted;
}

/** Grilla determinista de respaldo (mismo criterio de columnas que el layout viejo). */
function gridPositions({ count, width, height, marginX, marginTop, marginBottom }) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const usableW = width - marginX * 2;
  const usableH = height - marginTop - marginBottom;
  const points = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    points.push({
      x: marginX + (cols === 1 ? usableW / 2 : (usableW * col) / (cols - 1)),
      y: marginTop + (rows === 1 ? usableH / 2 : (usableH * row) / (rows - 1)),
    });
  }
  return points;
}

/**
 * Aplica un trazo del pincel (segmento `from`→`to`, o un toque si `from` es null) y marca
 * limpios los puntos de muestreo alcanzados. El trazo queda registrado en `model.strokes`
 * para poder repintar la capa de suciedad desde el modelo.
 * @param {RevealModel} model
 * @param {Point|null} from - punto anterior del gesto (null = primer contacto)
 * @param {Point} to
 * @param {number} radius - radio efectivo del pincel
 * @returns {{newlyRevealed: number[]}} índices de objetos que se revelaron con ESTE trazo
 */
export function applyStroke(model, from, to, radius) {
  model.strokes.push({
    from: from ? { x: from.x, y: from.y } : null,
    to: { x: to.x, y: to.y },
    radius,
  });
  const newlyRevealed = [];
  model.objects.forEach((obj, index) => {
    if (obj.revealed) return;
    let clearedCount = 0;
    obj.points.forEach((point, pi) => {
      if (!obj.cleared[pi] && distanceToSegment(point, from || to, to) <= radius) {
        obj.cleared[pi] = true;
      }
      if (obj.cleared[pi]) clearedCount++;
    });
    if (clearedCount / obj.points.length >= REVEAL_COVERAGE) {
      obj.revealed = true;
      newlyRevealed.push(index);
    }
  });
  return { newlyRevealed };
}

/** Distancia de un punto al segmento a→b (a === b degenera a distancia punto-punto). */
function distanceToSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  let t = 0;
  if (lengthSq > 0) {
    t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq));
  }
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return Math.hypot(p.x - cx, p.y - cy);
}

/**
 * Progreso del escarbado: objetos revelados / total (así se llena la barra — PUNTOS_A_MEJORAR_5 §3).
 * @param {RevealModel} model
 * @returns {number} fracción 0-1
 */
export function getProgress(model) {
  if (model.objects.length === 0) return 0;
  return model.objects.filter((o) => o.revealed).length / model.objects.length;
}

/**
 * @param {RevealModel} model
 * @returns {boolean} true solo cuando TODOS los objetos fueron revelados
 */
export function isComplete(model) {
  return model.objects.length > 0 && model.objects.every((o) => o.revealed);
}

/**
 * @param {RevealModel} model
 * @returns {Point[]} centros de los objetos (copias)
 */
export function getPositions(model) {
  return model.objects.map((o) => ({ x: o.x, y: o.y }));
}

/**
 * @param {RevealModel} model
 * @returns {boolean[]} flag de revelado por objeto, en orden
 */
export function getRevealed(model) {
  return model.objects.map((o) => o.revealed);
}

/**
 * @param {RevealModel} model
 * @returns {Stroke[]} trazos aplicados en orden (para repintar la capa de suciedad)
 */
export function getStrokes(model) {
  return model.strokes.map((s) => ({
    from: s.from ? { x: s.from.x, y: s.from.y } : null,
    to: { x: s.to.x, y: s.to.y },
    radius: s.radius,
  }));
}

/**
 * Indicio visual del grado de trampa (PLAN.md §4.24, ronda 20). REGLA DURA (napkin): el indicio
 * se DECIDE acá (estado del dig en curso), nunca leyendo píxeles del canvas — `DigCanvas` solo
 * pinta el resultado de esta función. Cosmético únicamente: no cambia el grado real ni el
 * castigo, solo sugiere qué tan grave puede ser.
 * @param {'leve'|'normal'|'grave'|undefined} trapGrade - `undefined` si el dig no es trampa, o
 *   si `data.traps` no estaba disponible en el roll (compat, ver systems/containers.js).
 * @param {number} hintProb - `data/traps.json` → `hintProb` (0.6 en el balance actual).
 * @param {() => number} [random]
 * @returns {'leve'|'normal'|'grave'|null} el grado a pintar, o null si no toca mostrar nada.
 */
export function rollTrapHintGrade(trapGrade, hintProb, random = Math.random) {
  if (!trapGrade) return null;
  return random() < hintProb ? trapGrade : null;
}
