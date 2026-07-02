# Agente 10 — Empaquetado Steam (la caja)

## Tu identidad
Sos el **Agente 10**. Envolvés el juego en **Electron**, lo integrás con **Steam** (logros + Steam
Cloud) y producís **builds instalables** para Windows/Mac/Linux (Linux cubre Steam Deck).

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — §1 (plataforma Steam), §6.3 (guardado + Steam Cloud), §5.3 (fuentes/íconos a auto-hospedar).
2. `CLAUDE.md` — versiones pineadas, no cambiar stack, guardado sincroniza con Steam Cloud.
3. `DESARROLLO.md` — **§3** (versiones pineadas Electron/steamworks.js/electron-builder), **§4**
   (`apps/desktop/`, `tools/steam/`), **§7 Fase 10**, decisión Electron vs Tauri (§10).
4. `agentes/HANDOFF.md` — bloques de los Agentes 4 y 8 (fuentes/íconos y su licencia, riesgo offline).

## Precondiciones
El juego (`apps/game`) está completo, con las mecánicas del §11, pulido "The Workshop" y balanceado.

## Objetivo
Un ejecutable de escritorio que carga el juego, sincroniza guardado con Steam Cloud, dispara logros
de Steam y se empaqueta por plataforma.

## Tareas concretas
1. **`apps/desktop/main.js`**: proceso principal de Electron; crea la ventana, carga `apps/game`,
   maneja ciclo de vida (`before-quit` fuerza autoguardado). Sin `nodeIntegration` en el renderer.
2. **`apps/desktop/preload.js`**: `contextBridge` que expone al juego solo lo necesario
   (setAchievement, save/load hacia `userData`). El juego no habla directo con Steam.
3. **`apps/desktop/steam.js`**: `steamworks.js` — init con `appId` (usá el de prueba `480` hasta tener
   el real), **logros** espejando los del engine (incluí los logros con recompensa del §11.6), y
   **Steam Cloud** mapeando el save en `userData`. Conflicto de guardado: elegí el más reciente por
   `lastSavedAt`, nunca pises en silencio una partida más avanzada (PLAN.md §6.3).
4. **Guardado a archivo** en `userData` (además de localStorage) para que Steam Cloud lo tome.
5. **Auto-hospedar fuentes/íconos** (PLAN.md §5.3): descargá Plus Jakarta Sans (y Material Symbols si
   se usaron) a `apps/game/assets/fonts/`, reemplazá el `<link>` por `@font-face` local, y sumá la
   atribución de licencia a la pantalla de créditos. El build de Steam corre offline.
6. **`apps/desktop/electron-builder.yml`**: targets Win (nsis), Mac (dmg), Linux (AppImage/tar.gz).
7. **`tools/steam/`**: `app_build.vdf` y `depot_build.vdf` para SteamPipe (placeholders de appId/depotId).
8. **Pantalla de créditos/atribución** en Settings (fuentes/íconos/licencias).
9. **Compatibilidad Steam Deck**: layout táctil, que el build Linux corra.

## Lo que NO debés hacer
- No subir Electron/steamworks.js/electron-builder por encima de las versiones pineadas sin actualizar `DESARROLLO.md` §3.
- No publicar ni mover el appId real; eso lo hace el usuario.
- No romper el modo web: `apps/game` debe seguir sirviéndose estático.

## Definition of Done
- [ ] `electron .` corre el juego sin errores.
- [ ] Un logro del engine dispara un logro de Steam (contra appId `480`).
- [ ] Guardado sincroniza vía Steam Cloud y resuelve conflictos por `lastSavedAt`.
- [ ] Fuentes/íconos auto-hospedados; créditos con licencias.
- [ ] `electron-builder` produce instalables Win/Mac/Linux; el build Linux corre en entorno tipo Steam Deck (o se documenta cómo probarlo).

## Handoff
Rama `fase/10-steam`, PR a `main`. En `agentes/HANDOFF.md`: comandos de build por plataforma, qué
falta del lado del usuario (appId real, subir depots por SteamPipe, arte de la ficha), y confirmá al
Agente 11 que está todo para la auditoría final.
