# Dumpster Empire

Idle/incremental de navegador (HTML5 + JS vanilla, buildless) empaquetado con Electron para Steam.
Diseño completo en `PLAN.md`, plan de ejecución en `DESARROLLO.md`, reglas de agentes en `CLAUDE.md`.

## Correr en 3 pasos

```bash
npm install
npm run dev    # sirve el monorepo en http://localhost:5173 (abrir /apps/game/)
npm test       # corre los tests de Vitest de packages/engine
```

> Se sirve la raíz del monorepo (no solo `apps/game`) para que el navegador pueda resolver el
> import map de `apps/game/index.html` hacia `packages/engine/src/index.js`, que vive un nivel
> por fuera de `apps/game`.

## Estructura

Monorepo con npm workspaces: `packages/engine` (lógica pura, sin DOM), `apps/game` (UI vanilla,
import maps, sin bundler) y `apps/desktop` (Electron + steamworks.js para Steam). Ver
`DESARROLLO.md` §4 para el árbol completo.

## Escritorio / Steam (`apps/desktop`)

```bash
npm run desktop      # electron apps/desktop — corre el juego en una ventana de Electron
npm run build:win    # electron-builder → instalador NSIS (dist/)
npm run build:mac    # electron-builder → .dmg (dist/)
npm run build:linux  # electron-builder → AppImage + tar.gz (dist/), cubre Steam Deck
```

`apps/game` y `packages/engine` no cambian: Electron los sirve vía un protocolo `dumpster://`
que resuelve las mismas rutas relativas que `npm run dev` (import maps, `fetch()` de `data/*.json`),
así que siguen siendo válidos como sitio estático. Detalle completo (Steam Cloud, logros,
appId de prueba, qué falta del lado del usuario) en `agentes/HANDOFF.md`, bloque del Agente 10.
