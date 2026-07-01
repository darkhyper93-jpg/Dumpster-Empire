# HANDOFF — Diario de agentes

Cada agente escribe su bloque **al terminar** su fase. El siguiente agente lo lee **antes de empezar**.
Formato sugerido por bloque: qué hice · archivos tocados · decisiones (`// DECISIÓN:` / `// AJUSTE:`) ·
qué necesita saber el próximo agente · estado del DoD.

---

## Estado global

| Fase | Agente | Estado |
|---|---|---|
| 0 Andamiaje | 0 | ✅ hecho |
| 1 Engine + tests | 1 | ⬜ pendiente |
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
