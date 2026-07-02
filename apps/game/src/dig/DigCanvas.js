/**
 * Canvas de escarbado: dos capas, la de arriba ("suciedad") se borra con
 * `destination-out` para revelar la de abajo (contenido del contenedor), igual
 * patrón técnico que un rasca y gana HTML5 (PLAN.md §2.2). No conoce el engine ni
 * fórmulas: recibe `revealThreshold`/`areaMult` ya calculados por quien lo monta
 * (@dumpster/engine vía store.js) y solo redibuja el área afectada por cada gesto,
 * nunca el canvas completo por frame (PLAN.md §6.4).
 *
 * Sin emojis (CLAUDE.md): el contenido de la capa de abajo se dibuja con formas
 * simples + texto, a la espera del registro de íconos SVG del Agente 3.
 */

import { attachDigInput } from './digInput.js';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 330;
const SAMPLE_GRID_X = 16;
const SAMPLE_GRID_Y = 9;
const SAMPLE_THROTTLE_MS = 120;
const BASE_ERASE_RADIUS = 26;

export class DigCanvas {
  /**
   * @param {HTMLElement} host
   * @param {{ onProgress: (frac:number)=>void, onThresholdReached: ()=>void }} callbacks
   */
  constructor(host, callbacks) {
    this.host = host;
    this.callbacks = callbacks;

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

    this.ctxBottom = this.bottomCanvas.getContext('2d');
    this.ctxTop = this.topCanvas.getContext('2d');

    this.active = false;
    this.revealThreshold = 0.6;
    this.areaMult = 1;
    this.thresholdFired = false;
    this.lastSampleAt = 0;

    this.detachInput = attachDigInput(this.topCanvas, {
      onStart: (pos) => this.erase(pos),
      onMove: (pos) => this.erase(pos),
      onEnd: () => {},
    });
  }

  /**
   * Arranca un nuevo escarbado. El resultado (trampa o ítems) ya viene decidido por
   * el engine: acá solo se dibuja y se detecta cuándo se llega al umbral de revelado.
   * @param {{ isTrap: boolean, items: Array<{name:string}> }} digResult
   * @param {number} revealThreshold - fracción 0-1, viene de getRevealThreshold()
   * @param {number} areaMult - viene de getAreaMult()
   */
  start(digResult, revealThreshold, areaMult) {
    this.active = true;
    this.thresholdFired = false;
    this.revealThreshold = revealThreshold;
    this.areaMult = areaMult;
    this.drawBottomLayer(digResult);
    this.drawTopLayer();
  }

  stop() {
    this.active = false;
    this.ctxTop.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctxBottom.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawBottomLayer(digResult) {
    const ctx = this.ctxBottom;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#2c261a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const labels = digResult.isTrap ? ['¡Trampa!'] : digResult.items.map((item) => item.name);
    const positions = this.layoutPositions(labels.length);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px sans-serif';
    labels.forEach((label, i) => {
      const pos = positions[i];
      ctx.beginPath();
      ctx.fillStyle = digResult.isTrap ? '#c0392b' : '#e8c07d';
      ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#161310';
      ctx.fillText(label, pos.x, pos.y + 44, CANVAS_WIDTH / positions.length - 8);
    });
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
    ctx.fillStyle = '#4a4128';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /**
   * Borra una zona local de la capa de arriba (destination-out) y, con throttle,
   * muestrea qué fracción del canvas ya quedó revelada.
   * @param {{x:number,y:number}} pos
   */
  erase(pos) {
    if (!this.active) return;
    const radius = BASE_ERASE_RADIUS * this.areaMult;
    const ctx = this.ctxTop;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    const now = performance.now();
    if (now - this.lastSampleAt <= SAMPLE_THROTTLE_MS) return;
    this.lastSampleAt = now;
    const fraction = this.sampleClearedFraction();
    this.callbacks.onProgress(fraction);
    if (!this.thresholdFired && fraction >= this.revealThreshold) {
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
    this.detachInput();
    this.host.innerHTML = '';
  }
}
