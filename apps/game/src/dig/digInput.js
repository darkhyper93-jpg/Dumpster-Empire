/**
 * Puntero/touch para el canvas de escarbado. Traduce eventos de mouse y touch a
 * coordenadas del canvas (escaladas a su resolución interna) y expone callbacks
 * onStart/onMove/onEnd. `touch-action: none` se aplica acá para que el navegador
 * no interprete el arrastre como scroll (PLAN.md §2.2/§6.4).
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onStart: (pos: {x:number,y:number}) => void, onMove: (pos: {x:number,y:number}) => void, onEnd: () => void }} handlers
 * @returns {() => void} detach
 */
export function attachDigInput(canvas, handlers) {
  let dragging = false;
  canvas.style.touchAction = 'none';

  function toCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const touch = evt.touches && evt.touches[0];
    const clientX = touch ? touch.clientX : evt.clientX;
    const clientY = touch ? touch.clientY : evt.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function onDown(evt) {
    dragging = true;
    handlers.onStart(toCanvasPos(evt));
    evt.preventDefault();
  }

  function onMove(evt) {
    if (!dragging) return;
    handlers.onMove(toCanvasPos(evt));
    evt.preventDefault();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    handlers.onEnd();
  }

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);
  window.addEventListener('touchcancel', onUp);

  return function detach() {
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
    window.removeEventListener('touchcancel', onUp);
  };
}
