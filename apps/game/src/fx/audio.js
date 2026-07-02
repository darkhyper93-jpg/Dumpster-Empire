/**
 * SFX cortos con WebAudio puro (sin librería, sin archivos de audio que licenciar).
 * `setEnabled` refleja `state.soundOn` (Settings); si está apagado, todos los métodos
 * son no-ops silenciosos. El AudioContext se crea recién al primer sonido (gesture-gated
 * por navegadores) para no disparar warnings de autoplay al cargar la página.
 */

let ctx = null;
let enabled = true;

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** @param {boolean} value - espeja `state.soundOn`. */
export function setEnabled(value) {
  enabled = value;
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
  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration + 0.02);
}

/** "Pop" corto y alegre al hallar un objeto (PLAN.md §5.2). Más brillante si la rareza es alta. */
export function playFindPop(rarityIndex = 0) {
  const brightness = Math.min(rarityIndex, 7) * 60;
  playTone({ freq: 520 + brightness, freqEnd: 780 + brightness, duration: 0.14, type: 'triangle', gain: 0.16 });
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
