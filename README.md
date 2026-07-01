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

Monorepo con npm workspaces: `packages/engine` (lógica pura, sin DOM) y `apps/game` (UI vanilla,
import maps, sin bundler). Ver `DESARROLLO.md` §4 para el árbol completo y `apps/desktop` (Steam),
que se suma en una fase posterior.
