# Agente 2 — Juego jugable modular (portar el prototipo)

## Tu identidad
Sos el **Agente 2**. Convertís el engine en un **juego jugable de punta a punta** en el navegador:
canvas de escarbado + loop + vistas que **consumen el engine** (leen estado, despachan acciones).

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 2.2** (mecánica de escarbado), **sección 5.1/5.4** (layout y vistas), **sección 6.4** (rendimiento).
2. `CLAUDE.md` — la UI **no** reimplementa fórmulas ni muta estado directo.
3. `DESARROLLO.md` — **sección 4** (estructura de `apps/game`), **sección 5** (mapa de funciones), **sección 6** (qué existe).
4. `reference/dumpster-empire.html` — **referencia suelta de comportamiento**. Portá lo que funciona; **no portes lo roto** (la Fuerza se rediseñó en el engine). El engine es la autoridad, no este HTML.
5. `agentes/HANDOFF.md` — leé la API pública que documentó el Agente 1.

## Precondiciones
El Agente 1 dejó `packages/engine` verde con API pública documentada y la data en JSON.

## Objetivo de la fase
Paridad funcional con el prototipo (menos sus bugs), pero **modular** y consumiendo el engine. El loop
completo debe jugarse: escarbar → vender → mejorar → comprar contenedor → automatizar → prestigiar,
guardando en localStorage.

## Tareas concretas
1. **`src/dig/DigCanvas.js` + `src/dig/digInput.js`**: canvas de escarbado con
   `globalCompositeOperation = "destination-out"`, `touch-action: none`, revelado por %, redibujado
   solo del área afectada (PLAN.md §6.4). El % de revelado y el resultado los decide el **engine**.
2. **`src/loop.js`**: `requestAnimationFrame` para lo visual + tick de producción **por delta de
   tiempo real** (no por frame) para automatización. Autoguardado cada 15s y en `visibilitychange`.
3. **`src/main.js`**: init del engine, carga de save, aplicar progreso offline al abrir, arrancar loop y UI.
4. **`src/ui/`** (una vista por archivo, cada una con los **4 estados**: cargando/vacío/error/datos):
   `UIManager.js`, `Topbar.js`, `QuickUpgrades.js`, `ShopView.js`, `AutomationView.js`,
   `AchievementsView.js`, `PrestigeView.js`, `SettingsView.js`, `Toast.js`, `Tutorial.js`.
   (El árbol de prestigio "bonito" y el modal de offline con highlights son del **Agente 3**; acá
   dejá versiones funcionales mínimas.)
5. **Cableado de acciones**: cada botón despacha una acción al engine y re-renderiza desde el estado
   resultante. Botones deshabilitados (con tooltip "cuánto falta") cuando no alcanza el dinero.
6. **Tutorial mínimo** (PLAN.md §7): primeras 3 acciones con tooltip guiado que se muestra una vez.

## Lo que NO debés hacer
- No poner cálculos de economía en la UI (costos/valores/llaves/offline salen del engine).
- No mutar el estado directo desde la UI.
- No hacer el pulido visual fino todavía (colores extruidos, bloom, etc.) — eso es Fase 4. Usá los
  tokens que existan, funcional y limpio.
- No agregar sonido/partículas/tween todavía (Fase 3).

## Definition of Done
- [ ] El juego abre servido estático y se juega el loop completo de punta a punta.
- [ ] El guardado persiste al recargar; el offline se aplica al volver.
- [ ] Ningún botón queda muerto por `NaN`/`Infinity`.
- [ ] Cada vista tiene sus 4 estados.
- [ ] Grep: la UI no llama fórmulas propias; todo pasa por `@dumpster/engine`.
- [ ] Escarbar funciona con mouse **y** touch.

## Handoff
En `agentes/HANDOFF.md`: listá las vistas creadas y qué quedó como "mínimo funcional" a pulir por el
Agente 3 (árbol de prestigio, modal offline, íconos), y dónde están los puntos de enganche para
sonido/partículas/tween (p. ej. `finishDig`, update de topbar, evento de trampa).
