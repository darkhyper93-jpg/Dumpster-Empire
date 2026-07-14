# ROADMAPv4.md — Rondas 21-31: limpieza, Puesto de Chatarra, NPCs, estética y lategame infinito

> **Rediseñado el 2026-07-14 (post-ronda 20), por decisión del usuario.** Cambios contra la
> versión anterior de este documento: (1) la **Energía y el espionaje** (ronda 20) se REMUEVEN
> del juego y del plan — la ronda 21 nueva hace la limpieza; (2) los **temas/skins, la puerta
> DLC y los leaderboards** de Steam (vieja ronda 27) quedan FUERA DE ALCANCE — los reemplaza
> una ronda de **rediseño estético** (28); (3) se agrega la ronda 30 de **imágenes reales de
> contenedores** (assets que provee el usuario); (4) todo el resto del contenido pendiente fue
> aprobado ítem por ítem por el usuario el 2026-07-14 y se conserva ÍNTEGRO, solo renumerado
> (rondas y versiones de save corren un lugar).
>
> **Para el agente ejecutor.** Este plan cubre ONCE rondas (21-31) que se ejecutan EN ORDEN,
> cada una en su propia rama con su propio PR (el usuario mergea entre rondas). NO empieces una
> ronda sin que la anterior esté mergeada en main. Todo el contenido de este roadmap sale
> **antes del lanzamiento en Steam** (decisión del usuario, 2026-07-11): el orden es por
> dependencia técnica y el release final es la ronda 31.
>
> El plan es autocontenido en diseño (fórmulas y valores exactos), pero menos prescriptivo en
> código que ROADMAPv3: donde no hay snippet, seguí los patrones existentes que se citan por
> archivo. Si algo no coincide con el repo real, **detenete y reportá la diferencia**.
> Leé `CLAUDE.md` primero (siempre), y `PLAN.md` + `DESARROLLO.md` para el contexto.
> Las reglas que mandan:
> 1. La economía vive SOLO en `packages/engine`; la UI lee estado y despacha acciones.
> 2. Toda fórmula nueva se escribe primero en PLAN.md §4; las constantes de balance van en `data/*.json`.
> 3. TDD: tests RED antes de implementar.
> 4. Al balancear, se ajustan **constantes de datos**, nunca fórmulas.

---

## 0. Estado actual (2026-07-14, post-ronda 20, verificado contra el repo)

- Rondas 1-18 (ROADMAPv3 completo) + **19 y 20 de este roadmap** hechas y mergeadas en main
  (PRs #18 y #19). Baselines de `npm test` / `npm run test:e2e`: **recontar al ejecutar** y
  anotar en HANDOFF (regla heredada: nunca hardcodear conteos).
- Hecho en la **ronda 19** (save v8): racha de escarbado (`digStreak`/`bestDigStreak`, §4.20),
  pantalla de Estadísticas (hoy dentro de Ajustes — la ronda 21 la muda al header), % de
  completitud, logros ocultos, vibración táctil, botón JUGAR de placa metálica.
- Hecho en la **ronda 20** (save v9): grados de trampa (§4.21), herramientas de escarbado
  (§4.23, hoy en Ajustes — la ronda 21 las muda a Escarbar), indicios visuales y 2 contenedores
  con mecánica propia (`bovedaContrarreloj`, `sotanoSinLuz`, §4.24), y **Energía/espionaje
  (§4.22) — que la ronda 21 REMUEVE por decisión del usuario (2026-07-14): la función existe
  hoy en main y hay que desmontarla entera, sin fragmentos residuales**.
- Data: 18 contenedores, ~125 ítems, logros `a1`..`a41`, 12 máquinas, 13 nodos de prestigio,
  4 mejoras rápidas, 4 herramientas, i18n es/en completo (todos los conteos: indicativos).
- `SAVE_VERSION = 9` (`packages/engine/src/state.js`).
- La venta es **instantánea**: `applyContainerResult` (systems/containers.js) suma el valor a
  `money` directo. El inventario del Puesto (ronda 23) es un sistema nuevo de verdad.
- `marketFluctuation` existe y afecta el valor, pero es **invisible** para el jugador (ronda 23
  lo vuelve visible como "cotización del día").
- **Conteos = indicativos.** NUNCA hardcodees un conteo en un test o script; recontá desde la
  data al ejecutar (regla heredada de ROADMAPv3 §0).

---

## 1. Reglas duras globales (las once rondas)

Heredadas de ROADMAPv3 §1 (siguen TODAS vigentes): 1) no committear untracked ajeno —
`.claude/napkin.md` sigue ignorado; 2) no tocar el save real del jugador
(`%APPDATA%\@dumpster\desktop\save.json` ni `dumpsterEmpireSave` de un navegador real — para
verificar Electron usar `--user-data-dir` a un dir temporal, patrón de la ronda 18); 3) sin
`gh` CLI, el PR lo crea el usuario con el link del push; 4) commits multilínea con Bash;
5) cero emojis, íconos al registro `icons.js` con `xmlns`; 6) CSS solo con tokens `var(--...)`;
7) no tocar importmap ni CSP de `index.html`; 8) toasts e2e con `.filter({ hasText })` y
`#money` con polling; 9) seeds e2e por `addInitScript` + `serializeState(freshState())` mutado;
10) tras cada ronda `npm test` + `npm run test:e2e` verdes + manual 375px y desktop ANTES del
commit final; 11) el copy español existente es INTOCABLE (los e2e lo asertan); 12) números de
balance nuevos con comentario `AJUSTE:` y tablas de PLAN.md actualizadas primero.

Nuevas de v4:

13. **Todo campo numérico persistido nuevo** entra con `Number.isFinite` (lo cubre gratis el
    loop de `REQUIRED_FIELDS`) **y** su chequeo de CONTENIDO/coherencia en
    `validateDeepContent()` (rangos, allow-lists, `remaining <= total`). Preguntate siempre:
    "¿qué valor pasa el typeof pero rompe la UI o la economía?" (napkin, 3 rondas de la misma
    clase de bug).
14. **Todo sistema con reloj** (misiones diarias, pedidos, eventos, día/noche) usa
    deltas clampeados a ≥ 0 (`Math.max(0, now - since)`) y NUNCA regenera/avanza si el reloj
    retrocede. `JSON.parse` puede devolver `Infinity` (`1e999`): timestamps de save siempre
    con `Number.isFinite` (lección ronda 18).
15. **Todo copy nuevo entra en `es.js` Y `en.js` con traducción real de una** (el inglés ya
    shippeó en la ronda 16; no hay "placeholder en español" nunca más). Data nueva con nombre
    visible → entrada en `data-en.js`. Los tests de paridad de la ronda 16 lo vigilan.
16. Appends a `agentes/HANDOFF.md`: escribir el bloque a un archivo temporal (Write) y
    appendear con `cat archivo >> agentes/HANDOFF.md` en Bash — el heredoc multilínea se rompió
    con CRLF en la ronda 18.
17. **Cada ronda que agrega estado persistente bumpea `SAVE_VERSION`** (v10..v16, ver tabla §2)
    con su migración en `save.js` (backfill de defaults, nunca fabricar contenido que "lave"
    un save inválido — ver el comentario de la migración v6→v7) y tests de migración.
18. **El puesto y todo sistema nuevo degrada limpio**: si el jugador no lo desbloqueó, el juego
    es EXACTAMENTE el de hoy (los e2e existentes deben pasar sin tocarse — recontá el baseline
    al ejecutar —, salvo que una ronda declare lo contrario explícitamente).

---

## 2. Cobertura: idea → ronda (ninguna se queda afuera)

| Idea | Origen | Ronda | Save |
|---|---|---|---|
| Racha, estadísticas, completitud, secretos, vibración, botón JUGAR | usuario + brainstorm | **19 (HECHA)** | v8 |
| Trampas con grados + indicios, herramientas, contenedores con mecánica | postre + brainstorm | **20 (HECHA)** | v9 |
| ~~Espiar un slot gastando Energía~~ | postre PLAN.md | 20 (HECHA) — **se REMUEVE en la 21** (usuario 2026-07-14) | v9 |
| **Remoción de Energía/espionaje + fixes de UI (prompt en inglés, racha tapada, Tools/Stats fuera de Ajustes)** | usuario (2026-07-14) | **21** | v10 |
| Sets de colección con bonus | brainstorm | **22** | v11 |
| Legendarios 1-en-500 + vitrina/salón de trofeos | postre PLAN.md | 22 | v11 |
| **Puesto de venta + inventario + NPC + robot vendedor** | usuario | **23** | v12 |
| Pedidos de compradores (sobreprecio por categoría) | brainstorm | 23 | v12 |
| Negociación de venta / timing de mercado (marketFluctuation visible) | postre PLAN.md | 23 | v12 |
| NPCs con retrato y personalidad + historia liviana por prestigio | usuario | 23 | v12 |
| **Misiones diarias (3) con recompensa según progreso, llaves** | usuario | **24** | v13 |
| Eventos de contenedor dorado / en llamas | postre PLAN.md | 24 | v13 |
| Ciclo día/noche (hora del sistema) | postre PLAN.md | 24 | v13 |
| Especializaciones al prestigiar | postre PLAN.md | **25** | v14 |
| Desafíos / runs con modificador | brainstorm | 25 | v14 |
| Nodos infinitos del árbol | brainstorm | 25 | v14 |
| Segunda capa de prestigio ("Mudanza de Galaxia", Escrituras) | brainstorm | **26** | v15 |
| Contenedores procedurales post-Big Bang | brainstorm | 26 | v15 |
| Sufijos numéricos extendidos (Qa, Qi, …) | regla CLAUDE.md | 26 | v15 |
| Flota de robots asignables | brainstorm | **27** | v16 |
| Filtros por robot (umbral, reservar para el puesto) | brainstorm | 27 | v16 |
| **Rediseño estético: retoque profundo de la paleta (tokens)** | usuario (2026-07-14) | **28** | — |
| **Objetos ilustrados reales en el canvas de escarbado (no íconos)** | usuario (2026-07-12) | **29** | — |
| **Imágenes reales de contenedores (assets del usuario)** | usuario (2026-07-14) | **30** | — |
| Idiomas pt/fr/de | postre ROADMAPv3 §7 | **31** | — |
| Re-auditoría global + release final | proceso | 31 | — |

Filas ELIMINADAS del alcance el 2026-07-14 (desaprobadas por el usuario): «Temas/skins por
tokens CSS, desbloqueables», «Puerta al DLC cosmético (PLAN.md §8)» y «Leaderboards de Steam»
— ver "Fuera de alcance explícito" al final.

Ya implementadas antes de v4 (no repetir): progreso offline visible (modal), colección/álbum
(INDEX rondas 7-14), partículas/sonido por rareza (juice ronda 12).

---

## 3. Diseño transversal (leer antes de cualquier ronda)

### 3.1 NPCs (se crean en la ronda 23; los usan la 24, 26 y 27)

Cinco personajes fijos, data en `apps/game/src/data/npcs.json`
(`{ id, name, portrait, rol }`), retratos SVG en `apps/game/src/icons/portraits.js` (nuevo
registro hermano de `icons.js`, mismo vocabulario de shapes, viewBox 24, cero emojis).
Diálogos SIEMPRE por claves i18n `npc.<npcId>.<contexto>` (es.js + en.js reales).

| id | Nombre | Rol |
|---|---|---|
| `rita` | Doña Rita | Compradora fija del Puesto (ronda 23). Jubilada coleccionista, paga bien y opina de todo. |
| `salomon` | El Turco Salomón | Pedidos especiales del Puesto (ronda 23). Regateador teatral. |
| `chispa` | Chispa | Pibe fanático de robots. Da las misiones diarias (ronda 24) y el flavor de la flota (ronda 27). |
| `zoraida` | Madame Zoraida | Vidente del barrio. Anuncia eventos dorados y el ciclo día/noche (ronda 24). |
| `intendente` | El Intendente | Historia de prestigio: en cada ciudad reaparece con otro cargo (running gag); presenta la Mudanza de Galaxia (ronda 26). |

### 3.2 Historia liviana

`apps/game/src/data/story.json`: viñetas de 2-3 líneas
(`{ id, npcId, cond: {type,...}, textKey }`) que se muestran UNA vez en el modal de
celebración existente (patrón ronda 12), con `state.storySeen: string[]` para no repetir.
Hitos mínimos: desbloqueo del Puesto (Rita se presenta), primer pedido cumplido (Salomón),
primera misión diaria (Chispa), primer evento dorado (Zoraida), cada prestigio 1/3/6/10
(Intendente, cargo nuevo), primera Mudanza de Galaxia (Intendente galáctico). Los cond types
reusan `CONDITION_EVALUATORS` de achievements.js — si falta uno, se agrega ahí (un solo
motor de condiciones para logros, historia y misiones).

### 3.3 Relojes seguros

Módulo nuevo `packages/engine/src/time.js` con helpers puros y testeados:
`clampedElapsedMs(now, since)` (≥ 0, y 0 si algún operando no es finito) y
`localDayStamp(now)` (`'YYYY-MM-DD'` local). TODO sistema temporal nuevo (pedidos, misiones,
eventos) pasa por acá. Nada de `Date.now()` crudo restado a un campo de save.

### 3.4 Convención de logros nuevos

Cada ronda agrega los suyos AL FINAL de `achievements.json` (ids consecutivos `a42`, `a43`, …
— recontá el último real al ejecutar, no asumas). OJO: **`a39` es un hueco PERMANENTE** (logro
de espionaje removido en la ronda 21) — no lo reuses jamás. Recompensas siguen el principio de
la ronda 15: dinero ≈ 10% del hito, llaves para hitos duros. La ronda 31 regenera la tabla de
RELEASE.md con `node tools/steam/achievements-table.mjs` (el usuario re-registra en Steamworks).

### 3.5 Contratos entre rondas (análisis de dependencias 2026-07-12, renumerado 2026-07-14 — respetarlos a rajatabla)

El orden 21→31 se eligió por dependencia técnica; estos son los contratos exactos que lo
sostienen. Si tu ronda rompe uno, detenete y reportá:

1. La **racha** (19, hecha) se corta con trampa de CUALQUIER grado (20, hecha); los grados NO
   cambian la probabilidad de trampa (§4.6 intacto).
2. Los contenedores especiales de la 20 usan `fueraDeCadena: true` (ya implementado) — único
   cambio permitido a `isContainerUnlocked`.
3. Los **legendarios** (22) se venden instantáneo SIEMPRE: jamás entran al inventario del
   Puesto (23) ni los toca el robot vendedor; su persistencia es `legendariesFound` (vitrina).
   El filtro de la 27 depende de esta regla.
4. La 24 consume contadores creados por la 19 (`digStreak`) y la 23 (`stallSoldCount`,
   `ordersFulfilledCount`); las misiones de puesto solo se generan con puesto desbloqueado.
5. La 26 consume `totalKeysEarned` (creado y backfilleado en la 25) y crea `flotaFundadora`,
   que consume la 27. La 27 además consume el inventario de la 23.
6. Los contenedores **procedurales** (26) quedan FUERA de: INDEX, sets (22), % de completitud
   (19) y generación de misiones (24). Solo existen para Tienda, escarbado y automatización.
   (Sin esta regla, cada tier Eco sería un "set" nuevo → bonus infinito, bug de balance.)
7. El arte ilustrado (29) cubre TODO ítem existente al ejecutarse; los procedurales reusan el
   arte del pool del Big Bang. Por eso la 29 va después de la última ronda que crea ítems (la 26).
8. Las **imágenes de contenedores** (30) cubren todo contenedor de `containers.json` al
   ejecutarse; los tiers procedurales (26) reusan la imagen de `vertederoBigBang`. La ronda 30
   arranca BLOQUEADA hasta que el usuario suba los PNG al repo.

(El contrato viejo sobre los temas `dorado`/`neonNocturno` se eliminó junto con la ronda de
skins, 2026-07-14.)

### 3.6 Numeración de PLAN.md §4

PLAN.md ya llegó a §4.24 (indicios y contenedores con mecánica, ronda 20), y tras la ronda 21
§4.22 queda como tombstone de la remoción de energía/espionaje (NO se renumera lo existente).
Las secciones que este roadmap manda a escribir arrancan en **§4.25** y siguen consecutivas.
Verificá el último § real de PLAN.md al ejecutar tu ronda y corré la numeración si difiere:
el contenido manda, no el número.

---
---

# RONDA 21 — Limpieza: remoción de Energía/espionaje + fixes de UI (rama `feat/limpieza-ronda21`, 1 agente, save v10)

> Decisión del usuario (2026-07-14): el espionaje "es totalmente inútil" — se desmonta ENTERO
> (engine, data, UI, i18n, logros, tests) sin dejar fragmentos residuales. La misma ronda
> arregla tres deudas de UI detectadas jugando. Dos aclaraciones para no borrar de más:
> `gravesHit` y el logro `a40` ("Nueve Vidas") parecen del espionaje pero son del sistema de
> **trampas graves** — QUEDAN; y las **herramientas** (`equippedTool`/`toolsOwned`,
> `data/tools.json`, `getToolRadiusMult`/`getToolRhythmMult`) también quedan — solo se mudan
> de vista.

## 21.1 PLAN.md primero

- §4.22 se elimina y queda como **tombstone**: "### 4.22 — (removido) Energía y espionaje:
  removido por decisión del usuario 2026-07-14 (ronda 21 de ROADMAPv4)". NO renumerar los §
  siguientes (§4.23 herramientas y §4.24 indicios quedan como están).
- Editar las otras menciones al espionaje manual en PLAN.md (grep `espiar|espia|energía`):
  la visión (~línea 75, "El jugador puede espiar antes de comprometerse"), el trade-off del
  robot (~línea 169, "no puede espiar antes de comprometerse" — reescribir: el robot escarba a
  ciegas y sin criterio, por eso sufre más trampas que el jugador manual) y el postre
  (~línea 756, la idea de gastar energía para revelar un slot — marcarla descartada).
- §5.4: la pantalla de Estadísticas pasa de "subvista de Ajustes" a "vista propia abierta desde
  el header"; el selector de herramientas pasa a "sección de la vista Escarbar".

## 21.2 Estado y save (v10)

`SAVE_VERSION = 10`. La migración v9→v10 es la **PRIMERA del repo que ELIMINA campos**: borra
`energy`, `energyAt` y `spiesUsed` del save y filtra `a39` de los logros desbloqueados (patrón
`sanitizeContainerRefs`: filtrar ids muertos NO es "lavar" un save inválido — los valores
basura en otros campos se siguen rechazando como siempre). Sacar los 3 campos de
`freshState()`, del JSDoc de `GameState` (state.js), de `REQUIRED_FIELDS` y de
`validateDeepContent()` (save.js). Documentar en save.js el patrón "migración que borra
campos": la ronda 27 lo reusa para `autoTargetContainerId`. `gravesHit` NO se toca.

## 21.3 Tareas

1. **Engine**: borrar `regenEnergy` y `spendEnergyToSpy` (economy.js, bloque "Energía y
   espionaje"), `spySlot` (systems/containers.js) y sus reexports en index.js; quitar el
   evaluador `spiesUsedAtLeast` de systems/achievements.js. El resto de la ronda 20 (grados de
   trampa, herramientas, contenedores especiales) queda intacto.
2. **Data**: borrar `apps/game/src/data/energy.json` (y su inyección como `data.energy` en el
   boot); quitar el logro `a39` ("Ojo Que Todo Lo Ve") de achievements.json. Los ids de logros
   NO se renumeran: `a40`/`a41` quedan como están y el hueco `a39` se documenta (§3.4).
   Limpiar aliases de íconos huérfanos (`eye-wide`, `energy-crystal` en icons.js) SOLO si un
   grep confirma que ningún otro consumidor los usa.
3. **UI**: borrar `#dig-energy-pill` y `#dig-spy-panel` (index.html), `renderDigEnergyPill`/
   `renderDigSpyPanel` y el handler `spy-slot` (UIManager.js), las acciones `spyDigSlot`/
   `tickEnergy` (store.js) y la llamada `tickEnergy()` del loop (loop.js).
4. **i18n**: borrar `dig.energyLabel`, `dig.spyButton`, `dig.spyDisabledNoEnergy`,
   `dig.spyResultTrap` y `dig.spyResultCategory` de es.js Y en.js (los tests de paridad de la
   ronda 16 vigilan que queden espejados).
5. **Fix del prompt en inglés**: `DigCanvas` setea `t('dig.idlePrompt')` UNA sola vez en el
   constructor y nunca lo re-traduce — el jugador en inglés ve "Arrastrá para escarbar".
   Exponer un método en DigCanvas (p. ej. `refreshTexts()`) y llamarlo desde
   `UIManager.refreshStaticTexts()` (donde ya se re-traducen los tabs y "Abandonar").
6. **Fix de la racha tapada**: al escarbar, el overlay/título del canvas tapa la píldora de
   racha (`.dig-streak-pill`, components.css — hoy `top: var(--space-2)`, `z-index: 2`, en la
   misma franja superior que cubre `.scavenge-card`). Reposicionarla (y/o subir su z-index)
   para que sea SIEMPRE visible durante el escarbado activo sin tapar ella el canvas ni el
   título del contenedor. Verificación manual a 375px escarbando de verdad.
7. **Tools a Escarbar**: extraer `renderToolsSection` de SettingsView.js a una sección propia
   de la vista Escarbar (donde las herramientas se usan), con los mismos handlers
   `buy-tool`/`equip-tool` despachando al engine (costos/estado deshabilitado con tooltip
   "cuánto falta", regla CLAUDE.md); el bloque desaparece de Ajustes.
8. **Stats al header**: extraer `renderStatsSection` de SettingsView.js a una vista propia
   abierta por un botón nuevo en el header (patrón exacto de `#settings-btn` →
   `activeTab='ajustes'` en UIManager). Ícono nuevo al registro icons.js (cero emojis).
   Estados cargando/vacío/error/con-datos; copy nuevo en es+en.

## 21.4 Tests

- RED de migración v10: un save v9 real migra limpio (los 3 campos desaparecen del
  serializado, todo lo demás intacto); `a39` desbloqueado se filtra sin rechazar el save;
  round-trip serialize/deserialize v10 sin pérdida; export/import ida y vuelta.
- Actualizar los tests de la ronda 20: borrar los de `regenEnergy`/`spendEnergyToSpy`/`spySlot`
  (ronda20-dig-profundo.test.js) y los del logro de espionaje (ronda20c-logros-espionaje.test.js
  — CONSERVAR los de `gravesHitAtLeast`); conservar TODOS los de herramientas y trampas.
- e2e: `ronda20-dig.spec.js` pierde el test de espiar; spec nuevo (`ronda21-limpieza.spec.js`):
  cambiar idioma a inglés → el prompt del canvas dice "Drag to dig"; racha visible DURANTE un
  escarbado activo; selector de herramientas visible y operable en Escarbar; Estadísticas abre
  desde el header y muestra valores del seed; Ajustes ya no contiene ninguno de los dos bloques.
- **Grep de cierre obligatorio**: `energy|energia|espiar|spy` sin restos en `packages/`,
  `apps/game/src` y `apps/game/e2e` (los docs históricos HANDOFF/roadmaps viejos NO se tocan).

## 21.5 Riesgos

- R21.1 La migración que borra campos es NUEVA en el repo: cubrir el round-trip v10 y el
  import de un v9 real exportado; documentar el precedente (la ronda 27 lo reusa).
- R21.2 Mover Tools/Stats rompe e2e existentes que naveguen a Ajustes (rondas 19/20):
  actualizarlos en la misma ronda, no desactivarlos ni saltearlos.
- R21.3 El fix de la racha no debe achicar el área táctil del canvas ni interferir el gesto
  (`touch-action: none`, CLAUDE.md): verificar el gesto completo en mobile tras el cambio.

## 21.6 DoD

```
npm test + npm run test:e2e verdes (baseline recontado y anotado en HANDOFF)
Manual 375px: prompt en inglés correcto, racha visible escarbando, tools en Escarbar, stats desde el header
Grep de cierre sin restos de energía/espionaje en código/data/i18n/e2e
Commit "feat: ronda 21 — remoción de energía/espionaje y fixes de UI (save v10)"
HANDOFF + push + PR link
```

---

# RONDA 22 — Colección con dientes: sets, legendarios, vitrina (rama `feat/coleccion-ronda22`, 1 agente, save v11)

## 22.1 PLAN.md primero

- §4.25 **Sets**: completar el pool entero de un contenedor (todos sus ítems en
  `itemsFoundByItem`) otorga permanente `+setBonusPercent` al valor de venta de ESE contenedor.
  `data/collectionSets.json`: `{ "setBonusPercent": 0.02 }` (AJUSTE: +2%, suma con
  `levelValueMultPerLevel` sin romper §3). Derivado del estado — sin campo nuevo.
- §4.26 **Legendarios**: 1 ítem único por categoría (8 en total), FUERA de los pools normales
  (`data/legendaries.json`: `{ id, name, icon, categoria, valorBase }`, valorBase ≈ 40× el
  mejor ítem normal de su categoría). Tras un roll SIN trampa, con probabilidad
  `legendaryChance: 1/500` por escarbado (constante en el mismo json) y solo si la categoría
  rolleada en el slot 1 coincide y aún no se posee, el legendario REEMPLAZA el ítem del slot 1.
  Se registra en `state.legendariesFound: string[]` y NO entra en `itemsFoundByItem` (la
  vitrina es su casa). Solo escarbado manual (el robot no encuentra legendarios — son el
  premio del jugador activo).

## 22.2 Estado y save (v11)

`legendariesFound: []` (validar: array de strings; ids desconocidos se filtran al cargar en
el store contra legendaries.json — patrón `sanitizeContainerRefs`).

## 22.3 Tareas

1. Data: `legendaries.json` (8, nombres con la inventiva de la ronda 15: "La Primera Lata",
   "El Ancla del Diluvio"…), íconos con bloom de rareza alta (§5.2), 4 logros: primer
   legendario / 4 legendarios / los 8 (oculto) / primer set completo — cond types
   `legendariesFoundAtLeast`, `setsCompletedAtLeast` (sets contados derivando de
   `itemsFoundByItem` vs pools, nunca contador paralelo).
2. Engine: roll de legendario en `rollContainerResult` (con el `random` inyectable);
   `getSetBonus(state, container, itemsData)` en economy.js aplicado en el camino de
   `itemSaleValue`; tests RED de todo (incluye: legendario repetido imposible, robot jamás
   rollea legendario, set bonus exacto, valor del legendario entra al `moneyDelta` correcto).
3. UI: sección **Vitrina** al final del INDEX (grilla de 8 pedestales: silueta "???" →
   pieza con glow al obtener; estados vacío/con datos); tarjeta de contenedor muestra
   "SET COMPLETO +2%" cuando aplica; celebración especial al hallar legendario (modal ronda 12
   + partícula dorada + sonido — juice obligatorio).
4. e2e (`ronda22-coleccion.spec.js`): seed con pool completo → INDEX muestra "SET COMPLETO";
   seed con `legendariesFound` → vitrina lo exhibe; vitrina vacía muestra su empty state.

## 22.4 Riesgos

- R22.1 El legendario reemplaza el slot 1 ANTES de calcular `moneyDelta` (o se recalcula) —
  fijarlo con un test explícito del total.
- R22.2 `legendariesFound` con id desconocido (save manipulado / data renombrada): se filtra
  al cargar, nunca crashea la vitrina.
- R22.3 El % de completitud de la ronda 19 muestra los legendarios en contador APARTE
  ("Vitrina 3/8") — no ensucia el % de pools.

## 22.5 — DoD patrón estándar (tests verdes + manual 375px + commit + HANDOFF + push).

---

# RONDA 23 — EL PUESTO DE CHATARRA: inventario, NPCs, historia, robot vendedor (rama `feat/puesto-ronda23`, 5 agentes A→E, save v12)

> La ronda más grande de v4. Decisión del usuario: inventario real con umbral configurable,
> venta instantánea preservada como default y red de seguridad, desbloqueo avanzada la
> progresión (el tutorial NO se toca), robot vendedor que trabaja el inventario.

## 23.A — Agente A (engine): inventario + captura + venta

### PLAN.md primero

- §2.9 **El Puesto de Chatarra** (concepto): un puesto físico que el jugador compra en la
  Tienda por `stallCost: 30000` (AJUSTE: llega entre los tiers 4-5 de contenedor, ~30-60 min
  de juego — cumple "no gravar al jugador nuevo"). Con el puesto:
  - **Captura**: en `applyContainerResult`, si `stallLevel >= 1` y `keepThreshold > 0` y
    `item.value >= keepThreshold` y `inventory.length < capacidad` → el ítem va a
    `state.inventory` (guarda `{ itemId, containerId, categoria, baseValue }` con `baseValue`
    SIN fluctuación de mercado) en vez de sumarse a `money`. Si no cumple CUALQUIERA de las
    condiciones → venta instantánea de siempre. **El loot jamás se pierde.**
  - `keepThreshold: 0` = puesto en pausa (default al comprar). El jugador lo setea en la UI
    ("guardá lo que valga $X o más").
  - `rollContainerResult` expone en cada ítem `baseValue` (el MISMO cálculo con fluctuación 1)
    además de `value` — la captura persiste `baseValue` (si guardara `value`, la fluctuación
    del momento de hallazgo se aplicaría DOS veces al vender); el umbral compara contra
    `value` (lo que valdría vendido ya).
  - **Los legendarios (ronda 22) NUNCA se capturan**: venta instantánea siempre — su trofeo es
    la vitrina (contrato §3.5.3; el filtro del robot vendedor de la ronda 27 depende de esto).
  - **El progreso offline usa SOLO venta instantánea** para el loot nuevo (el modal offline no
    gestiona inventario); el robot vendedor SÍ vende offline lo ya guardado (ver §4.29).
- §4.27 **Precio de venta en el puesto**:
  `precioPuesto = baseValue × fluctuacionMercadoActual × (stallMultBase + stallMultPorNivel × (stallLevel - 1))`
  con `stallMultBase: 1.25`, `stallMultPorNivel: 0.05`, `stallNivelMax: 5` (costo de subir de
  nivel: `stallCost × 4^(nivel-1)`). La fluctuación se toma AL VENDER, no al guardar — esa es
  la mecánica de "negociación/timing" del postre de PLAN.md: guardar y vender cuando la
  cotización está alta. Toda acción de venta (manual o del robot) REFRESCA primero la
  fluctuación con el mismo helper del roll (`refreshMarketFluctuation`, rng.js) — si no, un
  jugador que no escarba vendería para siempre con la cotización congelada.
- §4.28 **Pedidos**: 2 activos, rotan cada `orderRotationMs: 1200000` (20 min, reloj clampeado
  §3.3) o al cumplirse. Un pedido = `{ npcId, categoria, cantidad (2-4), mult }` con
  `orderMult: 1.4` sobre `precioPuesto`. Generación con `random` inyectable sobre las
  categorías de los contenedores POSEÍDOS (nunca pedir lo inalcanzable).
- §4.29 **Robot vendedor** (máquina nueva en `automations.json`): vende 1 ítem del inventario
  cada `vendedorIntervalo: 20` s (en `automationTick`, mismo reloj por delta): prioridad
  (1) ítems que satisfacen un pedido activo, (2) el de mayor `baseValue`. Vende a
  `precioPuesto` (con mult de pedido si aplica). OFFLINE: dentro de `applyOfflineProgress`,
  vende a fluctuación 1 (sin timing gratis mientras dormís).

### Estado y save (v12)

`inventory: []` (validar CADA elemento: forma exacta, `baseValue` finito > 0, `itemId`/
`containerId`/`categoria` strings; elementos inválidos → save RECHAZADO, no lavado — regla de
la migración v6→v7), `stallLevel: 0`, `keepThreshold: 0`, `stallOrders: []` (misma dureza),
`ordersRotatedAt: 0`, `stallSoldCount: 0`, `ordersFulfilledCount: 0`, `storySeen: []`.
Capacidad: `stallCapacityBase: 12` + `stallCapacityPorNivel: 6` (constantes en
`data/stall.json`, junto con TODAS las de §4.27-4.29).

### Tests RED (los mínimos duros)

Captura respeta umbral/capacidad/fallback; `keepThreshold: 0` = juego idéntico a hoy
(snapshot de `applyContainerResult` con y sin puesto nivel 0); precio con fluctuación al
vender; pedido cumple y paga mult; rotación clampeada (reloj atrás = no rota); robot vendedor
prioriza pedidos y vende offline a fluctuación 1; migración v12; save con `inventory`
manipulado (`baseValue: 1e999`, ítem objeto-basura, array más grande que la capacidad máxima
teórica) se RECHAZA.

## 23.B — Agente B (data): NPCs, retratos, historia, textos

`npcs.json` y `portraits.js` (§3.1), `story.json` (§3.2 — los hitos de esta ronda: Rita al
comprar el puesto, Salomón al primer pedido), `stall.json`, máquina `robotVendedor` en
`automations.json` (`cost: 2000000`, insertada manteniendo el orden por costo — regla de la
ronda 15.C), diálogos es+en (Rita comenta la venta según categoría — 3-4 variantes),
3 logros: primer ítem guardado / 25 pedidos cumplidos (`ordersFulfilledAtLeast`) / puesto
nivel máximo (`stallLevelAtLeast`). Íconos: puesto, estantería, cartel de pedido, retratos.

## 23.C — Agente C (UI): pestaña Puesto

Nueva pestaña **Puesto** en el tabbar (verificar que las 7 pestañas entren a 375px; si no
entran, el tabbar scrollea horizontal con snap — documentar la decisión; el precedente de
tabbar es la ronda 17). Contenido:
- Bloqueado: teaser con silueta + "Se desbloquea comprando el Puesto en la Tienda" (la Tienda
  gana la tarjeta del puesto).
- Activo: Doña Rita con retrato + diálogo; **cotización del día** (fluctuación como % con
  flecha, por fin visible); inventario en grilla (ícono, nombre, `precioPuesto` actual, botón
  Vender con tween de dinero); control del umbral (input numérico con presets que la UI PIDE
  al engine — percentiles del mejor contenedor —, jamás calculados en la UI); pedidos de
  Salomón como 2 tarjetas (progreso x/n, recompensa, tiempo restante); nivel del puesto con
  botón de mejora (costo del engine).
- Estados: cargando / vacío ("El puesto está vacío — subí el umbral o escarbá algo bueno") /
  error / con datos. El sync de idioma re-renderiza diálogos (patrón UIManager ronda 16).

## 23.D — Agente D (e2e): `ronda23-puesto.spec.js`

1. Sin puesto: juego idéntico (un escarbado con ítem valioso va directo a `#money`).
2. Seed con puesto + umbral: el ítem valioso aparece en el inventario y el dinero NO sube;
   venderlo manualmente sube `#money` (polling).
3. Pedido sembrado + inventario que lo satisface → cumplir paga el mult (comparar contra
   vender sin pedido).
4. Robot vendedor sembrado → el inventario baja solo. Si el intervalo de 20s no es viable en
   e2e, cubrirlo en engine y aquí solo smoke del estado visible — documentar la decisión
   (precedente: 15.D con el descarte de trampas).
5. Viñeta de Rita aparece UNA vez (recargar → no repite: `storySeen` persistió).

## 23.E — Agente E: auditoría Verif&Audit.md del diff completo

Focos: `inventory` es el vector de save más rico hasta ahora (¿qué pasa el typeof pero rompe
la UI? — strings HTML en `itemId` interpolado, `baseValue` Infinity, arrays anidados);
pedidos/fluctuación con relojes manipulados; XSS vía diálogos NPC (params interpolados);
frontera engine↔UI (percentiles, precios — TODO del engine). Arreglar 🔴/🟡 con tests.
Manual 375px completo.

## Riesgos de la ronda 23

- R23.1 **El tabbar con 7 pestañas a 375px** es el riesgo de UX #1 — resolverlo ANTES de
  seguir (la auditoría 11 ya mordió acá; ver HANDOFF ronda 17).
- R23.2 La captura toca `applyContainerResult`, el corazón de la economía: el snapshot-test
  "sin puesto = idéntico" es OBLIGATORIO y va primero.
- R23.3 Offline + inventario: el vendedor offline NO debe duplicar la venta del período online
  (orden: primero vendedor offline sobre inventario persistido, después venta instantánea del
  loot offline).
- R23.4 `storySeen`/pedidos con ids que ya no existen en data: filtrar al cargar (patrón
  `sanitizeContainerRefs`).

---

# RONDA 24 — Retención: misiones diarias, eventos, día/noche (rama `feat/retencion-ronda24`, 1 agente, save v13)

## 24.1 PLAN.md primero

- §4.30 **Misiones diarias**: 3 por día (fácil / media / difícil). Regeneración: al abrir el
  juego, si `localDayStamp(now) !== localDayStamp(missionsRolledAt)` **y**
  `now > missionsRolledAt` (anti reloj-hacia-atrás, §3.3) → rerollear las 3 (el progreso no
  reclamado se pierde — es diario). Tipos data-driven en `data/missions.json`, generados con
  `random` inyectable y SOLO sobre contenido alcanzable (contenedores poseídos, puesto solo si
  está desbloqueado):

| tipo | plantilla | dificultad |
|---|---|---|
| `findCategoryCount` | "Encontrá {n} objetos de {categoria}" | fácil n=8 / media n=25 |
| `digContainerCount` | "Escarbá {n} veces {contenedor}" | fácil n=6 / media n=15 |
| `streakReach` | "Llegá a una racha de {n}" | media n=8 / difícil n=15 |
| `sellAtStallCount` | "Vendé {n} objetos en el Puesto" | media n=5 (solo con puesto) |
| `fulfillOrders` | "Cumplí {n} pedidos" | difícil n=2 (solo con puesto) |
| `moneyEarnedToday` | "Ganá {monto} hoy" | difícil, monto = fórmula abajo |

- §4.31 **Recompensas acordes al progreso** (pedido del usuario): sea
  `V = valorMedioDelPool(mejorContenedorPoseído) × slotsDeEseContenedor` (el engine expone
  `V`; la UI jamás lo calcula):
  fácil → `6 × V` de dinero; media → `15 × V`; **difícil → `1 + floor(prestigeCount / 3)`
  Llaves de Ciudad (cap 5)**. `moneyEarnedToday` usa `monto = 40 × V`. Constantes (6/15/40,
  cap 5) en missions.json con su `AJUSTE:`.
- §4.32 **Eventos de contenedor**: si no hay evento activo y
  `clampedElapsedMs(now, lastEventAt) > eventoCooldownMs (600000)`, cada tick tiene
  probabilidad `dt / 600` de disparar uno (esperanza ~10 min de juego activo) sobre un
  contenedor poseído al azar: **Dorado** (70%): `valor ×3` por `75` s. **En Llamas** (30%):
  `valor ×4` y `probTrampa +0.15` por `75` s. El evento activo es estado TRANSITORIO (no se
  persiste: cerrar el juego lo pierde — decisión: elimina todo exploit de reloj).
- §4.33 **Día/noche**: noche = hora local ∈ [20:00, 06:00): `Suerte +3` y `probTrampa +0.03`
  (constantes `data/dayNight.json`). Las funciones puras reciben `hour` como parámetro —
  testeables sin mock global.

## 24.2 Estado y save (v13)

`dailyMissions: []` (elementos `{ id, type, params, target, progress, claimed }`, validación
dura de forma y finitud), `missionsRolledAt: 0`, `missionsCompletedCount: 0`,
`lastEventAt: 0` (persistido para que reabrir no regale un evento instantáneo).

## 24.3 Tareas

Data (missions.json, dayNight.json, 3 logros: 10 misiones / 50 misiones (oculto) / primer
evento aprovechado — cond `missionsCompletedAtLeast` + contador de eventos usados) →
Engine (reroll; progreso por DELTAS contra snapshot tomado al rollear sobre los contadores
existentes — `itemsFoundByCategory`, `stallSoldCount`, `totalMoneyEarned`, etc. — nada de
tracking paralelo; typedef del mecanismo. EXCEPCIÓN `streakReach`: la racha sube Y baja, así
que el delta no sirve — su progreso es el MÁXIMO `digStreak` observado desde el roll, actualizado
en el mismo punto del engine que actualiza la racha) → tests RED (reroll con las 4 manipulaciones de reloj;
recompensas escalan con el mejor contenedor del seed; evento expira; noche/día por hora
inyectada) → UI (las misiones viven como sección del Puesto si está desbloqueado o de Logros
si no — decidir por espacio y documentar; Chispa de quest-giver con retrato + diálogo;
3 tarjetas con progreso y botón Reclamar con juice; banner de evento sobre la tarjeta del
contenedor con glow dorado/llamas + countdown; indicador luna/sol en el topbar con tooltip
de Zoraida) → e2e (`ronda24-retencion.spec.js`): misiones sembradas muestran progreso real
tras escarbar; reclamar paga (polling); seed `missionsRolledAt` de ayer → al bootear hay 3
misiones nuevas; seed de hoy → NO rerollea.

## 24.4 Riesgos

- R24.1 El snapshot de progreso es LA trampa: si las misiones cuentan con listeners en vez de
  deltas contra snapshot, el robot/offline las infla. Delta = `contadorActual − snapshotAlRollear`,
  clampeado ≥ 0.
- R24.2 Día/noche cambia stats efectivas: los tests de economía existentes corren con hora
  inyectada FIJA de día (12:00) para no volverse flaky según cuándo corra CI.
- R24.3 El evento muta el valor del roll: aplicarlo como multiplicador transitorio del store
  hacia `rollContainerResult`, NUNCA persistido.
- R24.4 **Día/noche vuelve flaky cualquier e2e que corra de noche** (Suerte +3 y trampa +0.03
  reales en el Chromium del test): los specs NUEVOS fijan la hora con `page.clock.install()`
  (Playwright ≥ 1.45; el repo pinea ^1.61) a las 12:00. Además, AUDITAR los e2e EXISTENTES:
  correr la suite completa una vez con `page.clock` simulando las 23:00 (fixture temporal) y
  confirmar que ninguno depende de valores afectados; el que dependa, fija su hora en el spec.
  Documentar el resultado de esa corrida en HANDOFF.

## 24.5 — DoD patrón estándar + verificación manual con el reloj del sistema cambiado a mano
(documentar el resultado en HANDOFF).

---

# RONDA 25 — Prestigio profundo: especializaciones, desafíos, nodos infinitos (rama `feat/prestigio-ronda25`, 1 agente, save v14)

## 25.1 PLAN.md primero

- §4.34 **Especializaciones**: al prestigiar (y solo ahí) se elige 1 de 3, o "Sin
  especialización". Dura hasta el próximo prestigio. `data/specializations.json`:

| id | name | bonus (sellMult) | penalidad (sellMult resto) |
|---|---|---|---|
| `coleccionista` | Coleccionista | ×1.5 en `antiques`, `art`, `relics` | ×0.85 |
| `chatarrero` | Chatarrero | ×1.5 en `common`, `reusable`, `electronics` | ×0.85 |
| `anticuario` | Anticuario | ×1.5 en `historic`, `relics`, `future` | ×0.85 |

- §4.35 **Desafíos**: se ACTIVAN al prestigiar (reemplazan la elección de especialización en
  esa run — son excluyentes). `data/challenges.json` — cada uno:
  `{ id, name, desc, modifiers, goal, reward }`:

| id | modificador | objetivo (goal) | recompensa permanente |
|---|---|---|---|
| `manosVacias` | sin máquinas (no se pueden comprar) | `totalMoneyEarned` de la run ≥ 1e9 | +5% valor de venta global |
| `campoMinado` | `probTrampa ×2` (post-§4.6, clamp 0.95) | prestigiar | +1 Suerte permanente |
| `pulsoDebil` | Fuerza de Escarbado ×0.5 | prestigiar | +10% Fuerza permanente |
| `mercadoNegro` | fluctuación fija 0.8 | `totalMoneyEarned` de la run ≥ 1e10 | +0.1 a la fluctuación mínima |

  Recompensas = effect types nuevos evaluados en los getters correspondientes
  (`challengeEffectsOfType(state, data)`, espejo de `automationEffectsOfType`). Un desafío
  completado no se repite (sin recompensa doble).
  Nota dura sobre los goals de dinero: "de la run" = el contador POR RUN que ya alimenta la
  fórmula de Llaves (§4.3) — verificá su nombre real en el engine ANTES de implementar; si la
  fórmula usara un histórico y no existiera contador por run, se agrega en v14 (migración
  backfill: 0). NO uses `totalMoneyEarned` a secas: es histórico y completaría el desafío al
  instante en cualquier partida avanzada.
- §4.36 **Nodos infinitos**: 3 nodos nuevos SIN `nivelMaximo` (el campo pasa a opcional:
  ausente = infinito — la UI ya muestra "Máximo" cuando existe):
  `codiciaEterna` (+2% valor de venta global/nivel, costoBase 20, factor 2.0),
  `paladaEterna` (+3% Fuerza/nivel, costoBase 15, factor 1.9),
  `imanDeSuerte` (+1 Suerte/nivel, costoBase 25, factor 2.1). Sumidero infinito de Llaves.

## 25.2 Estado y save (v14)

`specialization: null` (string|null con allow-list — patrón `autoTargetContainerId`),
`activeChallenge: null` (ídem), `challengesCompleted: []` (strings),
`specializationsUsed: 0` (contador para su logro),
`totalKeysEarned: number` — **la migración v14 lo backfillea** con
`prestigeKeys + costoAcumulado(prestigeTreeLevels)` (computable desde la data del árbol; lo
necesita la fórmula de Escrituras de la ronda 26). Nota: la migración necesita la data del
árbol → se enhebra igual que `itemNameToId` en v7 (precedente en save.js).

## 25.3 Tareas

Data → Engine (el flujo de prestigio gana el paso de elección; modificadores de desafío en
los getters; goal chequeado al prestigiar y expuesto como cond-evaluator) → tests RED
(especialización aplica y expira al prestigiar; desafío activo modifica; completar paga UNA
vez; nodo sin `nivelMaximo` nunca topea y su costo crece; `totalKeysEarned` migra bien y suma
al ganar llaves) → UI (modal de prestigio: 3 tarjetas de especialización + pestaña/sección de
desafíos con estado activo/completado; badge de especialización o desafío activo visible en
Prestigio) → 4 logros (primer desafío / los 4 (oculto) / nodo infinito nivel 10 /
especialización usada 5 veces — contador `specializationsUsed`) → e2e
(`ronda25-prestigio.spec.js`: prestigiar eligiendo especialización y ver el sellMult
reflejado en un precio visible; desafío activo bloquea la compra de máquinas con su tooltip).

## 25.4 Riesgos

- R25.1 El flujo de prestigio resetea medio estado: la elección se aplica DESPUÉS del reset
  (la especialización sobrevive al reset de la run que arranca — obvio, pero testealo).
- R25.2 `nivelMaximo` opcional: TODO consumidor actual del campo (UI del árbol, validación,
  tests) debe tolerar ausencia — grep obligatorio de `nivelMaximo`.
- R25.3 Desafío y especialización son EXCLUYENTES por run — que la UI lo deje claro en el
  propio modal.

## 25.5 — DoD patrón estándar.

---

# RONDA 26 — Lategame infinito: Mudanza de Galaxia, contenedores procedurales, sufijos (rama `feat/lategame-ronda26`, 4 agentes A→D, save v15)

## 26.A — Engine: segunda capa de prestigio

### PLAN.md primero

- §2.10 **Mudanza de Galaxia**: disponible con `prestigeCount >= 10`. Resetea TODO lo que
  resetea un prestigio Y ADEMÁS: `prestigeKeys`, `prestigeTreeLevels`, `specialization`,
  `prestigeCount` (a 0). NO resetea: logros, colección/vitrina, sets, desafíos completados,
  herramientas, puesto y su nivel (el inventario se LIQUIDA a venta instantánea al mudarse —
  decisión: sin arbitraje entre galaxias), Escrituras y su árbol, `bestDigStreak`, contadores
  históricos. La tabla exhaustiva campo-por-campo se escribe PRIMERO como test RED (R26.1).
- §4.37 **Escrituras**: `escrituras = max(1, floor(sqrt(prestigeCount × totalKeysEarnedRun) / 5))`
  donde `totalKeysEarnedRun` = llaves ganadas desde la última mudanza. AJUSTE inicial: la
  primera mudanza (~10 prestigios, ~200-400 llaves) paga ~9-12 Escrituras; calibrar contra el
  árbol de abajo y documentar.
- §4.38 **Árbol de Escrituras** (`data/deedsTree.json`, 6 nodos, mismos mecanismos que
  prestigeTree): `ventajaGalactica` (+25% valor global/nivel, máx 4), `memoriaDeCiudades`
  (+1 Llave por prestigio/nivel, máx 3), `bolsilloCosmico` (+6 slots de inventario/nivel,
  máx 3), `agendaLlena` (+1 misión diaria/nivel, máx 2), `flotaFundadora` (+1 slot de robot,
  máx 2 — lo consume la ronda 27), `ecoDelBigBang` (desbloquea contenedores procedurales,
  máx 1).

### Estado y save (v15)

`deeds: 0`, `deedsTreeLevels: {}`, `galaxyMoveCount: 0`, `totalKeysEarnedRun: 0` (migración:
= `totalKeysEarned` de v14). Validación numérica dura estándar.

## 26.B — Contenedores procedurales + sufijos

- §4.39 **Tiers procedurales**: con `ecoDelBigBang` comprado, después de `vertederoBigBang`
  aparece `bigbangPlus1`, y al poseerlo `bigbangPlus2`, … — generados en runtime por una
  factory PURA del engine `proceduralContainer(n, baseContainer)`, NUNCA escritos a
  containers.json: `costoInicial × 15^n`, `resistencia × 1.32^n`,
  `probTrampaBase = min(0.5, 0.44 + 0.005n)`, pool = el del Big Bang con `valorBase × 13^n` y
  nombres "… (Eco {n})" por clave i18n con `{n}` (es+en). **Tope duro de `n`**: fijarlo con un
  test contra el rango de float64 (con costo base 1e18 y ×15^n, n=30 ya ronda 1e53 — decidir
  el tope donde el formateo de sufijos siga cubriendo, documentar el número elegido).
- **Validación de saves**: los ids `bigbangPlus<n>` entran a `ownedContainers`/`autoQueue` →
  `validContainerIds` acepta también el patrón `^bigbangPlus([1-9][0-9]?)$` con `n ≤ tope`
  (extender `sanitizeContainerRefs`/store con tests de ids hostiles: `bigbangPlus999`,
  `bigbangPlus01`, `bigbangPlus1e2`, `bigbangPlus-1`).
- **Colección y misiones** (contrato §3.5.6): los tiers procedurales NO aparecen en el INDEX,
  no cuentan para el % de completitud (19), no forman sets (22) y los generadores de misiones
  (24) los EXCLUYEN al elegir contenedor objetivo. Sus hallazgos SÍ suman `itemsFoundCount` y
  categorías (los logros siguen contando). Test que lo fije: poseer `bigbangPlus1` no cambia
  el denominador del % ni crea un set nuevo.
- **Sufijos** (regla CLAUDE.md: jamás notación científica cruda): extender el formateador a
  `K M B T Qa Qi Sx Sp Oc No Dc UDc DDc TDc QaDc QiDc` (1e3 … 1e48) con test de cada borde;
  el tope procedural se elige para que ningún número visible se quede sin sufijo.

## 26.C — UI + e2e

Pestaña Prestigio gana la sección "Mudanza de Galaxia" (bloqueada con tooltip antes del
prestigio 10; confirmación con resumen de lo que se pierde y lo que queda — patrón del
confirm de prestigio); árbol de Escrituras (reusa el componente del árbol); el Intendente
presenta la mudanza (viñeta story.json); la Tienda muestra el tier procedural siguiente.
3 logros: primera mudanza / 3 mudanzas / Eco 5 comprado (cond types sobre `galaxyMoveCount` y
ownedContainers procedurales). e2e (`ronda26-lategame.spec.js`): seed prestigio 10 → mudanza
disponible, ejecutarla resetea llaves y CONSERVA vitrina/logros (asserts sobre INDEX y árbol);
seed con `ecoDelBigBang` → el tier Eco 1 aparece y es comprable con money alto; un costo
≥ 1e21 se muestra con sufijo (assert de texto, jamás "e+21").

## 26.D — Auditoría (Verif&Audit.md sobre el diff)

Focos: la factory procedural con `n` hostil (0, negativo, 1e9, NaN → clamp/rechazo); mudanza
durante desafío activo (definir: el desafío se CANCELA sin recompensa — testearlo); overflow
de números; Escrituras con contadores manipulados (`Number.isFinite`).

## Riesgos de la ronda 26

- R26.1 La mudanza toca MÁS estado que el prestigio: el test-tabla "qué conserva / qué
  resetea" (campo por campo del GameState) se escribe RED antes de implementar.
- R26.2 Los ids procedurales son ahora parte del contrato de validación de saves — cambiar el
  patrón o el tope es breaking (documentarlo en save.js).
- R26.3 El "Auto" del robot (más caro afordable) debe considerar los tiers generados
  (`getQueueMax`/selección de target con contenedores que no están en containers.json).

---

# RONDA 27 — Flota de robots y filtros (rama `feat/flota-ronda27`, 1 agente, save v16)

## 27.1 PLAN.md primero

- §2.11 / §4.40 **Flota**: el robot actual pasa a ser el slot 1 de una flota. Slots extra: el
  2 lo da `flotaFundadora` (Escrituras, ronda 26) y el 3 una máquina nueva carísima
  (`hangarRobots`, cost 5e9, al final de automations.json por orden de costo). Cada robot:
  `{ targetContainerId: string|null (Auto), filters }`, procesando en paralelo. DECISIÓN de
  diseño a documentar en PLAN.md: los slots paralelos EXISTENTES (por máquinas,
  `getParallelAutoSlots`) pasan a ser "brazos" del robot 1; la flota multiplica robots
  enteros, cada uno con su target y sus filtros. La cola (`autoQueue`) sigue siendo GLOBAL y
  los robots toman de ahí (menor cambio de esquema).
- §4.41 **Filtros por robot** (los evalúa `automationTick`/el vendedor, NUNCA la UI):
  `descartarBajoValor: number` (0 = off; ítems con `value < X` se descartan directamente —
  higiene de lategame para no ensuciar inventario ni ruido), `reservarCategorias: string[]`
  (esas categorías van al inventario del puesto aunque estén bajo el umbral global). El robot
  vendedor (ronda 23) gana `mantenerStockPedidos: boolean` (no vender por debajo de lo que
  exige un pedido activo).

## 27.2 Estado y save (v16)

`robots: [{ targetContainerId: null, filters: {…defaults} }]`. **La migración v16 absorbe
`autoTargetContainerId` como target del robot 1 y ELIMINA el campo del esquema** — segunda
migración que borra campos (la primera fue la v10 de la ronda 21: reusar su patrón y sus
tests como precedente): sacar de `REQUIRED_FIELDS`… no está (era opcional por `string|null`,
ver el comentario especial en save.js) — actualizar ESE comentario y `validateDeepContent`,
y testear que un v15 real migra limpio y que un v16 con `autoTargetContainerId` residual no
rompe. Validación dura de cada robot (target contra ids válidos + procedurales; filtros con
rangos y allow-list de categorías).

## 27.3 Tareas

Data (hangarRobots, íconos, 2 logros: 3 robots activos / 10.000 procesados con filtros —
contador `filteredProcessedCount`) → Engine (loop de flota, filtros, integración
vendedor/puesto) → tests RED (2 robots procesan 2 contenedores distintos en paralelo; filtro
descarta; reserva manda al inventario; migración v16 en ambos sentidos del campo borrado) →
UI (Automatización se reorganiza en tarjetas de robot: selector de target + filtros con
inputs validados por el engine, estados completos, Chispa de flavor) → e2e
(`ronda27-flota.spec.js`: seed 2 robots → ambas tarjetas visibles y procesando; filtro
visible aplicado).

## 27.4 Riesgos

- R27.1 La migración que elimina campo ya tiene precedente (v10, ronda 21), pero acá ABSORBE
  el valor en otro campo: cubrir el round-trip serialize/deserialize v16 y el import de un
  v15 real.
- R27.2 El drenaje de `autoQueue` con N robots: sin duplicar el mismo contenedor si el dinero
  no alcanza — la afordabilidad se evalúa secuencialmente dentro del MISMO tick.
- R27.3 `descartarBajoValor` mal configurado puede "comerse" el loot del jugador: la UI lo
  deja claro ("Se descartará el 43% de lo que encontrás al ritmo actual" — dato del engine) y
  el default es off.

## 27.5 — DoD patrón estándar.

---

# RONDA 28 — Rediseño estético: la paleta deja de ser "marrón IA" (rama `feat/estetica-ronda28`, 1 agente, sin bump de save)

> Decisión del usuario (2026-07-14): NO quiere temas/skins ni leaderboards (la vieja ronda de
> cosmética se eliminó del plan); quiere UN retoque profundo de la estética actual, que hoy
> percibe como "tono aburrido e IA marrón" (todo el rango `--bg-0 #191208` → `--bg-3 #3c3427`
> más el acento `--amber #f0bc92` es marrón casi mono-tono).

## 28.1 Alcance EXACTO (aprobado por el usuario)

- Se rediseñan los **VALORES de los tokens** de `apps/game/styles/tokens.css`: fondos
  (`--bg-*`), acentos (`--amber*`, `--olive*`, `--tertiary*`), texto/bordes (`--fg-*`,
  `--outline`), glows de rareza (`--r-*` / `--r-*-glow`) y sombras si hace falta. Objetivo:
  más contraste, acentos de color REALES (no todo marrón), fondos con vida, rarezas que se
  distingan de un vistazo.
- **Layout y componentes NO se tocan**: ninguna regla nueva en components.css/layout.css salvo
  que un token nuevo lo exija (y en ese caso, solo referencias `var(--...)`). Cero colores
  sueltos (regla dura 6). La identidad "taller/chatarra" y el botón JUGAR de placa metálica
  (ronda 19) se conservan — esto es un re-tono, no un re-branding.
- Tipografía y espaciado quedan como están.

## 28.2 Proceso (el usuario elige)

1. Usar la skill `frontend-design` y preparar **2-3 propuestas de paleta** como sets completos
   de tokens (cada una un tokens.css alternativo), aplicadas al juego REAL (skill `verify` del
   repo para levantarlo).
2. Presentar screenshots comparativos por propuesta: 375px y 1280px; vistas: Escarbar activo,
   Tienda, INDEX, un modal de celebración y Prestigio.
3. **El usuario elige una propuesta (o pide mezclar) ANTES de commitear.** Nada se mergea sin
   su OK visual explícito.

## 28.3 Verificación

- Contraste AA en los textos principales sobre los fondos nuevos (chequear los pares fg/bg
  reales de cada vista).
- Los e2e existentes no asertan colores (confirmarlo con un grep de hex/rgb en
  `apps/game/e2e`): la suite completa debe quedar verde SIN tocar un solo spec.
- Manual 375px y 1280px por cada vista; matriz de screenshots final en el HANDOFF.
- Grep de cierre: ningún color hardcodeado nuevo fuera de tokens.css.

## 28.4 DoD

```
npm test + npm run test:e2e verdes sin tocar specs
Propuesta elegida por el usuario aplicada; matriz de screenshots en HANDOFF
Commit "feat: ronda 28 — rediseño de paleta (tokens)" + push + PR link
```

---

# RONDA 29 — Objetos ilustrados: arte real en el escarbado (rama `feat/arte-ronda29`, 4 agentes A→D, sin bump de save)

> Pedido del usuario (2026-07-12): al escarbar, lo enterrado deben ser **objetos de verdad**,
> no un círculo de color con un pictograma de 32px encima (estado actual:
> `DigCanvas.drawEntry`, apps/game/src/dig/DigCanvas.js — círculo plano + glifo + etiqueta).
> Va DESPUÉS de la última ronda que crea ítems a propósito: para esta altura el catálogo de
> ítems de v4 está completo (pools de las rondas 20 y 26, legendarios de la 22) y el pase de
> arte se hace UNA sola vez. Es una ronda 100% de presentación: **cero engine, cero data de
> balance, cero save** — el modelo de revelado (`digRevealModel`) y la economía no se tocan.
> Corre DESPUÉS de la 28 a propósito: el arte se ilustra sobre la paleta definitiva.

## 29.A — Agente A: el sistema de arte (el "modelo bien diseñado")

### PLAN.md primero

- §5.5 **Sistema de objetos ilustrados**: registro nuevo
  `apps/game/src/icons/objectArt.js`, hermano de `icons.js` pero con OTRO contrato: viewBox
  **96** (no 24), y un vocabulario de **PARTES** en tres capas por objeto:
  1. `body` — la silueta/forma principal (lata, botella, engranaje, ancla, cuadro…),
     rellena con **gradientes** (`<defs>` de SVG: lineales/radiales) que dan volumen.
  2. `material` — overlay de material (metal rayado, vidrio con brillo especular, madera
     vetada, tela, cerámica craquelada, óxido) como paths semitransparentes reutilizables.
  3. `details` — 1-3 detalles propios del ítem (abolladuras, etiqueta despegada, gema,
     inscripción) que lo hacen ESE objeto y no uno genérico.
  Cada ítem se define como composición: `{ body, material, palette, details, scale }` —
  mismo espíritu compositivo que `SHAPES`, pero ilustrativo. La paleta base sale de la
  categoría (tokens de rareza ya existentes) con variaciones por ítem.
- **Calidad mínima exigible** (la vara del "realista" en un juego 2D buildless): volumen por
  gradiente + sombra propia, silueta reconocible a 40px de alto en un canvas de 375px de
  ancho, coherencia con la identidad ámbar+Stitch (PLAN.md §5.3) — NO fotorealismo, NO
  assets bitmap externos (el juego sigue siendo SVG generado, offline, sin build).
- **Presentación "enterrada" en el canvas**: cada objeto se pinta con (a) **escala natural
  relativa** (`scale` 0.7-1.4 por ítem: una lata es chica, un ancla es grande — clampeada
  para que la huella jugable no cambie, ver R29.2), (b) **rotación leve** (±15°), (c)
  **sombra de apoyo** elíptica bajo el objeto, (d) viñeta de tierra en el borde inferior
  (semi-enterrado). Rotación y escala son parte del MODELO del escarbado en curso
  (determinísticas por posición ya rolleada), NUNCA del canvas: el repintado completo en
  `focus`/`visibilitychange` debe reproducir el frame idéntico (lección dura del napkin:
  el canvas solo PINTA lo que dice el modelo).
- La etiqueta con el nombre se conserva (es información de juego), pero pasa debajo del
  objeto con un fondo pill semitransparente para legibilidad sobre el arte.

### Implementación del pipeline

1. `getObjectImage(artKey, { size })` en objectArt.js: compone el SVG (SIEMPRE con
   `xmlns="http://www.w3.org/2000/svg"` — regla dura §1.5), lo sirve como data-URL y cachea
   el `HTMLImageElement` (mismo mecanismo que `getIconImage`).
2. `DigCanvas.drawEntry` pasa a: sombra → arte del objeto (con rotación/escala del modelo,
   vía `ctx.save()/translate/rotate/drawImage/restore`) → viñeta → etiqueta pill. El chequeo
   `img.complete && img.naturalWidth > 0` se mantiene TAL CUAL (una imagen rota no puede
   cortar el gesto de rascado — napkin).
3. **Fallback incremental**: si un `icon` id no tiene entrada en objectArt.js, `drawEntry`
   dibuja el render actual (círculo + glifo). Así B y C entregan el arte por tandas sin
   big-bang y un ítem nuevo futuro nunca rompe el canvas.
4. Pre-rasterizado: las imágenes se piden UNA vez al iniciar el escarbado (tamaño fijo 128px,
   el drawImage escala) — nada de recomponer SVG por frame. Presupuesto de §6.4 (PLAN.md):
   el rascado debe seguir fluido en un target clase Steam Deck.

### Tests RED del sistema (Node, sin DOM)

- Todo SVG compuesto lleva `xmlns` y abre/cierra bien (sanity parse).
- `getObjectImage` con `artKey` desconocido devuelve null/undefined limpio (activa fallback).
- Cobertura DERIVADA de la data (cero conteos hardcodeados): cada `icon` id de items.json +
  legendaries.json o tiene arte o figura en la lista `PENDING_ART` exportada — el test falla
  si un ítem nuevo no se registró en ninguna de las dos (obliga a decidir).
- La rotación/escala determinísticas: misma semilla → mismos valores (función pura).

## 29.B — Agente B: arte, tanda 1

Ilustrar los pools de los contenedores 1-8 (tachoVereda … el octavo real — recontá) + las 4
herramientas de la ronda 20 (se lucen en el selector). Al terminar: quitar esos ids de
`PENDING_ART`. Verificación visual por matriz de screenshots (script Playwright descartable
en el scratchpad que abre un escarbado sembrado por contenedor y captura a 375px y 1280px);
revisar silueta a tamaño real ANTES de pasar al siguiente pool.

## 29.C — Agente C: arte, tanda 2 + vitrina

Pools de los contenedores 9-16 + `bovedaContrarreloj`/`sotanoSinLuz` (ronda 20) + los 8
**legendarios** (ronda 22 — merecen el nivel de detalle más alto del juego: son el premio
aspiracional; bloom/glow acorde a §5.2). Los tiers procedurales (ronda 26) REUSAN el arte del
pool del Big Bang (ya cubierto por diseño — anotarlo en objectArt.js). Bonus de la ronda: la
**Vitrina** del INDEX pasa a mostrar el arte ilustrado grande (96px) en los pedestales; el
resto del INDEX conserva los íconos de 24px (densidad de grilla — decisión a documentar).
`PENDING_ART` queda VACÍA al cerrar esta tanda (el test de cobertura pasa sin lista).

## 29.D — Agente D: e2e + auditoría visual y de rendimiento

1. e2e (`ronda29-arte.spec.js`): con un escarbado sembrado, `window.__digDebug` expone por
   entry si usa arte ilustrado y si su imagen cargó (`naturalWidth > 0`) → assert de que
   TODOS los entries del contenedor inicial usan arte cargado (nada cayó al fallback); assert
   de que un artKey saboteado (route-interception, patrón napkin/ronda 18) NO rompe el gesto
   (el fallback dibuja y el escarbado completa).
2. Auditoría (Verif&Audit.md sobre el diff): el pipeline de data-URL no introduce sinks
   (artKeys vienen SOLO de data estática, jamás del save — verificar que ningún id de save
   llegue a `getObjectImage` sin allow-list); presupuesto de memoria del caché de imágenes
   (128px × ~140 ítems: acotar y documentar); FPS del rascado antes/después en el hardware
   del usuario (documentar en HANDOFF).
3. Manual: matriz completa de screenshots por contenedor (375px), revisión de contraste de la
   etiqueta pill sobre arte claro y oscuro, y una pasada jugando de verdad (¿se RECONOCE el
   objeto a medio destapar? — ese es el criterio de éxito del pedido del usuario).

## Riesgos de la ronda 29

- R29.1 **El modelo de revelado NO se toca**: `digRevealModel`, las posiciones, la huella de
  muestreo y el umbral de completado quedan bit a bit iguales (los e2e de dig existentes lo
  asertan). El arte es una capa de PINTURA sobre el mismo modelo.
- R29.2 La escala visual (0.7-1.4) es SOLO estética: la hitbox/huella de revelado sigue
  siendo `OBJECT_RADIUS` fijo. Si un objeto grande "parece" destapable por fuera de su
  huella, ajustar la viñeta de tierra, no el modelo (documentar si molesta en playtest).
- R29.3 Un catálogo de ~140 composiciones tienta a bajar la vara al final: el criterio de
  B/C es por tanda con screenshot-review — si una composición no se reconoce a 40px, se
  rehace ANTES de seguir.
- R29.4 `getObjectImage` comparte la trampa de `getIconImage` (napkin): SVG sin `xmlns` en
  data-URL falla en SILENCIO (`naturalWidth 0`) — el test de sanity y el chequeo en draw ya
  lo cubren; no confiar en `complete` solo.

## DoD de la ronda 29

```
npm test + npm run test:e2e verdes (cobertura de arte completa, PENDING_ART vacía)
Manual: matriz de screenshots revisada, rascado fluido, objetos reconocibles a medio destapar
Commits por agente + HANDOFF (con la comparación de FPS) + push + PR link
```

---

# RONDA 30 — Imágenes reales de contenedores (rama `feat/imagenes-ronda30`, 1 agente, sin bump de save)

> División de trabajo pactada (2026-07-14): **el usuario busca y provee un PNG realista por
> contenedor** (acorde al nombre/fantasía de cada uno: un tacho de vereda real, un volquete,
> una bóveda…); **el agente los implementa**. La ronda arranca BLOQUEADA hasta que los assets
> estén en el repo (contrato §3.5.8) — si al empezar faltan, detenete y pedíselos al usuario
> con la lista exacta de abajo.

## 30.1 Convención de assets (para que el usuario sepa qué buscar)

- Un archivo por contenedor: `apps/game/assets/containers/<containerId>.png` con el id EXACTO
  de containers.json (recontar al ejecutar; hoy son 18: de `tachoVereda` a `vertederoBigBang`
  más `bovedaContrarreloj` y `sotanoSinLuz` — generar la lista real y pasársela al usuario).
- Guía para el usuario: ~512×512px (o proporción similar), fondo transparente u homogéneo
  oscuro, el objeto centrado y reconocible como miniatura de ~56px.
- Los tiers procedurales (ronda 26) REUSAN la imagen de `vertederoBigBang` (§3.5.8).
- Derechos: imágenes libres de uso comercial (van al build de Steam) — responsabilidad del
  usuario al elegirlas; dejar constancia en HANDOFF de que se le recordó.

## 30.2 Tareas

1. UI: las tarjetas de la Tienda (`ShopView.js`, `.shop-card-icon`) y del selector de Escarbar
   (`DigContainerPicker.js`) muestran `<img src="assets/containers/<id>.png">` con **fallback
   al ícono SVG actual** si el archivo falta o falla la carga (`onerror` → repone el
   `iconMarkup` de hoy): un contenedor sin imagen NUNCA rompe la tarjeta. El `<img>` con
   `alt=""` y tamaño fijo por CSS (clases/tokens existentes; sin layout shift).
2. La ruta se deriva SOLO del id validado contra containers.json (allow-list — jamás
   interpolar un id crudo del save en un `src`; napkin, clase XSS).
3. CSP: los assets son locales (`'self'`) — la CSP de index.html NO se toca (regla dura 7) y
   `apps/game/tests/csp.test.js` debe seguir verde.
4. Test derivado de la data (cero conteos hardcodeados): cada id de containers.json tiene su
   PNG en assets/containers/ o figura en una lista `PENDING_IMAGES` exportada (patrón
   `PENDING_ART` de la ronda 29); el test falla si un contenedor nuevo no se decidió.
5. e2e (`ronda30-imagenes.spec.js`): una tarjeta de Tienda muestra su `<img>` cargada
   (`naturalWidth > 0`); sabotear una ruta (route-interception, patrón napkin) → la tarjeta
   cae al ícono SVG sin romper la vista ni el flujo de compra.

## 30.3 Riesgos

- R30.1 Peso del build: 18 PNGs de 512px pueden pesar varios MB — optimizar (compresión
  razonable sin artefactos visibles) y anotar el peso total en HANDOFF.
- R30.2 Estilo heterogéneo entre imágenes de distintas fuentes: si el resultado queda
  visualmente incoherente, proponerle al usuario un tratamiento unificador barato (marco,
  viñeta, normalización de fondo por CSS) ANTES de inventar uno por cuenta propia.

## 30.4 DoD

```
npm test + npm run test:e2e verdes (PENDING_IMAGES vacía o con faltantes acordados con el usuario)
Manual 375px: Tienda y picker con imágenes, fallback verificado
Commit "feat: ronda 30 — imágenes reales de contenedores" + HANDOFF + push + PR link
```

---

# RONDA 31 — Idiomas pt/fr/de + re-release (rama `feat/i18n-release-ronda31`, 1 agente)

1. `SUPPORTED_LANGUAGES = ['es','en','pt','fr','de']` (save.js) + diccionarios completos:
   `pt.js` / `fr.js` / `de.js` (UI — recontar las claves reales con todo v4) y
   `data-pt.js` / `data-fr.js` / `data-de.js` (contenedores, ítems, logros, máquinas, nodos,
   herramientas, legendarios, NPCs, diálogos, misiones — generar los esqueletos por
   script desde la data, patrón 16.B). Los tests de paridad de la ronda 16 se extienden
   DERIVANDO la lista de `SUPPORTED_LANGUAGES` (no hardcodear 5).
2. `resolveInitialLanguage`: `pt-*`→pt, `fr-*`→fr, `de-*`→de, `es-*`→es, resto→en (tests).
3. El selector de Ajustes gana las 3 opciones; `index.html` no cambia (el boot ya es bilingüe
   genérico y el guard de la ronda 18 también).
4. **Re-release**: regenerar la tabla de logros (`node tools/steam/achievements-table.mjs`) y
   actualizar `tools/steam/RELEASE.md` (los logros nuevos que el usuario re-registra en
   Steamworks — U4; idiomas soportados para la página de tienda); `npm run build:win` + smoke
   del instalador (patrón ronda 18: `--user-data-dir` + hash del save real); **auditoría
   global final Verif&Audit.md sobre el repo COMPLETO** (como la 18.3) con veredicto
   explícito apto/no apto.
5. DoD: `npm test` + `npm run test:e2e` verdes (recontar baselines y dejarlos en HANDOFF);
   veredicto APTO; commit + push + PR link. **Después de mergear esta ronda, el usuario
   ejecuta el checklist U1-U9 de ROADMAPv3 §2 y lanza.**

---

## Fuera de alcance explícito (requieren re-diseño y aprobación, ni "postre" son)

- **Temas/skins desbloqueables y puerta al DLC cosmético** (desaprobados por el usuario el
  2026-07-14 — en su lugar va el rediseño estético de la ronda 28; PLAN.md §8 queda como
  referencia histórica, sin vehículo actual).
- **Leaderboards de Steam** (desaprobado por el usuario el 2026-07-14).
- **Energía/espionaje** (removido del juego en la ronda 21 — no reintroducir bajo ningún
  nombre sin aprobación explícita).
- Multiplayer / co-op / economía entre jugadores.
- Contenido pago con ventaja de gameplay (PLAN.md §8 lo prohíbe).
- Mods / Steam Workshop.
- Reescritura del tutorial (v4 lo deja intacto a propósito; si el playtest post-v4 muestra que
  el Puesto necesita tutorial propio, se diseña en un v5).

## Nota final de balance

Cada ronda que toque números corre una pasada de juego real (manual) contra los hitos de
PLAN.md §3 y ajusta SOLO constantes de data con `AJUSTE:`. Si un sistema nuevo rompe el ritmo
del primer prestigio (20-40 min validados por el usuario), la constante cede, no la fórmula.
