# HANDOFF — Diario de agentes

Cada agente escribe su bloque **al terminar** su fase. El siguiente agente lo lee **antes de empezar**.
Formato sugerido por bloque: qué hice · archivos tocados · decisiones (`// DECISIÓN:` / `// AJUSTE:`) ·
qué necesita saber el próximo agente · estado del DoD.

---

## Estado global

| Fase | Agente | Estado |
|---|---|---|
| 0 Andamiaje | 0 | ✅ hecho |
| 1 Engine + tests | 1 | ✅ hecho |
| 2 Juego jugable | 2 | ✅ hecho |
| 3 Huecos de UI | 3 | ✅ hecho |
| 4 Pulido visual | 4 | ✅ hecho |
| 5 Balance | 5 | ⬜ pendiente |
| 6 Steam | 6 | ⬜ pendiente |
| 7 Auditoría | 7 | ⬜ pendiente |

---

## Agente S (Setup/Infra)

**Qué hice:**
- Inicialicé el repo git (`git init`, rama `main`) — no había `.git` previo.
- Creé `.gitignore`, `.gitattributes` (normaliza EOL a LF, marca binarios de imagen/audio/fuente),
  `.editorconfig` (2 espacios, UTF-8, LF, trim trailing whitespace, newline final).
- Creé `.nvmrc` con Node **20** (LTS compatible con Electron ^31.x pineado en DESARROLLO.md §3;
  Electron 31 embebe Node 20.x). El Agente 0 debe usar esta misma versión en `engines.node` del
  `package.json` raíz.
- Creé CI en `.github/workflows/ci.yml`: corre en push y PR, cachea `node_modules` por hash de
  `package-lock.json` (no usé el cache nativo de `actions/setup-node` porque falla si no hay
  lockfile — todavía no existe), instala con `npm ci` si hay lockfile o `npm install` si no, y
  corre `npm test` solo si hay `package.json` y un script `test` definido. No falla si el Agente 0
  todavía no dejó nada armado.
- Creé `LICENSE` de "todos los derechos reservados" (no es código abierto). **Ojo:** no tengo el
  nombre legal del titular — quedó el placeholder `<TITULAR>` en `LICENSE`. Hay que reemplazarlo
  a mano por el nombre/razón social real antes de un release público.
- Conecté `origin` → `https://github.com/darkhyper93-jpg/Dumpster-Empire.git`.
- Primer commit: `chore: bootstrap repo (docs, agent prompts, reference, CI, gitignore)`, con
  PLAN.md, CLAUDE.md, DESARROLLO.md, `agentes/`, `reference/` y toda la infra de arriba.
- **Push: hecho.** Las credenciales de git ya estaban configuradas en el entorno (git config
  global `user.name`/`user.email` presentes, sin `gh` CLI instalado pero el credential helper
  tenía auth) — `git push -u origin main` corrió sin pedir nada. `main` está al día con
  `origin/main`.

**Archivos tocados:** `.gitignore`, `.gitattributes`, `.editorconfig`, `.nvmrc`,
`.github/workflows/ci.yml`, `LICENSE`, `agentes/HANDOFF.md` (este archivo). No toqué contenido
de `PLAN.md`, `CLAUDE.md`, `DESARROLLO.md`, `agentes/agenteN-prompt.md` ni `reference/` — solo los
agregué al primer commit.

**Convención de ramas para agentes de fase:** cada agente de fase trabaja en una rama
`fase/<N>-<slug>` (ej. `fase/0-andamiaje`, `fase/1-engine`, `fase/2-juego-jugable`, etc.) y abre
PR contra `main` para que corra CI. `main` se mantiene siempre jugable/verde — no se commitea
directo a `main` salvo bootstrap de infra como este.

**Decisiones:**
```
// DECISIÓN: Node 20 en .nvmrc porque Electron ^31.x (pineado en DESARROLLO.md §3) embebe Node 20.x;
// hay que mantener el mismo runtime entre dev y el proceso principal de Electron.
// DECISIÓN: cache manual de node_modules en CI (actions/cache) en vez de cache:npm de setup-node,
// porque ese cache nativo falla si no encuentra package-lock.json, y todavía no existe.
// AJUSTE: LICENSE con placeholder <TITULAR> — falta el nombre legal real del titular del copyright.
```

**Qué necesita saber el Agente 0:**
- Puede arrancar el scaffolding del monorepo directo sobre `main` (ya está pusheado y limpio) o
  sobre una rama `fase/0-andamiaje` si prefiere abrir PR primero — la convención de ramas de arriba
  aplica desde el Agente 0 en adelante si quiere que CI valide antes de mergear.
- Usar Node **20** en `engines.node` del `package.json` raíz (coincide con `.nvmrc`).
- El CI ya está listo para correr `npm test` en cuanto exista `package.json` con script `test` y
  `package-lock.json` — no hace falta tocar `.github/workflows/ci.yml`.
- `reference/` ya está versionado (se commitea) pero **no se buildea** — es solo consulta, tal
  como dice `CLAUDE.md`/`DESARROLLO.md`.
- Reemplazar `<TITULAR>` en `LICENSE` cuando se tenga el nombre legal/razón social definitivo.

**Estado del DoD:** completo. Repo en `main`, `origin` conectado, higiene (`gitignore`/
`gitattributes`/`editorconfig`/`nvmrc`) creada, CI tolerante a "sin tests aún", LICENSE de
derechos reservados presente, commit inicial pusheado a `origin/main`, convención de ramas
documentada acá arriba.

---

## Agente 0 (Andamiaje del monorepo)

**Qué hice:**
- Rama `fase/0-andamiaje` (siguiendo la convención del Agente S).
- `package.json` raíz: `"private": true`, `workspaces: ["packages/*", "apps/*"]`, `engines.node: "20.x"`
  (coincide con `.nvmrc`). Scripts: `test` (`vitest run`), `dev` (`npx serve . -l 5173` — sirve la
  **raíz del monorepo**, no solo `apps/game`), y placeholders `desktop`/`build` que fallan con
  mensaje claro (son del Agente 6). Comentario `//versionesPineadas` con las versiones de
  DESARROLLO.md §3 (electron/steamworks.js/electron-builder/vitest).
- `vitest.config.js` en la raíz, apunta a `packages/*/tests/**/*.test.js`, `environment: 'node'`.
- `packages/engine/`: `package.json` (`"type": "module"`, nombre `@dumpster/engine`, `exports`
  apuntando a `src/index.js`), `src/index.js` vacío (comentado, a la espera del Agente 1),
  `tests/engine.test.js` con un test trivial (confirma que no hay `document` en Node y que Vitest corre).
- `apps/game/`: `index.html` con el layout estático de PLAN.md §5.1 (topbar con dinero/llaves/ajustes,
  área de escarbado, mejoras rápidas Suerte/Fuerza/Área, tabbar Tienda/Automatización/Logros/Prestigio)
  **sin lógica**, import map `@dumpster/engine` → `../../packages/engine/src/index.js`. `styles/{tokens,layout,components}.css`
  vacíos con comentario de encabezado. `src/main.js` importa `@dumpster/engine` y marca
  `document.getElementById('app').dataset.ready = 'true'` en vez de `console.log` (CLAUDE.md prohíbe
  `console.log` en código terminado, así que usé una marca en el DOM verificable en vez del logueo
  que pedía el prompt del agente literalmente). Carpetas vacías con `.gitkeep`: `src/dig/`, `src/ui/`,
  `src/fx/`, `src/icons/`, `src/data/`, `assets/`.
- `README.md` raíz: arranque en 3 pasos (`npm install`, `npm run dev`, `npm test`), con nota de por
  qué `dev` sirve la raíz y no `apps/game/`.
- `.gitignore` ya existía (obra del Agente S) y ya cubre `node_modules/`, `dist/`, builds de Electron;
  no hizo falta tocarlo.

**Decisiones:**
```
// DECISIÓN: npm run dev sirve la raíz del monorepo (npx serve . ), no apps/game/, porque el import
// map de apps/game/index.html apunta a ../../packages/engine/src/index.js, un nivel por fuera de
// apps/game. Serví con `serve` (bloquea path traversal fuera de su raíz) y confirmé con curl que
// serve apps/game da 404 en la ruta del engine, mientras que serve . resuelve /packages/engine/src/index.js
// con 200. Documentado en el README: hay que abrir /apps/game/ en el navegador.
// AJUSTE: main.js no usa console.log (aunque el prompt del Agente 0 lo pedía "temporal") porque
// CLAUDE.md prohíbe console.log en código que se da por terminado; usé un dataset flag en el DOM,
// verificable igual sin dejar deuda de "borrar el log después".
```

**Qué necesita saber el Agente 1:**
- `packages/engine/src/index.js` está vacío y listo para recibir `state.js`, `economy.js`, `rng.js`,
  `save.js`, `systems/*`, `format.js` — todo re-exportado desde `index.js` como API pública.
- Los tests van en `packages/engine/tests/*.test.js`; `vitest.config.js` raíz ya los descubre.
- El import map en `apps/game/index.html` ya resuelve `@dumpster/engine`; no hace falta tocarlo al
  sumar más código al engine, salvo que se agregue un segundo entry point.
- Para probar en navegador: `npm run dev` y abrir `http://localhost:5173/apps/game/`.

**Verificado:**
- `npm install` corre sin error (solo warning de `engines.node` porque el Node local es v24, no
  bloqueante).
- `npm test` corre Vitest y el test trivial pasa (1/1 verde).
- Serví el monorepo con `npx serve . -l 5174` y confirmé con `curl` que `/apps/game/` (200),
  `/apps/game/src/main.js` (200) y `/packages/engine/src/index.js` (200) resuelven correctamente
  desde la base del documento — el import map funciona.
- Estructura de carpetas verificada 1:1 contra DESARROLLO.md §4 (`packages/engine/{src,tests}`,
  `apps/game/{styles,src/{dig,ui,fx,icons,data},assets}`).

**Estado del DoD:** completo. Falta que el Agente 6 fije Electron/steamworks.js/electron-builder en
`apps/desktop` (no existe todavía, no es parte de esta fase).

---

## Agente 1 (Engine puro + tests)

**Qué hice:**
- Data completa en `apps/game/src/data/*.json`: `items.json` (8 rarezas + 8 categorías × 6 ítems
  c/u, 48 ítems totales), `containers.json` (8 contenedores con costos/trampa/slots/digTime de
  PLAN.md §2.6), `upgrades.json` (4 mejoras repetibles: luck/digPower/area/capacity),
  `automations.json` (8 mejoras de automatización de un solo uso), `prestigeTree.json` (12 nodos),
  `achievements.json` (27 logros). Ningún emoji: todos los `icon` son claves kebab-case (ej.
  `"can-crushed"`, `"container-portal"`, `"robot-sorter"`) para que el Agente 3 arme el registro SVG.
- `packages/engine/src/state.js`: `freshState()` + `SAVE_VERSION=1`, `@typedef GameState` completo.
- `packages/engine/src/economy.js`: las 6 fórmulas de PLAN.md §4 implementadas **literalmente**
  (`upgradeCost`, `containerCost`, `prestigeKeysEarned`, `itemSaleValue`, `offlineEarnings`,
  `trapProbability`), más getters de stats data-driven (`getLuck`, `getDigPowerMult`,
  `getRevealThreshold`, `getDepthValueMult`, `getAreaMult`, `getQueueMax`, `getSellMult`,
  `getEffectiveTrapProbability`, `getOfflineFactor`, `getOfflineCapSeconds`, `getContainerCost`,
  `getFragmentMult`, `getPrestigeStartMoney`, `getParallelAutoSlots`).
- `packages/engine/src/rng.js`: `rollCategory`, `rollItem`, `rollItemVariance`, `rollIsTrap`,
  `refreshMarketFluctuation`. Toda función acepta un `random` inyectable (default `Math.random`)
  para poder testear con semilla si hace falta a futuro.
- `packages/engine/src/save.js`: `validateSave` (esquema + `saveVersion`, nunca tira si el input
  es basura), `serializeState`/`deserializeState`, `exportSave`/`importSave` en base64, `migrate()`
  interno listo para el próximo bump de `saveVersion`.
- `packages/engine/src/format.js`: `formatNumber`/`formatMoney`, K/M/B/T (+Qa para cuatrillones).
- `packages/engine/src/systems/`: `containers.js` (compra, roll de resultado, aplicación),
  `upgrades.js` (compra de niveles), `automation.js` (compra de mejoras de automatización + tick
  de cola/procesamiento paralelo), `prestige.js` (`canPrestige`, `doPrestige`, árbol de nodos),
  `achievements.js` (evaluador genérico de condiciones), `offline.js` (estimación de tasa
  automática + `applyOfflineProgress`).
- `packages/engine/src/index.js`: reexporta toda la API pública de arriba — es lo único que
  `apps/game` debería importar.
- 48 tests de Vitest, todos verdes: `engine.test.js` (trivial de andamiaje, ya existía),
  `economy.test.js` (30 tests: costos de mejoras/contenedores en los primeros 10 niveles vs
  fórmula exacta, llaves de prestigio para varios `dineroTotalGanado`, trampa nunca <1%, y un
  bloque específico que prueba que **cada stat mueve un número distinto** — Suerte, umbral de
  revelado + bonus de profundidad de Fuerza, Área, Capacidad), `save.test.js` (7: ida/vuelta
  export/import y serialize/deserialize, rechazo de corruptos sin tocar el estado en curso),
  `prestige.test.js` (5: reset correcto conservando llaves/árbol/logros), `offline.test.js`
  (5: fórmula literal + tope de 8h + integración con `applyOfflineProgress`).

**Decisiones (`// DECISIÓN:` / `// AJUSTE:` en el código, resumidas acá):**
```
// DECISIÓN: el engine NO importa los JSON de apps/game/src/data directamente (ni con fetch ni con
// import assertions). Todas las funciones de economy.js/systems/* reciben la data como parámetro
// (`data = { upgrades, automations, prestigeTree }`, `itemsData = { rarities, categories }`,
// `allContainers`). Esto mantiene el engine 100% headless y testeable sin DOM y sin resolver
// import assertions de JSON (inestables entre Node/navegador sin bundler). apps/game (Agente 2)
// debe hacer `fetch()` de los JSON en main.js y pasarlos a las funciones del engine; los tests de
// Vitest importan los JSON directo porque Vite (motor de Vitest) sí soporta ese import nativamente.
//
// DECISIÓN: automations.json y prestigeTree.json usan un esquema de `effects: [{type, ...}]`
// genérico en vez de que economy.js tenga un switch hardcodeado de ids ('guantes', 'robotClasificador',
// etc). Así un futuro cambio de balance es 100% de data (agregar/quitar un efecto en el JSON) sin
// tocar economy.js. Tipos de efecto usados: statFlat, statPercent, statPercentFinal, queueSlots,
// queueSlotsFlatPerNivel, parallelSlots, sellPercentCategories, sellPercentGlobalPerNivel,
// trapPercentReductionPerNivel, containerCostPercentReductionPerNivel, containerSpecificPerNivel,
// startMoneyFlatPerNivel, offlineEfficiencyPercentPerNivel, offlineCapHorasFlatPerNivel,
// fragmentPercentPerNivel, enablesAutoDig, autoTrapMultiplier, unlocksContainer.
//
// AJUSTE (rediseño de Fuerza, PLAN.md §2.3): el prototipo tenía `getDigPowerMult` calculado pero
// sin usar en ningún lado real (la "velocidad de limpieza" no afectaba nada que el jugador viera).
// Se implementó de cero: `getRevealThreshold` (baja de 60% a un piso de 30% con la Fuerza) y
// `getDepthValueMult` (bonus multiplicativo de valor por objeto). Los dos leen del mismo
// `getDigPowerMult` pero producen efectos distintos y visibles — cumple el "test de relevancia" de
// DESARROLLO.md §5. Constantes elegidas (REVEAL_THRESHOLD_FLOOR=0.3, DROP_PER_MULT=0.25,
// DEPTH_VALUE_BONUS_PER_MULT=0.5) son de esta fase, no del balance final (eso es Fase 5).
//
// AJUSTE: `estimateAutomationRatePerSecond` (systems/offline.js) NO tira dados: calcula un valor
// esperado determinístico (ponderando categorías por la misma fórmula de `rollCategory` y
// promediando `valorBase` de la categoría) para el mejor contenedor comprable/desbloqueado. Evita
// que el progreso offline sea no-determinístico o dependa de simular el tiempo real transcurrido
// contenedor por contenedor. La fórmula literal de §4.5 (`offlineEarnings` en economy.js) sigue
// siendo la que se testea directamente con inputs controlados.
//
// AJUSTE: formatNumber/formatMoney soportan K/M/B/T (pedido explícito de CLAUDE.md/PLAN.md §6.4)
// y además "Qa" (cuatrillón) para no caer en notación científica en partidas post-prestigio muy
// avanzadas donde el dinero puede superar 1e15.
```

**Claves de ícono para el Agente 3 (registro SVG en `apps/game/src/icons/icons.js`):**
- Ítems (48): ver `apps/game/src/data/items.json` → cada entrada de cada categoría tiene su `icon`.
  Ejemplos: `can-crushed`, `banana-peel`, `bike-rusty`, `tv-crt`, `pocket-watch`, `war-helmet`,
  `oil-painting`, `crown-lost`, `fusion-core`, `stellar-fragment`.
- Contenedores (8): `trash-bin-street`, `dumpster-street`, `container-industrial`,
  `warehouse-abandoned`, `mansion-move`, `gallery-liquidation`, `vault-lost`, `container-portal`.
- Mejoras repetibles (4): `clover`, `fist-dig`, `hand-spread`, `crate-stack`.
- Automatizaciones (8): `gloves-work`, `cart-push`, `metal-detector`, `robot-sorter`,
  `conveyor-belt`, `recycling-plant`, `auction-house`, `drone-network`.
- Árbol de prestigio (12): `cash-stack`, `clover-glow`, `eagle-eye`, `moon-watch`, `truck-fleet`,
  `appraiser-loupe`, `steel-arm`, `eye-wide`, `handshake-deal`, `archive-box`, `shield-clock`,
  `portal-swirl`.
- Logros (27): ver `apps/game/src/data/achievements.json`, reusan varios íconos de arriba
  (`medal-bronze`, `coin-stack-small`, `coin-stack-medium`, `bank-vault`, `crown-gold`,
  `magnifier`, `clipboard-check`, `gear-set`, `city-skyline`, `bone-cracked`, `chart-up`).
- Colores de rareza (§2.5): `apps/game/src/data/items.json` → `rarities[].colorToken` apunta a las
  variables CSS `--r-common` … `--r-future` (ya definidas en el prototipo, hay que llevarlas a
  `tokens.css`).

**Qué necesita saber el Agente 2:**
- `packages/engine` está **100% headless y verde en tests** (48/48). El engine NO importa los JSON
  de data — hay que hacer `fetch()` de los 6 archivos de `apps/game/src/data/*.json` en `main.js` y
  pasarlos como parámetros a las funciones de `@dumpster/engine` (ver la DECISIÓN de arriba). Armar
  un objeto `data = { upgrades, automations, prestigeTree }` y otro `itemsData = { rarities,
  categories }` una sola vez al bootear, y pasarlos a cada llamada del engine.
- La API pública completa está en `packages/engine/src/index.js` (un solo import point). Funciones
  clave para portar el prototipo: `buyContainer`/`rollContainerResult`/`applyContainerResult`
  (reemplaza `startDig`/`rollContainerResult`/`applyContainerResult` del prototipo),
  `buyUpgrade`/`nextUpgradeCost` (reemplaza `buyUpgrade`), `automationTick` (reemplaza
  `automationTick`, ya incluye autocompra de cola), `doPrestige`/`canPrestige`/`prestigeKeysPreview`
  (reemplaza `doPrestige`/`prestigeKeysIfPrestigedNow`), `checkAchievements` (necesita
  `ctx = { allContainers, allAutomations }`), `applyOfflineProgress` (calcula y aplica solo, no hay
  que llamar a `offlineEarnings` a mano salvo que se quiera mostrar el desglose antes de aplicar).
- **Fuerza (`digPower`) ya no es la stat inútil del prototipo.** Usar `getRevealThreshold(state,
  data)` como el % de revelado que completa el contenedor (reemplaza el `0.55` hardcodeado del
  prototipo) y `getDepthValueMult` ya está aplicado dentro de `rollContainerResult`/`itemSaleValue`
  — no hace falta que la UI lo multiplique de nuevo.
- `state.upgradeLevels` reemplaza los 4 campos sueltos (`luckLevel`, `digPowerLevel`, etc.) del
  prototipo: ahora es un objeto `{ luck, digPower, area, capacity }`.
- El guardado usa `saveVersion` real con validación (`validateSave`/`deserializeState`); no asumir
  `Object.assign(freshState(), parsed)` como hacía el prototipo — eso no rechaza saves corruptos.
- `getEffectiveTrapProbability(state, container, isAuto, data)` ya compone luck + reducciones de
  prestigio + penalización de automatización (no puede espiar); es la que hay que usar antes de
  `rollContainerResult` para mostrar "Riesgo de trampa: X%" en la UI (ese cálculo ya lo hace
  internamente `rollContainerResult`, así que para el hint de UI se puede llamar aparte con los
  mismos parámetros sin efectos secundarios).

**Verificado:**
- `npm test`: 5 archivos de test, **48/48 tests verdes**.
- `grep -rn "document\|window" packages/engine/src` → 0 resultados.
- Los 6 JSON de data parsean como JSON válido; ningún campo `icon` tiene emoji (validado con
  regex `^[a-z0-9-]+$` sobre las 103 claves de ícono).
- Contenido mínimo de PLAN.md §7: 8 categorías × 6 ítems (48 total, dentro del rango 6-8), 8
  contenedores, 4 mejoras repetibles + 8 automatizaciones, 12 nodos de prestigio, 27 logros.

**Estado del DoD:** completo. Todos los tests de Vitest verdes, cero DOM en `packages/engine/src`,
las 6 fórmulas de §4 literales y testeadas, data completa sin placeholders ni emojis, y cada stat
(Suerte/Fuerza/Área/Capacidad) mueve un número verificable en un test dedicado.

---

## Agente 2 (Juego jugable modular)

**Qué hice:**
- `apps/game/src/store.js`: única fuente de verdad del lado UI. Envuelve `@dumpster/engine`,
  carga/guarda en `localStorage`, aplica progreso offline al bootear (`applyOfflineProgress` si
  pasaron ≥5s desde `lastSavedAt`), corre `checkAchievements` tras cada acción y expone un objeto
  `actions` (uno por verbo de juego) que es lo único que la UI puede llamar. Nunca muta el estado
  directo desde fuera de acá.
- `apps/game/src/loop.js`: `setInterval` de 1s con delta de tiempo real (`Date.now()` diff, no
  frames) para `tickAutomation`, autoguardado cada 15s, guardado en `visibilitychange`/`beforeunload`,
  y un `requestAnimationFrame` liviano solo para refrescar el topbar (dinero/llaves) entre ticks.
- `apps/game/src/dig/digInput.js` + `DigCanvas.js`: canvas de dos capas con
  `globalCompositeOperation='destination-out'`, `touch-action:none`, muestreo de fracción revelada
  por grilla (16x9) con throttle de 120ms — igual patrón técnico que el prototipo, pero el umbral de
  revelado y el radio de borrado ahora salen de `getRevealThreshold`/`getAreaMult` del engine, no de
  constantes hardcodeadas (`0.55`, `30`). Solo dibuja formas + texto (nombre del ítem), **sin
  emojis**: el registro de íconos SVG queda para el Agente 3.
- `apps/game/src/ui/`: `UIManager.js` (orquestador, suscrito al store, cablea tabbar/ajustes/canvas),
  `Topbar.js`, `QuickUpgrades.js` (Suerte/Fuerza/Área), `ShopView.js`, `AutomationView.js`,
  `AchievementsView.js`, `PrestigeView.js`, `SettingsView.js`, `Toast.js`, `Tutorial.js`. Cada vista
  recibe `(container, state, store)`, lee estado y despacha `store.actions.*`; ninguna calcula
  costos/valores por su cuenta (grep verificado: sin `Math.pow`/`costoBase *`/`valorBase *` fuera
  del cálculo de layout del canvas).
- `apps/game/index.html`, `styles/{tokens,layout,components}.css`: layout mobile-first funcional
  (sin el pulido Stitch todavía — eso es Fase 4), con estado `loading`/`error`/`ready` en `#app` y
  tokens mínimos de color/espaciado para no hardcodear valores sueltos (CLAUDE.md).
- Tutorial mínimo (PLAN.md §7) usando `state.tutorialStep` ya existente en el engine: paso 0→1 al
  completar el primer escarbado, 1→2 al comprar la primera mejora, 2→3 al comprar el primer
  contenedor de pago. Se muestra una sola vez porque el paso persiste en el save.

**Decisiones (`// DECISIÓN:` / `// AJUSTE:` en el código, resumidas acá):**
```
// DECISIÓN: comprar y escarbar un contenedor es una sola acción (`startManualDig`), igual que el
// prototipo: se paga y se tira el resultado (rollContainerResult) de una, y el jugador "espía" el
// resultado ya resuelto mientras revela con el canvas. abandonManualDig() descarta el resultado sin
// reembolsar la compra (tal cual el comportamiento del prototipo) — es el costo de espiar.
//
// DECISIÓN: la 4ta mejora repetible (Capacidad) no está en QuickUpgrades junto a Suerte/Fuerza/Área
// porque no es una stat de escarbado manual: controla `getQueueMax` (tamaño de la cola de
// automatización). Se puso en AutomationView, al lado de la cola que efectivamente modifica.
//
// AJUSTE: en UIManager.renderTabContent(), si el foco (`document.activeElement`) está en un
// `<textarea>`/`<input>` dentro de `#tab-content`, se salta el re-render. Sin este guard, el tick de
// automatización (que notifica cada 1s) pisaba lo que el jugador estaba escribiendo en el textarea
// de importar guardado de SettingsView. SettingsView además guarda su propio estado (texto
// exportado, texto de import, armado del botón de reset) en variables de módulo en vez de leerlo
// del DOM, para sobrevivir a un re-render disparado por el store mientras la vista sigue montada.
//
// AJUSTE: `pendingDig` (el contenedor comprado y su resultado ya tirado, pendiente de revelar a
// mano) vive fuera del `GameState` persistido — es estado transitorio de sesión, no de partida. Si
// se recarga la página a mitad de un escarbado, se pierde el "espiar en curso" pero no la compra
// (el dinero ya se descontó y el contenedor ya se sumó a `ownedContainers` en `startManualDig`).
```

**Verificación hecha:**
- `node --check` sobre los 16 archivos nuevos de `apps/game/src/**`: todos sin errores de sintaxis.
- `npm test`: engine sigue en **48/48 verde** (no se tocó `packages/engine`).
- Simulación headless del store completo (Node + mock de `localStorage`, sin DOM) contra la data real:
  30 escarbados del tacho gratis → tutorial avanza 0→1, dinero sube; compra de mejora Suerte →
  tutorial 1→2; compra+escarbado de Contenedor de Barrio ($15) → tutorial 2→3; abandonar un dig no
  cambia el dinero; export→import del propio save ida y vuelta ok; import de texto corrupto
  rechazado sin tocar el estado en curso; tick de automatización sin robot no gasta plata; compra de
  Robot Clasificador + ticks de automatización procesan/encolan contenedores; forzar el umbral de
  $1.000.000.000 y prestigiar reparte llaves, sube `prestigeCount` y resetea contenedores/mejoras.
  Los 30 asserts pasaron.
- **Smoke e2e con Playwright/Chromium (agregado a pedido del usuario tras esta fase — ver DECISIÓN
  abajo), `npm run test:e2e`, 2/2 verde:** sirve `apps/game/` por HTTP, navega a `/apps/game/`, chequea
  `#app[data-state="ready"]` y cero errores de consola, saca screenshot a 375px / 1280×800 (Steam Deck)
  / 1440px, y simula un pointer drag en zigzag sobre `.dig-canvas-top` (mouse down/move/up reales,
  no eventos sintéticos) verificando que el juego solo — sin que el test llame `finishManualDig` a
  mano — vuelve al estado `#dig-empty` y que `#money` cambió. Esto valida contra el **DOM y canvas
  reales** lo que la simulación headless de arriba no podía tocar.
  - **Este smoke test encontró un bug real** que la simulación headless no detectaba: en `main.js`,
    `fetch('./data/items.json')` resolvía relativo a la URL del **documento** (`/apps/game/`), no a
    la del módulo (`/apps/game/src/main.js`), pidiendo `/apps/game/data/items.json` (404) en vez de
    `/apps/game/src/data/items.json`. La simulación headless usaba `fs.readFileSync` directo y nunca
    pasaba por `fetch()`, así que no lo veía. Arreglado con `new URL(path, import.meta.url)` (ver
    `// AJUSTE:` en `main.js`). **Esta es la razón de fondo por la que vale la pena mantener este
    smoke test como capa permanente**, no solo como verificación puntual de esta fase.
  - También encontró (por el screenshot a 375px) que el tabbar recortaba "Automatización" a
    "Automatiza" (los `<button>` traen `white-space: nowrap` por defecto del navegador). Arreglado
    en `styles/layout.css`.

**DECISIÓN (Playwright como herramienta permanente, aprobada explícitamente por el usuario):**
```
// DECISIÓN: se agrega @playwright/test (^1.61.x) como devDependency en la raíz, con script
// `test:e2e` SEPARADO de `npm test` (Vitest sigue siendo la suite rápida sin browser para
// packages/engine). Config en playwright.config.js (raíz): levanta `npx serve . -l 5185` como
// webServer y corre apps/game/e2e/smoke.spec.js contra Chromium. Motivo: la simulación headless de
// store.js (sin DOM) no puede detectar bugs de integración DOM/fetch/canvas — y de hecho encontró
// uno real en el primer run (ver arriba). Queda como capa permanente de QA para las Fases 3/4/7
// (DESARROLLO.md §9 ahora documenta 4 capas de red de seguridad en vez de 3). CI: job **separado**
// `e2e` en .github/workflows/ci.yml (instala Chromium con `npx playwright install --with-deps
// chromium` y sube el reporte de Playwright como artifact si falla), no está dentro del job `test`
// para no acoplar la suite rápida de Vitest a tener que instalar un browser.
```

**Qué necesita saber el Agente 3:**
- Quedó **mínimo funcional** (a propósito, PLAN.md dice que esto es Fase 3/4 de ese agente):
  - **Íconos:** `DigCanvas.drawBottomLayer()` dibuja círculos de color + el nombre del ítem en texto
    plano (sin emoji). Cuando exista `apps/game/src/icons/icons.js`, reemplazar ese texto por el
    ícono SVG correspondiente a `item.icon`/`container.icon` (las claves ya están en la data, ver el
    handoff del Agente 1 más arriba). Mismo cambio aplica a las tarjetas de `ShopView`/
    `AutomationView`/`AchievementsView`/`PrestigeView` (hoy son solo texto).
  - **Árbol de prestigio:** `PrestigeView.js` es una grilla plana de tarjetas, no nodos conectados
    visualmente. La lógica de nivel/costo/máximo ya está resuelta vía el engine; falta el layout.
  - **Modal de offline con highlights:** hoy es un solo `Toast` con el monto total y los minutos
    (`UIManager.render()`, bloque `offline`). Falta desglosar por objetos/categorías encontradas
    (el engine no trackea qué ítems específicos generó el offline, solo el monto agregado — si se
    quiere el desglose real habría que decidir si vale la pena simularlo o alcanza con mostrar el
    total, que es lo que hay ahora).
  - **Estados vacío/error explícitos:** cada vista tiene un `empty-state` para cuando la data viene
    vacía (no debería pasar en producción, es defensivo) y `SettingsView` tiene un estado de error
    de import: falta pulir esos mensajes.
- **Puntos de enganche para sonido/partículas/tween (Fase 3, `fx/*`):**
  - `store.actions.finishManualDig()` es el momento exacto de "hallazgo" (pop + partícula + sonido)
    o "trampa" (shake + flash + sonido grave) — hoy solo aplica el resultado al estado, no dispara
    ningún efecto. El `store` no importa nada de `fx/`, así que hay que decidir si el enganche va en
    `UIManager` (leyendo `pending.result.isTrap` antes de llamar a `finishManualDig`) o si el store
    expone el resultado aplicado para que la UI reaccione después.
  - El contador de dinero en `Topbar.render()` hoy hace `textContent = formatMoney(...)` directo, sin
    tween. Es el punto exacto donde engancha `fx/tween.js`.
  - `checkAchievements`/`consumeNewAchievements()` en `UIManager.render()` ya dispara un `Toast` por
    logro nuevo; ahí engancha el "modal corto celebratorio" de PLAN.md §5.2 si se quiere algo más que
    un toast para desbloqueos de categoría.
- El tabbar en `index.html` **no** tiene un botón `data-tab="ajustes"` a propósito: Ajustes se abre
  con el botón de engranaje (`#settings-btn`) del topbar, tal como pide el mockup de PLAN.md §5.1.

**Estado del DoD:**
```
[x] El juego abre servido estático (verificado por HTTP 200, simulación headless del store y el
    smoke e2e de Playwright, que además detectó y disparó el arreglo de un 404 real de fetch()).
[x] El guardado persiste en localStorage; el offline se aplica al iniciar el store.
[x] Ningún botón queda muerto por NaN/Infinity (todas las condiciones de disabled comparan contra
    costos que salen de fórmulas del engine, nunca de cálculo propio).
[x] Cada vista tiene un estado de datos + vacío; loading/error cubiertos a nivel de app (`#app`
    data-state) y en SettingsView (mensaje de error de import).
[x] Grep: la UI no reimplementa fórmulas de economía.
[x] Escarbar funciona con mouse (digInput.js soporta mouse y touch con el mismo código; el smoke
    e2e ejerce la rama de mouse con un pointer drag real). Touch queda cubierto por código pero no
    se probó con un emulador táctil real dentro de este smoke — Agente 3/4 puede sumar un proyecto
    `devices['iPhone ...']` a playwright.config.js si se quiere ese caso automatizado también.
```

---

## Agente 3 (Cerrar los huecos de UI del PLAN)

**Qué hice:**
- `apps/game/src/icons/icons.js`: registro de íconos SVG inline (sin fuentes/paquetes externos,
  originales de este repo — **sin licencia que declarar** en créditos de Steam). Un vocabulario de
  ~65 formas (`SHAPES`) reutilizadas por un `ICON_MAP` que cubre las 103 claves `icon` de la data
  (48 ítems + 8 contenedores + 4 mejoras + 8 automatizaciones + 12 nodos de prestigio + logros) más
  claves genéricas de UI (`settings`, `money`, `keys`, `touch-app`, `tab-*`), con fallback `artifact`
  para cualquier clave no mapeada (nunca una tarjeta sin ícono). `iconMarkup()` da el `<svg>` para
  `innerHTML`; `getIconImage()` da la misma forma como `HTMLImageElement` (data URL) para poder
  dibujarla dentro de un `<canvas>` (`DigCanvas` no puede usar `innerHTML`).
- `apps/game/src/fx/audio.js`: WebAudio puro (osciladores + envolvente, sin archivos de audio que
  licenciar). `playFindPop(rarityIndex)` (más brillante en rarezas altas), `playTrapThud()` (grave y
  suave, nunca alarma — PLAN.md §5.2), `playCelebration()`. `setEnabled(state.soundOn)` se sincroniza
  en cada `render()` de `UIManager`, así el toggle de Settings silencia todo de verdad.
- `apps/game/src/fx/tween.js`: `tweenNumberText(el, toValue, formatFn)` interpola el número mostrado
  en 300-500ms (easing cúbico) y además retriggerea la clase `is-rolling` (`@keyframes counter-roll`,
  el efecto de "rodillo" del mockup `main_game`). Cablé el contador de dinero y llaves del Topbar acá
  (antes hacían `textContent =` directo).
- `apps/game/src/fx/particles.js`: `triggerRarityGlow` (franja de blur de color debajo de la tarjeta,
  como pide el mockup `main_game` — no confeti), `spawnFindPop` (pop chico con partícula de color de
  rareza) y `triggerTrapShake` (shake+flash rojo tenue, aplicado a `#app` completo porque PLAN.md
  §5.2 dice "shake breve **de la pantalla**", no solo del canvas).
- `apps/game/src/dig/DigCanvas.js`: agregué el estado "antes de tocar" (`.dig-idle-prompt`: ícono
  `touch-app` + anillo pulsante `.dig-idle-ring` + "Arrastrá para escarbar"), que se oculta en el
  primer gesto (`markTouched()`, enganchado en `onStart` de `digInput.js`) y se re-muestra en cada
  `start()` nuevo. `drawBottomLayer` ahora dibuja el ícono real de cada ítem (`getIconImage`) sobre
  un círculo del color de rareza (`resolveCssColor` lee la variable CSS `--r-*` real, no un hex fijo),
  en vez de solo texto. Recibe `rarities` como tercer parámetro del constructor (antes solo tenía
  `host`/`callbacks`).
- `apps/game/src/ui/PrestigeView.js`: reescrita para árbol de nodos conectados. **DECISIÓN:**
  `prestigeTree.json` no define dependencias reales (cualquier nodo se compra en cualquier orden si
  hay Llaves), así que el "árbol" es una agrupación **visual** en 5 ramas temáticas desde una raíz
  común (`capitalInicial`) — mapa estático `TREE_LAYOUT` en el archivo, puramente de presentación, no
  toca la economía ni gatea compras. Grid con `--branch`/`--depth` (CSS vars) + conectores `::before`,
  con fallback a lista simple en mobile (`< 700px`, ver AJUSTE de CSS abajo).
- `apps/game/src/ui/OfflineModal.js`: modal no bloqueante con highlights. El engine no trackea qué
  ítems específicos generó el offline (solo el monto agregado — ver handoff del Agente 2), así que
  el highlight usa la función pública `bestAffordableUnlockedContainer` del engine (sin reimplementar
  economía) para mostrar íconos de las categorías de las que "probablemente" vinieron los objetos,
  con el monto total tweened.
- `apps/game/src/ui/CategoryUnlockModal.js`: modal celebratorio corto (auto-cierra a los 3s o con
  tap). El engine no emite un evento de "categoría desbloqueada"; se infiere de los logros
  `categoryFoundAtLeast` (`a14`-`a19` en `achievements.json` — encontrar el primer objeto de una
  categoría nueva es, en los hechos, desbloquearla). `UIManager` separa esos IDs del resto de logros
  (que siguen yendo por `Toast`).
- `apps/game/src/ui/UIManager.js`: cablea todo lo de arriba. `handleDigComplete()` lee
  `store.getPendingDig()` **antes** de llamar `finishManualDig()` (que lo descarta) para poder
  disparar sonido/partícula/glow con el resultado real (trampa vs. rareza más alta de los ítems).
  Inyecta íconos en el tabbar una sola vez (`injectTabIcons`).
- `Topbar.js`/`QuickUpgrades.js`/`ShopView.js`/`AutomationView.js`/`AchievementsView.js`: íconos
  agregados (dinero/llaves/ajustes en el topbar, ícono por mejora rápida usando el campo `icon` que
  ya traía `upgrades.json`, ícono por tarjeta de contenedor/automatización/logro).
- `styles/tokens.css`: agregué los 8 tokens de rareza `--r-common`…`--r-future` (PLAN.md §2.5/§5.3)
  que el Agente 1 dejó como `colorToken` en `items.json` pero nadie había definido en CSS todavía —
  hacían falta para que el glow/color de ítems en canvas funcionen. Tono exacto es ajuste del Agente 4.
- `styles/components.css`/`layout.css`: clases nuevas para todo lo de arriba (`.icon`, `.sr-only`,
  `#dig-rarity-glow`+`.is-glowing`, `.find-pop`, `.dig-idle-prompt`+`.dig-idle-ring`,
  `.is-rolling`/`@keyframes counter-roll`, `#app.is-shaking`+`@keyframes trap-shake/trap-flash`,
  `.modal-overlay`/`.modal-card`, `.prestige-tree` grid+breakpoint). Es CSS **funcional**, no el
  pulido final (bordes extruidos, gauges recesados, texturas, bloom) — eso es Fase 4.

**Decisiones (`// DECISIÓN:` / `// AJUSTE:` en el código, resumidas acá):**
```
// DECISIÓN: los íconos son SVG inline generados por icons.js a partir de un vocabulario chico de
// formas reutilizadas (no una ilustración bespoke por cada una de las 103 claves) — cubre el
// requisito funcional de "cero emojis, cada clave con símbolo reconocible" en el tiempo de esta
// fase; el afinado de trazo/proporción final es del Agente 4 (así lo dice el prompt del Agente 3,
// tarea 10: "el pulido fino de forma/color... es del Agente 4").
//
// DECISIÓN: el árbol de prestigio es una agrupación visual en 5 ramas (TREE_LAYOUT en
// PrestigeView.js), no dependencias reales del engine — prestigeTree.json no las tiene y no se
// tocó el engine en esta fase (fuera de alcance del Agente 3).
//
// AJUSTE: encontré el mismo bug de especificidad `[hidden]` vs. clase con `display` que el Agente 2
// ya había resuelto para `.dig-state` (ver su handoff) — mi `.dig-idle-prompt { display:flex }`
// pisaba el `display:none` de `[hidden]` de la hoja de estilos del user-agent. Mismo arreglo:
// agregar `.dig-idle-prompt[hidden] { display:none }` explícito. Lo until encontré con Playwright
// (screenshot manual), no con el smoke test existente (no cubre ese estado) — quedó documentado en
// el código para que no se repita en el próximo componente que use `hidden`.
//
// AJUSTE: `.prestige-tree` es una lista simple (flex column) por debajo de 700px y recién ahí pasa
// a la grilla de 5 ramas con conectores — la grilla de escritorio pisaba el layout mobile-first en
// una pantalla de 420px (probado con Playwright a 420×900). CLAUDE.md exige mobile-first sin
// excepción, así que no podía dejar la grilla de 5 columnas fija.
//
// AJUSTE: el shake+flash de trampa se aplica a `#app` completo (toda la pantalla), no solo al área
// de escarbado, porque PLAN.md §5.2 dice literalmente "vibración visual (shake) breve de la
// pantalla" — no del canvas.
```

**Assets de sonido/íconos y licencia (para créditos de Steam):**
- **Íconos:** 100% SVG inline generados por código en `icons/icons.js`, sin ninguna librería ni
  fuente de íconos de terceros (no Material Symbols, no Font Awesome). Son originales de este repo:
  **no requieren atribución ni licencia en los créditos de Steam.**
- **Sonido:** 100% sintetizado con la Web Audio API (osciladores + envolventes), sin ningún archivo
  de audio (`.mp3`/`.wav`/etc.) ni librería. **No requieren atribución ni licencia.**

**Verificado:**
- `npm test`: engine sigue en **48/48 verde** (no se tocó `packages/engine`).
- `npm run test:e2e`: **2/2 verde** (cero errores de consola, los 3 anchos de referencia, y el
  pointer drag real completa el escarbado y suma dinero — sigue pasando con todos los cambios de
  íconos/fx encima).
- `node --check` sobre los 14 archivos nuevos/tocados de `apps/game/src/**`: todos sin errores.
- Verificación visual manual con Playwright (script descartable, no quedó en el repo): screenshots a
  420×900 de las 5 pestañas + Ajustes + estado idle del canvas + escarbado en progreso, revisadas una
  por una. Encontró y permitió arreglar el bug de `.dig-idle-prompt[hidden]` de arriba.
- `grep` de emojis (rango Unicode `\x{1F300}-\x{1FAFF}` y `\x{2600}-\x{27BF}`) sobre todo
  `apps/game/`: **0 resultados**. `grep` de `console.log` y `// TODO` sobre `apps/game/src`: **0
  resultados**.

**Qué necesita saber el Agente 4:**
- Todo lo de esta fase es **funcional, no pulido**: los componentes están listos para recibir los
  tokens/estilos de PLAN.md §5.3 sin volver a tocar JS, en general.
- Clases ya preparadas y esperando el pulido visual (mencionadas en el prompt del Agente 3, tarea 10):
  `.dig-idle-ring` (el anillo pulsante hoy es un círculo con borde simple + `@keyframes
  idle-ring-pulse`; el mockup lo pide con blur/glow más marcado), `.is-rolling`/`counter-roll` (hoy
  es un fade+translateY genérico, el mockup pide algo más marcado), `#dig-rarity-glow` (hoy es un
  blur chico fijo, falta el "bloom" real de PLAN.md §5.3).
- **Íconos:** si en Fase 4 se decide reemplazar el vocabulario geométrico de `icons/icons.js` por
  ilustraciones más elaboradas (o por Material Symbols reales), el único archivo a tocar es
  `icons/icons.js` (`SHAPES`/`ICON_MAP`) — ninguna vista importa formas SVG directo, todas pasan por
  `iconMarkup()`/`getIconImage()`.
- **Layout de escritorio con sidebar (DESARROLLO.md §6):** no lo toqué — sigue siendo tabbar inferior
  en todos los anchos salvo el breakpoint puntual que agregué en `.prestige-tree` (700px, solo para
  que la grilla de 5 ramas no rompiera en mobile). La reconstrucción real de `layout.css` con
  sidebar(s) en `>= md` es 100% de la Fase 4, como ya aclaraba el handoff del Agente 2.
- **Texturas/fondo/tarjetas extruidas** del catálogo de `main_game` (grilla industrial, textura
  metálica, `scavenge-card` con sombra interior + etiqueta flotante, tabbar con pastilla hundida,
  botones "extruidos" de mejoras rápidas): nada de esto se tocó, sigue 100% pendiente para Fase 4.
- Los 8 tokens `--r-*` que agregué a `tokens.css` son colores provisorios (elegí una progresión
  perceptualmente creciente común→futurista); el tono final/bloom es criterio del Agente 4.
- No toqué `packages/engine` ni `apps/game/src/store.js`/`loop.js`/`main.js` — fuera de alcance de
  esta fase.

**Estado del DoD:**
```
[x] Suena el pop al hallar y el grave suave en trampa; el toggle de Settings silencia todo.
[x] Partícula/glow por rareza en finishDig; el dinero (y las llaves) se animan con tween, nunca saltan.
[x] Cero emojis como íconos en data ni en UI (grep verificado, 0 resultados).
[x] Árbol de prestigio con nodos conectados (agrupación visual en 5 ramas) y preview de llaves.
[x] Modal de offline con highlights (íconos de categoría + monto tweened), no bloqueante.
[x] Estados vacío/error explícitos en las vistas (ya existían en su mayoría desde la Fase 2; no
    encontré vistas con estados implícitos que necesitaran agregarse en esta pasada).
```

---

## Agente 4 (Pulido visual — fusión ámbar + Stitch)

**Qué hice:**
- `styles/tokens.css`: reescrito completo. Sumé `--bg-surface-highest` (pastillas/tarjetas),
  `--amber-dark` (sombra de extrusión), `--outline`, radios `--radius-lg/xl/full`, `--space-5`,
  `--container-max`, sombras reutilizables (`--shadow-extrude`, `--shadow-extrude-pressed`,
  `--shadow-recessed`, `--shadow-card`, `--shadow-pressed-pill`), `--hazard-stripe`, y un tono de
  "glow" por rareza (`--r-*-glow`) además del color base ya definido por el Agente 3. Variables de
  tipografía `--font-display` (Fredoka), `--font-body` (Nunito), `--font-mono` (JetBrains Mono).
- `styles/components.css`: botones extruidos (`box-shadow` inferior sólida + se hunden al
  `:active`), pastillas de stat (`.stat-pill`, dinero/llaves del topbar), botón de ajustes y demás
  íconos circulares (`.icon-btn-circle`), gauge recesado con relleno rayado hazard en
  `#dig-progress-fill`, tarjetas con textura sutil de metal gastado (`repeating-linear-gradient`
  a 5-10% vía `background-image` combinado), mejoras rápidas como botones extruidos con ícono en
  círculo (`.quick-upgrade-icon-circle`), tabbar con pestaña activa en pastilla + sombra hundida,
  `.scavenge-card` (esquinas muy redondeadas, sombra interior + gradiente, `.scavenge-card-label`
  como pestaña flotante pegada al borde superior) y `.scavenge-card-metal-texture` (7% opacidad,
  clip propio con `border-radius:inherit; overflow:hidden` para no salirse de las esquinas).
- `styles/layout.css`: fondo con grilla industrial sutil en `body` (dos `linear-gradient`
  cruzados al 5%, celda 20×20px). **Reconstruí `.game-shell` a una grilla de tres columnas en
  `>= 1024px`** (`grid-template-areas`: topbar arriba spanneada, `nav` = el mismo `<nav
  id="tabbar">` reestilizado vertical y con `position: sticky`, `dig` = área de escarbado
  centrada, `quick` = `#quick-upgrades` reestilizado como panel vertical fijo a la derecha, y
  `tabcontent` debajo del área de escarbado en la misma columna central). Mobile (`< 1024px`)
  sigue siendo el tabbar inferior del Agente 2, sin tocarlo estructuralmente — solo estilo.
- `apps/game/src/dig/DigCanvas.js`: agregué una textura tipo fibra de carbono a la capa de
  suciedad (`getDirtTexture()`, un patrón procedural 16×16 dibujado con `createPattern`, sin
  imágenes externas) — se pinta **dentro del propio canvas**, no como capa CSS aparte, porque
  tiene que desaparecer junto con el resto de la capa al escarbar (`destination-out`).
- `apps/game/src/ui/QuickUpgrades.js`: el ícono de cada mejora rápida ahora va envuelto en
  `.quick-upgrade-icon-circle` (círculo de color) y el nivel se fusionó con el label
  (`SUERTE · LV. 3`) en vez de un `(3)` aparte, más cerca del mockup.
- `apps/game/index.html`: agregué el `<link>` de Google Fonts (Fredoka/Nunito/JetBrains Mono),
  `.brand` ("DUMPSTER EMPIRE", solo visible en `>= 1024px`), envolví los stats del topbar en
  `.topbar-stats`, clases `.stat-pill`/`.icon-btn-circle` en los elementos existentes (mismos
  ids, sin romper ningún `querySelector` de `Topbar.js`/`UIManager.js`), y reestructuré
  `#dig-active` con el wrapper `.scavenge-card` (título pasó de `<h2>` a un `<span
  class="scavenge-card-label">` posicionado como pestaña flotante).

**Bug real encontrado y arreglado (no cosmético) — el smoke e2e lo detectó:**
```
// AJUSTE: `erase()` en DigCanvas.js reusaba el `fillStyle` que hubiera quedado de la última
// `drawTopLayer()`. Al meterle ahí un patrón semitransparente (0.05-0.18 de alpha) para la
// textura de fibra de carbono, el `destination-out` del escarbado dejó de borrar del todo cada
// píxel (solo quitaba una fracción del alpha proporcional al alpha del patrón) — el progreso de
// escarbado nunca pasaba de un par de puntos porcentuales por más que se arrastrara sobre todo
// el canvas. `erase()` ahora fija `ctx.fillStyle = '#000'` explícitamente antes de dibujar el
// círculo de borrado (el color es irrelevante para `destination-out`, solo importa el alpha).
// Encontrado con `npm run test:e2e` (el segundo test, el del pointer drag real) — la simulación
// headless de Fases anteriores no lo hubiera visto porque no ejecuta el canvas real.
```
También encontré y arreglé un segundo bug de mi propia introducción: `.scavenge-card` con
`overflow: hidden` recortaba a la mitad la pestaña flotante del título (que a propósito pincha
por encima del borde de la tarjeta). Saqué el `overflow:hidden` de la tarjeta y se lo puse solo
a `.scavenge-card-metal-texture` (con `border-radius: inherit`) para que la textura no se salga
de las esquinas redondeadas sin recortar la pestaña. Y un tercero: el tooltip del tutorial
(`#tutorial-overlay`) tapaba parte del canvas de escarbado al subir el canvas de posición (por
sacarle el alto de bloque al viejo `<h2>` del título) — le puse `pointer-events: none` al overlay
y `pointer-events: auto` solo a su botón, para que el arrastre pase a través del texto.

**Decisión de fuentes (para créditos de Steam):**
```
// DECISIÓN: Fredoka/Nunito/JetBrains Mono se cargan vía Google Fonts (<link> en index.html), las
// tres bajo licencia SIL Open Font License — no exigen atribución obligatoria en los créditos,
// aunque es buena práctica mencionarlas. Elegí no auto-hospedarlas para no meter un paso de build
// en apps/game (CLAUDE.md prohíbe bundler para el juego).
// RIESGO PARA EL AGENTE 6: el build de Electron corre offline en Steam Deck/desktop — hay que
// descargar los .woff2 reales a apps/game/assets/fonts/, reemplazar el <link> por @font-face
// local, y actualizar la licencia en los créditos de Steam (OFL, ver arriba) antes de empaquetar.
// Documentado también como comentario inline en index.html.
```

**Verificado a los 3 anchos de referencia (`npm run test:e2e`, capturas en
`apps/game/e2e/.results/screenshots/`):**
- **375px (mobile):** tabbar inferior con pestaña activa en pastilla ámbar + sombra hundida,
  mejoras rápidas en fila con ícono circular, tarjetas con textura de metal sutil.
- **1280×800 (Steam Deck):** layout de escritorio de tres columnas ya activo (`>= 1024px`):
  sidebar de navegación a la izquierda, escarbado centrado, mejoras rápidas a la derecha, grilla
  industrial de fondo visible.
- **1440px (desktop):** igual que Steam Deck con más aire; `.brand` visible en el topbar.
- `npm test`: engine sigue **48/48 verde** (no toqué `packages/engine`).
- `npm run test:e2e`: **2/2 verde** tras el arreglo del bug de `erase()`.
- `grep` de hex/colores sueltos fuera de `tokens.css` en `styles/`/`index.html`/`src/ui`/`src/dig`:
  0 resultados (el único que apareció, un `#fff` en la textura de metal, se reemplazó por
  `var(--fg-0)`). `grep` de `console.log`/`// TODO` en `apps/game/src`: 0 resultados.

**Qué necesita saber el Agente 5:**
- La UI está lista para el pase de balance: ningún cambio de esta fase tocó `packages/engine`,
  `store.js` ni las fórmulas — solo CSS, `index.html` y ajustes puntuales de markup/JS de
  presentación en `apps/game/src/ui/QuickUpgrades.js` y `apps/game/src/dig/DigCanvas.js`.
- El layout de escritorio con sidebar es nuevo (antes no existía, era tabbar inferior a cualquier
  ancho) — si el Agente 5 corre capturas o smoke tests a 1280×800/1440px va a ver una disposición
  distinta a los handoffs de Fases 2/3, es intencional (DESARROLLO.md §6/§7 Fase 4).
- Pendiente para el Agente 6 (Steam): auto-hospedar las 3 fuentes (ver DECISIÓN arriba) y sumar la
  atribución OFL a la pantalla de créditos.

**Estado del DoD:**
```
[x] Todos los tokens en tokens.css; grep de colores/hex sueltos fuera de tokens ≈ 0.
[x] Botones extruidos, gauges recesados y bloom de rareza (glow bajo la tarjeta + find-pop)
    aplicados según §5.3.
[x] Tipografía Fredoka/Nunito/JetBrains Mono en su rol correcto (vía Google Fonts, ver DECISIÓN).
[x] Layout correcto en 375px, 1280×800 (Steam Deck) y 1440px, sin texto desbordado con números
    grandes (verificado con capturas de Playwright).
[x] Desktop (>= 1024px) usa el layout de sidebar de tres columnas de los mockups Stitch, no el
    tabbar móvil escalado a un ancho mayor.
[x] Identidad coherente en todas las vistas (Tienda/Automatización/Logros/Prestigio verificadas
    con captura a 1440px).
```
