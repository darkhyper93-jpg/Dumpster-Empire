/**
 * Puntero para el canvas de escarbado. Traduce Pointer Events (mouse, touch y pen unificados)
 * a coordenadas del canvas (escaladas a su resolución interna) y expone callbacks
 * onStart/onMove/onEnd. `touch-action: none` se aplica acá para que el navegador
 * no interprete el arrastre como scroll (PLAN.md §2.2/§6.4).
 *
 * DECISIÓN: se usan Pointer Events en vez de mouse+touch por separado. Además de unificar
 * ambos casos con un solo listener, `setPointerCapture` garantiza que `pointerup`/`pointercancel`
 * lleguen SIEMPRE al canvas aunque el usuario suelte el botón fuera de la ventana (modo ventana,
 * Steam overlay con Shift+Tab, alt-tab). El diseño previo (mouse/touch con `dragging` apagado
 * solo por un listener de `mouseup`/`touchend` en `window`) podía quedar con `dragging` prendido
 * para siempre si ese evento nunca llegaba, y un `mousemove` posterior sin botón seguía borrando
 * la capa de suciedad (Problema 2, escarbado de un solo click intermitente).
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onStart: (pos: {x:number,y:number}) => void, onMove: (pos: {x:number,y:number}) => void, onEnd: () => void }} handlers
 * @returns {{ detach: () => void, cancel: () => void }} `detach` remueve todos los listeners
 *   (usar en el `destroy()` del componente dueño). `cancel` fuerza `dragging = false` sin llamar
 *   a `onEnd()`: es un reset silencioso para cuando arranca un escarbado nuevo, no el fin de un
 *   gesto real.
 */
export function attachDigInput(canvas, handlers) {
  let dragging = false;
  canvas.style.touchAction = 'none';

  function toCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY };
  }

  function onDown(evt) {
    if (!evt.isPrimary || evt.button !== 0) return;
    dragging = true;
    // AJUSTE (ronda 5): setPointerCapture lanza NotFoundError si el pointerId no está activo
    // (eventos sintéticos, punteros retirados a mitad de gesto). Antes la excepción abortaba
    // onDown DESPUÉS de armar `dragging` y ANTES de onStart — gesto fantasma sin borrado. La
    // captura es una mejora (release garantizado), no un requisito: la autocuración de onMove
    // ya cubre el release perdido.
    try {
      canvas.setPointerCapture(evt.pointerId);
    } catch {
      // Sin captura: el gesto sigue; un release perdido lo cierra la autocuración de onMove.
    }
    handlers.onStart(toCanvasPos(evt));
    evt.preventDefault();
  }

  function onMove(evt) {
    if (!dragging) return;
    // Auto-curación del "dragging rancio": si llegamos hasta acá con `dragging` en true pero sin
    // el botón presionado, es que se perdió el release (soltar afuera de la ventana, overlay de
    // Steam, alt-tab a mitad de arrastre). Se trata como un release perdido en vez de seguir
    // borrando con un simple hover.
    if (evt.buttons === 0) {
      dragging = false;
      handlers.onEnd();
      return;
    }
    handlers.onMove(toCanvasPos(evt));
    evt.preventDefault();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    handlers.onEnd();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('lostpointercapture', onUp);

  return {
    detach() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
    },
    cancel() {
      dragging = false;
    },
  };
}
