# Agente ejecutor — Fixes Ronda 3 (scroll por panel + escarbado de un click)

## Tu identidad
Sos un agente **ejecutor** (Sonnet 5.0 medium). **El plan ya está hecho y validado** — no lo
rediseñes ni lo re-diagnostiques. Tu trabajo es **ejecutarlo fielmente** con disciplina TDD.

## Lectura obligatoria antes de tocar nada
1. **`PLAN_PAM3.md`** — el plan detallado y **autoritativo**. Seguilo al pie (causas raíz, fixes, tests,
   orden de ejecución, archivos). Si algo del plan no cierra con el código real, **paralo y anotalo en
   el HANDOFF**, no improvises otra cosa.
2. `PUNTOS_A_MEJORAR_3.md` — el brief original (síntomas y comportamiento deseado).
3. `CLAUDE.md` — reglas (sin emojis, tokens centralizados, sin console.log, engine sin DOM, no tocar fórmulas).
4. `agentes/HANDOFF.md` — estado del proyecto.
5. Código a tocar: `apps/game/src/dig/digInput.js`, `apps/game/src/dig/DigCanvas.js`,
   `apps/game/styles/layout.css`, `apps/game/styles/components.css`, `apps/game/e2e/`.

## Precondición
`main` con la ronda 2 ya mergeada. Creá la rama **`fix/pulido-ronda3`** desde `main`.

## Orden de ejecución (TDD — respetalo)
Seguí exactamente la sección "Orden de ejecución" de `PLAN_PAM3.md`:
1. Rama `fix/pulido-ronda3`.
2. **Escribí primero** los tests e2e 1 y 2 (capa transparente + un click no completa; hover sin botón
   no escarba) y **corrélos para confirmar que FALLAN contra el estado actual** antes de tocar el fix.
   Si no fallan, el diagnóstico no está reproducido: paralo y anotalo, no sigas a ciegas.
3. **Problema 2** (`digInput.js` → Pointer Events con `setPointerCapture`, self-heal por
   `evt.buttons === 0`, `cancel()`; `DigCanvas.js` → resets en `start()`/`stop()`, compuerta de
   esfuerzo `MIN_DRAG_DISTANCE`, reparación de anomalía) → tests 1–3 en verde.
4. **Problema 1** (CSS: clamp de altura en `#app`, `overflow-y` del panel en desktop, `#quick-upgrades`,
   scrollbar estilo "The Workshop" con tokens) → test 4 en verde; revisar screenshots de los 3 anchos.
5. `npm test` + `npm run test:e2e` completos + prueba manual (escarbar exige arrastre siempre; listas
   scrollean con su barrita y el resto queda fijo).
6. HANDOFF + commit + PR.

## Guardrails (no negociables)
- **No tocar `packages/engine` ni las fórmulas** (`getRevealThreshold`/`getDigRate`/`getAreaMult` siguen
  siendo la única fuente). La compuerta `MIN_DRAG_DISTANCE` es **higiene de input de la UI, no economía**
  — documentala como tal con un comentario.
- La compuerta **no debe romper el juego legítimo**: el smoke existente (arrastre real completa y suma
  dinero) tiene que seguir verde.
- Tokens centralizados en `tokens.css`, cero colores/hex sueltos, cero emojis, cero `console.log`/`// TODO`.
- Verificar la pantalla de inicio (`.title-screen` tiene `min-height:100vh`): con `#app` clampeado no
  debe generar scroll fantasma. Probar 375×812, 1280×800 y 1440×900.

## Definition of Done
- [ ] Tests e2e 1 y 2 **fallaban** contra el estado previo y **pasan** con el fix (verificado).
- [ ] `npm run test:e2e` verde, incluidos los 4 tests nuevos + el smoke original.
- [ ] `npm test` (Vitest, engine sin cambios) verde.
- [ ] Manual: escarbar **siempre** exige arrastre (probado con click suelto y con hover tras alt-tab /
      overlay a mitad de arrastre); en Contenedores/Logros/Prestigio/Índice la lista scrollea con su
      barrita y topbar/sidebar/mejoras quedan fijos, en los 3 anchos.
- [ ] Sin console.log/TODO/emojis; tokens centralizados.

## Handoff
Rama `fix/pulido-ronda3`, PR a `main`. En `agentes/HANDOFF.md` (sección propia): la causa raíz
encontrada ((a) `dragging` rancio + (b) confianza ciega en el buffer), el fix aplicado, y confirmación
de que los tests de regresión fallaban antes y pasan ahora.
