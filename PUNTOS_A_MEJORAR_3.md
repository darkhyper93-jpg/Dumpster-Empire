# PUNTOS A MEJORAR — Ronda 3 (brief para el agente planificador)

> **Cómo usar este documento.** Dos problemas abiertos, reportados jugando el build de escritorio
> (rama `fix/pulido-ronda2`, antes del merge a `main`). Un agente **Opus 4.8 high** debe **determinar
> las causas** y armar el plan; luego **Sonnet 5.0 medium** lo ejecuta.
>
> **IMPORTANTE — no asumir diagnósticos previos.** El Problema 2 (escarbado de un solo click) ya
> "se arregló" varias veces y **sigue ocurriendo**. Los intentos anteriores atacaron el umbral de
> revelado y la resistencia, y no lo resolvieron. Investigá de cero, con la cabeza fría: reproducí el
> bug, mirá el camino completo del click al escarbado, y recién ahí concluí la causa. No repitas los
> intentos que ya fallaron (listados abajo).

---

## Problema 1 — Scroll: que scrollee el panel, no toda la pantalla

**Síntoma:** en las secciones que muestran una lista debajo (Contenedores, Automatización, Logros,
Prestigio, Índice — o sea, todas menos Escarbar), cuando hay más elementos de los que entran, al
scrollear se mueve **toda la pantalla** en vez de solo esa lista.

**Comportamiento deseado:** que scrollee **específicamente ese panel/interfaz** (con su propia barrita
de scroll), mostrando los elementos de más abajo, **sin mover el resto de la pantalla** (topbar,
sidebar/menú, mejoras rápidas, etc. quedan fijos). Ejemplo: en "Contenedores", al scrollear dentro de
la lista voy viendo los contenedores de abajo, y el resto de la UI no se mueve.

**Alcance:** aplica a todas las secciones con lista larga menos Escarbar. Respetar el diseño "The
Workshop" (PLAN.md §5.3): la barra de scroll debe verse acorde, no un scrollbar crudo del navegador si
se puede evitar.

---

## Problema 2 — Escarbado de un solo click (intermitente, PERSISTE)

**Síntoma:** **algunas veces** (no siempre), al iniciar un escarbado, con **un solo click** se
reclaman directamente las recompensas y se ven los objetos **sin pasar por la arena de escarbar** —
es decir, el escarbado se completa de un click en lugar de requerir arrastrar. No parece pasar cuando
sale trampa.

**Dato clave: es intermitente.** A veces escarbar exige arrastrar (correcto) y a veces se completa de
un click (bug). El agente debería **reproducirlo y encontrar bajo qué condiciones** ocurre (¿re-escarbar
un contenedor ya escarbado?, ¿cierto stat/nivel?, ¿primer gesto tras cambiar de contenedor?, ¿timing?).

**Intentos previos que NO lo resolvieron (no repetir):**
- Ronda original: el canvas ya pedía arrastrar hasta un umbral de revelado.
- Rework de escarbado: se cableó la resistencia/Fuerza para hacerlo más lento y se subió la dificultad
  base. Bajar el umbral por Fuerza / la resistencia **no** explica que el bug siga siendo intermitente.

**Cómo funciona hoy (contexto factual, NO una conclusión de causa):**
- El escarbado es un canvas de dos capas: la de arriba ("suciedad") se borra con `destination-out` al
  arrastrar; se muestrea con throttle qué fracción quedó revelada; al superar un umbral se dispara el
  cierre del escarbado, que aplica el resultado (ya pre-decidido por el engine).
- Archivos relevantes para investigar (mapa, no diagnóstico): `apps/game/src/dig/DigCanvas.js`
  (borrado, muestreo de fracción revelada, umbral), `apps/game/src/dig/digInput.js` (manejo de eventos
  de puntero/touch), `apps/game/src/store.js` (startManualDig / finishManualDig / getPendingDig),
  `apps/game/src/ui/UIManager.js` (renderDigArea, handleDigComplete, cuándo se llama `digCanvas.start`).

**El agente determina la causa.** Posibles familias a descartar metódicamente (sin casarse con ninguna
de antemano): reinicio incompleto del canvas entre escarbados, muestreo que devuelve una fracción alta
por estado previo, un gesto único que dispara varios eventos, o un camino que aplica el resultado sin
pasar por el canvas. Pero eso lo confirma la investigación, no este documento.

**Comportamiento deseado:** escarbar **siempre** requiere arrastrar de verdad (esfuerzo real, escalado
por resistencia/Fuerza como ya se pidió), sin ningún caso en que un click lo complete. El único atajo
válido sigue siendo la automatización (robot), nunca el escarbado manual.

---

## Reglas para el plan y la ejecución
- Respetar el sistema visual "The Workshop" (PLAN.md §5.3): sin emojis, tokens centralizados en
  `styles/tokens.css`, mobile-first + Steam Deck.
- Cerrar con `npm test` + `npm run test:e2e` verdes. Para el Problema 2, **agregar un test que capture
  el bug** (que falle antes del fix y pase después), porque es intermitente y hay que blindarlo para
  que no vuelva.
- Rama `fix/...` → PR a `main`. Actualizar `agentes/HANDOFF.md` con la causa raíz encontrada y el fix.
