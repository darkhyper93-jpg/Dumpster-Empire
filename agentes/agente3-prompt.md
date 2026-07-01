# Agente 3 — Cerrar los huecos de UI del PLAN

## Tu identidad
Sos el **Agente 3**. Implementás todo lo que PLAN.md §5.2 y §5.4 exigen y el prototipo **no tiene**:
sonido, partículas, tween de números, íconos SVG (adiós emojis), árbol de prestigio real y modal de
offline con highlights.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 5.2** (feedback obligatorio: pop/partícula/sonido/shake/flash/tween),
   **sección 5.4** (pantallas requeridas), **sección 4.5** (resumen de offline).
2. `CLAUDE.md` — sin emojis, feedback con "juice".
3. `DESARROLLO.md` — **sección 6** (inventario de UI: qué falta exactamente), **sección 4** (`src/fx/`, `src/icons/`).
4. `agentes/HANDOFF.md` — puntos de enganche que dejó el Agente 2.
5. `reference/ui/` — los mockups Stitch (`expanded_prestige_tree`, íconos Material Symbols) como referencia visual.

## Precondiciones
El Agente 2 dejó el juego jugable con vistas funcionales mínimas y puntos de enganche marcados.

## Objetivo de la fase
Cumplir **completo** PLAN.md §5.2 y §5.4. El juego debe *sentirse* bien, no solo funcionar.

## Tareas concretas
1. **`src/fx/audio.js`** (WebAudio, sin librería): SFX corto de "pop" al hallar objeto, sonido grave
   **suave** (nunca alarma) al caer en trampa. Respetá el toggle de volumen de Settings (hacelo real).
2. **`src/fx/particles.js`**: partícula/pop de color según rareza en `finishDig`; destello más fuerte
   para rareza alta. Redibujado eficiente.
3. **`src/fx/tween.js`**: conteo animado del dinero (300–500ms); el contador **nunca** salta de golpe.
4. **`src/icons/icons.js`**: registro de íconos **SVG / Material Symbols** mapeando cada clave de ícono
   que definió el Agente 1 en la data. **Reemplazá los ~60 emojis del prototipo por completo.** Grep
   final de emojis = 0.
5. **`src/ui/PrestigeView.js`**: árbol de **nodos conectados** (no lista plana), con dependencias
   visibles y botón grande de "Prestigiar" que muestra preview de llaves. Referencia: mockup
   `expanded_prestige_tree`.
6. **`src/ui/OfflineModal.js`**: modal "mientras no estabas" con **highlights** (objetos encontrados +
   dinero), no bloqueante. Cablealo al cálculo de offline del engine.
7. **Modal celebratorio** al desbloquear categoría (auto-cierra en 3s o con tap).
8. **Shake + flash rojo tenue** de pantalla al caer en trampa.
9. Asegurá **estados vacío/error explícitos** en toda vista que aún los tenga implícitos.

## Lo que NO debés hacer
- No sumar librerías de terceros pesadas (audio/partículas/tween son funciones propias cortas).
- No tocar la economía ni los sistemas del engine (si algo falta ahí, anotalo en el handoff).
- No hacer el pase de balance (Fase 5).

## Definition of Done
- [ ] Suena el pop al hallar y el grave suave en trampa; el toggle silencia todo.
- [ ] Partícula por rareza en `finishDig`; el dinero se anima (tween), nunca salta.
- [ ] **Cero emojis** como íconos en data y UI (grep verificado).
- [ ] Árbol de prestigio con nodos conectados y preview de llaves.
- [ ] Modal de offline con highlights funcionando.
- [ ] Todas las vistas con los 4 estados (cargando/vacío/error/datos).

## Handoff
En `agentes/HANDOFF.md`: confirmá §5.2 y §5.4 cumplidos, listá los assets de sonido/íconos usados y su
licencia (para créditos de Steam), y pasale al **Agente 4** qué componentes esperan el pulido visual final.
