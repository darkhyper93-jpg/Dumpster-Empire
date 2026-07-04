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
// AJUSTE (PUNTOS_A_MEJORAR_4 §1): el ritmo de escarbado bajo (getDigRate del engine, 0.15-1)
// ya no debilita el alpha del borrado — el destination-out con alpha parcial dejaba mugre
// semi-transparente ("damero fantasma" con el objeto asomando abajo). La lentitud se expresa
// SOLO con el radio del pincel; piso 0.45→0.35 para conservar el costo de escarbar contenedores
// por encima de la Fuerza actual ahora que cada pasada limpia al 100%.
const DIG_RATE_RADIUS_FLOOR = 0.35;
// Pausa entre limpiar la capa entera y cerrar el escarbado: el jugador tiene que llegar a VER
// cada objeto revelado con su nombre antes de que la vista vuelva al picker (PUNTOS_A_MEJORAR_4 §1).
const REVEAL_HOLD_MS = 650;

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
    this._revealTimer = null;

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
    this.cancelRevealHold();
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
    this.cancelRevealHold();
    this.active = false;
    this.idlePrompt.hidden = true;
    stopScratchSound();
    this.input.cancel();
    this.ctxTop.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctxBottom.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /** Cancela un "momento de revelado" pendiente (ver completeReveal): un escarbado nuevo o un
   *  desmontaje no deben heredar el aviso diferido del anterior. */
  cancelRevealHold() {
    if (this._revealTimer) {
      clearTimeout(this._revealTimer);
      this._revealTimer = null;
    }
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
    if (!this.active || this.thresholdFired) return;
    // Compuerta de esfuerzo: acumula la distancia real recorrida en este arrastre (ver
    // plausibleClearedFraction). `_lastErasePos` se resetea a null en start(), así que el primer
    // erase() de cada gesto no suma distancia (no hay punto anterior con el que compararlo).
    if (this._lastErasePos) {
      const dx = pos.x - this._lastErasePos.x;
      const dy = pos.y - this._lastErasePos.y;
      this._dragDistance += Math.sqrt(dx * dx + dy * dy);
    }
    this._lastErasePos = pos;
    const radius = this.eraseRadius();
    const ctx = this.ctxTop;
    ctx.globalCompositeOperation = 'destination-out';
    // AJUSTE (Agente 4): `destination-out` quita alpha del destino proporcional al alpha de lo
    // que se dibuja encima. `drawTopLayer` deja el `fillStyle` en el patrón de textura (que tiene
    // zonas con alpha bajo, 0.05-0.18) para el dibujo visual de la suciedad; si `erase()` reusara
    // ese mismo `fillStyle` solo borraría una fracción de cada píxel en vez de revelarlo del todo
    // (encontrado con el smoke e2e: el progreso nunca superaba unos pocos puntos porcentuales).
    // El área borrada necesita alpha 1 sin importar el color: todo píxel de la capa de suciedad
    // queda opaco o borrado, nunca semi-transparente (PUNTOS_A_MEJORAR_4 §1).
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    const now = performance.now();
    if (now - this.lastSampleAt <= SAMPLE_THROTTLE_MS) return;
    this.lastSampleAt = now;
    const fraction = this.sampleClearedFraction();
    if (fraction >= this.revealThreshold && fraction > this.plausibleClearedFraction()) {
      // Reparación de anomalía: la fracción revelada supera lo que el arrastre real de este
      // escarbado pudo haber limpiado (buffer vaciado por una causa externa — contexto GPU
      // perdido, hover fantasma residual, etc.). Se repinta la capa de suciedad completa y se
      // reporta progreso 0; el escarbado sigue "vivo" (no se marca thresholdFired) y exige
      // arrastre real desde cero.
      this.drawTopLayer();
      this._dragDistance = 0;
      this._lastErasePos = null;
      this.callbacks.onProgress(0);
      return;
    }
    this.callbacks.onProgress(fraction);
    if (fraction >= this.revealThreshold) {
      this.thresholdFired = true;
      this.completeReveal();
    }
  }

  /** Radio efectivo del pincel: área del jugador (areaMult) × ritmo de escarbado (Resistencia
   *  del contenedor vs Fuerza, ver getDigRate en el engine), expresado SOLO como tamaño. */
  eraseRadius() {
    const radiusScale = DIG_RATE_RADIUS_FLOOR + (1 - DIG_RATE_RADIUS_FLOOR) * this.digRate;
    return BASE_ERASE_RADIUS * this.areaMult * radiusScale;
  }

  /**
   * Fracción máxima del canvas que un arrastre real de largo `_dragDistance` con el pincel
   * actual pudo haber limpiado: franja barrida (2·r·L) + huella inicial (πr²), con margen ×2
   * por solapamiento del muestreo grueso y el antialias. Si la fracción muestreada supera esto,
   * el buffer se vació por una causa externa, no por rascar. Reemplaza a la vieja distancia
   * mínima fija (400px), que con pinceles grandes (areaMult alto) daba falsos positivos y
   * repintaba la mugre sobre un escarbado honesto (PUNTOS_A_MEJORAR_4 §1).
   * @returns {number}
   */
  plausibleClearedFraction() {
    const radius = this.eraseRadius();
    const maxCleared = (2 * radius * this._dragDistance + Math.PI * radius * radius) * 2;
    return maxCleared / (CANVAS_WIDTH * CANVAS_HEIGHT);
  }

  /** Umbral alcanzado: limpia la capa de suciedad ENTERA (sin bandas ni parches a medias),
   *  llena la barra y deja REVEAL_HOLD_MS de "momento de revelado" — el jugador ve cada objeto
   *  con su nombre — antes de avisar al dueño (que despacha finishManualDig y desmonta). */
  completeReveal() {
    stopScratchSound();
    this.ctxTop.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.callbacks.onProgress(1);
    this._revealTimer = setTimeout(() => {
      this._revealTimer = null;
      this.callbacks.onThresholdReached();
    }, REVEAL_HOLD_MS);
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
