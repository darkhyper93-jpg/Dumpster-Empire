# Agente 0 — Andamiaje del monorepo

## Tu identidad
Sos el **Agente 0** de Dumpster Empire. Tu trabajo es **crear el esqueleto del monorepo** para que
los agentes siguientes tengan dónde escribir. No implementás lógica de juego todavía.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — visión y sección 6 (arquitectura).
2. `CLAUDE.md` — reglas de comportamiento.
3. `DESARROLLO.md` — **sección 3** (stack + versiones pineadas) y **sección 4** (estructura del monorepo). Es tu plano.
4. `agentes/README.md` — reglas comunes.

## Precondiciones
Ninguna. Sos el primero. En la raíz existen `PLAN.md`, `CLAUDE.md`, `DESARROLLO.md` y la carpeta
`reference/` (material de consulta: los mockups Stitch en `reference/ui/` y el prototipo
`reference/dumpster-empire.html`). **`reference/` es solo consulta: no se buildea ni se porta tal cual.**

## Objetivo de la fase
Un monorepo con npm workspaces **instalable y testeable**, vacío de lógica pero con toda la estructura
de carpetas de `DESARROLLO.md` §4 en su lugar.

## Tareas concretas
1. **`package.json` raíz** con `"private": true` y `"workspaces": ["packages/*", "apps/*"]`. Scripts:
   `test` (vitest), `dev` (servir `apps/game` estático), y placeholders para `desktop`/`build`.
2. **`packages/engine/`**: `package.json` (`"type": "module"`, name `@dumpster/engine`, export map
   apuntando a `src/index.js`), `src/index.js` con un export vacío comentado, y `tests/` con un test
   trivial que pase (para confirmar que Vitest corre).
3. **`apps/game/`**:
   - `index.html` con el layout estático base de PLAN.md §5.1 (topbar, área de escarbado, mejoras
     rápidas, tabbar inferior) **sin lógica**, y un **import map** que mapee `@dumpster/engine` →
     `../../packages/engine/src/index.js`.
   - `styles/tokens.css`, `styles/layout.css`, `styles/components.css` vacíos con un comentario de encabezado.
   - `src/main.js` que solo loguee que arrancó (temporal) e importe el engine para probar el import map.
   - Carpetas vacías con `.gitkeep`: `src/dig/`, `src/ui/`, `src/fx/`, `src/icons/`, `src/data/`, `assets/`.
4. **Vitest** configurado a nivel raíz (`vitest.config.js` o config en `package.json`).
5. **`README.md`** raíz: cómo correr en **3 pasos o menos** (`npm install`, `npm run dev`, `npm test`).
6. **`.gitignore`** (node_modules, dist, builds de electron).
7. Fijá las **versiones pineadas** de `DESARROLLO.md` §3 en los `package.json` correspondientes (Vitest ya; Electron/steamworks los usa el Agente 6, pero dejá anotadas las versiones en un comentario del `package.json` raíz).

## Lo que NO debés hacer
- No implementar fórmulas, sistemas ni vistas (eso es de los Agentes 1–2).
- No introducir framework ni bundler para `apps/game`.
- No portar código de `reference/dumpster-empire.html` ni tocar `reference/`.

## Definition of Done
- [ ] `npm install` corre sin error en la raíz.
- [ ] `npm test` ejecuta Vitest y pasa el test trivial.
- [ ] `npm run dev` sirve `apps/game` y abre `index.html` con el layout estático (sin errores de consola).
- [ ] El import map resuelve `@dumpster/engine` (probado desde `main.js`).
- [ ] La estructura de carpetas coincide con `DESARROLLO.md` §4.
- [ ] `README.md` explica el arranque en 3 pasos.

## Handoff
Escribí tu bloque en `agentes/HANDOFF.md`: comandos verificados, cualquier decisión de versiones,
y confirmá al **Agente 1** que `packages/engine` está listo para recibir lógica.
