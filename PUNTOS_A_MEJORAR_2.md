# PUNTOS A MEJORAR — Ronda 2 (post-rework de escarbado + landing)

> **Cómo usar este documento.** Es el brief de problemas detectados jugando el build de escritorio
> (Electron 43, `main` al día). Un agente **Opus 4.8 high** debe leerlo y armar un **plan de fixes**;
> luego agentes **Sonnet 5.0 medium** lo ejecutan (rama `fix/...` → PR a `main`, como siempre).
> Fuentes de verdad de diseño: `PLAN.md` (§5.3 mockup canónico `clean_scavenge_area`, §11) y la ronda 1
> en `PUNTOS_A_MEJORAR.md`. Reglas de comportamiento: `CLAUDE.md`.
>
> **Ya resuelto por el rework anterior (no tocar salvo que se indique):** la pantalla de escarbado es
> ahora el home con "arrastrá para escarbar", separada de la tienda; el escarbado escala mejor. Lo de
> abajo es la siguiente ronda de pulido.

---

## 1. Escarbado — los ítems a veces se dibujan sin nombre
**Síntoma:** al rascar, por momentos los productos revelados aparecen como círculos de color **sin su
nombre** debajo, y otras veces sí con nombre (ver las 2 capturas del usuario: un círculo verde con
"Lámpara vieja" y otro gris sin texto; en otra, un círculo verde solo).
**Dónde vive:** `apps/game/src/dig/DigCanvas.js`, método `drawBottomLayer()`. Sospecha: la capa de
abajo se dibuja una vez, pero el ícono se carga async (`iconImg.addEventListener('load', ...)`) y ese
callback redibuja **solo el ícono**, no el nombre; según el timing, el nombre puede quedar sin
pintarse o quedar tapado. Revisar el orden de dibujo (círculo → ícono → nombre) y que el redibujo async
no pise el texto.
**Resultado deseado:** cada ítem revelado muestra **siempre** su nombre, consistente, sin importar el
timing de carga del ícono.

---

## 2. "Tienda" → "Contenedores", solo informativa, sin escarbar
**Qué se pide:**
- **Renombrar** la sección "Tienda" a **"Contenedores"** (nav + títulos).
- **Sacarle los botones "Escarbar"**: desde ahí el escarbado no funciona, y no debe funcionar. La
  sección pasa a ser **meramente informativa** (mirar/comprar contenedores), sin disparar escarbado.
- El escarbado ocurre **solo** en la pantalla "Escarbar".
**Dónde vive:** `apps/game/src/ui/ShopView.js` (botones `Escarbar`/`data-start-dig` a sacar de acá),
`apps/game/index.html` (label del nav `data-tab="tienda"`), `UIManager` (id de tab).
**Resultado deseado:** "Contenedores" muestra info y permite comprar, pero no escarbar; el flujo de
escarbado queda 100% en la pantalla Escarbar.

---

## 3. Ubicar la lista de contenedores debajo del menú — DECISIÓN CONFIRMADA
**Qué se pide:** **mantener el sidebar izquierdo** (como el mockup canónico `clean_scavenge_area`, que
usa un `<aside w-64>` fijo con el menú adentro) y apilar la lista de "qué contenedor comprar"
**debajo de los ítems del menú, dentro del mismo sidebar izquierdo**.
**Resuelto (respuesta del usuario):** NO es "menú arriba horizontal / contenido a ancho completo
debajo" (esa era la interpretación que el planificador había elegido por default y es **incorrecta**).
Es la otra: conservar las columnas/sidebar y stackear la lista de contenedores dentro del sidebar,
debajo del nav. Referencia visual: `clean_scavenge_area`.
**Dónde vive:** `apps/game/index.html` (el `<nav>`/sidebar) + `apps/game/styles/layout.css`.
**Resultado deseado:** sidebar izquierdo con el nav (Escarbar · Contenedores · Automatización · Logros ·
Prestigio · Índice) y, debajo, la lista de contenedores comprables — todo dentro del sidebar, estilo mockup.

---

## 4. Nombres del menú mal capitalizados + "INDEX" → "Índice"
**Síntoma:** los labels se ven con capitalización rara (el usuario los lee como "TIenda",
"AutomatIzación", "PrestIgIo") y **"INDEX"** está en mayúsculas y en inglés.
**Dónde vive:** strings en `apps/game/index.html` (el nav) — hoy son `Escarbar`, `Tienda`,
`Automatización`, `Logros`, `Prestigio`, `INDEX`; y `apps/game/styles/components.css` tiene
`text-transform: uppercase` en varias clases (revisar si alguna cae sobre el nav y lo deforma).
**Resultado deseado:** capitalización española normal (solo primera mayúscula), sin `text-transform`
raro sobre el nav. Strings finales exactos:
`Escarbar` · `Contenedores` · `Automatización` · `Logros` · `Prestigio` · `Índice`.

---

## 5. Control de volumen en Configuración
**Qué se pide:** poder **subir y bajar el volumen** desde Configuración (no solo encender/apagar).
**Dónde vive:** `apps/game/src/ui/SettingsView.js` (hoy solo tiene un botón `toggle-sound` on/off) y
`apps/game/src/fx/audio.js` (agregar un **master gain** + `setVolume(0..1)`; el estado del volumen debe
persistir en el save, junto a `soundOn`).
**Resultado deseado:** un slider de volumen en Configuración que controla el volumen real de todos los
SFX y se guarda en la partida.

---

## 6. "Riesgo de trampa" y la barra se salen del borde de la tarjeta
**Síntoma:** en la pantalla de escarbado, la **barra de progreso** y el texto **"Riesgo de trampa"**
quedan pegados/sobresaliendo del borde de la tarjeta ("la R sobresale la mesa").
**Dónde vive:** `apps/game/index.html` (`#dig-progress` + `#dig-progress-fill` y `#dig-trap-hint`) y su
CSS en `styles/components.css`/`layout.css`. Falta padding/inset para que queden **dentro** de la
tarjeta de madera, no tocando el borde.
**Resultado deseado:** barra y texto correctamente inset dentro de la tarjeta, sin desbordes.

---

## 7. (Info, no bug) Consola de Steam al correr `npm run desktop`
El usuario ve al arrancar:
```
Setting breakpad minidump AppID = 480
SteamInternal_SetMinidumpSteamID:  Caching Steam ID: 7656... [API loaded no]
```
**El juego corre bien.** `[API loaded no]` significa que la **Steam API no se cargó** en esa sesión
(típicamente porque el cliente de Steam no está corriendo, o por el appId de prueba 480). No es un
error de la app: los logros y Steam Cloud **no se están ejercitando** en ese arranque. Para probarlos
de verdad hace falta el cliente de Steam abierto + un appId real (pendiente del usuario / Agente Steam).
No requiere fix ahora; anotarlo como verificación pendiente de la capa Steam.

---

## Nota para el planificador (Opus)
- La mayoría son fixes de **UI/estructura/CSS/audio** (puntos 2–6) + un **bug de render de canvas**
  (punto 1). Ninguno requiere tocar la economía del engine.
- Respetar el sistema visual "The Workshop" (PLAN.md §5.3): sin emojis, sin colores hardcodeados
  (tokens en `styles/tokens.css`), mobile-first + Steam Deck.
- Cerrar cada fix con `npm test` + `npm run test:e2e` verdes (actualizar specs e2e si cambian labels/
  estructura del nav), y actualizar `agentes/HANDOFF.md`.
