# Agente correctivo — Escarbado real + pantalla de inicio/escarbado (puntual)

## Tu identidad
Sos un agente correctivo puntual. Tras el playtest del build de escritorio, **varios requisitos de
`PUNTOS_A_MEJORAR.md` (y PLAN.md §11) quedaron sin cumplir**. Arreglás dos cosas grandes y un par de
bugs, sin romper lo que ya anda.

## Lectura obligatoria antes de tocar nada
1. `PUNTOS_A_MEJORAR.md` — la fuente de verdad de este correctivo (relee TODO).
2. `PLAN.md` — §2.2 (escarbado), §2.3 (Fuerza), §5.3 (mockup canónico `clean_scavenge_area`),
   §11.2 (resistencia/dificultad), §11.8/§11.9 (inicio y flujo de pantallas).
3. `reference/ui/stitch_est_tica_de_vanguardia/dumpster_empire_clean_scavenge_area/code.html` — el
   diseño EXACTO que el usuario quiere como pantalla principal.
4. `CLAUDE.md`, y `agentes/HANDOFF.md` (bloques de Agentes 6, 7, 8).
5. Código: `apps/game/src/dig/DigCanvas.js`, `digInput.js`, `apps/game/src/store.js`,
   `apps/game/src/ui/UIManager.js`, `apps/game/src/ui/TitleScreen.js`, `packages/engine/src/economy.js`
   (`getRevealThreshold`, la función de ritmo por resistencia ~L462), `styles/*`.

## Problema (diagnóstico ya hecho)
- La `DigCanvas` solo usa `revealThreshold` + `areaMult`. **Nunca usa la resistencia del contenedor ni
  el ritmo por Fuerza que el engine ya calcula** (`economy.js` ~L462). Resultado: escarbar es trivial,
  un gesto limpia todo, y los contenedores "mejores" no se sienten más difíciles.
- La vista inicial es la Tienda (`UIManager: activeTab='tienda'`, `showDigScreen = activeTab==='tienda'`):
  el escarbado está pegado a la tienda, no es una pantalla propia. El usuario quiere que la **pantalla
  de escarbado (el mockup `clean_scavenge_area`) sea la principal**, sin tener que apretar "Escarbar".

## Objetivo
Escarbar que **cuesta esfuerzo de verdad y escala con la resistencia del contenedor**, y una **pantalla
de escarbado como home** fiel al mockup, con el resto de secciones como pestañas.

## Tareas

### A. Escarbado real (engine + dig) — PUNTOS §7, §8, §9, §11 ; PLAN §11.2
1. **Wirear la resistencia/Fuerza al canvas.** Exponé desde el engine un "ritmo de escarbado" por
   contenedor (usá/expandí la función de ~L462 de `economy.js`, que ya combina `resistencia` y
   `getDigPowerMult`) y pasáselo a la `DigCanvas` junto con `revealThreshold`/`areaMult`. El borrado
   por gesto debe ser **más lento cuanto mayor la resistencia y menor la Fuerza** (menor radio/alpha
   efectivo por unidad de arrastre, o más "pasadas" necesarias).
2. **Subir la dificultad base.** Escarbar desde el inicio (Fuerza baja) debe **demorar** — que se note
   el esfuerzo, no que un gesto lo limpie. Ajustá `REVEAL_THRESHOLD_BASE`/constantes y el ritmo para
   que el primer contenedor lleve varios segundos de arrastre real. Que subir Fuerza se sienta.
3. **Eliminar el "un solo click".** Verificá que re-escarbar un contenedor ya conocido **también**
   requiera el mismo esfuerzo (no que complete de un gesto). El único atajo permitido sigue siendo la
   automatización (robot), no el manual.
4. **Sonido de escarbado (falta).** Agregá en `fx/audio.js` un SFX **continuo/por gesto de rascado**
   (WebAudio, sin archivos) que suene mientras se arrastra, satisfactorio (PUNTOS §7, §9).
5. **Mejorar el sonido de reclamo** (el actual "es horrible" según el usuario): que el `playFindPop`
   se sienta satisfactorio, no molesto.
6. Cubrir con tests del engine el nuevo getter de ritmo (que escala con resistencia y Fuerza).

### B. Pantalla de inicio + escarbado como home — PUNTOS §1, §2, §12 ; PLAN §11.8/§11.9
7. **Flujo:** Título (`TitleScreen`, ya existe) → "Jugar" → **pantalla de escarbado** (NO la tienda).
8. **Pantalla de escarbado propia**, fiel al mockup `clean_scavenge_area`: el contenedor actual listo
   para **arrastrar sin apretar "Escarbar"** primero, con las mejoras rápidas (Suerte/Fuerza/Tamaño)
   en esa pantalla. La **Tienda pasa a ser una pestaña aparte** (comprar contenedores), separada del
   área de escarbado. Reestructurá `index.html`/`UIManager`/`layout.css` para esto (hoy `showDigScreen`
   está atado a `activeTab==='tienda'`).
9. **Mejoras rápidas** visibles solo en la pantalla de escarbado (no en Tienda ni otras secciones).
10. **Fix del overflow:** el prompt "Elegí un contenedor para escarbar" / "Escarbar el Tacho (gratis)"
    se sale de su globo y está pegado a la izquierda — corregí padding/ancho/alineación (styles).
11. Respetá el sistema visual "The Workshop" (PLAN §5.3); no reintroduzcas emojis ni hardcodees colores.

### C. Verificación final contra PUNTOS_A_MEJORAR.md
12. Recorré **todos** los puntos del archivo y confirmá cuáles quedan cumplidos; lo que no puedas
    cerrar acá, documentalo explícito en el HANDOFF (no lo des por hecho en silencio).

## Lo que NO debés hacer
- No romper el modo web ni Electron; `npm test` y `npm run test:e2e` deben quedar verdes (actualizá los
  specs e2e si cambió el flujo de arranque: ahora Título → Jugar → escarbado, no → tienda).
- No tocar el balance económico fino más allá de lo necesario para la dificultad del escarbado (si un
  número de economía queda raro, anotalo para un pase de balance, no lo fuerces).

## Definition of Done
- [ ] Escarbar cuesta esfuerzo real desde el inicio y **escala con la resistencia** del contenedor; ya
      no se completa de un gesto; verificado a mano en el build.
- [ ] Suena el rascado mientras se arrastra y el reclamo se siente satisfactorio.
- [ ] Al abrir: Título → Jugar → **pantalla de escarbado** (mockup `clean_scavenge_area`), con el
      contenedor listo para arrastrar y las mejoras rápidas ahí; Tienda es pestaña aparte.
- [ ] Prompt sin overflow.
- [ ] Auditoría de PUNTOS_A_MEJORAR.md en el HANDOFF (cumplido / pendiente por punto).
- [ ] `npm test` y `npm run test:e2e` verdes.

## Handoff
Rama `fix/escarbado-y-landing`, PR a `main`. En `agentes/HANDOFF.md`: qué wireaste del engine al canvas,
cómo quedó el flujo de pantallas, y la tabla de auditoría de PUNTOS_A_MEJORAR.
