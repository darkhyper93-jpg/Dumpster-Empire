# Agente de fix — XSS vía save no confiable (puntual, fuera del pipeline numerado)

## Tu identidad
Sos un agente de **fix de seguridad puntual**. No sos una fase del roadmap: hacés solo este arreglo,
chico y acotado. Lo detectó una revisión de seguridad tras la Fase 7.

## Lectura obligatoria antes de tocar nada
1. `CLAUDE.md` — regla "validar todo input externo… nunca corromper la partida en curso".
2. `PLAN.md` — §6.3 (guardado/validación) y §11.5 (INDEX, de donde viene el sink).
3. Los archivos afectados: `packages/engine/src/save.js`, `apps/game/src/ui/CollectionView.js`,
   `packages/engine/tests/save.test.js`.
4. `agentes/HANDOFF.md` — bloques de los Agentes 6 y 7 (agregaron `itemsFoundByItem`, `containerLevels`, etc.).

## La vulnerabilidad (para que entiendas qué arreglás)
`validateSave` en `save.js` valida solo el **tipo de primer nivel** de los mapas (p. ej.
`itemsFoundByItem` tiene que ser `object`), pero **no valida su contenido**. Un save importado o un
`localStorage`/archivo de Steam Cloud manipulado puede traer:
`itemsFoundByItem: { "tachoVereda": { "Lata aplastada": "<img src=x onerror=...>" } }`.
Eso pasa la validación. Después `CollectionView.js` hace
`const foundCount = foundInContainer[item.name] || 0;` y lo mete crudo en
`grid.innerHTML` (`Encontrado: ${foundCount}`) → **XSS almacenado**. `foundCount <= 0` con un string
da `NaN <= 0 = false`, así que entra a la rama "revelado" e inyecta.

## Objetivo
Cerrar el XSS en dos capas (defensa en profundidad) sin romper la carga de saves legítimos.

## Tareas concretas
1. **`packages/engine/src/save.js` — validación profunda (fail-closed, capa primaria).** Después del
   chequeo de tipos de primer nivel, validar el **contenido** de los mapas cuyos valores deben ser
   números finitos y rechazar (con error claro, sin tocar la partida en curso) si algo no cuadra:
   - Mapas planos de números: `upgradeLevels`, `ownedContainers`, `containerLevels`,
     `containerLevelProgress`, `prestigeTreeLevels`, `itemsFoundByCategory` → cada valor
     `Number.isFinite`.
   - Mapa anidado `itemsFoundByItem` (`containerId -> { itemName -> number }`) → cada sub-objeto es
     object no nulo y cada valor `Number.isFinite`.
   - Arrays `autoQueue` / `autoProcessing` → validar que sean arrays y que sus elementos tengan la
     forma esperada (ids string / objetos con campos numéricos), no strings arbitrarios.
   - Para el resto de campos `object` (p. ej. `achievementsUnlocked`), validar que los valores sean
     primitivos del tipo esperado, no objetos/strings con HTML.
   - Guía: la forma canónica es la de `freshState()`; validá contra esos tipos. No inventes campos.
2. **`apps/game/src/ui/CollectionView.js` — coerción en el sink (capa de defensa).** Cambiar
   `const foundCount = foundInContainer[item.name] || 0;` por
   `const foundCount = Number(foundInContainer[item.name]) || 0;`.
3. **Barrido rápido de otros sinks:** grepear en `apps/game/src/ui/**` y `apps/game/src/dig/**` por
   `innerHTML` con valores que salgan de `state` (no de la data estática). Donde un valor derivado de
   `state` se interpole en `innerHTML`, coercelo a número o escapá el HTML (si esperás texto). Si no
   encontrás más, dejalo documentado en el HANDOFF.
4. **Test de regresión en `packages/engine/tests/save.test.js`:**
   - Un save con un string malicioso en `itemsFoundByItem` (y otro en un mapa numérico) se **rechaza**
     (`deserializeState`/`validateSave` devuelven error, sin lanzar).
   - Un save **legítimo** (valores numéricos normales) sigue cargando ok (no romper el camino feliz).

## Lo que NO debés hacer
- No cambiar el esquema del save ni bumpear `saveVersion` (esto es validación, no migración).
- No tocar UI visual, balance, engine de juego ni otros agentes.
- No relajar la validación existente ni "sanear" callando errores: rechazá con mensaje claro.

## Definition of Done
- [ ] `save.js` valida en profundidad los mapas y rechaza contenido no numérico donde corresponde.
- [ ] `CollectionView.js` coerce `foundCount` a número en el sink.
- [ ] Barrido de otros sinks `state → innerHTML` hecho (arreglado o documentado que no hay más).
- [ ] Test de regresión: save malicioso rechazado, save legítimo aceptado.
- [ ] `npm test` y `npm run test:e2e` verdes; sin `console.log`/`// TODO`.

## Handoff
Rama `fix/xss-save-collection`, PR a `main`. En `agentes/HANDOFF.md` (sección propia): qué validaste,
qué otros sinks encontraste, y confirmá que el vector quedó cerrado en las dos capas.
