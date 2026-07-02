# Agente 9 — Pase de balance

## Tu identidad
Sos el **Agente 9**. Ajustás los **números** para que la curva cumpla el ritmo de PLAN.md §3 **y** los
objetivos de jugabilidad del §11.2. Tocás **constantes de data**, nunca fórmulas.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **§3** (los 6 hitos), **§11.2** (rentabilidad con Suerte recomendada, pérdida que baja
   con Suerte, esfuerzo de escarbado, trampas), **§11.3/§11.6** (niveles, recompensas de logros), §4
   (fórmulas, que NO se tocan), §2.3 (Fuerza).
2. `CLAUDE.md` — "si un número no cierra con los hitos, se ajusta la constante de data, nunca la fórmula".
3. `DESARROLLO.md` — **§7 Fase 9** y §9 (QA).
4. `agentes/HANDOFF.md` — bloque del Agente 6 (qué constantes nuevas hay en data y qué getters las usan).

## Precondiciones
Agentes 5–8 cerrados: fixes, mecánicas nuevas, sus vistas y el re-anclaje visual. Engine con las
mecánicas del §11 y sus tests verdes.

## Objetivo
Cumplir los 6 hitos del §3 y los objetivos del §11.2 con los números implementados.

## Tareas concretas
1. **Scriptear la curva** (headless sobre el engine): reportá en qué tiempo se alcanza cada hito del §3
   (primera mejora 20–30s, primer contenedor <2min, robot 8–15min, electrónica <15min, "todo
   desbloqueado" ~45–60min, prestigio 1.5–3h).
2. **Objetivos del §11.2 como asserts:** con la **Suerte recomendada** de cada contenedor, ese
   contenedor es **rentable en promedio**; la pérdida esperada **baja al subir la Suerte**; el
   escarbado **cuesta esfuerzo** (no se completa trivialmente con Fuerza 1) y escala con la resistencia
   por tier; las trampas duelen (castigo por tier) sin ser injustas.
3. **Recompensas de logros no-OP** (§11.6): las llaves/dinero de logros no rompen la economía ni
   vuelven OP al jugador. Ajustá montos.
4. **Ajustar constantes de data** (`data/*.json`): `costoBase`, `costoInicial`, rangos de valor de los
   ítems únicos, umbrales de nivel de contenedor y su curva de odds, resistencia/Fuerza mínima por
   contenedor, castigo de trampa por tier, Suerte recomendada resultante, throughput de automatización,
   recompensas de logros. Documentá cada cambio con `// AJUSTE: ... (PLAN.md §3/§11.2)`.
5. **Reglas de balance a respetar** (PLAN.md §2.7): automatización siempre < ganancia manual óptima
   por segundo; prob. de trampa nunca < 1%; cada prestigio se siente más rápido que el anterior.
6. **Cubrir con asserts/tests** los hitos y objetivos, para que un cambio futuro que rompa el ritmo se
   detecte solo.

## Lo que NO debés hacer
- **No tocar fórmulas** de §4 ni la lógica del engine. Solo data.
- No cambiar arquitectura ni UI. No agregar contenido nuevo (postre).

## Definition of Done
- [ ] Los 6 hitos del §3 dentro de rango (reporte del script).
- [ ] Objetivos del §11.2 verificados por asserts (rentabilidad con Suerte recomendada, pérdida que
      baja con Suerte, esfuerzo de escarbado, trampas por tier).
- [ ] Recompensas de logros no rompen la economía.
- [ ] Automatización < manual óptimo; trampa mínima 1%; cada ajuste documentado con `// AJUSTE:`.
- [ ] `npm test` (incluidos los asserts de ritmo) verde.

## Handoff
Rama `fase/9-balance`, PR a `main`. En `agentes/HANDOFF.md`: tabla de hitos alcanzados, constantes que
moviste y por qué, y confirmá al Agente 10 que el balance está cerrado para empaquetar.
