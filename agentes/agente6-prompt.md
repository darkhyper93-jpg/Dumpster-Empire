# Agente 6 — Empaquetado Steam (la caja)

## Tu identidad
Sos el **Agente 6**. Envolvés el juego en **Electron**, lo integrás con **Steam** (logros + Steam Cloud)
y producís **builds instalables** para Windows/Mac/Linux (Linux cubre Steam Deck).

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 1** (plataforma Steam), **sección 6.3** (guardado + Steam Cloud).
2. `CLAUDE.md` — versiones pineadas, no cambiar stack, guardado sincroniza con Steam Cloud.
3. `DESARROLLO.md` — **sección 3** (stack + versiones pineadas de Electron/steamworks.js/electron-builder),
   **sección 4** (`apps/desktop/`, `tools/steam/`), decisión registrada de Electron vs Tauri (§10).
4. `agentes/HANDOFF.md` — sobre todo las licencias de fuentes/íconos/sonidos (para créditos).

## Precondiciones
El juego (`apps/game`) está completo, pulido y balanceado, con el engine testeado.

## Objetivo de la fase
Un ejecutable de escritorio que carga el juego, sincroniza guardado con Steam Cloud, dispara logros de
Steam y se empaqueta por plataforma.

## Tareas concretas
1. **`apps/desktop/main.js`**: proceso principal de Electron. Crea la ventana, carga `apps/game`,
   maneja ciclo de vida (`before-quit` fuerza autoguardado). Sin `nodeIntegration` en el renderer.
2. **`apps/desktop/preload.js`**: puente seguro con `contextBridge` que expone al juego solo lo
   necesario (setAchievement, save/load hacia userData). El juego **no** habla directo con Steam.
3. **`apps/desktop/steam.js`**: integración `steamworks.js` — init con el `appId` (usá el de prueba
   `480` mientras no tengas el real), **logros** espejando los del engine, y **Steam Cloud** mapeando el
   archivo de guardado en `userData`. Manejá **conflicto de guardado**: elegí el más reciente por
   `lastSavedAt`, nunca pises en silencio una partida más avanzada (PLAN.md §6.3).
4. **Guardado**: en Electron el save vive en `userData`; el juego sigue usando su capa de save del engine,
   pero persistida a archivo (no solo localStorage) para que Steam Cloud lo tome. Export/import de texto se mantiene.
5. **`apps/desktop/electron-builder.yml`**: targets Win (nsis), Mac (dmg), Linux (AppImage/tar.gz para
   Steam Deck). Íconos de app, metadata.
6. **`tools/steam/`**: `app_build.vdf` y `depot_build.vdf` para SteamPipe (con placeholders del `appId`/`depotId`).
7. **Pantalla de créditos/atribución** en Settings si alguna fuente/ícono/sonido lo exige por licencia.
8. **Verificación de compatibilidad Steam Deck**: layout táctil, controles, que el build Linux corra.

## Lo que NO debés hacer
- No subir Electron/steamworks.js/electron-builder por encima de las versiones pineadas sin actualizar `DESARROLLO.md` §3.
- No mover dinero ni ejecutar acciones de compra reales; el `appId` real y la publicación los hace el usuario.
- No romper el modo web: `apps/game` debe seguir sirviéndose estático (Electron es una capa por encima).

## Definition of Done
- [ ] `electron .` corre el juego dentro de la ventana de Electron sin errores.
- [ ] Un logro del engine dispara un logro de Steam (probado contra appId `480`).
- [ ] El guardado sincroniza vía Steam Cloud y resuelve conflictos por `lastSavedAt`.
- [ ] `electron-builder` produce instalables para Win/Mac/Linux.
- [ ] El build Linux corre en un entorno tipo Steam Deck (o se documenta cómo probarlo).
- [ ] Créditos/atribución de licencias presentes si hacen falta.

## Handoff
En `agentes/HANDOFF.md`: comandos de build por plataforma, qué falta del lado del usuario (appId real,
subir depots por SteamPipe, arte de la ficha de Steam), y confirmá al **Agente 7** que está todo para la auditoría final.
