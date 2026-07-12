/**
 * Canvas de escarbado: dos capas, la de arriba ("suciedad") se borra con
 * `destination-out` para revelar la de abajo (contenido del contenedor), igual
 * patrón técnico que un rasca y gana HTML5 (PLAN.md §2.2). No conoce el engine ni
 * fórmulas: recibe `areaMult`/`digRate` ya calculados por quien lo monta
 * (@dumpster/engine vía store.js).
 *
 * DECISIÓN (ronda 5, PUNTOS_A_MEJORAR_5): mecánica REHECHA a revelado por-objeto.
 * La fuente de verdad del progreso/completado es `digRevealModel.js` (modelo puro en JS:
 * posiciones + trazos → cobertura por objeto). Este canvas solo PINTA lo que dice el
 * modelo y puede repintarse entero desde él (`repaintFromModel`). Se eliminaron el umbral
 * por % de área, el muestreo de píxeles (`getImageData`), la compuerta de distancia y la
 * reparación de anomalía: con completado por-objeto, un buffer descartado por el
 * compositor ya no puede autocompletar ni destapar nada (causa raíz de las rondas 1-5).
 *
 * Sin emojis (CLAUDE.md): el contenido de la capa de abajo usa el registro de íconos
 * SVG (`icons/icons.js`) rasterizado a `Image` para poder dibujarse en canvas.
 */

import { DIG_SENSITIVITY_MIN, DIG_SENSITIVITY_MAX } from '@dumpster/engine';
import { attachDigInput } from './digInput.js';
import { getIconImage, iconMarkup } from '../icons/icons.js';
import { startScratchSound, stopScratchSound } from '../fx/audio.js';
import { t } from '../i18n/i18n.js';
import {
  createRevealModel,
  applyStroke,
  getProgress,
  isComplete,
  getPositions,
  getRevealed,
  getStrokes,
  rollTrapHintGrade,
} from './digRevealModel.js';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 330;
// AJUSTE (agentes/rework-escarbado-y-landing-prompt.md): bajado de 26 a 20 — un pincel más
// chico exige recorrido real por contenedor. Con el revelado por-objeto sigue siendo el
// costo del gesto: menos radio = más pasadas para cubrir la huella de cada objeto.
const BASE_ERASE_RADIUS = 20;
// AJUSTE (PUNTOS_A_MEJORAR_4 §1): el ritmo de escarbado (getDigRate del engine) no debilita
// el alpha del borrado — destination-out con alpha parcial deja mugre semi-transparente.
// La lentitud/rapidez se expresa SOLO con el radio del pincel.
// AJUSTE (ronda 7, PLAN.md §11.2): tope duro del radio relativo al objeto — ningún build
// (Área alta) convierte el escarbado en un toque único; ver eraseRadius().
const ERASE_RADIUS_MAX_VS_OBJECT = 1.5;
// Pausa entre limpiar la capa entera y cerrar el escarbado: el jugador tiene que llegar a VER
// cada objeto revelado con su nombre antes de que la vista vuelva al picker (PUNTOS_A_MEJORAR_4 §1).
const REVEAL_HOLD_MS = 650;
// Geometría de un objeto en la capa de abajo: círculo + etiqueta con el nombre debajo.
const OBJECT_RADIUS = 28;
const LABEL_OFFSET_Y = 44;
// AJUSTE (ronda 5): con posiciones aleatorias el ancho de etiqueta ya no depende de la cantidad
// de ítems; 100px < MIN_SPACING garantiza que dos etiquetas vecinas no se pisen.
const LABEL_MAX_WIDTH = 100;
// Distancia mínima entre centros de objetos (ver digRevealModel.createRevealModel).
const MIN_SPACING = 110;
// Al revelarse un objeto se destapa su huella COMPLETA (círculo + etiqueta) con este margen:
// garantiza que el nombre quede siempre visible (causa raíz del Problema 2 de ronda 5 — la
// franja del texto quedaba fuera del área rascada).
const PUNCH_PAD = 10;
const LABEL_PUNCH_HEIGHT = 24;

export class DigCanvas {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   onProgress: (frac: number) => void,
   *   onComplete: () => void,
   *   onObjectRevealed?: (entry: {name: string, categoria?: string, isTrap: boolean}, posPct: {xPct: number, yPct: number}) => void,
   * }} callbacks
   * @param {Array<{id:string, colorToken:string}>} [rarities] - para colorear ítems/íconos por rareza (§2.5).
   * @param {{hintProb: number}} [trapsData] - `data/traps.json` (ronda 20, PLAN.md §4.24). Sin
   *   esto (llamadores previos a la ronda 20) el indicio visual de grado queda deshabilitado —
   *   mismo patrón de gate opcional que `data.traps` en el engine.
   */
  constructor(host, callbacks, rarities = [], trapsData = null) {
    this.host = host;
    this.callbacks = callbacks;
    this.rarities = rarities;
    this.trapsData = trapsData;
    this.trapHintGrade = null;

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
      `<p>${t('dig.idlePrompt')}</p>`;
    this.idlePrompt.hidden = true;
    host.appendChild(this.idlePrompt);

    this.ctxBottom = this.bottomCanvas.getContext('2d');
    this.ctxTop = this.topCanvas.getContext('2d');

    this.active = false;
    this.completed = false;
    this.touched = false;
    this.areaMult = 1;
    this.digRate = 1;
    this.sensitivity = 1;
    this.model = null;
    this.entries = [];
    this._lastPos = null;
    this._revealTimer = null;

    this.input = attachDigInput(this.topCanvas, {
      onStart: (pos) => {
        this.markTouched();
        if (this.active) startScratchSound();
        this._lastPos = null;
        this.scratch(pos);
      },
      onMove: (pos) => this.scratch(pos),
      onEnd: () => {
        stopScratchSound();
        this._lastPos = null;
      },
    });

    // Fix robusto del Problema 1 (ronda 5): si el compositor descarta el backing store del
    // canvas (visto en el build Electron: la capa de suciedad aparecía transparente en idle),
    // al volver el foco/visibilidad se repinta TODO desde el modelo antes de que el jugador
    // vea nada. El completado ya es inmune (no lee píxeles), esto cubre lo visual.
    this._repaintHandler = () => {
      if (this.active) this.repaintFromModel();
    };
    window.addEventListener('focus', this._repaintHandler);
    document.addEventListener('visibilitychange', this._repaintHandler);
  }

  /**
   * Sensibilidad del pincel de escarbado (ronda 14, settings persistidos). Clamp defensivo
   * propio: el store ya clampa al mismo rango antes de persistir, pero un save corrupto/antiguo
   * no debería poder hacer crecer el pincel más allá del rango de diseño (el rango vive en el
   * engine como única fuente de verdad: DIG_SENSITIVITY_MIN/MAX).
   * @param {number} value - DIG_SENSITIVITY_MIN..DIG_SENSITIVITY_MAX
   */
  setSensitivity(value) {
    this.sensitivity = Math.min(DIG_SENSITIVITY_MAX, Math.max(DIG_SENSITIVITY_MIN, Number(value) || 1));
  }

  markTouched() {
    if (this.touched) return;
    this.touched = true;
    this.idlePrompt.hidden = true;
  }

  /**
   * Arranca un nuevo escarbado. El resultado (trampa o ítems) ya viene decidido por
   * el engine: acá solo se ubica cada objeto bajo la suciedad y se detecta cuándo el
   * jugador los destapó a TODOS (PUNTOS_A_MEJORAR_5 §3).
   * @param {{ isTrap: boolean, items: Array<{icon:string, name:string, categoria:string}> }} digResult
   * @param {number} areaMult - viene de getAreaMult()
   * @param {number} [digRate] - viene de getDigRate() (Resistencia del contenedor vs. Fuerza), 1 = ritmo normal.
   */
  start(digResult, areaMult, digRate = 1) {
    this.cancelRevealHold();
    this.active = true;
    this.completed = false;
    this.touched = false;
    this.areaMult = areaMult;
    this.digRate = digRate;
    this._lastPos = null;
    // Reset silencioso del input: un escarbado nuevo no debe heredar un `dragging` que haya
    // quedado prendido de un gesto anterior (ver digInput.js).
    this.input.cancel();
    // Generación de escarbado: cada `start()` la incrementa para que un callback de carga de
    // ícono de un escarbado anterior (que llega tarde) se descarte en vez de pintar sobre el
    // contenido actual (PUNTOS_A_MEJORAR_2.md §1).
    this.digGeneration = (this.digGeneration || 0) + 1;

    // PLAN.md §4.24 (ronda 20): indicio visual de grado, cosmético — se decide UNA vez acá
    // (nunca leyendo píxeles) y el canvas solo lo pinta en drawTopLayer(). `digResult.trapGrade`
    // solo existe si `data.traps` llegó al roll del engine; `this.trapsData` solo si el dueño de
    // este DigCanvas lo pasó al constructor — sin cualquiera de los dos, no se muestra nada.
    this.trapHintGrade =
      digResult.isTrap && this.trapsData
        ? rollTrapHintGrade(digResult.trapGrade, this.trapsData.hintProb)
        : null;

    this.entries = digResult.isTrap
      ? [{ icon: 'artifact', name: t('dig.trapEntryName'), colorHex: this.resolveCssColor('--trap'), isTrap: true }]
      : digResult.items.map((item) => ({
          icon: item.icon,
          name: item.name,
          categoria: item.categoria,
          colorHex: this.resolveCssColor(this.rarityColorToken(item.categoria)),
          isTrap: false,
        }));
    // DECISIÓN (ronda 5): posiciones aleatorias por escarbado — encontrar cada objeto es parte
    // del esfuerzo del gesto manual (aprobado en el plan de ronda 5). El RNG es de presentación:
    // el LOOT ya fue decidido por el engine, acá solo se decide dónde queda enterrado.
    this.model = createRevealModel({
      count: this.entries.length,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      objectRadius: OBJECT_RADIUS,
      minSpacing: MIN_SPACING,
    });
    // DECISIÓN: hook de SOLO lectura para los e2e (Playwright necesita saber dónde quedaron los
    // objetos para rascar encima con gestos reales; con posiciones aleatorias no puede
    // hardcodearlas). No muta estado ni expone economía.
    window.__digDebug = {
      positions: getPositions(this.model),
      revealed: () => getRevealed(this.model),
      isComplete: () => isComplete(this.model),
    };

    this.idlePrompt.hidden = false;
    this.drawBottomLayer();
    this.drawTopLayer();
  }

  stop() {
    this.cancelRevealHold();
    this.active = false;
    this.completed = false;
    this.model = null;
    this.entries = [];
    this.trapHintGrade = null;
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

  /** Resuelve una variable CSS de rareza (ej. `--r-relics`) a un color concreto para el canvas. */
  resolveCssColor(cssVar) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return value || '#e8c07d';
  }

  drawBottomLayer() {
    const ctx = this.ctxBottom;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#2c261a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const positions = getPositions(this.model);
    // El ítem se dibuja completo y síncrono (garantiza que el nombre SIEMPRE esté pintado). Si el
    // ícono todavía no cargó, al llegar se redibuja el ítem completo (círculo + ícono + nombre),
    // guardado por generación de escarbado (PUNTOS_A_MEJORAR_2.md §1).
    const gen = this.digGeneration;
    this.entries.forEach((entry, i) => {
      const pos = positions[i];
      const iconImg = getIconImage(entry.icon, { size: 64, color: '#161310' });
      this.drawEntry(ctx, entry, pos, iconImg);
      if (!iconImg.complete) {
        iconImg.addEventListener(
          'load',
          () => {
            if (this.active && this.digGeneration === gen) this.drawEntry(ctx, entry, pos, iconImg);
          },
          { once: true }
        );
      }
    });
  }

  /**
   * Dibuja un ítem completo en la capa de abajo, en orden círculo → ícono → nombre y seteando el
   * estado del contexto adentro (se llama también desde el callback async de carga de ícono).
   * @param {CanvasRenderingContext2D} ctx
   * @param {{name:string, colorHex:string}} entry
   * @param {{x:number,y:number}} pos
   * @param {HTMLImageElement} iconImg
   */
  drawEntry(ctx, entry, pos, iconImg) {
    ctx.beginPath();
    ctx.fillStyle = entry.colorHex;
    ctx.arc(pos.x, pos.y, OBJECT_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // `complete` también es true para una imagen ROTA (src que falló): dibujarla lanza
    // InvalidStateError y cortaría el gesto de rascado entero. naturalWidth 0 = no dibujable.
    if (iconImg.complete && iconImg.naturalWidth > 0) {
      ctx.drawImage(iconImg, pos.x - 16, pos.y - 16, 32, 32);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#f4ede1';
    ctx.fillText(entry.name, pos.x, pos.y + LABEL_OFFSET_Y, LABEL_MAX_WIDTH);
  }

  drawTopLayer() {
    const ctx = this.ctxTop;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#4a3526';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = ctx.createPattern(this.getDirtTexture(), 'repeat');
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawTrapHint(ctx);
  }

  /**
   * Indicio visual del grado de trampa (PLAN.md §4.24): ícono tenue sobre la suciedad, en el
   * centro del canvas. Puramente decorativo — no participa del modelo de revelado, así que
   * borrarlo con el gesto normal de rascado no cambia nada del completado.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawTrapHint(ctx) {
    if (!this.trapHintGrade) return;
    const iconImg = getIconImage(`hint-${this.trapHintGrade}`, { size: 64, color: '#f4ede1' });
    const draw = () => {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(iconImg, CANVAS_WIDTH / 2 - 32, CANVAS_HEIGHT / 2 - 32, 64, 64);
      ctx.restore();
    };
    if (iconImg.complete && iconImg.naturalWidth > 0) {
      draw();
    } else {
      iconImg.addEventListener('load', () => {
        if (this.active && this.trapHintGrade) draw();
      }, { once: true });
    }
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
   * Un tramo del gesto de rascado: pinta el borrado local en la capa de suciedad y alimenta
   * el modelo de revelado. Todo el progreso sale del modelo, nunca de leer píxeles.
   * @param {{x:number,y:number}} pos
   */
  scratch(pos) {
    if (!this.active || this.completed || !this.model) return;
    const radius = this.eraseRadius();
    this.eraseStrokeVisual(this._lastPos, pos, radius);
    const { newlyRevealed } = applyStroke(this.model, this._lastPos, pos, radius);
    this._lastPos = { x: pos.x, y: pos.y };
    if (newlyRevealed.length === 0) return;

    const positions = getPositions(this.model);
    for (const index of newlyRevealed) {
      this.revealEntry(index, positions[index]);
    }
    this.callbacks.onProgress(getProgress(this.model));
    if (isComplete(this.model)) {
      this.completed = true;
      this.completeReveal();
    }
  }

  /**
   * Borrado visual de un tramo del gesto: SIEMPRE alpha 1 (destination-out con alpha parcial
   * deja mugre semi-transparente, PUNTOS_A_MEJORAR_4 §1). Traza el segmento completo con punta
   * redonda para que un movimiento rápido no deje huecos entre eventos de puntero.
   * @param {{x:number,y:number}|null} from
   * @param {{x:number,y:number}} to
   * @param {number} radius
   */
  eraseStrokeVisual(from, to, radius) {
    const ctx = this.ctxTop;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(to.x, to.y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (from && (from.x !== to.x || from.y !== to.y)) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = radius * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }

  /**
   * Un objeto llegó a la cobertura de revelado: se destapa su huella COMPLETA (círculo +
   * etiqueta, con margen) para que el nombre quede siempre visible, se redibuja su entrada en
   * la capa de abajo (garantía extra contra pisadas) y se avisa para el juice del "pop".
   * @param {number} index
   * @param {{x:number,y:number}} pos
   */
  revealEntry(index, pos) {
    this.punchOutEntry(pos);
    const entry = this.entries[index];
    const iconImg = getIconImage(entry.icon, { size: 64, color: '#161310' });
    this.drawEntry(this.ctxBottom, entry, pos, iconImg);
    if (this.callbacks.onObjectRevealed) {
      this.callbacks.onObjectRevealed(entry, {
        xPct: (pos.x / CANVAS_WIDTH) * 100,
        yPct: (pos.y / CANVAS_HEIGHT) * 100,
      });
    }
  }

  /** Destapa la huella de un objeto en la capa de suciedad: círculo + rect de la etiqueta. */
  punchOutEntry(pos) {
    const ctx = this.ctxTop;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, OBJECT_RADIUS + PUNCH_PAD, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(
      pos.x - (LABEL_MAX_WIDTH + PUNCH_PAD * 2) / 2,
      pos.y + LABEL_OFFSET_Y - LABEL_PUNCH_HEIGHT / 2,
      LABEL_MAX_WIDTH + PUNCH_PAD * 2,
      LABEL_PUNCH_HEIGHT
    );
  }

  /**
   * Repinta AMBAS capas desde el modelo (objetos, suciedad, trazos ya rascados y huellas
   * reveladas). Se usa cuando el compositor pudo haber descartado los buffers (focus /
   * visibilitychange): el estado nunca se pierde porque vive en el modelo, no en el canvas.
   */
  repaintFromModel() {
    if (!this.active || !this.model) return;
    this.drawBottomLayer();
    if (this.completed) {
      // Ya se había limpiado la capa entera para el "momento de revelado": mantenerla limpia.
      this.ctxTop.globalCompositeOperation = 'source-over';
      this.ctxTop.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      return;
    }
    this.drawTopLayer();
    for (const stroke of getStrokes(this.model)) {
      this.eraseStrokeVisual(stroke.from, stroke.to, stroke.radius);
    }
    const positions = getPositions(this.model);
    getRevealed(this.model).forEach((revealed, i) => {
      if (revealed) this.punchOutEntry(positions[i]);
    });
  }

  /**
   * Radio efectivo del pincel (ronda 7, PLAN.md §11.2; sensibilidad sumada en ronda 14):
   *   radio = base × √áreaMult × ritmo × sensibilidad,  con tope 1.5× el radio del objeto.
   * — √área: el Área lineal a nivel alto (ej. mult 3.35) daba pinceles de 2× el objeto y
   *   trivializaba TODOS los contenedores por igual; con raíz sigue creciendo pero sin explotar.
   * — ritmo: clamp(Fuerza/resistencia, 0.3, 1.5) ya calculado por el engine — cada contenedor
   *   se siente distinto según tu Fuerza (sobre-Fuerza rasca más grande, quedarse corto mucho
   *   más chico).
   * — sensibilidad: preferencia de accesibilidad del jugador (settings, 0.5-1.5), independiente
   *   del balance de juego.
   * — tope: nunca más de 1.5× el objeto, así el gesto siempre exige recorrer el canvas.
   */
  eraseRadius() {
    const radius = BASE_ERASE_RADIUS * Math.sqrt(this.areaMult) * this.digRate * this.sensitivity;
    // DECISIÓN: con Área alta, sensibilidad >100% puede saturar el cap — intencional, el cap es
    // el guard de diseño.
    return Math.min(radius, OBJECT_RADIUS * ERASE_RADIUS_MAX_VS_OBJECT);
  }

  /** Todos los objetos revelados: limpia la capa de suciedad ENTERA (sin parches a medias),
   *  llena la barra y deja REVEAL_HOLD_MS de "momento de revelado" — el jugador ve cada objeto
   *  con su nombre — antes de avisar al dueño (que despacha finishManualDig y desmonta). */
  completeReveal() {
    stopScratchSound();
    this.ctxTop.globalCompositeOperation = 'source-over';
    this.ctxTop.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.callbacks.onProgress(1);
    this._revealTimer = setTimeout(() => {
      this._revealTimer = null;
      this.callbacks.onComplete();
    }, REVEAL_HOLD_MS);
  }

  destroy() {
    window.removeEventListener('focus', this._repaintHandler);
    document.removeEventListener('visibilitychange', this._repaintHandler);
    this.input.detach();
    this.host.innerHTML = '';
  }
}
