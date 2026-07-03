/**
 * SFX cortos con WebAudio puro (sin librería, sin archivos de audio que licenciar).
 * `setEnabled` refleja `state.soundOn` (Settings); si está apagado, todos los métodos
 * son no-ops silenciosos. El AudioContext se crea recién al primer sonido (gesture-gated
 * por navegadores) para no disparar warnings de autoplay al cargar la página.
 */

let ctx = null;
let enabled = true;
// Ganancia maestra por la que pasan TODOS los SFX, así el slider de Configuración controla el
// volumen real de todo (PUNTOS_A_MEJORAR_2.md §5). Se persiste en el save (`state.volume`).
let masterGain = null;
let volume = 1;

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Nodo maestro (creado junto al AudioContext). Todos los SFX se conectan acá, no a `destination`. */
function getMasterGain() {
  getCtx();
  return masterGain;
}

/** @param {boolean} value - espeja `state.soundOn`. */
export function setEnabled(value) {
  enabled = value;
  if (!value) stopScratchSound();
}

/**
 * Ajusta el volumen maestro de todos los SFX (PUNTOS_A_MEJORAR_2.md §5). Espeja `state.volume`.
 * No crea el AudioContext si todavía no existe (respeta el gating por gesto del navegador); el
 * valor se aplica al crearse el contexto en el primer sonido.
 * @param {number} value - 0..1 (se clampa).
 */
export function setVolume(value) {
  volume = Math.max(0, Math.min(1, value));
  if (masterGain) masterGain.gain.value = volume;
}

/**
 * Tono corto con envolvente ADR simple (attack-decay-release), sin librería.
 * @param {{ freq: number, duration: number, type?: OscillatorType, gain?: number, freqEnd?: number }} opts
 */
function playTone({ freq, duration, type = 'sine', gain = 0.18, freqEnd }) {
  if (!enabled) return;
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
  gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(gain, audioCtx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gainNode).connect(getMasterGain());
  osc.start();
  osc.stop(audioCtx.currentTime + duration + 0.02);
}

/**
 * "Pop" al hallar un objeto (PLAN.md §5.2) — AJUSTE (agentes/rework-escarbado-y-landing-prompt.md,
 * PUNTOS_A_MEJORAR.md: "el sonido al reclamar los items es horrible"): reemplazado el barrido de
 * un solo triángulo (sonaba a alarma de juguete) por un "ding" de dos notas senoidales en
 * intervalo de quinta (consonante, tipo moneda/campana), más brillante en rarezas altas.
 * @param {number} [rarityIndex]
 */
export function playFindPop(rarityIndex = 0) {
  if (!enabled) return;
  const audioCtx = getCtx();
  const now = audioCtx.currentTime;
  const brightness = Math.min(rarityIndex, 7) * 45;
  const notes = [660 + brightness, 990 + brightness * 1.5];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    const start = now + i * 0.035;
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(0.15, start + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
    osc.connect(gainNode).connect(getMasterGain());
    osc.start(start);
    osc.stop(start + 0.26);
  });
}

/**
 * Sonido grave y suave al caer en trampa — nunca una alarma agresiva (PLAN.md §5.2:
 * "el castigo debe sentirse como un chasco, no como un fallo grave").
 */
export function playTrapThud() {
  playTone({ freq: 160, freqEnd: 70, duration: 0.35, type: 'sine', gain: 0.22 });
}

/** Sonido corto y ascendente para logros/celebraciones. */
export function playCelebration() {
  playTone({ freq: 440, freqEnd: 660, duration: 0.25, type: 'sine', gain: 0.14 });
}

// ---------------------------------------------------------------------------
// Sonido de rascado continuo (agentes/rework-escarbado-y-landing-prompt.md, PUNTOS_A_MEJORAR.md:
// "no hay ruido mientras escarbás"). Ruido blanco pasado por un filtro pasa-banda angosto (recrea
// la textura de "raspar" sin samples de audio) con la ganancia modulada por un LFO chico para que
// no suene a tono plano sostenido. Arranca en el primer gesto de arrastre (onStart) y se apaga
// suave en onEnd/stop() — WebAudio puro, sin archivos que licenciar.
// ---------------------------------------------------------------------------

let scratchSource = null;
let scratchGain = null;
let scratchLfo = null;

function createNoiseBuffer(audioCtx) {
  const bufferSize = audioCtx.sampleRate * 1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) channel[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Arranca el rascado en loop. No-op si ya está sonando o el sonido está apagado. */
export function startScratchSound() {
  if (!enabled || scratchSource) return;
  const audioCtx = getCtx();
  const now = audioCtx.currentTime;

  const source = audioCtx.createBufferSource();
  source.buffer = createNoiseBuffer(audioCtx);
  source.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2200;
  filter.Q.value = 0.9;

  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.06);

  // LFO chico sobre el volumen: sin esto el ruido filtrado suena a "shhh" continuo plano; con la
  // modulación se percibe más como pasadas de raspado que como un tono sostenido.
  const lfo = audioCtx.createOscillator();
  lfo.frequency.value = 14;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain).connect(gainNode.gain);
  lfo.start();

  source.connect(filter).connect(gainNode).connect(getMasterGain());
  source.start();

  scratchSource = source;
  scratchGain = gainNode;
  scratchLfo = lfo;
}

/** Apaga el rascado con un fadeout corto. No-op si no estaba sonando. */
export function stopScratchSound() {
  if (!scratchSource) return;
  const audioCtx = getCtx();
  const now = audioCtx.currentTime;
  const source = scratchSource;
  const lfo = scratchLfo;
  scratchGain.gain.cancelScheduledValues(now);
  scratchGain.gain.setValueAtTime(Math.max(scratchGain.gain.value, 0.0001), now);
  scratchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  source.stop(now + 0.1);
  lfo.stop(now + 0.1);
  scratchSource = null;
  scratchGain = null;
  scratchLfo = null;
}
