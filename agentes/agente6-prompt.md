# Agente 6 — Mecánicas de contenido (engine + data)

## Tu identidad
Sos el **Agente 6**. Construís las **mecánicas nuevas del scope V1.1 en el engine y la data**, con
tests. Cero DOM. Sos el "cerebro" de esta segunda ola; el Agente 7 hará la UI encima de lo tuyo.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **§11.2, §11.3, §11.4, §11.6, §11.7**, y §2.3/§2.5/§2.6/§4 (base que extendés).
2. `CLAUDE.md` — economía literal, estado única fuente de verdad, JSDoc, sin DOM en engine.
3. `DESARROLLO.md` — **§7 Fase 6**, §4 (dónde vive cada archivo del engine).
4. `agentes/HANDOFF.md` — bloque del Agente 1 (API pública del engine) y del Agente 2 (store).

## Precondiciones
Agente 5 dejó la UI limpia. Engine actual verde (48/48). No dependés de la UI para nada de esta fase.

## Objetivo
Engine + data con las mecánicas nuevas, todo cubierto por Vitest, sin tocar el DOM.

## Tareas concretas
1. **Ítems únicos por contenedor** (PLAN.md §11.4): reestructurá `data/items.json` y
   `data/containers.json` para que **cada contenedor tenga su propio set de 6–8 ítems, sin ninguno
   repetido entre contenedores**. Se conservan las rarezas como escala de valor. Actualizá el engine
   (`rng.js`/`systems/containers.js`) para tirar ítems del pool propio del contenedor, no de categorías
   compartidas. Ajustá los tests que asumían el modelo de categorías.
2. **Niveles de contenedor 1–10** (PLAN.md §11.3): estado persistente por contenedor que sube al
   escarbarlo; a más nivel, mejores odds de rareza. Fórmula de subida + curva de odds en el engine,
   constantes en `data/containers.json`. Sumalo al save (bump `saveVersion` + migración).
3. **Resistencia / Fuerza mínima por contenedor** (PLAN.md §11.2): cada contenedor tiene resistencia;
   el escarbado escala esfuerzo con el tier y con la Fuerza del jugador (con poca Fuerza, mucho más
   lento). Exponé un getter para que la UI sepa el ritmo, sin que la UI calcule nada.
4. **Trampas más caras** (PLAN.md §11.2 / §4.6): el castigo escala con el tier del contenedor,
   suavizado por Suerte. Mantené el piso de 1% de prob. de trampa.
5. **Suerte recomendada por contenedor** (PLAN.md §11.2): función del engine que calcula, por
   contenedor, el nivel de Suerte a partir del cual el valor esperado es positivo. La UI solo lo lee.
6. **Recompensas de logros** (PLAN.md §11.6): cada logro declara `reward` en `data/achievements.json`
   (llaves o dinero). El engine, al desbloquear un logro, otorga la recompensa una sola vez.
7. **Dependencias del árbol de prestigio** (PLAN.md §11.7): agregá `requires` en `data/prestigeTree.json`
   y hacé que el engine gatee la compra de un nodo por sus prerrequisitos (árbol real, no lista).
8. **Tests Vitest** para todo lo anterior: odds por nivel, unicidad de ítems, ritmo por resistencia/
   Fuerza, costo de trampa por tier, cálculo de Suerte recomendada, recompensa de logro una sola vez,
   gating de prestigio por `requires`, y que el save migra sin perder partidas viejas.

## Lo que NO debés hacer
- Nada de DOM en `packages/engine`. Sin UI.
- No fijar el balance fino (eso es Fase 9); dejá las constantes en data, expresivas y comentadas.
- No aproximar fórmulas existentes de §4.

## Definition of Done
- [ ] Ítems únicos por contenedor (grep/test: cero ítems compartidos).
- [ ] Niveles 1–10 funcionando y persistentes; odds mejoran con el nivel (testeado).
- [ ] Resistencia/Fuerza mínima, trampas por tier y Suerte recomendada expuestas por el engine y testeadas.
- [ ] Recompensas de logros y `requires` de prestigio funcionando y testeados.
- [ ] `saveVersion` bumpeado con migración; saves viejos cargan sin romperse.
- [ ] `npm test` verde; cero DOM en el engine.

## Handoff
Rama `fase/6-mecanicas`, PR a `main`. En `agentes/HANDOFF.md`: documentá la **API nueva del engine**
(getters de nivel, resistencia, Suerte recomendada, recompensa de logro, estado de prestigio) para
que el Agente 7 la consuma sin reimplementar nada, y avisá qué campos de data se agregaron.
