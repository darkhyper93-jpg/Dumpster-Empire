# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-07-02, ampliado 2026-07-09] `typeof` solo NUNCA alcanza para validar un save**
   Dos rondas de la misma clase de bug: (a) `REQUIRED_FIELDS` validaba `itemsFoundByItem: 'object'`
   sin mirar el contenido (string/HTML colable en mapas `id -> number`); (b) `typeof NaN ===
   'number'` — `money: NaN` / `lastSavedAt: Infinity` pasaban y brickeaban la partida; y un slot
   de `autoProcessing` con `totalTime: 0` pasaba la finitud pero daba "NaN%" en la UI (división
   por cero). Desde la auditoría post-ronda 14 el loop de `validateSave` exige `Number.isFinite`
   en TODO campo `number` top-level (los nuevos quedan cubiertos gratis).
   Do instead: al agregar un campo persistido a `GameState`, el `typeof` de `REQUIRED_FIELDS` +
   finitud genérica ya están; lo que sigue faltando siempre es el chequeo de CONTENIDO en
   `validateDeepContent()` — mapas numéricos `Number.isFinite` por valor, arrays con forma de
   elemento verificada, y COHERENCIA entre campos (rangos, `remaining <= totalTime`, allow-lists).
   Preguntarse: "¿qué valor pasa el typeof pero rompe la UI o la economía?" y validarlo.
2. **[2026-07-08] Assertar `.toast` sin filtrar es un strict-mode violation latente (solo en CI)**
   El primer escarbado de una partida sembrada dispara además toasts de logros ("Primeros
   Pasos", "Primer Objeto"): hasta 3 `.toast` conviven. Local pasa por timing (los de logros ya
   expiraron); el runner de CI, más lento, falla siempre — el bug apareció recién en el PR de
   ronda 9. Do instead: toda assertion sobre toasts usa
   `page.locator('.toast').filter({ hasText: ... })`, nunca `.toast` pelado; y cualquier
   strict-mode violation vista en un script de verificación manual se traslada al spec en el
   momento (en ronda 9 lo vi en el drive manual y no lo apliqué al e2e).

## Domain Behavior Guardrails
1. **[2026-07-07] El completado de un canvas interactivo NUNCA se deriva de leer sus píxeles**
   Cuatro rondas de bugs del escarbado (umbral por % de área + compuerta de distancia +
   reparación de anomalía) venían de tratar el buffer del canvas como estado: un backing store
   descartado por el compositor (Electron) autocompletaba o destapaba solo, y cada parche agregó
   otra compuerta frágil. Do instead: el estado vive en un modelo puro en JS
   (`apps/game/src/dig/digRevealModel.js`); el canvas solo PINTA lo que dice el modelo y se
   repinta entero desde él en `focus`/`visibilitychange`. `getImageData` queda solo para asserts
   de tests, jamás para lógica de juego.
2. **[2026-07-07] Un SVG en data-URL de `<img>` exige `xmlns` (falla en silencio sin él)**
   `getIconImage` generaba SVGs sin `xmlns`: válidos vía innerHTML (parser HTML) pero rotos como
   documento standalone — `error` silencioso, `naturalWidth 0`, y `img.complete === true` aunque
   esté rota (`drawImage` lanza InvalidStateError). Estuvo latente desde el origen del proyecto.
   Do instead: todo `iconMarkup`/SVG que pueda terminar en un data-URL lleva
   `xmlns="http://www.w3.org/2000/svg"`; antes de `drawImage`, chequear
   `img.complete && img.naturalWidth > 0`, nunca `complete` solo.
3. **[2026-07-07] Marca "bind-once" genérica sobre un contenedor COMPARTIDO roba el listener**
   Las vistas de `#tab-content` (Índice/Automatización/Prestigio) usaban todas
   `if (!container.dataset.boundClick)` sobre el MISMO elemento: la primera vista visitada
   marcaba y las demás nunca bindeaban su delegación (los tabs del Índice no respondían; el bug
   dependía del orden de navegación del jugador, invisible para tests que visitan una sola vista).
   Do instead: si varias vistas comparten el host, la marca de bind lleva el nombre de la vista
   (`boundClickIndex`, …). Al revisar una vista nueva: grep de `boundClick` y verificar que el
   host no sea compartido; el e2e debe navegar Automatización→Índice y el orden inverso.
4. **[2026-07-04] Media query de viewport para paneles que viven en contenedores angostos**
   `.prestige-tree` activaba su grilla de 782px con `@media (min-width: 700px)`, pero en desktop
   su panel (`#tab-content`) es un sidebar de 320px → contenido clipeado + "hueco" fantasma.
   Do instead: si un componente vive dentro de un panel cuyo ancho NO sigue al viewport (sidebar,
   columna de grid), su breakpoint va por `@container` (el panel declara
   `container-type: inline-size`), nunca por `@media`. Verificar midiendo el rect del panel.
5. **[2026-07-04] `destination-out` con alpha parcial deja mugre semi-transparente**
   Escalar la "lentitud" de escarbado con `globalAlpha < 1` sobre `destination-out` produce capas
   fantasma (el objeto transluce y la textura queda como damero de transparencia); además el
   muestreo por umbral de alpha clasifica mal esos píxeles. Do instead: el borrado del canvas de
   escarbado es SIEMPRE alpha 1; la dificultad/ritmo se expresa solo con el radio del pincel.
6. **[2026-07-04] Plus Jakarta Sans bold a tamaño chico rompe la 'i' en Windows**
   Con weight ≥600 y font-size ≤14.4px la rasterización fusiona el punto de la 'i' con el asta
   ("PrestIgIo"). Do instead: para labels chicos usar weight ≤500 o font-size ≥15.2px; probar con
   una matriz de render (screenshot con zoom), `text-rendering` NO lo arregla.
7. **[2026-07-04] Ids internos de data mostrados crudos al jugador (UI en inglés/kebab-case)**
   `ShopView.js` interpolaba `c.categorias.join(', ')` y el jugador veía "Categorías: common" —
   los ids de `data/*.json` (`common`, `reusable`, `robotClasificador`…) NO son copy de UI; todos
   tienen un campo `name` de display en la propia data. Pasó 3 rondas de playtest sin que nadie
   lo notara porque los tests no miran strings de UI.
   Do instead: toda vez que una vista interpole un id de data (categoría, contenedor, upgrade,
   nodo), resolverlo contra su entrada de data y mostrar `.name`; el id solo va en atributos
   (`data-*`). Al revisar una vista nueva, grep rápido de `\.join\(|\.id}` en el template.
8. **[2026-07-02] `state`-derived values interpolated into `innerHTML` via `|| 0` are an XSS vector**
   `const x = state.someMap[id] || 0;` followed by `` `${x}` `` inside an `innerHTML` template does
   NOT coerce to a number — `|| 0` only replaces falsy values, so a non-empty malicious string
   survives and gets injected raw (found live in `CollectionView.js`, `PrestigeView.js`,
   `ShopView.js`, `AutomationView.js`, fixed in `fix/xss-save-collection`).
   Do instead: any numeric value read from `state` and interpolated into an `innerHTML` template
   must be `Number(x) || 0`, not `x || 0`. Any free-string value from `state` (like an id inside an
   array/object field, e.g. `autoProcessing[].containerId`) must be resolved against a known/static
   allow-list (e.g. `allContainers.find(...)`) before interpolation, never shown raw. Validation in
   `save.js` covers *type*, not HTML-safety — the UI sink still needs its own coercion/allow-list as
   defense in depth.

## User Directives
1. **[2026-07-02] Security fixes go through the CLAUDE.md engine/UI boundary too**
   Do instead: even a security-only fix (`agentes/*.md` one-off prompts) still respects
   engine-does-validation / UI-does-defense-in-depth split, gets a Vitest regression test, and gets
   documented in `agentes/HANDOFF.md` under its own section — not folded into an unrelated phase's
   block.
