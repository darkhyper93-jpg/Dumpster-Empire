# Plan de fixes — PUNTOS_A_MEJORAR_3.md (Ronda 3)

## Contexto

Dos problemas abiertos reportados jugando el build de escritorio. El brief pide **determinar las causas de cero** (el Problema 2 ya "se arregló" dos veces sin éxito). Se investigó el camino completo del click al escarbado por análisis estático de `DigCanvas.js`, `digInput.js`, `store.js`, `UIManager.js`, `economy.js` y los CSS de layout. Ambas causas quedaron identificadas y son distintas a los intentos previos (umbral/resistencia).

**Rama:** `fix/pulido-ronda3` → PR a `main`. Cierre: `npm test` + `npm run test:e2e` verdes, HANDOFF.md actualizado.

---

## Problema 1 — Scroll: scrollea toda la pantalla en vez del panel

### Causa raíz (confirmada en `apps/game/styles/layout.css`)

Nada limita la altura de la cadena `#app → .game-shell → #tab-content`:

- `#app` usa `min-height: 100vh` (layout.css:36) — crece con el contenido en vez de fijarse al viewport.
- `#tab-content` ya tiene `flex: 1; min-height: 0; overflow-y: auto` (layout.css:307-312), pero como su ancestro crece libremente, nunca llega a desbordar internamente: desborda el documento y scrollea la página entera (topbar, sidebar y todo).
- En desktop (≥1024px) pasa lo mismo: la grilla `.game-shell` tiene `grid-template-rows: ... minmax(0,1fr)` pero sin altura acotada arriba, así que la fila "content" crece en vez de scrollear.

### Fix (solo CSS, sin tocar HTML ni JS)

En `apps/game/styles/layout.css`:

1. **Clampear la cadena de altura:** `#app { height: 100vh; height: 100dvh; overflow: hidden; }` (reemplaza `min-height: 100vh`). `.game-shell` ya tiene `flex: 1; min-height: 0` — no tocar.
2. **Mobile (base):** `#tab-content` ya scrollea solo con el clamp de arriba. Para la home de escarbar (excluida del requisito pero que no debe quedar recortada): `#dig-area { flex-shrink: 0 }` y `#quick-upgrades { overflow-y: auto; min-height: 0 }` para que, si no entra, scrollee la lista de mejoras rápidas y no se corte nada.
3. **Desktop (bloque `@media (min-width:1024px)`):**
   - `#tab-content`: agregar `overflow-y: auto` (hoy solo tiene `overflow-x: auto`, línea 410). La fila 3 de la grilla ya es `minmax(0,1fr)`, con el clamp del punto 1 queda acotada y scrollea el panel.
   - `#quick-upgrades`: quitar `position: sticky; top: ...` (ya no hace falta con la grilla clampeada) y darle `overflow-y: auto` + acotarlo (`max-height: 100%` con `align-self: stretch`, o equivalente) por si la columna crece.
4. **Scrollbar "The Workshop"** (nuevo bloque en `components.css`, con tokens de `tokens.css`, cero colores sueltos): `::-webkit-scrollbar` angosto (~10px), track transparente, thumb `var(--bg-surface-highest)` con `border-radius` y borde del color del panel; más `scrollbar-width: thin; scrollbar-color: ...` como fallback estándar. Aplicarlo a los paneles scrolleables (`#tab-content`, `#quick-upgrades`, `#tabbar`) o global — Electron es Chromium, el `::-webkit-scrollbar` es el camino principal.

**Cuidado:** `.title-screen` tiene `min-height: 100vh`; con `#app` clampeado queda exacto — verificar que la pantalla de inicio no genere scroll fantasma. Verificar los 3 anchos de referencia (375×812, 1280×800, 1440×900) con el smoke existente.

---

## Problema 2 — Escarbado de un solo click (intermitente)

### Investigación: por qué el umbral/resistencia nunca fue la causa

Con la capa de suciedad recién pintada (opaca al 100%), **un click es matemáticamente incapaz de completar**: un `erase()` borra un círculo de radio `20 × areaMult × radiusScale` (DigCanvas.js:30,263-265) ≈ **3,8% del canvas** con stats base; el umbral tiene piso **0.40** (economy.js:187) y para taparlo de un click haría falta `areaMult ≥ 8` (nivel ~140 de "Tamaño de Búsqueda"). Conclusión forzosa: **cuando el bug ocurre, la capa de suciedad ya está mayormente transparente antes del click**, y el primer muestreo (`sampleClearedFraction`) devuelve una fracción alta que dispara `onThresholdReached` → `finishManualDig` al toque. "Se ven los objetos" literal: la capa de abajo queda visible porque la de arriba ya no está.

### Causa raíz: dos defectos concretos que producen esa capa pre-borrada

**(a) `dragging` rancio en `digInput.js` → el hover borra sin apretar.** `dragging` (digInput.js:14) se apaga solo con `mouseup`/`touchend` **en la ventana**. Si el mouseup nunca llega — soltar el botón **fuera de la ventana** en pleno zigzag (modo ventana), abrir el **Steam overlay** (Shift+Tab) a mitad de arrastre, alt-tab — `dragging` queda `true` para siempre, y a partir de ahí **cada `mousemove` sin botón sobre el canvas borra** (digInput.js:33-37 no chequea `evt.buttons`). El jugador pasea el cursor por la arena, la suciedad se limpia sola, y su próximo click único muestrea un canvas casi limpio → reclamo instantáneo. Esto explica la **intermitencia** (depende de haber perdido un mouseup antes, no de stats), por qué era irreproducible a demanda, y por qué bajar umbral/resistencia no cambió nada.

**(b) `DigCanvas` confía a ciegas en el buffer.** Ninguna verificación impide completar si el buffer aparece vacío por causas externas: en Electron una **pérdida de contexto GPU** (suspensión, reinicio del GPU process, overlay) resetea el canvas a transparente; el primer click muestrearía fracción ~1.0 y completaría. Además `lastSampleAt` no se resetea en `start()`. El comportamiento deseado del brief ("escarbar SIEMPRE requiere arrastrar de verdad, sin ningún caso en que un click lo complete") hay que **garantizarlo como invariante del componente**, no confiando en que todos los caminos estén limpios.

### Fix

**1. Reescribir `apps/game/src/dig/digInput.js` sobre Pointer Events** (Chromium/Electron y mobile los soportan; unifica mouse+touch y elimina el doble listener):
- `pointerdown` (solo `evt.isPrimary` y botón principal) + `canvas.setPointerCapture(evt.pointerId)` → el `pointerup`/`pointercancel` llega **siempre**, incluso soltando fuera de la ventana.
- `pointermove`: si `evt.buttons === 0`, tratar como release perdido (apagar `dragging` y llamar `onEnd`) — autocuración del caso (a).
- Manejar `pointerup`, `pointercancel` y `lostpointercapture`. Mantener `touch-action: none`.
- Exponer en el objeto retornado un `cancel()` que fuerce `dragging = false` (además del `detach()`).
- Actualizar el JSDoc del contrato.

**2. `apps/game/src/dig/DigCanvas.js` — resets e invariante "sin click-completo":**
- En `start()`: resetear `this.lastSampleAt = 0` y llamar `input.cancel()` (también en `stop()`).
- **Compuerta de esfuerzo:** acumular la distancia arrastrada real del gesto (suma de tramos entre `erase()` consecutivos del mismo arrastre, en px de canvas; resetear en `start()`). En el chequeo de umbral (DigCanvas.js:287): disparar `onThresholdReached` solo si `dragDistance >= MIN_DRAG_DISTANCE` (constante documentada, ~400 px de canvas ≈ dos tercios del ancho; es higiene de input de la UI, **no** una fórmula de economía — el umbral sigue viniendo del engine).
- **Reparación de anomalía:** si la fracción muestreada supera el umbral **sin** esa distancia mínima (buffer vacío por contexto GPU perdido, o cualquier camino sucio futuro), en vez de completar: `drawTopLayer()` de nuevo + `onProgress(0)`. El escarbado sigue vivo y exige arrastre real.

**3. No tocar engine ni fórmulas** (PLAN.md §4 intacto; `getRevealThreshold`/`getDigRate`/`getAreaMult` siguen siendo la única fuente).

---

## Tests (el brief exige capturar el bug: fallar antes, pasar después)

Nuevo spec e2e `apps/game/e2e/dig-regression.spec.js` (o dentro de `smoke.spec.js`):

1. **Capa transparente + un click NO completa** (reproduce mecánicamente el síntoma reportado): iniciar escarbado; con `page.evaluate` hacer `clearRect` del `.dig-canvas-top` (simula la capa pre-borrada); UN click en el canvas; asertar que `#dig-active` sigue visible y el dinero no cambió. **Hoy falla** (reclama al instante), pasa con la compuerta de esfuerzo.
2. **Hover sin botón NO escarba** (defecto (a)): iniciar escarbado; despachar vía `page.evaluate` un `pointerdown` sintético, mover un poco, **no** despachar `pointerup`; luego despachar `pointermove` con `buttons: 0` barriendo todo el canvas; asertar que el progreso no avanza y el escarbado no se completa. **Hoy falla** (el camino mousemove borra igual), pasa con el chequeo de `buttons` + capture.
3. **Un click sobre capa fresca no completa** (invariante simple): escarbado nuevo, un solo click al centro, `#dig-active` sigue visible.
4. **No-scroll de página (Problema 1):** en los 3 viewports, ir a una pestaña con lista larga (Logros o Contenedores) y asertar `document.documentElement.scrollHeight <= window.innerHeight + 1` (la página no scrollea) y que `#tab-content` sí scrollea internamente (`scrollHeight > clientHeight`) cuando la lista desborda.
5. El smoke existente (arrastre real completa y suma dinero) debe seguir verde — valida que la compuerta no rompe el juego legítimo.

`npm test` (Vitest, engine sin cambios) debe seguir verde.

## Archivos a tocar

- `apps/game/src/dig/digInput.js` — reescritura a Pointer Events + capture + `cancel()`.
- `apps/game/src/dig/DigCanvas.js` — resets en `start()`/`stop()`, compuerta de esfuerzo, reparación de anomalía.
- `apps/game/styles/layout.css` — clamp de altura, scroll por panel (mobile y desktop).
- `apps/game/styles/components.css` — scrollbar estilo Workshop con tokens.
- `apps/game/e2e/` — tests nuevos de regresión (los 2 primeros deben fallar contra `main` actual: verificarlo antes de aplicar el fix).
- `agentes/HANDOFF.md` — sección propia con causa raíz encontrada ((a)+(b)) y el fix.

## Orden de ejecución

1. Crear rama `fix/pulido-ronda3`.
2. Escribir los tests e2e 1 y 2 y **correrlos para verificar que fallan** (captura del bug, disciplina TDD).
3. Fix Problema 2 (digInput + DigCanvas) → tests 1-3 verdes.
4. Fix Problema 1 (CSS) → test 4 verde; revisar screenshots de los 3 viewports del smoke.
5. `npm test` + `npm run test:e2e` completos; prueba manual punta a punta en navegador (escarbar de verdad, cambiar de pestaña y scrollear listas).
6. HANDOFF.md + commit + PR a `main`.

## Verificación final

- `npm test` y `npm run test:e2e` verdes.
- Manual: servir `apps/game` estático, jugar: escarbar exige arrastre siempre (probar click suelto, hover tras alt-tab a mitad de arrastre); en Contenedores/Logros/Prestigio/Índice la lista scrollea con su barrita y topbar/sidebar/mejoras quedan fijos, en los 3 anchos.
- Cero `console.log`, cero emojis, tokens centralizados, checklist de CLAUDE.md.
