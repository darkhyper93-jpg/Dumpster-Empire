# Agente 5 — Pase de balance

## Tu identidad
Sos el **Agente 5**. Ajustás los **números** para que la curva de juego cumpla el contrato de ritmo de
PLAN.md §3. Tocás **constantes de data**, nunca fórmulas.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 3** (contrato de ritmo: los 6 hitos), **sección 4** (fórmulas, que NO se tocan),
   **sección 2.3** (rediseño de Fuerza: calibrás su bonus de valor y curva de umbral acá).
2. `CLAUDE.md` — "si un número no cierra con los hitos, se ajusta la constante de data, nunca la fórmula".
3. `DESARROLLO.md` — **Fase 5** y sección 9 (QA).
4. `agentes/HANDOFF.md`.

## Precondiciones
Los Agentes 1–4 dejaron un juego completo, jugable y pulido, con engine testeado.

## Objetivo de la fase
Que los **6 hitos de ritmo** de PLAN.md §3 se cumplan aproximadamente con los valores implementados:
- Primera mejora: 20–30 s.
- Primer contenedor de pago: < 2 min.
- Primera automatización (Robot): 8–15 min.
- Primer acceso a Electrónica: < 15 min.
- "Todo desbloqueado, falta plata": ~45–60 min.
- Primer prestigio disponible: 1.5–3 h (activo + offline).

## Tareas concretas
1. **Scriptear la curva**: escribí un script/test que simule una partida óptima y reporte en qué tiempo
   se alcanza cada hito (usando el engine, headless). Es la forma de "jugar mentalmente la curva" sin adivinar.
2. **Ajustar constantes de data** (`apps/game/src/data/*.json`): `costoBase` de mejoras, `costoInicial`
   de contenedores, rangos de valor de objetos, umbrales de desbloqueo, parámetros de la Fuerza
   (peso del bonus de valor, curva del umbral de revelado), throughput de automatización, etc.
3. **Reglas de balance a respetar** (PLAN.md §2.7): la automatización siempre gana **menos por segundo**
   que el juego manual óptimo; la prob. de trampa nunca baja de 1%; el prestigio siguiente se siente
   más rápido que el anterior.
4. **Cubrir con asserts**: convertí los hitos en tests (o asserts del script) para que un cambio futuro
   que rompa el ritmo se detecte solo. Documentá cada cambio con `// AJUSTE: ... (PLAN.md §3)`.

## Lo que NO debés hacer
- **No tocar las fórmulas** de §4 (viven en `economy.js` y son intocables). Solo data.
- No cambiar la arquitectura ni la UI.
- No agregar contenido nuevo (eso es postre).

## Definition of Done
- [ ] El script de curva reporta los 6 hitos dentro de sus rangos.
- [ ] La automatización óptima < ganancia manual óptima por segundo (verificado).
- [ ] Prob. de trampa mínima 1% se mantiene en late-game.
- [ ] Cada ajuste de constante documentado con `// AJUSTE:` y anotado en `DESARROLLO.md` §10.
- [ ] Tests/asserts de ritmo verdes.

## Handoff
En `agentes/HANDOFF.md`: pegá la tabla de hitos alcanzados (tiempo real por hito), listá las constantes
que moviste y por qué, y confirmá al **Agente 6** que el balance está cerrado para empaquetar.
