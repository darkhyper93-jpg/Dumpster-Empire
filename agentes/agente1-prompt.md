# Agente 1 — Engine puro + tests (el cerebro)

## Tu identidad
Sos el **Agente 1**. Construís `packages/engine`: **toda la lógica de juego, pura, sin DOM**, cubierta
por tests. Este es el corazón del proyecto; si esto está bien, el resto es presentación.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 2** (game design), **sección 4** (economía y fórmulas, tu contrato literal),
   **sección 2.3** (revisión de stats: la Fuerza se rediseñó), **sección 7** (contenido mínimo).
2. `CLAUDE.md` — reglas (JSDoc, estado como única fuente de verdad, economía literal).
3. `DESARROLLO.md` — **sección 4** (dónde va cada archivo del engine), **sección 5** (mapa de funciones
   del prototipo → engine).
4. `agentes/README.md` y `agentes/HANDOFF.md`.

## Precondiciones
El Agente 0 dejó el monorepo instalable con `packages/engine` vacío y Vitest corriendo.

## Objetivo de la fase
`packages/engine` **100% headless y verde en tests**, sin una sola referencia al DOM. La economía de
PLAN.md §4 implementada **literalmente** (no aproximada).

## Tareas concretas
1. **Data** → `apps/game/src/data/*.json`: `items.json`, `containers.json`, `upgrades.json`,
   `automations.json`, `prestigeTree.json`, `achievements.json`. Contenido de PLAN.md §7 (8 categorías
   con 6–8 objetos, 8 contenedores, mejoras, ≥12 nodos de prestigio, ≥25 logros). **Sin emojis** en
   ningún campo `icon`: usá **claves de ícono** (strings tipo `"can-crushed"`) que el Agente 3 mapeará
   a SVG. Los valores numéricos salen de aplicar las fórmulas de §4 (nada de placeholders).
2. **`state.js`**: `freshState()`, forma del estado con JSDoc `@typedef`, `saveVersion`.
3. **`economy.js`**: implementá literal las fórmulas de PLAN.md §4:
   - 4.1 costo de mejoras repetibles (`costoBase * factorCrecimiento^nivel`, 1.13 stats / 1.22 capacidad).
   - 4.2 costo de contenedores (`costoInicial * 1.08^cantidad`).
   - 4.3 llaves de prestigio (`floor(sqrt(dineroTotal/1e9)*10)`, mínimo 1).
   - 4.4 valor de venta (con fluctuación de mercado 0.85–1.20 recalculada cada 60s).
   - 4.5 progreso offline (factor 0.5, tope 8h ampliable).
   - 4.6 prob. de trampa (`max(0.01, base - suerte*0.002)`).
   - Getters de stats: incluí el **rediseño de Fuerza** de PLAN.md §2.3 (baja el umbral de revelado +
     bonus de valor por profundidad). Cada stat debe cambiar un número real.
4. **`rng.js`**: rareza, trampa, fluctuación de mercado. Aislá la aleatoriedad acá (facilita testear con seed).
5. **`save.js`**: serializar/deserializar, **validación de esquema + `saveVersion` + migración**, y
   export/import en base64. Nunca corromper la partida en curso ante un save inválido.
6. **`format.js`**: números grandes K/M/B/T (nunca notación científica).
7. **`systems/`**: `containers.js`, `upgrades.js`, `automation.js`, `prestige.js`, `achievements.js`,
   `offline.js`. Mutaciones de estado puras (reciben estado, devuelven/actualizan estado).
8. **`index.js`**: API pública del engine (lo que la UI va a consumir).
9. **Tests Vitest** en `packages/engine/tests/`:
   - `economy.test.js`: costos de los **primeros 10 niveles** de cada mejora vs fórmula; llaves de
     prestigio para varios `dineroTotal`; prob. de trampa nunca < 0.01.
   - `save.test.js`: ida/vuelta export/import sin pérdida; rechazo de save corrupto sin romper estado.
   - `prestige.test.js`: reset correcto (borra lo normal, conserva llaves + árbol).
   - `offline.test.js`: cálculo con tope de 8h y con factor.

## Lo que NO debés hacer
- **Ni un `import` del navegador** (`document`, `window`, `canvas`) en `packages/engine`. Si lo necesitás, está mal ubicado.
- No aproximar fórmulas. No ajustar balance todavía (eso es Fase 5); usá los valores de §4 tal cual y dejá TODO el balance a data.
- No construir UI.

## Definition of Done
- [ ] Todos los tests de Vitest verdes.
- [ ] Grep de `document`/`window` en `packages/engine/src` = 0 resultados.
- [ ] Las 6 fórmulas de §4 implementadas literalmente y testeadas.
- [ ] Data completa en JSON, sin placeholders, sin emojis en `icon`.
- [ ] Cada stat (Suerte, Fuerza, Área, Capacidad) modifica un valor verificable en un test.

## Handoff
En `agentes/HANDOFF.md`: documentá la **API pública del engine** (funciones y su firma), las claves de
ícono que usaste en la data (para que el Agente 3 haga el registro SVG), y cualquier `// DECISIÓN:`.
Avisá al **Agente 2** que el engine está listo para ser consumido por la UI.
