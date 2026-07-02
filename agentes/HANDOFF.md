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
| 2 Juego jugable | 2 | ⬜ pendiente |
| 3 Huecos de UI | 3 | ⬜ pendiente |
| 4 Pulido visual | 4 | ⬜ pendiente |
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
