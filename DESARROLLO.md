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
electron           ^31.x   (LTS estable con soporte de Node reciente)
steamworks.js      ^0.4.x
electron-builder   ^24.x
vitest             ^2.x
```

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
│   │   │   │   ├── Topbar.js
│   │   │   │   ├── QuickUpgrades.js
│   │   │   │   ├── ShopView.js
│   │   │   │   ├── AutomationView.js
│   │   │   │   ├── AchievementsView.js
│   │   │   │   ├── PrestigeView.js  ← árbol real de nodos conectados
│   │   │   │   ├── SettingsView.js
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
de la anterior. Las fases 1–3 son secuenciales; dentro de la 4 se puede paralelizar por vista.

**Fase 0 — Andamiaje del monorepo**
- Crear `package.json` raíz con workspaces, `packages/engine` y `apps/game` vacíos con su
  `package.json`, `index.html` con import map, `README.md` de 3 pasos. Configurar Vitest.
- Salida: `npm install` funciona; `npm test` corre (aunque sin tests todavía); `apps/game` abre
  una página en blanco servida estáticamente.

**Fase 1 — Engine puro + tests (el cerebro)**
- Portar data a `apps/game/src/data/*.json`.
- Portar `state.js`, `save.js` (con validación + `saveVersion` + migración), `economy.js` (fórmulas
  §4 literales), `rng.js`, `format.js` y `systems/*`.
- Escribir tests Vitest: costos de los primeros 10 niveles de cada mejora vs fórmula; llaves de
  prestigio; ida/vuelta de export/import; tope y factor de offline; prob. de trampa nunca < 1%.
- Salida: engine 100% headless y verde en CI local, sin una sola referencia al DOM.

**Fase 2 — Juego jugable modular (portar el prototipo)**
- Portar canvas de escarbado (`dig/`), loop (`loop.js`), y las vistas existentes (`ui/*`)
  consumiendo el engine vía import map. Migración 1:1 del comportamiento del prototipo.
- Salida: el juego es jugable de punta a punta en el navegador (escarbar → vender → mejorar →
  comprar → automatizar → prestigiar), guardando en localStorage, con paridad funcional al prototipo.

**Fase 3 — Cerrar los huecos de UI del PLAN**
- `fx/audio.js`, `fx/particles.js`, `fx/tween.js` y su cableado en `finishDig`/topbar/trampa.
- Reemplazo total de emojis por `icons/icons.js`.
- Árbol de prestigio real (nodos conectados) y modal de offline con highlights.
- Estados vacío/error explícitos en todas las vistas.
- Salida: se cumple PLAN.md §5.2 y §5.4 completo.

**Fase 4 — Pulido visual fusión ámbar + Stitch**
- `tokens.css` + `components.css`: botones extruidos, gauges recesados, bloom de rareza,
  tipografía Rubik/Hanken/JetBrains sobre base cálida. Aplicar a cada vista. Paralelizable por vista.
- **`layout.css` (no solo componentes): reconstruir la grilla de escritorio con sidebar(s), no
  repintar el tabbar móvil escalado.** Mobile (`< md`) sigue con el tabbar inferior que dejó la
  Fase 2 (ya cumple PLAN.md §5.1). Desktop (`>= md`) pasa a las tres columnas de los mockups Stitch:
  sidebar fija a la izquierda con Tienda/Automatización/Logros/Prestigio/Ajustes (reemplaza el
  tabbar, no convive con él), área de escarbado centrada, y un panel de mejoras rápidas a un costado
  (ver `dumpster_empire_tactile_clear/code.html` para el caso con panel a ambos lados). Ver el
  detalle de qué mockup usa qué grilla en la sección 6 de arriba ("Layout de escritorio con
  sidebar"). Decisión explícita del usuario (no asumir "mobile-first" como "un solo layout escalado").
- Salida: identidad visual coherente, mobile-first en angosto y sidebar de tres columnas en
  desktop/Steam Deck horizontal, sin colores hardcodeados.

**Fase 5 — Pase de balance**
- Jugar mentalmente/scriptear la curva contra los hitos de PLAN.md §3 y ajustar **constantes de
  data** (no fórmulas) hasta cumplirlos. Cubrir los ajustes con asserts en tests.
- Salida: los 6 hitos de ritmo de §3 se cumplen con los números implementados.

**Fase 6 — Empaquetado Steam (la caja)**
- `apps/desktop`: Electron carga `apps/game`; `preload.js` + `steam.js` con steamworks.js;
  logros de Steam espejados desde el engine; Steam Cloud mapeando userData; manejo de conflicto de
  guardado. `electron-builder.yml` con targets Win/Mac/Linux. `tools/steam/` con los VDF de SteamPipe.
- Salida: builds instalables por plataforma; logros y cloud saves funcionando contra el appId de prueba.

**Fase 7 — Auditoría final (checklist de PLAN.md §10) + QA**
- Recorrer explícitamente el checklist de PLAN.md §10 y el de QA de la sección 9 de este doc.
- Salida: cero ítems sin marcar; nota final breve de qué se construyó y qué queda como postre.

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

---

## 11. Qué queda como postre (no tocar en V1)

Todo lo de "posibles adiciones a futuro" de PLAN.md: objetos legendarios, eventos de contenedor,
clima/turnos por hora real, misiones diarias, segunda moneda de prestigio, especializaciones,
álbum de colección, negociación de venta, leaderboards online, demo web en Cloudflare Pages. Se
implementan solo tras cerrar la Fase 7 y con aprobación explícita.
