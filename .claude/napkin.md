# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-07-02] `save.js` only checked top-level `typeof` on save fields, not content**
   `REQUIRED_FIELDS` verified e.g. `itemsFoundByItem: 'object'` but never that the values inside
   were finite numbers — a manipulated/imported save could smuggle a string (incl. HTML) into any
   `id -> number` map or nested map and pass validation.
   Do instead: when adding a new persisted field to `GameState` (`packages/engine/src/state.js`),
   also add a content-level check to `validateDeepContent()` in `packages/engine/src/save.js` —
   numeric maps must be `Number.isFinite` per value, boolean maps `typeof === 'boolean'`, arrays
   must have their element shape checked, not just `Array.isArray`. Top-level `typeof` alone is not
   enough for any field the UI will later interpolate.

## Domain Behavior Guardrails
1. **[2026-07-04] Media query de viewport para paneles que viven en contenedores angostos**
   `.prestige-tree` activaba su grilla de 782px con `@media (min-width: 700px)`, pero en desktop
   su panel (`#tab-content`) es un sidebar de 320px → contenido clipeado + "hueco" fantasma.
   Do instead: si un componente vive dentro de un panel cuyo ancho NO sigue al viewport (sidebar,
   columna de grid), su breakpoint va por `@container` (el panel declara
   `container-type: inline-size`), nunca por `@media`. Verificar midiendo el rect del panel.
2. **[2026-07-04] `destination-out` con alpha parcial deja mugre semi-transparente**
   Escalar la "lentitud" de escarbado con `globalAlpha < 1` sobre `destination-out` produce capas
   fantasma (el objeto transluce y la textura queda como damero de transparencia); además el
   muestreo por umbral de alpha clasifica mal esos píxeles. Do instead: el borrado del canvas de
   escarbado es SIEMPRE alpha 1; la dificultad/ritmo se expresa solo con el radio del pincel (y
   cualquier compuerta anti-anomalía se calcula proporcional al pincel, no con px fijos).
3. **[2026-07-04] Plus Jakarta Sans bold a tamaño chico rompe la 'i' en Windows**
   Con weight ≥600 y font-size ≤14.4px la rasterización fusiona el punto de la 'i' con el asta
   ("PrestIgIo"). Do instead: para labels chicos usar weight ≤500 o font-size ≥15.2px; probar con
   una matriz de render (screenshot con zoom), `text-rendering` NO lo arregla.
4. **[2026-07-04] Ids internos de data mostrados crudos al jugador (UI en inglés/kebab-case)**
   `ShopView.js` interpolaba `c.categorias.join(', ')` y el jugador veía "Categorías: common" —
   los ids de `data/*.json` (`common`, `reusable`, `robotClasificador`…) NO son copy de UI; todos
   tienen un campo `name` de display en la propia data. Pasó 3 rondas de playtest sin que nadie
   lo notara porque los tests no miran strings de UI.
   Do instead: toda vez que una vista interpole un id de data (categoría, contenedor, upgrade,
   nodo), resolverlo contra su entrada de data y mostrar `.name`; el id solo va en atributos
   (`data-*`). Al revisar una vista nueva, grep rápido de `\.join\(|\.id}` en el template.
2. **[2026-07-02] `state`-derived values interpolated into `innerHTML` via `|| 0` are an XSS vector**
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
