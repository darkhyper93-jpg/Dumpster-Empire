# Agente de bump — Electron 31→43 + re-verificar apps/desktop (puntual)

## Tu identidad
Sos un agente de **bump de versiones y re-verificación**, puntual (no una fase del roadmap). Los pins
ya se subieron en los `package.json` y en DESARROLLO.md §3 (Electron `^43`, electron-builder `^26`).
Tu trabajo es reinstalar limpio y **arreglar el código de `apps/desktop` que rompa** con las APIs
nuevas de Electron 43, sin cambiar el comportamiento.

## Motivo del bump
`npm audit` (julio 2026) mostró que Electron 31.7.7 quedó EOL con 17 advisories (varios high) y que
`tar`/electron-builder también traían vulns high. Se bumpeó a las versiones actuales para cerrar las
vulns **y** destrabar el install (el binario de Electron 31 no bajaba en el entorno del usuario).

## Lectura obligatoria antes de tocar nada
1. `CLAUDE.md` — versiones pineadas, no cambiar stack sin actualizar DESARROLLO (ya actualizado).
2. `DESARROLLO.md` §3 (versiones nuevas + nota del bump) y §7 Fase 10.
3. `agentes/HANDOFF.md` — **bloque del Agente 10** (qué construyó: `main.js`, `preload.js`, `steam.js`,
   `saveFile.js`, protocolo `dumpster://`, electron-builder.yml).
4. Los archivos de `apps/desktop/`.

## Precondiciones
Pins ya bumpeados. `node_modules` con la versión vieja o rota de Electron.

## Tareas concretas
1. **Reinstalar limpio:**
   ```
   Remove-Item -Recurse -Force node_modules, package-lock.json
   npm install
   npm approve-scripts electron esbuild     # re-aprobar: allowScripts pineaba la versión vieja
   npm install                              # que corra el postinstall de Electron 43 y baje el binario
   ```
   Si el binario aún no baja: `Remove-Item -Recurse -Force $env:LOCALAPPDATA\electron\Cache` y reintentar;
   y descartar **antivirus** (Defender a veces pone en cuarentena `electron.exe` — revisar historial de
   protección / agregar exclusión para el `node_modules` del repo).
2. **Re-verificar el código contra Electron 43** (breaking changes probables, revisar y adaptar):
   - **Registro de protocolo `dumpster://`**: si `main.js` usa `protocol.registerBufferProtocol`/
     `registerFileProtocol` o `registerSchemesAsPrivileged` con la firma vieja, migrar a la API actual
     (`protocol.handle()` + `protocol.registerSchemesAsPrivileged` con la forma de Electron ≥25/43).
   - **Ciclo de vida / `app.whenReady`**, `BrowserWindow` webPreferences, `contextBridge` en `preload.js`.
   - **`steamworks.js`**: confirmar que carga bajo Electron 43 (ABI/N-API). Si no, bumpear steamworks.js
     a la versión compatible y anotarlo en DESARROLLO §3.
   - **electron-builder 26**: revisar que `electron-builder.yml` no use claves deprecadas.
3. **Smoke real:** `npm run desktop` debe abrir la ventana, servir el juego por `dumpster://` (sin
   pantalla en blanco), iniciar el stub de Steam (appId 480), disparar un logro y guardar/cargar.
4. **No romper el modo web ni los tests:** `npm test` y `npm run test:e2e` siguen verdes (el juego web
   no depende de Electron).
5. Documentar en el HANDOFF qué APIs cambiaste y a qué versión quedó cada dep.

## Lo que NO debés hacer
- No tocar la lógica del juego, el engine ni el balance. Solo `apps/desktop` + deps.
- No bumpear vitest a 4 acá (es aparte; podría romper los 109 tests).
- No `npm audit fix --force` a ciegas.

## Definition of Done
- [ ] `npm install` deja el binario de Electron 43 instalado (no más "failed to install correctly").
- [ ] `npm run desktop` abre la app y pasa el smoke (protocolo, logro, guardado).
- [ ] `npm test` y `npm run test:e2e` verdes.
- [ ] `npm audit`: cerradas las vulns high de electron/tar (quedan a lo sumo las moderate dev-only de esbuild/vite).
- [ ] APIs migradas documentadas en el HANDOFF.

## Handoff
Rama `chore/bump-electron-43`, PR a `main`. En `agentes/HANDOFF.md`: versiones finales, APIs migradas,
y si el smoke de escritorio pasó (o qué quedó pendiente de verificar en otra máquina/CI).
