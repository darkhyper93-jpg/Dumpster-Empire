# Agente 5 — Fixes de UX (pasada de correcciones)

## Tu identidad
Sos el **Agente 5**. Arreglás los problemas de UX que salieron en el playtest (PLAN.md §11.1). Solo
UI/UX: **sin mecánicas nuevas y sin tocar balance ni engine**.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **§11.1** (fixes de UX), §5.1 (flujo de pantallas), §5.4 (vistas).
2. `CLAUDE.md` — la UI lee estado y despacha acciones; sin console.log; tokens centralizados.
3. `DESARROLLO.md` — **§7 Fase 5**.
4. `agentes/HANDOFF.md` — bloques de los Agentes 2, 3 y 4 (cómo están armadas las vistas, `UIManager`,
   el guard de re-render, etc.).

## Precondiciones
Agentes 0–4 cerrados: juego jugable, con íconos/fx y primer pulido visual. `main` verde (48/48 Vitest + e2e).

## Objetivo
Aplicar los seis fixes del §11.1 sin romper nada de lo existente.

## Tareas concretas
1. **Prompt de contenedor solo en la Tienda:** el "Elegí un contenedor para escarbar" y el botón
   "Escarbar el Tacho de Vereda (gratis)" hoy aparecen en todas las pestañas. Que se muestren **solo
   en la Tienda**; en Automatización/Logros/Prestigio/Ajustes, ninguno de los dos.
2. **Mejoras rápidas solo en la pantalla de escarbado:** `QuickUpgrades` (Suerte/Fuerza/Tamaño) debe
   ocultarse cuando el jugador está en otra sección (son cosas distintas, PLAN.md §11.9).
3. **Copy de prestigio:** "Prestigiar" → **"Hacer Prestigio"** en `PrestigeView`.
4. **Eliminar export/importar guardado** de `SettingsView` (Steam Cloud lo cubre; ver PLAN.md §11.1).
   Sacá también el estado/handlers asociados que queden huérfanos.
5. **Explicar Automatización:** `AutomationView` debe explicar en texto claro qué hace cada máquina,
   cómo se encola y cómo procesa el robot. No cambies la lógica; es copy + layout. Aclará que los
   botones grises son por falta de dinero (no un error), con el tooltip de "cuánto falta" que ya existe.
6. Revisá que ninguna vista quede con estado implícito tras estos cambios (mantené los 4 estados).

## Lo que NO debés hacer
- No tocar `packages/engine`, `store.js`, `loop.js` ni las fórmulas.
- No agregar mecánicas nuevas (eso es del Agente 6/7).
- No hacer el re-anclaje visual (Agente 8) ni balance (Agente 9).

## Definition of Done
- [ ] El prompt de contenedor y el botón gratis solo aparecen en la Tienda.
- [ ] Las mejoras rápidas solo se ven en la pantalla de escarbado.
- [ ] "Hacer Prestigio" en la vista de prestigio.
- [ ] Settings sin export/import, sin código muerto.
- [ ] Automatización explicada y comprensible.
- [ ] `npm test` 48/48 y `npm run test:e2e` verdes; sin `console.log`/`// TODO`.

## Handoff
Rama `fase/5-fixes-ux`, PR a `main`. En `agentes/HANDOFF.md`: qué archivos de `ui/` tocaste y confirmá
al Agente 6 que la base de UI quedó limpia para colgar las mecánicas nuevas.
