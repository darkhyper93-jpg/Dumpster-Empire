/**
 * Canvas de escarbado: dos capas, la de arriba ("suciedad") se borra con
 * `destination-out` para revelar la de abajo (contenido del contenedor), igual
 * patrón técnico que un rasca y gana HTML5 (PLAN.md §2.2). No conoce el engine ni
 * fórmulas: recibe `revealThreshold`/`areaMult` ya calculados por quien lo monta
 * (@dumpster/engine vía store.js) y solo redibuja el área afectada por cada gesto,
 * nunca el canvas completo por frame (PLAN.md §6.4).
 *
 * Sin emojis (CLAUDE.md): el contenido de la capa de abajo usa el registro de íconos
 * SVG (`icons/icons.js`) rasterizado a `Image` para poder dibujarse en canvas.
 *
 * Estado "antes de tocar": el mockup Stitch `dumpster_empire_main_game` (DESARROLLO.md §6)
 * muestra un ícono + anillo pulsante + "arrastrá para escarbar" hasta el primer gesto.
 * Ese overlay vive como un <div> HTML superpuesto (no en el propio canvas) para poder
 * animarlo con CSS (`.dig-idle-ring` queda preparada para el pulido del Agente 4).
 */

import { attachDigInput } from './digInput.js';
import { getIconImage, iconMarkup } from '../icons/icons.js';
import { startScratchSound, stopScratchSound } from '../fx/audio.js';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 330;
const SAMPLE_GRID_X = 16;
const SAMPLE_GRID_Y = 9;
const SAMPLE_THROTTLE_MS = 120;
// AJUSTE (agentes/rework-escarbado-y-landing-prompt.md): bajado de 26 a 20 — con el radio viejo,
// un solo barrido en zigzag sobre el canvas ya cubría casi todo el umbral de revelado ("un solo
// click" con forma de arrastre). Un pincel más chico exige más recorrido real por contenedor.
const BASE_ERASE_RADIUS = 20;
// El ritmo de escarbado (getDigRate del engine, 0.15-1) escala el radio y el alpha efectivos del
// borrado: con poca Fuerza contra un contenedor resistente, cada pasada limpia menos superficie
// y dos pasadas por el mismo punto no alcanzan a agotar el alpha del todo (destination-out con
// alpha parcial reduce el alpha del destino multiplicativamente, no lo pone en 0 de una).
const DIG_RATE_RADIUS_FLOOR = 0.45;
const DIG_RATE_ALPHA_FLOOR = 0.35;
// Higiene de input de la UI (no economía): exige que el jugador haya arrastrado al menos esta
// distancia real (px de canvas) antes de poder disparar onThresholdReached. El umbral de
// revelado en sí sigue viniendo 100% del engine (getRevealThreshold); esto solo evita que un
// buffer vaciado por una causa externa (contexto GPU perdido, hover fantasma) se confunda con
// un escarbado legítimo.
const MIN_DRAG_DISTANCE = 400; // px de canvas ≈ dos tercios del ancho (CANVAS_WIDTH=600)

export class DigCanvas {
  /**
   * @param {HTMLElement} host
   * @param {{ onProgress: (frac:number)=>void, onThresholdReached: ()=>void }} callbacks
   * @param {Array<{id:string, colorToken:string}>} [rarities] - para colorear ítems/íconos por rareza (§2.5).
   */
  constructor(host, callbacks, rarities = []) {
    this.host = host;
    this.callbacks = callbacks;
    this.rarities = rarities;

    this.bottomCanvas = document.createElement('canvas');
    this.topCanvas = document.createElement('canvas');
    for (const canvas of [this.bottomCanvas, this.topCanvas]) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      canvas.className = 'dig-canvas-layer';
    }
    this.topCanvas.classList.add('dig-canvas-top');
    host.appendChild(this.bottomCanvas);
    host.appendChild(this.topCanvas);

    this.idlePrompt = document.createElement('div');
    this.idlePrompt.className = 'dig-idle-prompt';
    this.idlePrompt.innerHTML =
      `<span class="dig-idle-ring"></span>${iconMarkup('touch-app', { size: 32 })}` +
      `<p>Arrastrá para escarbar</p>`;
    this.idlePrompt.hidden = true;
    host.appendChild(this.idlePrompt);

    this.ctxBottom = this.bottomCanvas.getContext('2d');
    this.ctxTop = this.topCanvas.getContext('2d');

    this.active = false;
    this.revealThreshold = 0.6;
    this.areaMult = 1;
    this.digRate = 1;
    this.thresholdFired = false;
    this.touched = false;
    this.lastSampleAt = 0;
    this._lastErasePos = null;
    this._dragDistance = 0;

    this.input = attachDigInput(this.topCanvas, {
      onStart: (pos) => {
        this.markTouched();
        if (this.active) startScratchSound();
        this.erase(pos);
      },
      onMove: (pos) => this.erase(pos),
      onEnd: () => stopScratchSound(),
    });
  }

  markTouched() {
    if (this.touched) return;
    this.touched = true;
    this.idlePrompt.hidden = true;
  }

  /**
   * Arranca un nuevo escarbado. El resultado (trampa o ítems) ya viene decidido por
   * el engine: acá solo se dibuja y se detecta cuándo se llega al umbral de revelado.
   * @param {{ isTrap: boolean, items: Array<{name:string}> }} digResult
   * @param {number} revealThreshold - fracción 0-1, viene de getRevealThreshold()
   * @param {number} areaMult - viene de getAreaMult()
   * @param {number} [digRate] - viene de getDigRate() (Resistencia del contenedor vs. Fuerza), 1 = ritmo normal.
   */
  start(digResult, revealThreshold, areaMult, digRate = 1) {
    this.active = true;
    this.thresholdFired = false;
    this.touched = false;
    this.revealThreshold = revealThreshold;
    this.areaMult = areaMult;
    this.digRate = digRate;
    this.lastSampleAt = 0;
    this._lastErasePos = null;
    this._dragDistance = 0;
    // Reset silencioso del input: un escarbado nuevo no debe heredar un `dragging` que haya
    // quedado prendido de un gesto anterior (ver digInput.js).
    this.input.cancel();
    // Generación de escarbado: cada `start()` la incrementa para que un callback de carga de
    // ícono de un escarbado anterior (que llega tarde) se descarte en vez de pintar sobre el
    // contenido actual (PUNTOS_A_MEJORAR_2.md §1).
    this.digGeneration = (this.digGeneration || 0) + 1;
    this.idlePrompt.hidden = false;
    this.drawBottomLayer(digResult);
    this.drawTopLayer();
  }

  stop() {
    this.active = false;
    this.idlePrompt.hidden = true;
    stopScratchSound();
    this.input.cancel();
    this.ctxTop.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctxBottom.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  rarityColorToken(categoria) {
    const rarity = this.rarities.find((r) => r.id === categoria);
    return rarity ? rarity.colorToken : '--amber';
  }

  drawBottomLayer(digResult) {
    const ctx = this.ctxBottom;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#2c261a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const entries = digResult.isTrap
      ? [{ icon: 'artifact', name: '¡Trampa!', colorHex: '#c0392b' }]
      : digResult.items.map((item) => ({
          icon: item.icon,
          name: item.name,
          colorHex: this.resolveCssColor(this.rarityColorToken(item.categoria)),
        }));
    const positions = this.layoutPositions(entries.length);
    // Piso en maxWidth para que fillText nunca reciba un ancho 0/negativo (que dejaría el nombre
    // invisible con muchos ítems por contenedor).
    const maxWidth = Math.max(40, CANVAS_WIDTH / positions.length - 8);
    // El ítem se dibuja completo y síncrono (garantiza que el nombre SIEMPRE aparezca). Si el
    // ícono todavía no cargó, al llegar se redibuja el ítem completo (círculo + ícono + nombre),
    // no solo el ícono, guardado por generación de escarbado: así el nombre nunca queda pisado y
    // una carga tardía de un escarbado anterior no ensucia el actual (PUNTOS_A_MEJORAR_2.md §1).
    const gen = this.digGeneration;
    entries.forEach((entry, i) => {
      const pos = positions[i];
      const iconImg = getIconImage(entry.icon, { size: 64, color: '#161310' });
      this.drawEntry(ctx, entry, pos, maxWidth, iconImg);
      if (!iconImg.complete) {
        iconImg.addEventListener(
          'load',
          () => {
            if (this.active && this.digGeneration === gen) this.drawEntry(ctx, entry, pos, maxWidth, iconImg);
          },
          { once: true }
        );
      }
    });
  }

  /**
   * Dibuja un ítem completo en la capa de abajo, en orden círculo → ícono → nombre y seteando el
   * estado del contexto adentro. Se llama tanto en el dibujo síncrono como en el callback async de
   * carga de ícono, donde no se puede confiar en un estado de contexto seteado antes del loop.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{name:string, colorHex:string}} entry
   * @param {{x:number,y:number}} pos
   * @param {number} maxWidth
   * @param {HTMLImageElement} iconImg
   */
  drawEntry(ctx, entry, pos, maxWidth, iconImg) {
    ctx.beginPath();
    ctx.fillStyle = entry.colorHex;
    ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
    ctx.fill();

    if (iconImg.complete) ctx.drawImage(iconImg, pos.x - 16, pos.y - 16, 32, 32);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#f4ede1';
    ctx.fillText(entry.name, pos.x, pos.y + 44, maxWidth);
  }

  /** Resuelve una variable CSS de rareza (ej. `--r-relics`) a un color concreto para el canvas. */
  resolveCssColor(cssVar) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return value || '#e8c07d';
  }

  layoutPositions(count) {
    const points = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const padX = CANVAS_WIDTH * 0.15;
    const padY = CANVAS_HEIGHT * 0.2;
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padX + (CANVAS_WIDTH - 2 * padX) * ((col + 0.5) / cols);
      const y = padY + (CANVAS_HEIGHT - 2 * padY) * ((row + 0.5) / Math.max(1, rows));
      points.push({ x, y });
    }
    return points;
  }

  drawTopLayer() {
    const ctx = this.ctxTop;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#4a3526';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = ctx.createPattern(this.getDirtTexture(), 'repeat');
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /**
   * Textura tipo fibra de carbono para la capa de suciedad (DESARROLLO.md §6), en vez de un
   * color plano. Se pinta dentro del propio canvas (no como capa CSS aparte) para que el
   * `destination-out` del escarbado la borre junto con el resto de la capa.
   * @returns {HTMLCanvasElement}
   */
  getDirtTexture() {
    if (DigCanvas._dirtTexture) return DigCanvas._dirtTexture;
    const tile = document.createElement('canvas');
    tile.width = 16;
    tile.height = 16;
    const tctx = tile.getContext('2d');
    tctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    tctx.fillRect(0, 0, 8, 8);
    tctx.fillRect(8, 8, 8, 8);
    tctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    tctx.fillRect(8, 0, 8, 8);
    tctx.fillRect(0, 8, 8, 8);
    DigCanvas._dirtTexture = tile;
    return tile;
  }

  /**
   * Borra una zona local de la capa de arriba (destination-out) y, con throttle,
   * muestrea qué fracción del canvas ya quedó revelada.
   * @param {{x:number,y:number}} pos
   */
  erase(pos) {
    if (!this.active) return;
    // Compuerta de esfuerzo: acumula la distancia real recorrida en este arrastre (ver
    // MIN_DRAG_DISTANCE arriba). `_lastErasePos` se resetea a null en start(), así que el primer
    // erase() de cada gesto no suma distancia (no hay punto anterior con el que compararlo).
    if (this._lastErasePos) {
      const dx = pos.x - this._lastErasePos.x;
      const dy = pos.y - this._lastErasePos.y;
      this._dragDistance += Math.sqrt(dx * dx + dy * dy);
    }
    this._lastErasePos = pos;
    // AJUSTE (agentes/rework-escarbado-y-landing-prompt.md): el ritmo de escarbado (digRate, 1 =
    // normal) ya lo calcula el engine (economy.js getDigRate) combinando Resistencia del
    // contenedor y Fuerza del jugador; acá se traduce a un pincel más chico Y más "débil" (alpha
    // parcial) cuando el ritmo es bajo, para que escarbar un contenedor por encima de la Fuerza
    // actual sea notoriamente más lento sin quedar nunca trabado del todo (digRate nunca baja de
    // 0.15, ver economy.js).
    const radiusScale = DIG_RATE_RADIUS_FLOOR + (1 - DIG_RATE_RADIUS_FLOOR) * this.digRate;
    const alphaScale = DIG_RATE_ALPHA_FLOOR + (1 - DIG_RATE_ALPHA_FLOOR) * this.digRate;
    const radius = BASE_ERASE_RADIUS * this.areaMult * radiusScale;
    const ctx = this.ctxTop;
    ctx.globalCompositeOperation = 'destination-out';
    // AJUSTE (Agente 4): `destination-out` quita alpha del destino proporcional al alpha de lo
    // que se dibuja encima. `drawTopLayer` deja el `fillStyle` en el patrón de textura (que tiene
    // zonas con alpha bajo, 0.05-0.18) para el dibujo visual de la suciedad; si `erase()` reusara
    // ese mismo `fillStyle` solo borraría una fracción de cada píxel en vez de revelarlo del todo
    // (encontrado con el smoke e2e: el progreso nunca superaba unos pocos puntos porcentuales).
    // El área borrada necesita alpha 1 sin importar el color (el debilitamiento por digRate se
    // aplica con `globalAlpha`, no reusando el patrón semitransparente).
    ctx.fillStyle = '#000';
    ctx.globalAlpha = alphaScale;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const now = performance.now();
    if (now - this.lastSampleAt <= SAMPLE_THROTTLE_MS) return;
    this.lastSampleAt = now;
    const fraction = this.sampleClearedFraction();
    if (fraction >= this.revealThreshold && this._dragDistance < MIN_DRAG_DISTANCE) {
      // Reparación de anomalía: la fracción revelada saltó sin que hubiera arrastre real
      // suficiente (buffer vaciado por una causa externa — contexto GPU perdido, hover fantasma
      // residual, etc.). Se repinta la capa de suciedad completa y se reporta progreso 0; el
      // escarbado sigue "vivo" (no se marca thresholdFired) y exige arrastre real desde cero.
      this.drawTopLayer();
      this.callbacks.onProgress(0);
      return;
    }
    this.callbacks.onProgress(fraction);
    if (!this.thresholdFired && fraction >= this.revealThreshold && this._dragDistance >= MIN_DRAG_DISTANCE) {
      this.thresholdFired = true;
      this.callbacks.onThresholdReached();
    }
  }

  sampleClearedFraction() {
    const { data } = this.ctxTop.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let cleared = 0;
    const total = SAMPLE_GRID_X * SAMPLE_GRID_Y;
    for (let gy = 0; gy < SAMPLE_GRID_Y; gy++) {
      for (let gx = 0; gx < SAMPLE_GRID_X; gx++) {
        const px = Math.floor(((gx + 0.5) * CANVAS_WIDTH) / SAMPLE_GRID_X);
        const py = Math.floor(((gy + 0.5) * CANVAS_HEIGHT) / SAMPLE_GRID_Y);
        const idx = (py * CANVAS_WIDTH + px) * 4;
        if (data[idx + 3] < 40) cleared++;
      }
    }
    return cleared / total;
  }

  destroy() {
    this.input.detach();
    this.host.innerHTML = '';
  }
}
