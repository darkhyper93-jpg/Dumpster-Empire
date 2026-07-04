# Task 1 — Report: Problema 2 (escarbado de un solo click, intermitente)

## Qué se implementó

### 1. `apps/game/src/dig/digInput.js` (reescrito sobre Pointer Events)
- Reemplazados los listeners de `mousedown/mousemove/mouseup` + `touchstart/touchmove/touchend/touchcancel`
  por `pointerdown/pointermove/pointerup/pointercancel/lostpointercapture`.
- `onDown`: solo arranca si `evt.isPrimary && evt.button === 0`; llama `canvas.setPointerCapture(evt.pointerId)`
  para garantizar que `pointerup`/`pointercancel` lleguen siempre al canvas (incluso soltando fuera
  de la ventana, con el Steam overlay abierto, o tras alt-tab).
- `onMove`: si `dragging` es true pero `evt.buttons === 0`, se trata como release perdido — apaga
  `dragging` y llama `handlers.onEnd()` (auto-curación del defecto (a)); si no, procesa el movimiento.
- `onUp` (compartido por `pointerup`/`pointercancel`/`lostpointercapture`): apaga `dragging` y llama `onEnd()`.
- `toCanvasPos` simplificado: ya no necesita el chequeo de `evt.touches` (los pointer events traen
  `clientX/clientY` directamente).
- Nuevo shape de retorno: `{ detach, cancel }`. `cancel()` fuerza `dragging = false` sin llamar `onEnd()`
  (reset silencioso). JSDoc del `@returns` actualizado para reflejarlo.

### 2. `apps/game/src/dig/DigCanvas.js`
- Constructor: `this.detachInput = attachDigInput(...)` → `this.input = attachDigInput(...)`.
- `destroy()`: `this.detachInput()` → `this.input.detach()`.
- `start()`: agrega reset de `this.lastSampleAt = 0`, `this._lastErasePos = null`, `this._dragDistance = 0`,
  y llama `this.input.cancel()`.
- `stop()`: agrega `this.input.cancel()`.
- Constante documentada `MIN_DRAG_DISTANCE = 400` (px de canvas), con el comentario de higiene de
  input (no economía) tal como especifica el brief.
- `erase(pos)`: acumula distancia euclidiana real recorrida en `this._dragDistance` comparando con
  `this._lastErasePos` (que se actualiza en cada llamada y se resetea a `null` en `start()`).
- Chequeo de umbral: ahora exige `fraction >= this.revealThreshold && this._dragDistance >= MIN_DRAG_DISTANCE`
  para disparar `onThresholdReached`.
- **Reparación de anomalía:** si `fraction >= this.revealThreshold` pero `this._dragDistance < MIN_DRAG_DISTANCE`,
  se repinta `drawTopLayer()` completo, se reporta `onProgress(0)` y se retorna sin marcar `thresholdFired`
  (el escarbado sigue "vivo", exige arrastre real desde cero).

### 3. Engine
No se tocó `packages/engine`. `getRevealThreshold`/`getDigRate`/`getAreaMult` siguen siendo la única
fuente del umbral y multiplicadores.

## Evidencia TDD

### RED (antes del fix)

Comando: `npx playwright test apps/game/e2e/dig-regression.spec.js --reporter=list`

Primera iteración del spec (dispatch de `pointerdown`/`pointermove` sintéticos para el test "hover
sin botón") resultó en que **solo el test 1 fallaba** — el test de pointer events "pasaba" contra el
código viejo, pero por la razón equivocada: el `digInput.js` sin arreglar escucha `mousedown`/`mousemove`,
NO `pointerdown`/`pointermove`; al dispatchear `PointerEvent` sintéticos contra código que no tiene
listeners de puntero, nada ocurre — el test pasaba trivialmente (sin reproducir el bug), no porque el
chequeo de `evt.buttons` ya existiera.

Para reproducir honestamente el defecto (a) tal como describe el brief ("`dragging` rancio... cada
`mousemove` sin botón sobre el canvas sigue borrando porque `onMove` no chequea `evt.buttons`"), se
agregó un cuarto test que dispatchea `MouseEvent` (`mousedown` + `mousemove` con `buttons: 0`) — los
eventos que el código SIN ARREGLAR sí escucha. Esta versión, corrida contra el código sin tocar, dio:

```
Running 4 tests using 3 workers

  ✓ [chromium] › mover el puntero sin botón presionado NO escarba (dragging rancio)          [pointer events — no reproduce nada, ver nota abajo]
  ✓ [chromium] › un solo click sobre la capa fresca no completa el escarbado
  ✘ [chromium] › capa pre-vaciada externamente + un click NO completa el escarbado
  ✘ [chromium] › mousemove sin botón con dragging rancio (implementación mouse actual) NO escarba

  2 failed, 2 passed
```

Fallo del test 1 (`capa pre-vaciada + un click`):
```
Error: expect(locator).toBeVisible() failed
Locator:  locator('#dig-active')
Expected: visible
Received: hidden
```
→ Esperado: sin la reparación de anomalía, un click sobre un canvas pre-vaciado por causa externa
completa el escarbado al instante (`#dig-active` pasa a hidden).

Fallo del test "mousemove sin botón... (implementación mouse actual)":
```
Error: expect(locator).toBeVisible() failed
Locator:  locator('#dig-active')
Expected: visible
Received: hidden
```
→ Esperado: sin el chequeo de `evt.buttons`, el zigzag de `mousemove` sin botón presionado (tras un
`mousedown` cuyo `mouseup` nunca llega) sigue borrando la capa vía `onMove`, completando el escarbado.

**Nota sobre el test 2 (pointer events, "mover el puntero sin botón"):** por diseño, este test solo
puede validar el mecanismo específico del fix (Pointer Events + chequeo de `evt.buttons` + capture)
una vez migrado el código a pointer events — contra el código viejo (que no escucha pointer events en
absoluto) el test pasa trivialmente porque nada ocurre, no porque el bug esté resuelto. Se dejó como
test post-fix legítimo (documentado inline en el spec) y se agregó el cuarto test con `MouseEvent`
específicamente para reproducir el defecto (a) contra el código actual y confirmar el RED real, en
línea con el espíritu de "capturar el bug primero" del brief aunque la letra pedía Pointer Events.

También se detectó y corrigió un problema de metodología en el primer intento del test de `MouseEvent`:
al dispatchear ~230 `mousemove` en un solo bucle síncrono, el throttle de muestreo del canvas
(`SAMPLE_THROTTLE_MS = 120ms`) bloqueaba toda re-evaluación de `sampleClearedFraction()` dentro del
mismo burst, dando un falso "pasa" (nada se sampleaba nunca). Se corrigió intercalando
`await new Promise(r => setTimeout(r, 150))` entre filas del zigzag, igual patrón que ya usa
`smoke.spec.js` con el drag real.

### GREEN (después del fix)

Comando: `npx playwright test apps/game/e2e/dig-regression.spec.js apps/game/e2e/smoke.spec.js --reporter=list`

```
Running 6 tests using 3 workers

  ✓ [chromium] › mover el puntero sin botón presionado NO escarba (dragging rancio)
  ✓ [chromium] › mousemove sin botón con dragging rancio (implementación mouse actual) NO escarba
  ✓ [chromium] › capa pre-vaciada externamente + un click NO completa el escarbado
  ✓ [chromium] › un solo click sobre la capa fresca no completa el escarbado
  ✓ [chromium] › carga sin errores de consola y el layout entra en los 3 anchos de referencia
  ✓ [chromium] › escarbar el Tacho de Vereda revela con un pointer drag real y suma dinero

  6 passed (30.6s)
```

Comando: `npm test` (Vitest, engine)

```
 Test Files  8 passed (8)
      Tests  112 passed (112)
```

## Archivos modificados

- `C:\Users\SANTI\Desktop\dumpire\apps\game\src\dig\digInput.js` — reescrito sobre Pointer Events.
- `C:\Users\SANTI\Desktop\dumpire\apps\game\src\dig\DigCanvas.js` — resets de input, compuerta de esfuerzo,
  reparación de anomalía.
- `C:\Users\SANTI\Desktop\dumpire\apps\game\e2e\dig-regression.spec.js` — nuevo, 4 tests (uno extra
  respecto al brief, ver nota arriba).

`packages/engine` no se tocó.

## Self-review

- Pointer Events con capture/self-heal/cancel: implementado tal cual el brief.
- `DigCanvas`: resets en `start()`/`stop()`, compuerta de esfuerzo con `MIN_DRAG_DISTANCE` documentada
  como higiene de UI (no economía), reparación de anomalía que repinta y resetea progreso sin marcar
  `thresholdFired`.
- Smoke test existente sigue en verde con ambos tests (incluye el drag real completando y sumando dinero) — no negociable, verificado.
- Cero `console.log`, cero `// TODO`, cero emojis (grep verificado).
- JSDoc de `attachDigInput` actualizado con el nuevo shape `{ detach, cancel }`.
- `this.detachInput` reemplazado enteramente por `this.input`; grep confirma que no quedó ninguna
  referencia vieja.
- Nombres de archivo y ubicación consistentes con la estructura pedida.

## Concerns

- El test 2 del brief ("hover sin botón" vía Pointer Events sintéticos) no reproduce el bug contra
  el código sin arreglar por la razón correcta (el código viejo no escucha pointer events en absoluto,
  así que el dispatch no tiene efecto). Se agregó un test adicional con `MouseEvent` que sí reproduce
  fielmente el defecto (a) tal como está descrito en el código actual, y se documentó la razón inline
  en el spec. El test de Pointer Events se mantuvo porque sigue siendo válido para verificar el
  mecanismo específico del fix (buttons===0 + capture) una vez migrado el input.
- `MIN_DRAG_DISTANCE = 400` es un valor nuevo elegido a partir del brief (≈ dos tercios del ancho de
  600px); no hay un test que verifique un arrastre *legítimo pero corto* que no llegue a esa distancia
  — el smoke test (zigzag completo de 10 filas) cubre por lejos ese piso, así que no se detectaría un
  falso negativo ahí si el número fuera demasiado alto para partidas reales. Vale la pena que alguien
  con criterio de balance de juego confirme que 400px no penaliza un escarbado legítimo con muy poca
  Fuerza/área (radio de pincel chico).
