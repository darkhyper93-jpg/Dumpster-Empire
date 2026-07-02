/**
 * Conteo animado de números (PLAN.md §5.2: nunca debe saltar de golpe, 300-500ms).
 * Además del interpolado numérico clásico, aplica la animación de "rodillo"
 * (`@keyframes counter-roll`, ver components.css) que pide el mockup Stitch
 * `dumpster_empire_main_game` para el contador de dinero (DESARROLLO.md §6).
 */

const activeTweens = new WeakMap();

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Anima el texto de `el` desde su último valor tweeneado hacia `toValue`, formateando
 * cada frame con `formatFn`. Cancela cualquier tween previo sobre el mismo elemento.
 * @param {HTMLElement} el
 * @param {number} toValue
 * @param {(n:number)=>string} formatFn
 * @param {{ durationMs?: number, roll?: boolean }} [opts]
 */
export function tweenNumberText(el, toValue, formatFn, opts = {}) {
  const { durationMs = 400, roll = true } = opts;
  const prev = activeTweens.get(el);
  const fromValue = prev ? prev.currentValue : Number(el.dataset.tweenValue || toValue);

  if (fromValue === toValue) {
    el.textContent = formatFn(toValue);
    el.dataset.tweenValue = String(toValue);
    return;
  }

  if (prev) cancelAnimationFrame(prev.rafId);

  const startTime = performance.now();
  const state = { currentValue: fromValue, rafId: 0 };
  activeTweens.set(el, state);

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    const eased = easeOutCubic(t);
    const value = fromValue + (toValue - fromValue) * eased;
    state.currentValue = value;
    el.textContent = formatFn(value);
    if (t < 1) {
      state.rafId = requestAnimationFrame(step);
    } else {
      el.textContent = formatFn(toValue);
      el.dataset.tweenValue = String(toValue);
      activeTweens.delete(el);
      if (roll) triggerRoll(el);
    }
  }
  state.rafId = requestAnimationFrame(step);
  if (roll) triggerRoll(el);
}

/** Retriggerea la animación CSS `counter-roll` (clase preparada para el pulido del Agente 4). */
function triggerRoll(el) {
  el.classList.remove('is-rolling');
  // Forzar reflow para poder re-disparar la animación en updates consecutivos.
  void el.offsetWidth;
  el.classList.add('is-rolling');
}
