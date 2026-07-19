# DUMPSTER EMPIRE — Plan de Desarrollo y Lanzamiento (Steam)

> Este documento es el plan de ejecución. `PLAN.md` es la fuente de verdad del diseño;
> `CLAUDE.md` define cómo se comportan los agentes ejecutores. Los agentes **Sonnet 5.0 medium**
> ejecutan las tareas de la sección "Roadmap por fases" en orden.

---

## 1. Análisis de la idea

Dumpster Empire es un idle/incremental sólido y bien especificado. El `PLAN.md` ya resuelve lo
más difícil de un juego de este género: el **core loop** (escarbar → vender → mejorar → comprar
contenedor → automatizar → prestigiar), una **economía cerrada con fórmulas explícitas**
(secciones 4.1–4.6) y un **contrato de ritmo** (sección 3) que define cuándo debe pasar cada hito.
Eso es exactamente lo que suele faltar en los idle amateur, y acá está.

La mecánica táctil de "escarbar" con `<canvas>` y `globalCompositeOperation = "destination-out"`
es la decisión correcta y ya está probada en el prototipo (`reference/dumpster-empire.html`, línea 958).
El prototipo demuestra que el juego es **jugable de punta a punta hoy**: escarbado, tienda,
mejoras, automatización, 27 logros, prestigio y offline funcionan. O sea, el riesgo de diseño
está retirado; lo que queda es **ingeniería de producto y de lanzamiento**.

Riesgos reales que hay que gestionar, en orden de impacto:

1. **Todo vive en un solo archivo de 1517 líneas.** Imposible de mantener, testear o repartir
   entre agentes. Es el principal trabajo de la Fase 1.
2. **La economía no tiene tests.** Las fórmulas de la sección 4 son el corazón del juego; que un
   agente rompa una constante sin que nadie lo note es el bug más caro posible. Necesitan cobertura
   automática (Vitest) antes de tocar balance.
3. **Faltan capas de "juice" y pulido que el PLAN exige** (sonido, partículas, tween de números,
   árbol de prestigio real, modal de offline con highlights). Ver inventario en la sección 6.
4. **Íconos por emoji.** El prototipo usa ~60 emojis como íconos; el usuario los quiere fuera.
   Reemplazo por SVG propios / Material Symbols coherentes con Stitch.
5. **Steam.** El PLAN asume "navegador, sin backend". Lanzar en Steam agrega: empaquetado de
   escritorio, integración de logros, Steam Cloud para guardado, y builds para Win/Mac/Linux
   (Linux cubre Steam Deck). Nada de esto es difícil, pero hay que planificarlo desde el inicio.

Veredicto: la idea es viable y está madura. El plan de abajo la lleva de "prototipo de un archivo"
a "producto modular, testeado y empaquetable para Steam" sin cambiar el diseño.

---

## 2. Verificación de la estructura (¿es óptima?)

La estructura de carpetas de `PLAN.md` sección 6.2 es buena para un juego web de un solo paquete,
pero **no es óptima para un lanzamiento en Steam ni para el trabajo en paralelo de agentes**, por
dos razones:

- Mezcla **lógica pura** (economía, sistemas) con **presentación** (DOM, canvas, vistas) en el
  mismo árbol `src/`. Eso impide testear la economía headless y hace que dos agentes se pisen.
- No contempla el **empaquetado de escritorio** ni la **integración con Steam**.

La estructura óptima separa tres cosas y las pone en un **monorepo con npm workspaces**:

- `packages/engine` — el "cerebro": estado, fórmulas, sistemas. **Cero DOM.** Corre en Node y en
  el navegador. Se testea con Vitest.
- `apps/game` — la "cara": HTML/CSS/canvas + vistas que leen estado y despachan acciones. Vanilla,
  buildless (import maps).
- `apps/desktop` — la "caja": Electron + steamworks.js que envuelve `apps/game` para Steam.

Esto conserva el espíritu de PLAN.md 6.2 (módulos chicos, sin sobre-ingeniería) pero habilita
tests, paralelismo y Steam. Ver el árbol completo en la sección 4.

---

## 3. Decisión de stack para lanzar en Steam

Elección analizada (el usuario delegó la decisión). Objetivo: mínimo de fricción para un equipo
que escribe **JS vanilla**, máximo de solidez para Steam.

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje del juego | **JS vanilla (ES modules)** + JSDoc | Decisión del usuario. Buildless con import maps. JSDoc da contratos sin TS. |
| Lógica compartida | **packages/engine** (JS puro) | Testeable headless; reusable por juego y por el proceso Electron. |
| Módulos en el navegador | **Import maps** nativos | Permite un `packages/engine` real sin bundler ni paso de build. |
| Empaquetado de escritorio | **Electron** | Integración Steam madura y **en JS puro** (sin Rust). Precedente amplio de juegos HTML5 en Steam. Trade-off aceptado: binario más pesado que Tauri, irrelevante para un idle. |
| Integración Steam | **steamworks.js** | Logros + Steam Cloud + presencia, desde el proceso principal de Electron. |
| Guardado | **localStorage** en la app + **Steam Cloud** vía userData en Electron + export/import de texto | Cubre "que se guarde tras jugarlo" sin cuentas ni backend propio. |
| Tests (unit/lógica) | **Vitest** (Node) | Cubre el engine (economía, save, sistemas) sin DOM. Es el script `npm test`. |
| Tests (smoke visual/e2e) | **Playwright** (Chromium) | Verifica el juego servido por HTTP: cero errores de consola, layout a 375/1280/1440px y el gesto de escarbado en canvas (pointer/touch). Script **separado** `test:e2e`, NO dentro de `npm test`. Aprobado en Fase 2. |
| Build de distribución | **electron-builder** | Genera instaladores Win/Mac/Linux; el build Linux sirve para Steam Deck (nativo o Proton). |
| Publicación | **SteamPipe** (steamcmd) | Sube los depots a Steam. |
| Demo web (opcional, postre) | **Cloudflare Pages** | Demo gratis en navegador para marketing; mismo `apps/game` estático. |

**Por qué NO Supabase / backend propio:** el usuario solo pidió que "se guarde tras jugarlo, es
para Steam". Steam Cloud resuelve persistencia y sincronía entre máquinas sin cuentas ni servidor.
Sumar Supabase sería sobre-ingeniería. Queda como postre si en el futuro se quieren leaderboards
online.

**Por qué Electron y no Tauri:** Tauri da binarios más chicos, pero su integración con Steamworks
exige un crate de Rust y salir del mundo JS. Para un equipo vanilla-JS y agentes que ejecutan
tareas acotadas, `steamworks.js` sobre Electron es el camino más confiable y directo. El peso extra
del binario no importa en un idle.

**Sinergia mobile-first ↔ Steam Deck:** el PLAN es mobile-first. Lejos de ser un problema para
Steam, es una ventaja: el layout táctil responsive encaja perfecto en la pantalla 1280×800 táctil
del Steam Deck. En desktop, el mismo layout se centra con ancho máximo. No se diseña dos veces.

### Versiones pineadas (no subir sin actualizar este doc)

```
electron           ^43.x   (bump 2026-07: Electron 31 quedó EOL y con 17 advisories — npm audit)
steamworks.js      ^0.4.x   (verificar compat con Electron 43 al reinstalar; N-API, suele ser estable)
electron-builder   ^26.x    (bump 2026-07: cierra las vulns high de tar/app-builder-lib)
vitest             ^4.x     (bump 2026-07, Agente 11: las advisories de la cadena vite/vitest escalaron a high/critical — dev-only pero npm audit ya no quedaba limpio; los 112 tests pasan sin cambios en vitest 4.1)
node (dev)         >=20     (20 quedó EOL; dev corre en 22/24 — la app usa el Node embebido de Electron)
```

> **Nota (2026-07):** el bump de Electron 31→43 es 12 majors; cambia APIs que el Agente 10 usó
> (registro de protocolo `dumpster://`, ciclo de vida, ABI de steamworks.js). Requiere una pasada de
> re-verificación del código de `apps/desktop` — ver `agentes/bump-electron-stack-prompt.md`.

---

## 4. Estructura del monorepo (obligatoria)

```
dumpster-empire/                    ← raíz del monorepo (npm workspaces)
├── package.json                    ← workspaces: ["packages/*", "apps/*"]
├── CLAUDE.md                       ← reglas de comportamiento de los agentes
├── PLAN.md                         ← fuente de verdad del diseño (documento maestro)
├── DESARROLLO.md                   ← este archivo
├── README.md                       ← cómo correr/buildear en 3 pasos
│
├── packages/
│   └── engine/                     ← LÓGICA PURA — cero DOM, corre en Node y navegador
│       ├── package.json            ← "type": "module", export map
│       ├── src/
│       │   ├── index.js            ← API pública del engine
│       │   ├── state.js            ← freshState(), forma del estado, saveVersion
│       │   ├── economy.js          ← TODAS las fórmulas de PLAN.md §4 (literal)
│       │   ├── rng.js              ← aleatoriedad (rareza, trampa, mercado)
│       │   ├── save.js             ← serializar/deserializar + validación + migración
│       │   ├── systems/
│       │   │   ├── containers.js
│       │   │   ├── upgrades.js
│       │   │   ├── automation.js
│       │   │   ├── prestige.js
│       │   │   ├── achievements.js
│       │   │   └── offline.js
│       │   └── format.js           ← números grandes K/M/B/T
│       └── tests/                  ← Vitest
│           ├── economy.test.js
│           ├── save.test.js
│           ├── prestige.test.js
│           └── offline.test.js
│
├── apps/
│   ├── game/                       ← LA CARA — vanilla, buildless (import maps)
│   │   ├── index.html              ← layout + import map → @dumpster/engine
│   │   ├── styles/
│   │   │   ├── tokens.css          ← variables: paleta fusión ámbar+Stitch, tipografía, radios
│   │   │   ├── layout.css          ← grilla responsive mobile-first / Steam Deck / desktop
│   │   │   └── components.css      ← botones táctiles, gauges recesados, bloom de rareza
│   │   ├── src/
│   │   │   ├── main.js             ← punto de entrada: init engine + UI + loop
│   │   │   ├── loop.js             ← rAF (visual) + tick por delta real (producción)
│   │   │   ├── dig/
│   │   │   │   ├── DigCanvas.js     ← canvas de escarbado (destination-out)
│   │   │   │   └── digInput.js      ← puntero/touch, touch-action none
│   │   │   ├── ui/
│   │   │   │   ├── UIManager.js
│   │   │   │   ├── TitleScreen.js    ← pantalla de inicio (logo/Jugar/config) [Fase 7]
│   │   │   │   ├── Topbar.js
│   │   │   │   ├── QuickUpgrades.js  ← visible solo en pantalla de escarbado [Fase 5]
│   │   │   │   ├── ShopView.js       ← muestra Suerte recomendada por contenedor [Fase 7]
│   │   │   │   ├── CollectionView.js ← INDEX de recompensas por contenedor [Fase 7]
│   │   │   │   ├── AutomationView.js
│   │   │   │   ├── AchievementsView.js ← muestra recompensa (llaves/dinero) [Fase 7]
│   │   │   │   ├── PrestigeView.js  ← árbol real de nodos conectados por `requires` [Fase 7]
│   │   │   │   ├── SettingsView.js  ← sin export/import (eliminado) [Fase 5]
│   │   │   │   ├── OfflineModal.js  ← "mientras no estabas" con highlights
│   │   │   │   ├── Toast.js
│   │   │   │   └── Tutorial.js
│   │   │   ├── fx/
│   │   │   │   ├── particles.js     ← pop + partícula de rareza
│   │   │   │   ├── tween.js         ← conteo animado de números
│   │   │   │   └── audio.js         ← SFX cortos (WebAudio, sin librería)
│   │   │   ├── icons/
│   │   │   │   └── icons.js         ← registro de íconos SVG (reemplaza emojis)
│   │   │   └── data/
│   │   │       ├── items.json
│   │   │       ├── containers.json
│   │   │       ├── upgrades.json
│   │   │       ├── automations.json
│   │   │       ├── prestigeTree.json
│   │   │       └── achievements.json
│   │   └── assets/
│   │       ├── icons/              ← SVG por objeto/categoría
│   │       ├── sounds/             ← SFX (o generados por WebAudio)
│   │       └── fonts/
│   │
│   └── desktop/                    ← LA CAJA — Electron + Steam
│       ├── package.json
│       ├── main.js                 ← ventana, carga apps/game, ciclo de vida
│       ├── preload.js              ← puente seguro (contextBridge) hacia steam.js
│       ├── steam.js                ← steamworks.js: init appId, logros, Steam Cloud
│       └── electron-builder.yml    ← targets Win/Mac/Linux
│
├── tools/
│   ├── steam/                      ← app_build.vdf, depot_build.vdf para SteamPipe
│   └── icons/                      ← script de optimización de SVG (opcional)
│
├── agentes/                        ← prompts por agente (agente0..7) + HANDOFF.md
└── reference/                      ← SOLO consulta: dumpster-empire.html + ui/ (mockups). NO se buildea ni se porta.
```

Notas de arquitectura:

- **Import map** en `index.html` mapea `@dumpster/engine` a `../../packages/engine/src/index.js`.
  Así el navegador resuelve el paquete compartido sin bundler y el juego sigue siendo buildless.
- El **engine no importa nada del navegador**. Si un agente necesita `document` dentro de `engine`,
  la tarea está mal ubicada.
- Los **logros de Steam** son un espejo del sistema de logros del engine: cuando el engine emite
  "logro desbloqueado", `apps/desktop/steam.js` llama a `setAchievement`. El engine no sabe que
  Steam existe (se comunica por eventos/callbacks que la capa Electron escucha).

---

## 5. Migración prototipo → monorepo (mapa de funciones)

El prototipo `reference/dumpster-empire.html` es una **referencia suelta de comportamiento, no una autoridad**:
tiene funciones rotas o inútiles (la stat de **Fuerza**, entre otras) que **no se portan tal cual**.
Se toma como guía de *qué se siente bien* y se reimplementa limpio desde el engine y el PLAN. Cada
bloque útil se reubica así; lo roto se rediseña (ver la regla de migración al final de la tabla):

| Prototipo (single-file) | Destino en el monorepo |
|---|---|
| `RARITIES`, `ITEMS`, `CONTAINERS`, `UPGRADES`, `AUTOMATIONS`, `PRESTIGE_TREE`, `ACHIEVEMENTS` | `apps/game/src/data/*.json` (data) + `packages/engine` los carga |
| `freshState`, `loadState`, `saveState`, `SAVE_KEY` | `packages/engine/src/state.js` + `save.js` |
| `upgradeCost`, `containerCost`, `prestigeTreeCost`, `getLuck`, `getDigPowerMult`, `getAreaMult`, `getQueueMax`, `getSellMult`, `getOfflineFactor`, `getTrapProb`, `prestigeKeysIfPrestigedNow` | `packages/engine/src/economy.js` |
| `refreshMarketFluctuation`, `rollContainerResult`, `applyContainerResult` | `packages/engine/src/rng.js` + `systems/containers.js` |
| `automationTick`, cola/slots | `packages/engine/src/systems/automation.js` |
| `doPrestige`, `checkAchievements` | `systems/prestige.js`, `systems/achievements.js` |
| `applyOfflineProgress` | `systems/offline.js` |
| `fmt`, `fmtN` (formato de números) | `packages/engine/src/format.js` |
| Canvas: `startDig`, `drawBottomLayer`, `drawTopLayerFull`, `eraseAt`, `sampleClearedFraction`, `onPointer*`, `finishDig`, `abandonDig` | `apps/game/src/dig/DigCanvas.js` + `digInput.js` |
| `renderTopbar`, `renderQuickUpgrades`, `renderShop`, `renderAuto`, `renderAchievements`, `renderPrestige`, `refreshAll`, tabs/paneles | `apps/game/src/ui/*` |
| `pushToast`, `showModal`, `showFlash`, tutorial | `ui/Toast.js`, `ui/Tutorial.js`, `fx/*` |
| Loop principal + offline al abrir | `apps/game/src/loop.js` + `main.js` |

Regla de migración: **portar solo lo que funciona y se siente bien; rediseñar lo roto.** Antes de
portar una función, el agente verifica que realmente cambie un número que al jugador le importe (test
de relevancia). La Fuerza del prototipo falla ese test y se reimplementa según la revisión de stats
de PLAN.md §2.3 (umbral de revelado + bonus de valor por profundidad). Nada de arrastrar bugs "porque
estaban en el prototipo": el engine y sus tests son la autoridad, no el HTML de referencia.

---

## 6. Inventario de UI: qué existe y qué falta

Comparado con lo que exigen PLAN.md §5.2 y §5.4, esto es lo que el prototipo **ya tiene** y lo que
**falta** (trabajo real, no cosmético):

### Ya existe (portar y pulir)
- Barra superior (dinero, llaves, ajustes).
- Canvas de escarbado funcional (destination-out, revelado por %).
- Mejoras rápidas (Suerte / Fuerza / Área).
- Tienda de contenedores, panel de automatización con cola/slots.
- 27 logros (cumple el mínimo de 25), pantalla de logros.
- Prestigio funcional + progreso, ajustes con export/import y reset.
- Fluctuación de mercado (lógica) y progreso offline (cálculo + modal básico).

### Falta o está por debajo de lo que pide el PLAN
- **Sonido: no existe.** PLAN §5.2 pide SFX al hallar (pop) y al caer en trampa (grave, no
  agresivo). Hay que crear `fx/audio.js` (WebAudio, sin librería) y el toggle real de volumen.
- **Partículas / "pop" de rareza: no existe.** Falta `fx/particles.js` con partícula por color de
  rareza en `finishDig`.
- **Tween del contador de dinero: no existe.** PLAN §5.2 exige conteo animado 300–500ms; hoy salta.
  Falta `fx/tween.js`.
- **Árbol de prestigio real: falta.** Hoy es una lista plana (`treeList`). PLAN §5.4 y el mockup
  Stitch `expanded_prestige_tree` piden nodos conectados visualmente.
- **Modal de offline con highlights: parcial.** Hoy muestra solo minutos y total. PLAN §4.5 pide
  resumen con objetos encontrados destacados.
- **Modal celebratorio al desbloquear categoría: verificar/mejorar** (auto-cierra en 3s, no bloqueante).
- **Íconos por emoji → reemplazo total.** ~60 emojis en data (items/containers/upgrades/etc.) y UI.
  Reemplazar por el registro de `icons/icons.js` (SVG / Material Symbols) del estilo Stitch.
- **Pulido visual fusión ámbar+Stitch: pendiente.** Botones táctiles "extruidos" (borde inferior
  2–4px), gauges recesados con relleno rayado, bloom en íconos de rareza alta, tipografía Rubik/
  Hanken/JetBrains Mono sobre la base cálida del prototipo.
- **Layout de escritorio con sidebar: pendiente, no es solo estilo de componentes.** El Agente 2
  (Fase 2) dejó a propósito un layout mobile-first con tabbar inferior en todos los anchos (el
  mínimo funcional que pedía esa fase — ver `agentes/HANDOFF.md`, bloque Agente 2). Pero la mayoría
  de los mockups Stitch (`the_workbench`, `refined_scavenge_station`, `tactile_clear`,
  `clean_scavenge_area`, `scritchy_shop`, `container_shop`, `automation_gadgets`,
  `expanded_prestige_tree`) usan en **desktop** un `<aside>` fijo a la izquierda de navegación/tienda
  (`hidden md:flex`, ancho `w-64`) y `tactile_clear` además un panel fijo a la derecha (`w-80`) con
  las mejoras — el layout de **tres columnas** (sidebar izquierda · escarbado centro · mejoras a los
  costados) que el usuario pidió explícitamente mantener. El único mockup mobile puro es
  `main_game`, que sí coincide con el tabbar inferior actual. **La Fase 4 tiene que reconstruir la
  grilla de `apps/game/index.html`/`layout.css` con ese breakpoint** (mobile = tabbar inferior tal
  como está hoy; `md:`/desktop = sidebar(s) fija(s) reemplazando el tabbar), no solo repintar los
  componentes existentes con los tokens nuevos.
- **Estados vacío/error explícitos** en cada vista (hoy algunos son implícitos).
- **Capa Steam:** pantalla de créditos/atribución si se usan fuentes/íconos con licencia; manejo
  de "guardado en la nube en conflicto".
- **Catálogo de estética de `dumpster_empire_main_game` (la pantalla principal que el usuario pidió
  explícitamente conservar entera, no solo su grilla): cada elemento visual, con la fase que lo
  implementa.** Sacado de `reference/ui/stitch_est_tica_de_vanguardia/dumpster_empire_main_game/code.html`
  línea por línea para que no se pierda nada al pasar por varios agentes:
  - **Fondo:** grilla industrial sutil (`industrial-grid`: dos `linear-gradient` cruzados color
    primario al 5% de opacidad, celda 20×20px) cubriendo toda la pantalla. → **Fase 4** (token de
    fondo en `layout.css`/`tokens.css`).
  - **Header:** dinero y llaves como **pastillas redondeadas** (`bg-surface-container-highest`,
    borde, `rounded-lg`) con ícono Material Symbols *filled* + valor en Fredoka bold — no texto
    plano como hoy. Botón de ajustes circular (`rounded-full`) con ícono, no un botón rectangular
    de texto. → **Fase 3** (íconos) para el glifo, **Fase 4** para la pastilla/botón circular.
  - **Tarjeta de escarbado (`scavenge-card`):** esquinas muy redondeadas (`rounded-3xl`), sombra
    interior fuerte + gradiente sutil (`inset 0 4px 12px` + `linear-gradient(145deg, ...)`), borde
    de 2px. Encima, una **etiqueta flotante tipo pestaña** con el nombre del contenedor actual,
    pegada al borde superior de la tarjeta. → **Fase 4**.
  - **Texturas de la zona de escarbado:** textura metálica sutil superpuesta a todo (`metal-texture`,
    7% opacidad, patrón de aluminio cepillado) y textura tipo "fibra de carbono" en la capa de
    suciedad (`scratch-surface`) en vez de un color plano. → **Fase 4** (se aplican como capas CSS
    sobre el `<canvas>` de `DigCanvas.js`, no dentro del propio canvas).
  - **Prompt de "arrastrá para escarbar":** antes de que el jugador toque el contenedor, se ve un
    ícono `touch_app` + un anillo pulsante (`animate-ping`) + el texto "DRAG TO SCAVENGE" centrado
    sobre la zona de revelado. **Hoy `DigCanvas.js` no tiene este estado inicial** — arranca
    directo mostrando el contenido dibujado bajo la capa de suciedad. Esto es a la vez un hueco
    funcional (falta un estado antes del primer gesto) y estético. → **Fase 3** (agregar el estado/
    el ícono) con el pulido final en **Fase 4**.
  - **Glow de rareza ("Rarity Pulse"):** una franja de blur de color debajo de la tarjeta
    (`blur-md`, color primario al 20%) que se intensifica al revelar un objeto de rareza alta.
    → **Fase 3** (`fx/particles.js`, ya está en el alcance de "partícula/destello por rareza en
    `finishDig`" del prompt del Agente 3, solo que ahora queda claro que el mockup lo resuelve como
    un glow debajo de la tarjeta, no como confeti).
  - **Mejoras rápidas (Suerte/Fuerza/Área):** **no son botones de texto plano** como en la versión
    actual — son botones "extruidos" (`tactile-btn`: sombra inferior sólida de color, se hunde al
    presionar) con un **ícono en círculo de color** arriba (grifo/brazo mecánico/radar), label en
    mayúsculas chico, y el costo de la próxima compra en Fredoka bold debajo. → **Fase 3** (íconos)
    + **Fase 4** (forma circular + extrusión del botón).
  - **Barra inferior (tabbar móvil):** la pestaña activa tiene fondo de pastilla de color +
    sombra interior "hundida" (`shadow-[inset_0_2px_4px_...]`) simulando estar presionada; las
    inactivas van atenuadas (`opacity-70`) y se iluminan en hover. Hoy la pestaña activa solo
    cambia de color de texto. → **Fase 4**.
  - **Contador de dinero:** el mockup define una animación de "rodillo" (`@keyframes counter-roll`,
    traslada el texto -10% en Y) para cuando sube el número, más específica que un tween genérico
    de conteo. → **Fase 3** (`fx/tween.js`), decisión de diseño: usar este efecto de rodillo en vez
    de (o además de) un conteo numérico incremental.

### Mapeo visual (fusión ámbar + Stitch)
- **Base (del prototipo):** `--amber #ffb627`, `--olive #86a14a`, fondos `--bg-0..3` cálidos,
  fuentes Fredoka/Nunito → se conservan como identidad de marca.
- **De Stitch se adopta:** rigor tipográfico (Rubik para números grandes, Hanken para cuerpo,
  JetBrains Mono para readouts técnicos), botones extruidos, gauges recesados con rayado hazard,
  bloom de rareza, colores de rareza ya presentes en `:root` del prototipo (`--r-common`…`--r-future`),
  **y la estructura de layout de escritorio de tres columnas** (sidebar izquierda de navegación/
  tienda + área de escarbado centrada + panel de mejoras a los costados) — ver el detalle de qué
  mockup usa qué grilla en la sección "Falta" de arriba. En mobile (`< md`) esas columnas colapsan
  al tabbar inferior + panel deslizable que ya define PLAN.md §5.1; esto es responsive, no dos
  layouts separados.
- Todo esto vive en `styles/tokens.css`, `styles/layout.css` (la grilla/breakpoints) y
  `styles/components.css`. Cero valores sueltos.

---

## 7. Roadmap por fases (orden de ejecución de los agentes)

Cada fase es un lote de tareas para un agente Sonnet. No se avanza de fase sin cerrar el checklist
de la anterior. El **orden de agente = orden de ejecución**.

### Fases 0–4 — COMPLETADAS (Agentes S, 0, 1, 2, 3, 4)

Andamiaje del monorepo, engine puro + tests (48/48 verde), juego jugable modular, huecos de UI
(sonido/partículas/tween/íconos SVG/modales), y primer pase de pulido visual. Detalle en
`agentes/HANDOFF.md`. **A partir de acá el roadmap se re-secuenció tras el playtest** (ver PLAN.md
§11): entran una pasada de fixes, las mecánicas nuevas y el re-anclaje visual **antes** del balance.

### Cola re-secuenciada (Agentes 5–11)

**Fase 5 — Fixes de UX (Agente 5)** — PLAN.md §11.1
- Prompt de "elegí contenedor" + botón de escarbado gratis: solo en la Tienda; sacarlos del resto.
- Ocultar mejoras rápidas fuera de la pantalla de escarbado.
- "Prestigiar" → "Hacer Prestigio". Eliminar export/import de guardado. Explicar Automatización.
- Solo UI/UX, sin mecánicas nuevas ni balance. Toca `apps/game/src/ui/*` e `index.html`.
- Salida: los seis fixes del §11.1 aplicados; smoke e2e verde.

**Fase 6 — Mecánicas de contenido (Agente 6)** — PLAN.md §11.2–11.4, 11.6, 11.7 (engine + data)
- **Ítems únicos por contenedor** (reestructura `items.json`/`containers.json`: cada contenedor su
  propio set, sin repetidos).
- **Niveles de contenedor 1–10** que mejoran odds (estado persistente + fórmula en engine).
- **Resistencia / Fuerza mínima** por contenedor; escarbado que escala esfuerzo con el tier.
- **Trampas más caras** (escalan con el tier, suavizadas por Suerte).
- **Suerte recomendada por contenedor** (valor derivado calculado por el engine).
- **Recompensas de logros** (llaves/dinero declaradas en `achievements.json`).
- **Dependencias reales del árbol de prestigio** (`requires` en `prestigeTree.json`).
- Todo con **tests de Vitest**. Cero DOM.
- Salida: engine + data con las mecánicas nuevas, tests verdes, API pública documentada en HANDOFF.

**Fase 7 — UI de las mecánicas nuevas (Agente 7)** — PLAN.md §11.5, 11.7, 11.8, 11.9 (consume Fase 6)
- **Colección / INDEX por contenedor** (recompensas ocultas → reveladas con %, precio, cantidad).
- **Pantalla de inicio / menú** (logo, "Jugar", config) y el flujo inicio → escarbado.
- **Árbol de prestigio real y simétrico** (nodos conectados según `requires`, estilo n8n/scritchy).
- Mostrar **Suerte recomendada** en la Tienda y **recompensa** en cada logro.
- Salida: las vistas nuevas consumen el engine (no reimplementan lógica), con sus 4 estados.

**Fase 8 — Re-anclaje visual a "The Workshop" (Agente 8)** — PLAN.md §5.3
- Re-anclar **todas** las pantallas al mockup `clean_scavenge_area`: paleta `#191208` + madera,
  **Plus Jakarta Sans**, tarjetas `.tactile-card`/`.squishy-button`, texturas de veta y superficie
  rascable, bordes rasgados. Reemplaza la "fusión" de la Fase 4.
- `tokens.css`/`components.css`/`layout.css` centralizados; cero valores sueltos.
- Salida: identidad "The Workshop" coherente en todas las vistas (inicio, escarbado, tienda,
  automatización, logros, prestigio, INDEX), mobile-first + Steam Deck, smoke e2e verde.

**Fase 9 — Pase de balance (Agente 9)** — corre DESPUÉS de las mecánicas nuevas
- Scriptear la curva contra los hitos de PLAN.md §3 **y** los objetivos del §11.2 (rentabilidad con
  la Suerte recomendada, pérdida que baja con Suerte, esfuerzo de escarbado, costo de trampa,
  recompensas de logros no-OP). Ajustar **constantes de data**, nunca fórmulas. Asserts en tests.
- Salida: hitos §3 y objetivos §11.2 cumplidos con los números implementados.

**Fase 10 — Empaquetado Steam (Agente 10)**
- `apps/desktop`: Electron + steamworks.js (logros espejados, Steam Cloud, conflicto de guardado),
  electron-builder Win/Mac/Linux, `tools/steam/` con VDF. Auto-hospedar fuentes/íconos para offline.
- Salida: builds instalables; logros y cloud saves contra el appId de prueba.

**Fase 11 — Auditoría final + QA (Agente 11)**
- Recorrer el checklist de PLAN.md §10 y el QA de la sección 9. Verificar además el scope §11 completo.
- Salida: cero ítems sin marcar; nota final de qué se construyó y qué queda como postre.

> **Paralelización posible** (ver también sección 9): la Fase 5 (fixes, solo `ui/*`) puede solaparse
> con el arranque de la Fase 6 (engine/data) porque tocan archivos distintos. Las Fases 7 y 8 dependen
> de la 6; la 9 depende de 6/7/8; 10 depende de que el juego esté completo; 11 es la última.

---

## 8. Desglose de tareas para agentes Sonnet 5.0 medium

Formato para asignar a un agente ejecutor. Cada tarea es autocontenida, con criterio de "listo".
(Ejemplos representativos por fase; el agente que orquesta expande el resto siguiendo el mismo molde.)

- **T0.1 — Andamiaje.** Crear el monorepo de la sección 4 (vacío pero instalable). *Listo cuando:*
  `npm install` y `npm test` corren sin error y `apps/game/index.html` sirve una página.
- **T1.1 — Economía + tests.** Portar `economy.js` con las fórmulas §4 literales y `economy.test.js`.
  *Listo cuando:* los tests verifican 10 niveles de cada mejora, llaves de prestigio y prob. de
  trampa mínima, todos verdes.
- **T1.2 — Save robusto.** `save.js` con validación de esquema, `saveVersion`, migración y
  export/import base64. *Listo cuando:* `save.test.js` prueba ida/vuelta sin pérdida y rechazo de
  save corrupto sin romper el estado en curso.
- **T2.1 — Canvas de escarbado.** Portar `DigCanvas.js` + `digInput.js` con `touch-action:none`.
  *Listo cuando:* se puede escarbar con mouse y touch, el % de revelado dispara `finishDig`.
- **T2.x — Vistas.** Una tarea por vista (`ShopView`, `AutomationView`, etc.), consumiendo el
  engine. *Listo cuando:* la vista tiene los 4 estados y paridad con el prototipo.
- **T3.1 — Audio.** `fx/audio.js` (WebAudio) + toggle real. *Listo cuando:* suena el pop al hallar
  y el grave suave en trampa, y el toggle silencia todo.
- **T3.2 — Íconos.** Reemplazar los ~60 emojis por SVG en `icons/icons.js`. *Listo cuando:* no
  queda ni un emoji como ícono en data ni en UI.
- **T3.3 — Árbol de prestigio.** `PrestigeView.js` con nodos conectados. *Listo cuando:* se ve el
  árbol, se compran nodos y refleja dependencias.
- **T6.1 — Electron shell.** `apps/desktop` carga el juego y empaqueta. *Listo cuando:* corre
  `electron .` y `electron-builder` produce un instalable local.
- **T6.2 — Steam.** `steam.js` con logros + Steam Cloud. *Listo cuando:* un logro del engine
  dispara un logro de Steam y el save sincroniza por Steam Cloud contra el appId de prueba.

Regla para el orquestador: asignar de a **una fase por vez**; dentro de una fase, paralelizar solo
tareas sin dependencias entre sí (p. ej. vistas distintas). Nunca dar por cerrada una fase con
tests rojos o checklist incompleto.

---

## 9. Plan de QA y verificación ("que todas las funciones anden")

Cuatro capas de red de seguridad:

1. **Tests automáticos de lógica (engine, Vitest).** Economía, save, prestigio, offline, formato de
   números. Es la defensa contra que un agente rompa una fórmula sin darse cuenta. Es el script
   `npm test`; corre en cada tarea de engine, en CI y en la auditoría final.
2. **Smoke test automático de UI (Playwright, Chromium).** Sirve `apps/game/` por HTTP y verifica:
   cero errores de consola, layout a 375px / 1280×800 (Steam Deck) / 1440px, y el gesto de escarbado
   en el canvas (pointer/touch) revelando y sumando dinero al completar. Script **separado**
   (`test:e2e`), fuera de `npm test` para que la suite unitaria siga siendo rápida y sin browser. Es
   la red que la simulación headless en Node no cubre (no toca el DOM ni el canvas). Aprobado en Fase 2.
3. **Checklist manual de UI por vista.** Para cada vista: ¿tiene estados cargando/vacío/error/datos?
   ¿el botón deshabilitado muestra cuánto falta? ¿hay feedback en tap/hover? ¿se rompe en 375px y
   en Steam Deck (1280×800) y en 1440px? ¿algún número desborda? (Complementa el smoke test con juicio humano.)
4. **Prueba de loop de punta a punta.** Partida nueva real: escarbar el tacho gratis → comprar
   primera mejora → comprar primer contenedor → automatizar → llegar a prestigio → prestigiar.
   Verificar que ningún botón queda muerto por `NaN`/`Infinity` y que el guardado persiste al
   recargar y al cerrar/abrir Electron (con Steam Cloud).

La auditoría final (Fase 7) recorre además, ítem por ítem, el checklist de PLAN.md §10 (Jugabilidad,
Economía, Guardado, UI/UX, Contenido, Código, Cierre). No se declara terminado con ítems sin marcar.

---

## 10. Decisiones registradas

- **Stack Steam = Electron + steamworks.js** (no Tauri): equipo vanilla-JS, integración Steam en
  JS puro, precedente amplio. Peso de binario aceptado.
- **Sin backend propio** (no Supabase): Steam Cloud cubre persistencia sin cuentas. Leaderboards
  online quedan como postre.
- **Monorepo con separación engine/UI**: habilita tests headless y trabajo paralelo de agentes;
  reemplaza la estructura de PLAN.md §6.2 conservando su espíritu de simplicidad.
- **Buildless con import maps**: respeta "JS vanilla puro" y permite un `packages/engine` real.
- **Mobile-first se conserva** y se reinterpreta como ventaja para Steam Deck.
- **Precio de contenedores fijo, tiers ×10–×15 (ronda 6)**: se eliminó el `1.08^n` de PLAN.md
  §4.2 (comprar contenedores es el loop principal; encarecer la repetición castigaba el loop) y
  la progresión pasa a los saltos de `costoInicial` entre tiers (0/25/300/4K/50K/700K/10M/150M).
  Con el costo pesando de verdad en el valor esperado, la Suerte recomendada de cada tier deja
  de ser 0 (rebalanceo de `items.json` en la misma ronda). PLAN.md §2.6/§4.2 actualizados.
- **Ronda 7 — riesgo y gesto que se sienten en partidas avanzadas**: (a) la Suerte recomendada
  se calcula contra un **jugador neutro** (meta fija por contenedor; con el estado real
  colapsaba a "0 (alcanzada)" apenas subían los niveles de contenedor/Fuerza); (b) la pena de
  trampa es **fija por tier** (sin dampening por Suerte) y el piso de probabilidad sube de 1% a
  **3%** — la Suerte reduce cuántas veces caés, no cuánto duele; (c) el ritmo del engine pasa a
  `clamp(Fuerza/resistencia, 0.3, 1.5)` (bonus real por sobre-Fuerza) y el radio del pincel a
  `base × √área × ritmo` con tope 1.5× el objeto (el Área lineal a nivel ~47 trivializaba el
  gesto en todos los contenedores por igual). PLAN.md §4.6/§11.2 actualizados.
- **Ronda 8 — requerimientos de Suerte más altos por contenedor**: las recomendadas pasan de
  0/2/9/20/35/56/81/122 a **0/6/16/32/56/86/126/176** (pares: la Suerte sube de a 2) bajando
  SOLO los `valorBase` de `items.json` (fórmulas, precios y trampas intactos). Calibrado con
  `agentes/scripts/calibrate-luck-ronda8.mjs`, que usa `getRecommendedLuck` del engine como
  oráculo (bisección del factor de escala por pool); targets exactos guardados por test en
  `fase9-balance.test.js`.
- **Ronda 9 — niveles de contenedor con valor y visibles**: los niveles (§11.3) existían pero
  eran invisibles y solo movían rarezas. Ahora cada nivel multiplica el valor de los ítems del
  contenedor: `multNivel = 1 + (nivel − 1) × levelValueMultPerLevel` (0.05 en data ⇒ tope
  ×1.45 a nivel 10), aplicado en roll real, automatización y offline. La Suerte recomendada NO
  cambia (meta neutra a nivel 1, guard de ronda 8 intacto). UI: nivel+bonus+progreso en la
  Tienda, badge "Nv. X" en el picker, toast al subir por escarbado manual (la automatización
  no notifica). PLAN.md §11.3 actualizado ANTES de implementar. De paso, fix de UX de la
  Automatización: el explainer nombraba mal la mecánica (nada se encola a mano; el Robot
  Clasificador compra y procesa solo) y el panel de estado ahora es consciente del estado —
  sin robot muestra un callout con el paso a seguir en vez de una cola muerta "0/2".
- **Ronda 10 — dificultad exponencial**: resistencia y `areaRecomendada` exponenciales (~×1.35),
  metas de Suerte recalibradas a 0/8/20/40/72/120/190/290 con el oráculo de ronda 8
  (`agentes/scripts/calibrate-luck-ronda10.mjs`), y Fuerza/Búsqueda recomendadas visibles en la
  Tienda (`getRecommendedDigPower`/`getRecommendedArea`, ambas del engine). Penalizan, no
  bloquean. El tope de búsqueda de `getRecommendedLuck` sube de 500 a 800 (metas de ronda 11).
  De paso se ajustaron 3 tests pre-existentes que el roadmap no había previsto que rompieran:
  dos guards de `economy.test.js`/`fase6-mecanicas.test.js` hardcodeaban niveles de Fuerza
  pensados para la resistencia vieja (ya no alcanzaban el tope de ritmo 1.5 con la nueva), el
  tope "alcanzable (< 200)" de `fase9-balance.test.js` (ronda 6) subió a 350 porque
  `containerExtradimensional` ahora recomienda 290, y el e2e de ronda 7 filtraba
  `.shop-card-luck` sin distinguir Suerte de las líneas nuevas de Fuerza/Búsqueda (mismo
  selector, texto distinto).
- **Ronda 11 — contenedores de prestigio**: 4 contenedores nuevos al final de `containers.json`
  (12 en total) — Convoy Fantasma, Cripta del Coleccionista, Estación Orbital Caída y Vertedero
  de los Dioses — gateados por `requiresPrestigeCount` 2/3/4/5 además del contenedor anterior
  comprado (`isContainerUnlocked` mira índice + prestigio). Cada uno con pool propio de 7 ítems
  (28 nuevos en `items.json`) y 3 shapes de ícono nuevas (`crypt`/`satellite`/`temple`, más
  `convoy-ghost` reusando `truck`). Suerte recomendada calibrada a 340/420/500/580 con
  `agentes/scripts/calibrate-luck-ronda11.mjs` (mismo método de bisección que ronda 10, con dos
  ajustes: el rango de búsqueda del factor de escala sube de 100 a 1e8 porque los costoInicial
  de estos tiers son 3-5 órdenes de magnitud más grandes, y el redondeo de `valorBase` pasa de 3
  a 4 cifras significativas porque a esa escala 3 cifras eran una grilla demasiado gruesa para
  clavar el target exacto). `ShopView` distingue "Se desbloquea con el Prestigio N" de "Comprá el
  contenedor anterior" en la tarjeta bloqueada; el picker de Escarbar y el Índice no necesitaron
  cambios (ya iteran `allContainers` genéricamente). De paso se ajustaron guards pre-existentes
  que no habían anticipado más de 8 contenedores: dos tests de ronda 9/10 que mapeaban
  `getRecommendedLuck` sobre `containers` completo ahora usan `containers.slice(0, 8)` (siguen
  guardando solo la tabla de ronda 10), el guard de precios fijos de `economy.test.js` pasó de 8
  a 12 contenedores, el de `getDigRate` con Fuerza "sobrada" subió sus niveles hardcodeados (220
  y 1200) para seguir superando la nueva resistencia máxima (29, antes 8.7), y el tope de
  "probabilidad de trampa nunca supera X%" de `fase9-balance.test.js` subió de 35% a 40%
  (vertederoDivino, el de mayor riesgo, usa 38% a propósito).
- **Ronda 12 — celebraciones centradas**: `CelebrationModal` (nuevo) reemplaza al toast de
  logros y al `CategoryUnlockModal` (borrado, absorbido — los logros a14-a19 se celebran como
  cualquier logro). Overlay `#celebration-modal` con backdrop, cerrado SOLO con la cruz (sin
  auto-cierre ni click en backdrop), cola FIFO si caen varias a la vez. Tres disparadores: logro
  desbloqueado (con recompensa formateada), contenedor nuevo desbloqueado, hallazgo jackpot del
  escarbado manual. `isJackpot` se calcula en `rollContainerResult` (engine): ítem de la
  categoría más rara del contenedor (última de `categorias`) con varianza ≥
  `JACKPOT_VARIANCE_MIN` (1.10 de un rango 0.85-1.15); la automatización nunca celebra jackpots.
  El store detecta desbloqueos de contenedor comparando el set de `isContainerUnlocked` contra
  un baseline (`detectContainerUnlocks`), llamado tras cualquier acción que pueda desbloquear uno
  (comprar/empezar dig, comprar automatización, prestigiar, tick de automatización) — el baseline
  arranca del estado actual al cargar, así que recargar la página nunca re-celebra (sin bump de
  `saveVersion`). Sonidos nuevos 100% WebAudio (`playContainerFanfare`, `playJackpot`).
  De paso: el test del engine (`ronda12-jackpot.test.js`) tuvo que ajustar el generador de
  `random` inyectado — `rollCategory` elige la categoría rara con random BAJO (no alto, al
  revés de la asunción inicial), y `freshState()` consume el primer `random()` en
  `refreshMarketFluctuation` (`marketFluctuationAt: 0`) antes de llegar a `rollIsTrap`. Y varios
  e2e pre-existentes que digueaban el tacho como primera acción rompieron porque comprarlo por
  primera vez desbloquea el Contenedor de Barrio y el modal nuevo bloquea el pointer del canvas
  debajo — se agregó `cerrarCelebraciones()` a los helpers compartidos (`entrarAlJuego`,
  `iniciarEscarbado`) para que los specs de mecánica (no de celebraciones) no queden bloqueados.
- **Ronda 13 — identidad visual (ícono + pantalla de inicio) y fix de empaquetado**: (a) el arte
  `reference/ui/logo.png` pasa a ser el ícono de la app en sus tres superficies: favicon
  (`apps/game/assets/icon.png`, 256px), ventana de Electron en dev (`icon:` del BrowserWindow) y
  ejecutable empaquetado (`apps/desktop/build/icon.png` 512px como `buildResources`;
  electron-builder genera solo el .ico/.icns/png por plataforma). `.gitignore` necesitó la
  excepción `!apps/desktop/build/` (el patrón genérico `build/` lo ignoraba). (b) la pantalla de
  inicio usa `reference/ui/fpisp.png` (1614x975, versión sin el pentágono placeholder de
  `fondopantalladeinicio.png`; optimizado a `assets/title-bg.jpg`, JPEG q85) a pantalla completa.
  El arte trae el emblema y un botón "Jugar" PINTADOS: el botón real
  se ancla encima con unidades de container query (`--title-art-scale = max(100cqw/1614,
  100cqh/975)` replica `object-fit: cover`; rect del botón pintado medido por escaneo de
  píxeles, x 681-922 / y 589-684) para que nunca se vean dos botones a ningún tamaño. Estados via `data-bg`
  (loading/ready/error): el respaldo es la pantalla previa (madera + logo SVG), así el juego
  nunca queda en blanco si el arte falta. GOTCHA: cqw/cqh miden el content box ⇒ `.title-screen`
  debe tener `padding: 0` o la escala queda corta. (c) FIX de empaquetado: electron-builder 26
  resuelve los `from` de `extraResources` contra la raíz del workspace (no contra
  `directories.app`); con `../game`/`../../packages/engine` el paquete salía sin juego ni engine
  (ventana en blanco). Ahora son `apps/game`/`packages/engine` y el exe empaquetado se verificó
  booteando y jugando de verdad.
- **Ronda 14 — QoL, íconos, settings y bases de i18n (decisiones D1-D7 de RONDA14-PLAN.md)**:
  - **D1** — Un solo bump `SAVE_VERSION` 4→5 con TRES campos nuevos: `autoTargetContainerId:
    string|null` (default `null` = modo Auto), `digSensitivity: number` (rango 0.5–1.5, default 1)
    y `language: 'es'|'en'` (default `'es'`). `language` entra ya aunque no haya selector visible
    todavía: evita un v6 en la ronda futura de traducción. Los tres viajan en el save (y Steam
    Cloud), igual que `soundOn`/`volume`.
  - **D2** — Orden estricto A → B → C → D. i18n va ÚLTIMO porque A y B agregan/acortan strings:
    así la extracción al diccionario captura el copy FINAL una sola vez.
  - **D3** — Los hallazgos del robot NUNCA disparan el modal de celebración. El robot corre
    desatendido (apilaría modales); sus hallazgos solo incrementan `itemsFoundByItem` y aparecen
    en el Índice (CollectionView), como ya ocurre. Consecuencia asumida: si el robot encuentra
    primero un ítem raro, ese ítem ya no celebra nunca — el modal es exclusivo del hallazgo manual.
  - **D4** — El target del robot se lee del state DENTRO de `bestAffordableUnlockedContainer` (la
    firma NO cambia). Motivo: `packages/engine/src/systems/offline.js` llama a la misma función
    para estimar la tasa offline; leyendo del state, la estimación offline respeta el target sin
    tocar nada más.
  - **D5** — Semántica del target fijo: si no alcanza el dinero, el robot ESPERA/AHORRA. Sin
    fallback silencioso a otro contenedor. La UI muestra cuánto falta.
  - **D6** — `doPrestige` resetea `autoTargetContainerId` a `null`. El prestigio ya resetea
    `automationOwned`, `ownedContainers`, `autoQueue` y `autoProcessing`; un target apuntando a un
    contenedor re-bloqueado dejaría al robot idle sin explicación.
  - **D7** — `isJackpot` se renombra a `isFirstRareFind` y cambia su definición. Antes: categoría
    más rara + varianza ≥ 1.10 (`JACKPOT_VARIANCE_MIN`), cada vez. Ahora: categoría más rara +
    primera vez que se encuentra ESE ítem. La constante de varianza se elimina. El flag se calcula
    en `rollContainerResult`, que corre ANTES de que `applyContainerResult` incremente los
    contadores (un contenedor multi-slot que saca el mismo ítem dos veces en el mismo roll solo
    marca la primera aparición con el flag, vía un `Set` local al roll).
  - **Estrategia de datos i18n (D4 de la sección Agente D, no confundir con D4 de arriba)**: los
    `name`/`desc` de `apps/game/src/data/*.json` quedan como fuente de verdad en español. Una
    ronda futura de traducción agregará overlays `apps/game/src/i18n/data.en.js` con mapas
    `id → { name, desc }` que `main.js` aplicará sobre la data cargada cuando `language !== 'es'`.
    La data cruda no se bifurca, los ids no cambian, el engine jamás ve texto de UI.

- **Ronda 28 — paleta «Turno Noche» (solo valores de tokens.css)**: el usuario desaprobó el
  rango marrón mono-tono del mockup Stitch ("marrón IA", 2026-07-14) y eligió (2026-07-18, por
  matriz de screenshots 375/1280px contra otras 2 propuestas) fondos azul pizarra nocturno con
  acento ámbar `#ffb627` (el del prototipo original). Ningún selector de components/layout.css
  cambió; el banco de madera sigue cálido a propósito y el botón JUGAR queda intacto. Las 8
  rarezas pasan a tonos francamente distintos (antes antiques/historic eran dos marrones casi
  iguales). Contraste AA verificado en los pares de texto reales. PLAN.md §5.3 actualizado.

- **Ronda 29.A — sistema de objetos ilustrados (`objectArt.js`, PLAN.md §5.5)**: registro
  hermano de `icons.js` con viewBox 96 y composición por partes (body con gradientes + material
  overlay recortado a la silueta + details por ítem). Decisiones: (1) la paleta de cada ítem se
  deriva de UN hex base con `paletteFrom()` (luces/sombras coherentes en todo el catálogo sin
  tokens CSS — el SVG compuesto no puede resolver `var(--...)` y el canvas ya documenta sus
  colores de dibujo hardcodeados); (2) rotación "enterrada" determinística por posición ya
  rolleada (`artRotationFor`, hash imul → ±15°) y escala por ítem clampeada 0.7-1.4 — el canvas
  nunca decide presentación, el repintado desde el modelo reproduce el frame (napkin); (3)
  fallback incremental: sin entrada en `ART` se dibuja el render clásico intacto, `PENDING_ART`
  lista los ids sin ilustrar y el test de cobertura (derivado de la data, cero conteos) obliga a
  decidir por cada ítem nuevo; (4) ids internos del SVG namespaciados por `uid` para poder
  inyectar composiciones inline en el mismo DOM (Vitrina de la 29.C).

- **Ronda 29.B — arte tanda 1 (pools de contenedores 1-8 + herramientas)**: 59 composiciones
  (55 ítems + 4 herramientas), ~50 bodies nuevos y el material `paper`. Decisiones: (1) helpers
  de gradiente compartidos (`GRAD.cyl/vert/diag/orb`, luz siempre arriba-izquierda) + `steelGrad`
  fijo para hojas/filos — el acero pulido no sale de la paleta del ítem, mismo criterio literal
  que los MATERIALS; (2) la paleta por ítem es el color NATURAL del objeto (una banana es
  amarilla) y la rareza aparece en acentos de details (glow teal en future, gemas violetas en
  relics) — colorear todo el pool con el token de rareza volvía irreconocible la silueta;
  (3) los bodies de trazos sin área de relleno (bicicleta) acotan su `clip` a los discos de
  rueda y pintan el desgaste en el propio body (el clipPath solo une geometría de fill: un
  material sobre el rect del cuadro flotaría sobre el fondo); (4) el selector de herramientas
  (`ToolsSection`) pasa a mostrar el arte ilustrado a 40px vía `getObjectArtMarkup` inline (es
  la única vista donde las herramientas se lucen — no son entries del canvas), con fallback al
  ícono clásico de 20px; (5) dos composiciones se rehicieron tras la revisión por screenshot a
  40px (R29.3): el diario leía como ladrillo (la plana superior pasó a dominar en claro) y el
  zapato como piedra (botín con caña, cordones y suela clara de contraste).

- **Ronda 29.C — arte tanda 2 (pools 9-16 + especiales de la ronda 20 + legendarios) y vitrina**:
  78 composiciones que cierran el catálogo (`PENDING_ART` queda VACÍA). Decisiones: (1) el bloom
  de rareza alta de los 8 legendarios (§5.2) se pinta en el `paint` del body y NO en `details`,
  porque el overlay de details se recorta al clipPath de la silueta y un aura ahí sería invisible
  — el `paint` no se recorta, así que el halo puede desbordar el objeto (helper `halo`, mismo
  patrón que `GRAD`/`steelGrad`: const interno del módulo); (2) los legendarios llevan **body
  propio no reutilizable** (`legendCan`, `legendBike`, …) con gradientes de más paradas y rim
  light, y escala alta (1.15-1.4): son el premio aspiracional y tienen que dominar el canvas
  apenas asoman; (3) la **Vitrina del INDEX** exhibe el arte a 96px (tamaño nativo del viewBox)
  con `.showcase-card-art`, cuyo drop-shadow es más suave que el del ícono plano porque la pieza
  ya trae su halo compuesto — el resto del INDEX conserva los íconos de 24px: su grilla tiene
  decenas de ítems por contenedor y a 96px dejaría de ser una tabla consultable, mientras que la
  vitrina son 8 piezas; (4) cinco composiciones se rehicieron tras la revisión por screenshot a
  40px (R29.3): partitura y boceto leían como papel en blanco (indistinguibles entre sí y del
  manifiesto de carga) → pentagrama con notas y garabato de carbonilla gruesos; el libro contable
  era un rectángulo gris → quemadura que ocupa media tapa con borde de brasa; el eslabón de cadena
  eran dos aros borrosos → pared de aro engrosada a 10 unidades de viewBox; y la Semilla del Vacío
  (legendario) leía como mancha oscura sobre la tierra del canvas → paleta subida a valor medio.

---

## 11. Qué queda como postre (no tocar en V1)

Todo lo de "posibles adiciones a futuro" de PLAN.md: objetos legendarios, eventos de contenedor,
clima/turnos por hora real, misiones diarias, segunda moneda de prestigio, especializaciones,
álbum de colección, negociación de venta, leaderboards online, demo web en Cloudflare Pages. Se
implementan solo tras cerrar la Fase 7 y con aprobación explícita.
