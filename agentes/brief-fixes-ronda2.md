# Brief de fixes — Ronda 2 (para el agente planificador Opus 4.8 high)

> **Rol de este documento:** NO es un plan de ejecución. Es el **relevamiento de problemas y
> requisitos** que reportó el usuario tras jugar el build de escritorio (Electron 43, ya corre y
> guarda). El agente **Opus 4.8 high** debe convertir esto en un plan de fixes ordenado; los agentes
> **Sonnet 5.0 medium** lo ejecutan (rama `fix/...` → PR a `main`, como el resto).
> Fuentes de verdad: `PLAN.md` (§5.3 mockup canónico, §11) y `PUNTOS_A_MEJORAR.md`.
> Punteros de código incluidos abajo (verificados), pero el diagnóstico fino es del planificador.

---

## 1. Glitch de render en el canvas de escarbado  — PRIORIDAD ALTA
**Síntoma (2 capturas del usuario):** mientras se rasca, de a ratos el overlay "ARRASTRÁ PARA
ESCARBAR" (ícono de mano + texto) queda **superpuesto sobre el contenido ya revelado**, y algunos
ítems aparecen **sin su nombre** (círculo de color pelado) mientras otros sí lo muestran.
**Punteros:** `apps/game/src/dig/DigCanvas.js`
- El overlay es `this.idlePrompt` (div HTML absoluto centrado). Se muestra en `start()`
  (`idlePrompt.hidden = false`) y se oculta en `markTouched()` (primer gesto). En las capturas sigue
  visible con ítems revelados → o `markTouched` no oculta de forma confiable, o algo re-muestra el prompt.
- Hipótesis fuerte a verificar: `UIManager.renderDigArea()` llama `digCanvas.start()` sólo cuando
  `this.mountedDig !== pending`. Si `store.getPendingDig()` devuelve un **objeto nuevo en cada notify**
  (el loop notifica ~cada 1s), `start()` se re-ejecuta cada tick → redibuja la capa, re-muestra el
  idle prompt y re-corre el dibujo async de íconos → parpadeo + nombres que aparecen/desaparecen.
- Nombres: en `drawBottomLayer` el nombre se dibuja sync con `fillText`, pero el ícono es async
  (`getIconImage(...).addEventListener('load', ...)`). Si el canvas se re-dibuja a mitad, callbacks de
  `load` viejos pueden pisar el nuevo dibujo.
**Resultado deseado:** el idle prompt desaparece al primer gesto y no reaparece hasta un escarbado
nuevo; todo ítem revelado muestra su nombre siempre; sin parpadeo mientras se rasca.

## 2. "Riesgo de trampa" y barra de progreso pegados al borde de la tarjeta
**Síntoma:** el texto "Riesgo de trampa: X%" y la barra naranja de arriba están **muy sobre el borde**;
la "R" se sale de la "mesa" (tarjeta).
**Punteros:** `apps/game/index.html` L51-52 (`#dig-progress`, `#dig-trap-hint`); CSS en
`apps/game/styles/components.css` (`#dig-progress` L312). Falta padding horizontal dentro de la
`.scavenge-card`.
**Resultado deseado:** barra y texto con padding, sin tocar/sobresalir el borde de la tarjeta.

## 3. Etiquetas del menú
**Síntoma:** el usuario ve "TIenda, AutomatIzación, PrestIgIo, INDEX".
**Diagnóstico:** en el código (`index.html` L60-65) están bien: "Escarbar, Tienda, Automatización,
Logros, Prestigio, **INDEX**". El look "TIenda/AutomatIzación" es la **fuente Plus Jakarta Sans** (la
'i' minúscula es muy alta y parece mayúscula) — no es un typo. El único cambio real de texto:
- **"INDEX" → "Índice"** (renombrar el label; `data-tab="index"` puede quedar igual). Revisar también
  el título/encabezado de esa sección (`CollectionView`).
**Resultado deseado:** "Índice" en vez de "INDEX"; evaluar un ajuste chico de `letter-spacing` en las
etiquetas del nav para que la 'i' no se lea como mayúscula (opcional, cosmético). Confirmar Título Case
en español en todas.

## 4. "Tienda" → "Contenedores", informativa y sin escarbar
**Requisitos del usuario:**
- Renombrar el apartado **"Tienda" → "Contenedores"** (label del tab y título de la vista).
- **Quitar los botones "Escarbar"** de esa vista (escarbar no funciona desde ahí; ya hay un tab
  "Escarbar" dedicado).
- Dejar la vista **meramente informativa + compra** de contenedores (comprar contenedor sí; escarbar no).
**Punteros:** `apps/game/src/ui/ShopView.js`, `apps/game/index.html` L61 (`data-tab="tienda"`).
**Resultado deseado:** el tab se llama "Contenedores", muestra info + botón de comprar, sin ningún
botón de escarbar.

## 5. Ubicación de la compra de contenedores
**Requisito (textual):** "cuál comprar debería estar **debajo de todo el menú** (Escarbar, Tienda,
Automatización, Logros, Prestigio, Índice)" — o sea, debajo de la lista de tabs en el sidebar izquierdo.
**Ambigüedad para el planificador:** decidir si la lista de compra vive (a) en el sidebar debajo del
nav (persistente) o (b) dentro del tab "Contenedores". Intención del usuario: acceso a comprar
contenedores ubicado bajo el menú de navegación. Resolver el layout exacto respetando el mockup
`clean_scavenge_area` y mobile-first.

## 6. Control de volumen en Configuración
**Síntoma:** hoy sólo hay un toggle Sonido on/off (`SettingsView.js` L35), y el estado sólo tiene
`state.soundOn` (`packages/engine/src/state.js` L82).
**Requisito:** poder **subir/bajar el volumen** desde Configuración.
**Alcance:** nuevo campo `volume` (0–1 o 0–100) en el estado (engine `state.js` + migración de save,
bump `saveVersion`), **slider** en `SettingsView`, y que `fx/audio.js` aplique el nivel a todos los SFX
(escala la ganancia del master). Mantener el on/off o derivar mute = volumen 0.

## 7. Verificaciones a confirmar (del rework anterior)
El planificador debería pedir confirmar, en el mismo pase, que quedaron bien:
- **Dificultad de escarbado:** que ahora cueste esfuerzo y escale con la resistencia del contenedor
  (era el fix de la ronda anterior; verificar que se siente, no que volvió a ser trivial).
- **Sonido de rascado** mientras se arrastra (se pidió; confirmar que exista y sea satisfactorio).
- Que la pantalla de inicio (Título → Jugar → **Escarbar**) siga bien tras estos cambios de layout.

---

## Restricciones (para el plan y la ejecución)
- Respetar el sistema visual "The Workshop" (`PLAN.md §5.3`, mockup `clean_scavenge_area`). Sin emojis,
  sin colores hardcodeados (todo por tokens).
- Mantener la frontera engine↔UI: la UI no reimplementa fórmulas; el volumen y cualquier estado nuevo
  pasan por el engine/store.
- `npm test` y `npm run test:e2e` deben quedar verdes (actualizar specs e2e si cambian labels/flujo).
- Mobile-first + Steam Deck; no romper Electron.
- Cada fix documentado; auditoría final contra `PUNTOS_A_MEJORAR.md` y este brief en `agentes/HANDOFF.md`.
