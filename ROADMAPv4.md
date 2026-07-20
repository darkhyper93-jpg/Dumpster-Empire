# ROADMAPv4.md — Rondas 21-33: limpieza, Puesto de Chatarra, NPCs, estética, lategame infinito, dificultad y pantalla de inicio

> **Actualizado el 2026-07-19 (durante la ronda 31), por decisión del usuario.** Sobre el plan
> vigente se agregan DOS cosas y se corre la numeración del cierre: (1) a la **ronda 31** se le
> suma la mecánica de **trampa simultánea con items + crédito parcial** (manual y robot) — ver
> §4.42/§4.43 y el bloque `31.3.B`, sin perder nada de su alcance de balance previo; (2) se crea la
> **ronda 32 — Nueva pantalla de inicio** (full-bleed, arregla los bordes vacíos en pantalla
> completa); (3) el **release final** (idiomas pt/fr/de + re-auditoría) pasa de ser el cierre
> inmediato a la **ronda 33** (antes se lo mencionaba como "ronda 32" dentro de la 31 — esas
> referencias se corrigieron). El resto del documento es intocado.

> **Rediseñado el 2026-07-14 (post-ronda 20), por decisión del usuario.** Cambios contra la
> versión anterior de este documento: (1) la **Energía y el espionaje** (ronda 20) se REMUEVEN
> del juego y del plan — la ronda 21 nueva hace la limpieza; (2) los **temas/skins, la puerta
> DLC y los leaderboards** de Steam (vieja ronda 27) quedan FUERA DE ALCANCE — los reemplaza
> una ronda de **rediseño estético** (28); (3) se agrega la ronda 30 de **imágenes reales de
> contenedores** (assets que provee el usuario); (4) todo el resto del contenido pendiente fue
> aprobado ítem por ítem por el usuario el 2026-07-14 y se conserva ÍNTEGRO, solo renumerado
> (rondas y versiones de save corren un lugar).
>
> **Para el agente ejecutor.** Este plan cubre TRECE rondas (21-33) que se ejecutan EN ORDEN,
> cada una en su propia rama con su propio PR (el usuario mergea entre rondas). NO empieces una
> ronda sin que la anterior esté mergeada en main. Todo el contenido de este roadmap sale
> **antes del lanzamiento en Steam** (decisión del usuario, 2026-07-11): el orden es por
> dependencia técnica y el release final es la ronda 33.
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
| **Dificultad y balance: resistencias con dientes, fix logros de racha, fix de los $250k** | usuario (2026-07-19) | **31** | — |
| **Trampa simultánea con items + crédito parcial (manual y robot)** | usuario (2026-07-19) | **31** | — |
| **Nueva pantalla de inicio full-bleed (arregla los bordes vacíos en fullscreen)** | usuario (2026-07-19) | **32** | — |
| Idiomas pt/fr/de | postre ROADMAPv3 §7 | **33** | — |
| Re-auditoría global + release final | proceso | 33 | — |

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
la ronda 15: dinero ≈ 10% del hito, llaves para hitos duros. La ronda 33 (release final) regenera
la tabla de RELEASE.md con `node tools/steam/achievements-table.mjs` (el usuario re-registra en
Steamworks); las rondas 31 y 32 solo agregan logros a la lista abierta, NO regeneran esa tabla.

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

## 27.5 Tareas adicionales delegadas por la post-auditoría de la ronda 26 (usuario, 2026-07-17)

> Origen: segunda pasada Verif&Audit.md sobre el diff de la ronda 26 (ver el bloque
> "Post-auditoría del usuario" en agentes/HANDOFF.md). Se suman a las tareas de 27.3, NO las
> reemplazan. Orden = prioridad.

1. **🟡 Y1 — clamp anti-Infinity de `money` (con test RED)**: `validateDeepContent` acepta
   `deedsTreeLevels`/`prestigeTreeLevels` con cualquier valor finito (sin enteros/rango): un
   save hostil con `ventajaGalactica: 1e305` pasa validación, `getSellMult` explota y
   `state.money += total` (containers.js:363; ídem stall.js:87, achievements.js:88,
   missions.js:232, offline.js:111) desborda a Infinity → `JSON.stringify` → `null` → el
   próximo boot RECHAZA el save entero (wipe — misma clase que el 🔴 de 26.D). Fix: helper
   `addMoney(state, x)` clampeado a `Number.MAX_VALUE` en los 5 puntos (patrón `state.deeds` de
   `doGalaxyMove`), o validar los niveles de ambos árboles como enteros en rango contra la data
   (precedente de enhebrar data: migración v14). Test de regresión con el save hostil.
2. **R26.3 (ya contractual de esta ronda)**: el loop de flota/"Auto" DEBE considerar los tiers
   procedurales (`getQueueMax`/selección de target con contenedores fuera de containers.json) —
   anotado 3 veces por 26.B/26.C/26.D.
3. **OfflineModal muestra `stallEarnings`** (deuda 23.E): `applyOfflineProgress` ya lo devuelve
   y el dinero ya se suma bien; solo falta surfacearlo en el modal (abrirlo también cuando
   `stallEarnings > 0` y sumar la línea al resumen, copy es+en).
4. **`migrate()` se extrae a funciones por paso** (deuda 16.E): esta ronda agrega la migración
   v16 (novena) — es el momento de la extracción con typedef de entrada/salida por paso, sin
   cambiar comportamiento (los tests de migración existentes deben quedar verdes sin tocarse).
5. **`persist()` con try/catch en `localStorage.setItem`** (deuda 18): quota excedida / storage
   deshabilitado no debe tirar en cada acción; degradar en silencio (el guardado a archivo de
   Electron es independiente).
6. **`boot()` no muestra `err.message` crudo** (deuda 16.E): mensaje genérico en `#boot-status`
   + detalle a `console.error` (excepción permitida al "sin console.log": es el manejador de
   error de boot, documentarlo inline).
7. **CSS `.deeds-tree` declara sus 6 columnas**: hoy reusa `repeat(5, ...)` del árbol de
   prestigio y el 6º nodo cae en columna implícita sin `minmax` (ver HANDOFF post-auditoría);
   1 línea + verificación visual desktop.
8. **Decidir la liquidación de la mudanza vs misiones**: `doGalaxyMove` suma `inventory.length`
   a `stallSoldCount` y puede completar "gratis" una misión `sellAtStallCount` activa. Decidir
   (excluir o documentar como feature) y dejar test o comentario `DECISIÓN:`.

Notas sin acción (solo conocimiento): `formatNumber` topea en QiDc (1e48) — suficiente para
todos los costos del juego; recién importaría con un sink de dinero lategame. `isFirstRareFind`
es por-tier en procedurales (cosmético). `loadState()` silencioso ante save inválido queda para
v1.1 (decisión de la ronda 18, no de esta).

**NO TOCAR (política explícita del repo — 15.E/23.E la declararon para que nadie lo "arregle"
por error; se re-declara acá y NO se debe cambiar):** `getAutoSpeedMult` llamado por slot
dentro del loop de `automationTick` (≤4 slots × 12 máquinas/s, irrelevante); `trapsDiscarded`
negativo pasando la validación del save (política uniforme de contadores); `stallLevel` sin
cota superior en el save (consistente con containerLevels/prestige, solo auto-perjudica).

## 27.6 — DoD patrón estándar.

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
> con la lista exacta de abajo. Archivos en: reference/ui/Contenedores
> Se me ocurrió algo que añadir además del plan, según la hora, la cual quiero que también se pueda ver osea que yo vea que hora es y a que hora se hace de día, de tarde, de noche, ... > el contenedor 1 según la hora, cambie entre sus distintos modelos, hay 5 contenedores 1, luego si, está el 0 que es el gratis, y 2-16 el resto.

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

# RONDA 31 — Dificultad y balance: resistencias con dientes, fix logros de racha, fix de los $250k, trampa simultánea + crédito parcial (rama `feat/balance-ronda31`, 1 agente, sin bump de save)

> Motivo (usuario, 2026-07-19): (a) las stats de Fuerza/Área dejan de importar enseguida — la
> resistencia de los contenedores crece tan despacio (~×1.35 por tier) que unas pocas mejoras
> baratas capean el ritmo en 1.5 y todos los contenedores se sienten iguales; el Área ni
> siquiera tiene mecánica (su "recomendada" es solo un cartel); (b) los logros de racha
> (a36-a38) no se auto-reclaman en la partida del usuario; (c) tras los primeros ~5 escarbados
> del Tacho de Vereda el jugador recibe $250.000 gratis que rompen toda la curva temprana.
> Esta ronda sube la dificultad general vía (a) y arregla (b) y (c). Sin estado persistido
> nuevo → sin bump de save (regla dura 17 no aplica). Ahora mismo apenas toma 5-7 minutos hacer prestigio, esto es inaceptable, DEMASIADO poco, debe haber una gap mayor.
>
> **AÑADIDO el 2026-07-19 (usuario): (d) trampa simultánea con items + crédito parcial.** Hoy la
> trampa es EXCLUYENTE con el loot: `rollContainerResult` (systems/containers.js ~183-190)
> devuelve, cuando cae trampa, `items: []` — o hay trampa o hay items, nunca los dos. El usuario
> quiere que la **trampa pueda salir junto a otros items** (más riesgo, más tensión) y que el
> **loot ya destapado NUNCA se pierda**: si el jugador destapa 1/2/… items y después abandona (o
> salta la trampa), se queda con el valor de esos items. Y **lo mismo para el robot**. Esto NO
> agrega estado persistido nuevo (el escarbado en curso es transitorio, no se guarda) → **sigue
> sin bump de save**. Es la parte más pesada de la ronda: toca el corazón de la economía
> (`applyContainerResult`) y el ciclo de vida del escarbado manual, así que va en su propio bloque
> `31.3.B` con su propio set de tests. Diseño exacto (decidido con el usuario, 2026-07-19) en
> §4.42/§4.43 y en `31.3.B`; el resto de la ronda (balance) queda intacto.

## 31.0 Contexto verificado contra el repo (2026-07-19) — leer antes de tocar nada

Mapa exacto (recontar líneas al ejecutar; el contenido manda):

- `packages/engine/src/economy.js`: `getDigRate` = `clamp(getDigPowerMult / container.resistencia, 0.3, 1.5)`
  (~línea 877); `getEffectiveDigTime` = `digTime / getDigRate` (~896); `getAreaMult` (~430)
  crece con la mejora `area` (upgrades.json: `1 + 0.05/nivel`) y NUNCA se compara contra
  `areaRecomendada`; `getRecommendedDigPower` devuelve `container.resistencia` (~999) y
  `getRecommendedArea` devuelve `container.areaRecomendada` (~1010) — hoy son solo texto de
  la Tienda (`ShopView.js` ~147-155), no bloquean ni modulan nada.
- `apps/game/src/store.js` `startManualDig` (~283): pasa al canvas
  `areaMult: getAreaMult(state, data) * getToolRadiusMult(state, data)` (~314) y
  `digRate: getDigRate(state, container, data) * getToolRhythmMult(state, data)` (~318).
- `apps/game/src/dig/DigCanvas.js` (~606): `radius = BASE_ERASE_RADIUS * Math.sqrt(this.areaMult) * this.digRate * this.sensitivity`.
- **Causa raíz de los $250k**: `achievements.json` a45 «Set Completo»
  (`setsCompletedAtLeast: 1` → `money 250000`). El pool de `tachoVereda` en `items.json`
  tiene SOLO 6 ítems, todos `common`, y el contenedor tira 3 slots por escarbado: en ~5
  escarbados el set se completa e `isSetComplete` (economy.js ~802) dispara a45. No es la
  racha ni un bug de código: es una recompensa de data desproporcionada para el primer set
  trivial del juego.
- **Logros de racha**: a36/a37/a38 (`digStreakAtLeast` 10/25/50) evalúan `state.bestDigStreak`
  (achievements.js ~25). La cadena estática se ve correcta: `applyContainerResult` incrementa
  `digStreak`/`bestDigStreak` (containers.js ~392) ANTES de que `finishManualDig` llame
  `runAchievements()` (store.js ~342). El reporte del usuario ("no se auto-reclaman") es real
  pero la causa no está confirmada — la tarea 2 la diagnostica con tests antes de tocar nada.
- Los tiers procedurales (`proceduralContainer`, containers.js ~102) derivan
  `resistencia = base × 1.32^n` del `vertederoBigBang` real: heredan la tabla nueva solos.

## 31.1 PLAN.md primero

Recontar el último § real de PLAN.md §4 (a la fecha: §4.39, ronda 27) y escribir a
continuación (§3.6 de este roadmap):

- **§4.40 Ritmo contra resistencia, rango ampliado**: la fórmula pasa de
  `clamp(Fuerza / resistencia, 0.3, 1.5)` a `clamp(Fuerza / resistencia, 0.25, 1.5)`
  — quedarse corto de Fuerza ahora duele hasta ritmo 0.25 (antes 0.3). Es un cambio de
  FÓRMULA (contrato), por eso entra por PLAN.md primero. Actualizar también §11.2.
- **§4.41 Área efectiva por contenedor** (mecánica nueva — hasta hoy `areaRecomendada` no
  hacía nada): `areaRate = clamp(getAreaMult / container.areaRecomendada, 0.45, 1.2)`.
  SOLO modula el pincel del escarbado manual (mismo alcance que las herramientas, §4.23):
  la automatización/offline no la usa. Con el Área al día el pincel queda como hoy
  (rate ≈ 1); corto de Área se achica hasta √0.45 ≈ ×0.67; sobrado premia hasta √1.2 ≈ ×1.10.
- **Tabla nueva de `resistencia` / `areaRecomendada`** (AJUSTE de data, la fórmula no se
  toca): crecimiento ~×1.5 por tier en la cadena jugada a mano (tiers 1-8) y ~×1.4 después,
  para que cada contenedor nuevo arranque pesado (ritmo ~0.4-0.6) y dominar el tier exija
  invertir en Fuerza/Área de verdad. Actualizar la tabla de PLAN.md §4/§11.2 con:

| contenedor | resistencia | areaRecomendada |
|---|---|---|
| tachoVereda | 1.0 | 1.0 |
| contenedorBarrio | 1.55 | 1.45 |
| containerIndustrial | 2.4 | 2.25 |
| depositoAbandonado | 3.7 | 3.45 |
| mudanzaMansion | 5.7 | 5.3 |
| galeriaLiquidacion | 8.8 | 8.2 |
| bovedaPerdida | 13.5 | 12.5 |
| containerExtradimensional | 20.5 | 19 |
| convoyFantasma | 30 | 28 |
| criptaColeccionista | 44 | 41 |
| estacionOrbital | 64 | 60 |
| vertederoDivino | 92 | 86 |
| chatarreriaTitanes | 128 | 119 |
| naufragioTemporal | 176 | 164 |
| bovedaContrarreloj | 205 | 191 |
| archivoMultiverso | 240 | 224 |
| sotanoSinLuz | 280 | 261 |
| vertederoBigBang | 325 | 302 |

  La tabla es el PUNTO DE PARTIDA: la calibración de la tarea 4 manda, y cualquier corrección
  se hace sobre estos números de data con su `AJUSTE:` (nunca sobre las fórmulas).
- **§11.6 (logros)**: a45 «Set Completo» baja de `money 250000` a `money 2500` (el primer set
  es el Tacho, trivial por diseño — la recompensa vuelve al principio "dinero ≈ 10% del
  hito", §3.4). Los $250k se mudan a un logro nuevo que sí lo vale: **a61 «Cinco Sets»**
  (`setsCompletedAtLeast: 5` → `money 250000`) y **a62 «Coleccionista Serial»**
  (`setsCompletedAtLeast: 10`, `hidden: true` → `keys 6`). Ids consecutivos tras el último
  real (hoy a60; a39 sigue siendo hueco permanente, §3.4).

Y las dos secciones de la trampa simultánea (bloque `31.3.B`), a continuación de §4.41:

- **§4.42 Trampa simultánea con items + crédito por-ítem (escarbado manual)**. Cambio de contrato,
  por eso entra por PLAN.md primero.
  - Hoy `rollContainerResult` (systems/containers.js ~183-190), al caer trampa, devuelve
    `items: []` (trampa EXCLUYENTE del loot). Nuevo: al caer trampa se rollea IGUAL la lista
    normal de items del contenedor y la trampa queda como **un objeto ADICIONAL entre ellos**
    (N items + 1 trampa = N+1 objetos a destapar). El resultado marca cuál entry es la trampa
    (flag `isTrap` por entry). El **legendario (ronda 22) sigue gateado a escarbado sin trampa**
    (no se rollea en un dig trampeado): se conserva el contrato §3.5.3 y el feel "la trampa no
    trae premio mayor".
  - **Crédito por-ítem**: en vez de aplicar todo el resultado de una al completar, cada item se
    acredita EN EL MOMENTO en que el jugador lo destapa. Se parte la economía en piezas puras:
    - `creditDugItem(state, container, item, isAuto, data, robotFilters?)` → acredita UN item
      (venta instantánea o captura al Puesto según umbral/capacidad de la ronda 23; contadores
      `itemsFoundByItem`/`itemsFoundByCategory`/`itemsFoundCount`; legendario SOLO en manual sin
      trampa). Devuelve el `moneyDelta` de ESE item. NO toca racha, nivel ni trampa.
    - `springTrap(state, container, result, data)` → castigo de dinero (`trapPenaltyMult` /
      `gravePenaltyMult`, §4.21), corta la racha a 0 (`digStreak = 0`, contrato §3.5.1),
      `trapsHit++`. Devuelve `trapPenalty`.
    - `registerContainerDig(state, container)` (ya existe) → nivel del contenedor (§11.3), UNA
      vez por escarbado.
  - **Al destapar la trampa (decisión del usuario 2026-07-19: "salta y corta el dig")**: se
    dispara `springTrap` (castigo + corta racha), el juice de trampa (shake+flash, §5.2) y el
    escarbado **termina en el acto** — los items AÚN NO destapados se PIERDEN, los ya destapados
    quedan acreditados. No hay +1 de racha (el dig no se completó limpio).
  - **Al abandonar** (botón Abandonar, sin haber destapado la trampa): los items ya destapados
    quedan acreditados; NO se dispara la trampa, NO hay castigo y la **racha queda como está**
    (ni +1 ni 0). `DECISIÓN:` documentar que abandonar es una salida sin penalización que
    conserva el loot parcial (es justo lo que pidió el usuario).
  - **Determinismo**: el crédito por-ítem se dispara SOLO desde `newlyRevealed` del modelo
    (digRevealModel.applyStroke), con guard por índice ya revelado → cada objeto se acredita
    EXACTAMENTE una vez; el repintado por `focus`/`visibilitychange` NO re-acredita (napkin: el
    canvas solo PINTA lo que dice el modelo).
- **§4.43 Robot y offline: "guarda todo, come el castigo" + Escáner que descarta solo la
  trampa**. El robot procesa el contenedor de forma ATÓMICA (no destapa de a poco), así que
  "lo mismo" que el jugador se traduce así (decisión del usuario 2026-07-19):
  - `result.isTrap` y `random() < getAutoTrapDiscardChance(state, data)` (Escáner de Trampas —
    nodo `escanerTrampas`, 3 niveles × +34%, cap 1.0): el robot **conserva TODOS los items
    no-trampa y descarta SOLO la trampa** (sin castigo, sin cortar racha), `trapsDiscarded++`,
    `registerContainerDig`, sigue con el siguiente contenedor. Es una **MEJORA** sobre hoy, donde
    el Escáner descarta el contenedor ENTERO y pierde los items con él (automation.js ~251-255).
  - `result.isTrap` y el Escáner NO dispara (o no lo tiene): **"guarda todo, come el castigo"** —
    acredita TODOS los items no-trampa Y aplica `springTrap` (castigo). El robot no pierde el
    loot que encontró; solo paga el castigo de la trampa.
  - `!result.isTrap`: igual que hoy.
  - **Reuso de piezas**: `applyContainerResult` (camino atómico de robot y offline) pasa a
    acreditar los items SIEMPRE (loop de `creditDugItem`, respetando los `robotFilters` de la
    ronda 27) y, si `isTrap`, ADEMÁS aplica `springTrap`. El camino del Escáner llama a
    `applyContainerResult` con el resultado "sin la trampa" (mismos items, `isTrap` neutralizado)
    + `trapsDiscarded++`. Así manual (crédito por-ítem, corta el dig) y robot (atómico, guarda
    todo) comparten las MISMAS piezas puras sin duplicar economía.
  - **Offline** (`applyOfflineProgress`, systems/offline.js): el auto-dig offline sigue el mismo
    criterio que el robot online (guarda todo / Escáner descarta solo la trampa) con venta
    instantánea (sin timing, ronda 23); verificar que el orden vendedor-offline / loot-offline
    (R23.3) no se rompe.

## 31.2 Estado y save

Sin bump: ningún campo persistido nuevo (areaRate y el ritmo son derivados; los logros nuevos
entran por `achievementsUnlocked`, que ya es una lista abierta de ids). `save.js` no se toca.

## 31.3 Tareas

1. **Fix $250k (data)**: en `achievements.json`, a45 → `money 2500`; agregar a61/a62 al FINAL
   con los cond/reward de §31.1. Nombres visibles nuevos → entrada real en `data-en.js`
   (regla dura 15). Test de engine: estado con 1 set completo NO gana más que $2.500 por
   logros de sets; con 5 sets gana a61; con 10, a62. NO tocar `isSetComplete` ni el pool del
   Tacho (agrandar el pool rompería INDEX/arte de la ronda 29 — fuera de alcance). La tabla
   de logros de Steam NO se regenera acá: lo hace la ronda 33 (release final) con todo junto (§3.4).
2. **Fix logros de racha (diagnóstico dirigido, no tocar antes de reproducir)**:
   a. Test de engine (`ronda31-racha-fix.test.js`): 10 × `rollContainerResult` +
      `applyContainerResult` manuales sin trampa (random inyectado) + `checkAchievements`
      tras cada uno → a36 se desbloquea exactamente en el décimo y paga $5.000 una sola vez.
   b. Test e2e (`ronda31-balance.spec.js`): seed por `addInitScript` (regla dura 9) con
      `digStreak: 9, bestDigStreak: 9`, un escarbado manual exitoso completo → toast de
      logro visible (`.filter({ hasText })`, regla dura 8), la vista Logros muestra
      «Racha de Diez» como reclamado, y `#money` refleja la recompensa (polling).
   c. Si a y b salen VERDES de entrada, el bug del usuario no está en el camino web: probar
      la build empaquetada (patrón ronda 18: `npm run build:win` + `--user-data-dir`
      temporal) y el espejo Steam (`desktopBridge.setAchievement`, store.js ~253), y
      documentar en HANDOFF la causa real encontrada. La tarea NO se cierra declarando
      "no reproducido": se cierra con la causa identificada y cubierta por un test, o con
      la evidencia de en qué build/estado ocurre y su fix.
   d. Auditar de paso que TODO punto que muta `digStreak`/`bestDigStreak` (recorrer con grep)
      quede seguido de `runAchievements()` dentro de la misma acción del store.
3. **Engine (fórmulas nuevas)**: en `economy.js`, ampliar el clamp de `getDigRate` a
   `[0.25, 1.5]` y agregar `getAreaRate(state, container, data)` según §4.41, con JSDoc
   (`@param`/`@returns`) y export en `index.js`. En `store.js` `startManualDig`, reemplazar
   `getAreaMult(state, data)` por `getAreaRate(state, container, data)` (el `×
   getToolRadiusMult` queda igual — las herramientas siguen siendo un trade-off aparte,
   §4.23). `DigCanvas.js` NO se toca: sigue recibiendo `areaMult`/`digRate` ya resueltos
   (frontera engine ↔ UI intacta; el `sqrt` existente amortigua el rate, documentarlo).
   Tests: `getAreaRate` en piso/techo/neutro; `getDigRate` en 0.25 con Fuerza 1 contra
   resistencia alta; `getEffectiveDigTime` coherente.
4. **Data + calibración**: aplicar la tabla de §31.1 a `containers.json` con comentario
   `AJUSTE:` en el commit (JSON no admite comentarios). Script
   `agentes/scripts/calibrate-resistencia-ronda31.mjs` (patrón calibrate-luck de las rondas
   8/10/11): simula, para cada contenedor de la cadena, el nivel de Fuerza/Área comprable
   gastando ~35% del dinero histórico al momento de poder comprarlo (con los nodos de
   prestigio esperables para su `requiresPrestigeCount`), y verifica las bandas: ritmo al
   desbloquear ∈ [0.35, 0.65]; ritmo con el dinero del contenedor SIGUIENTE ≥ 0.9; areaRate
   al desbloquear ≥ 0.45 y ≥ 0.95 al dominarlo. Si una banda falla, el script imprime la
   fila corregida y se ajusta la DATA (nunca la fórmula ni la banda). Dejar la salida final
   en HANDOFF.
5. **UI (visibilidad del balance)**: en `ShopView.js` y `DigContainerPicker.js`, junto a las
   recomendadas existentes, mostrar el estado ACTUAL del jugador contra ellas leyendo SOLO
   `getDigRate`/`getAreaRate` (cero fórmulas en UI): «Ritmo: 45%» / «Pincel: 70%», con color
   por token (`--amber` al día, token de alerta por debajo — tokens existentes, nada
   hardcodeado). Claves i18n nuevas en `es.js` + `en.js` (regla dura 15; el copy español
   existente es intocable, regla 11). El hint de ritmo del escarbado activo
   (`dig.rateHint`, UIManager ~337) ya existe y no cambia.
6. **Tests/e2e de regresión**: `ronda31-balance.test.js` (engine) deriva de containers.json
   que resistencia y areaRecomendada son estrictamente crecientes en la cadena y con salto
   mínimo ×1.3 por tier (derivado de la data, cero valores hardcodeados); e2e: un save
   seedeado rico en dinero pero con Fuerza/Área base escarba el tier 3+ con ritmo visible
   < 100% (el hint aparece); recontar el baseline COMPLETO de e2e — la tabla nueva puede
   hacer aparecer `dig.rateHint` en specs existentes que asumían ritmo 100% (regla dura 18:
   lo que se rompa por dificultad nueva se declara y ajusta explícitamente, no se tapa).

## 31.3.B — Trampa simultánea con items y crédito parcial (manual + robot)

> La parte más pesada de la ronda. Toca el corazón de la economía (`applyContainerResult`) y el
> ciclo de vida del escarbado manual. Diseño en §4.42/§4.43. Regla de oro: NADA de economía en la
> UI/canvas — el canvas solo avisa "se destapó el objeto i"; el store despacha al engine y el
> engine acredita. Cero conteos ni valores hardcodeados: todo sale de la data y del estado.
> Hacé esto DESPUÉS de las tareas 1-6 de 31.3 y sobre esas fórmulas ya mergeadas en la rama.

### Orden de implementación (respetá el orden de CLAUDE.md: data → engine → tests → UI → juice)

1. **Engine — partir la economía en piezas puras (sin cambiar comportamiento todavía)**. En
   `packages/engine/src/systems/containers.js`, refactorizá `applyContainerResult` extrayendo
   tres funciones puras exportadas (JSDoc `@param`/`@returns` completo; export en `index.js`):
   - `creditDugItem(state, container, item, isAuto, data, robotFilters = null)` — acredita UN
     item: venta instantánea (suma con el `addMoney` clampeado de la ronda 27, Y1) o captura al
     Puesto (umbral/capacidad, ronda 23) según corresponda; contadores `itemsFoundByItem`,
     `itemsFoundByCategory`, `itemsFoundCount`; legendario (ronda 22) SOLO si `!isAuto` y el dig
     no es trampa. Devuelve `{ moneyDelta, captured: boolean }`. NO toca racha, nivel ni trampa.
   - `springTrap(state, container, result, data)` — castigo de dinero (`trapPenaltyMult` /
     `gravePenaltyMult` según `result.trapGrade`, §4.21), `state.digStreak = 0` (contrato
     §3.5.1), `state.trapsHit++`. Devuelve `{ trapPenalty }`. (`bestDigStreak` NO se toca.)
   - `registerContainerDig` ya existe (nivel, §11.3).
   Reescribí `applyContainerResult` para que USE estas piezas y dé EXACTAMENTE el mismo resultado
   que hoy en el camino sin-trampa (snapshot-test obligatorio, R31.6). Este paso 1 es puramente
   estructural: los tests existentes de `applyContainerResult` deben quedar verdes SIN tocarse.
2. **Engine — trampa simultánea en el roll** (§4.42). En `rollContainerResult`, cuando
   `rollIsTrap(...)` es true, en vez de `items: []` rolleá la lista normal de items del
   contenedor (mismo camino que el éxito) y devolvé `{ isTrap: true, trapGrade, items: [...],
   moneyDelta, ... }`; marcá con un flag `isTrap` la entry-trampa (o devolvé `trapItem` aparte —
   elegí lo que menos ensucie el consumidor del canvas y documentalo). El **legendario sigue
   gateado a `!isTrap`** (no se rollea en dig trampeado). El `random` sigue inyectable y el
   consumo de RNG debe quedar DETERMINÍSTICO (los tests siembran `random`).
3. **Engine — camino atómico del robot/offline** (§4.43). `applyContainerResult` pasa a:
   (a) acreditar TODOS los items con `creditDugItem` (respetando `robotFilters`); (b) si
   `result.isTrap`, además `springTrap`. En `systems/automation.js` (~251-258), el bloque del
   Escáner cambia: si `result.isTrap && random() < getAutoTrapDiscardChance(state, data)` →
   llamar `applyContainerResult` con el resultado **sin la trampa** (mismos items, `isTrap`
   neutralizado) y `state.trapsDiscarded++` (conserva los items, descarta solo la trampa); si no
   dispara → `applyContainerResult` con el resultado COMPLETO (items + castigo). `registerContainerDig`
   se sigue llamando una vez. Replicá el mismo criterio en `systems/offline.js` (auto-dig
   offline) y verificá el orden vendedor/loot (R23.3).
4. **Store — ciclo de vida del escarbado manual** (`apps/game/src/store.js`, ~283-367). El
   escarbado deja de aplicar todo al final:
   - `startManualDig`: como hoy, pero NO acredita nada y NO registra el nivel; guarda en
     `pendingDig` las entries (items + cuál es la trampa) y un acumulador `creditedMoney = 0`.
   - Nueva acción `revealDugEntry(index)` (la despacha el canvas al destapar el objeto `index`,
     con guard de "ya acreditado"): si la entry es item → `creditDugItem(...)`, suma a
     `creditedMoney`, devuelve el dato para el juice de hallazgo; si es la trampa → `springTrap(...)`,
     `registerContainerDig`, `pendingDig = null`, `runAchievements()`/`runMissions()`,
     `detectContainerUnlocks()`, persist/notify, y devuelve `{ trapSprung: true, ... }` para el
     juice de trampa y para que la UI cierre el escarbado (los items no destapados se pierden).
   - `finishManualDig` (solo se alcanza si el dig se completó SIN trampa): `registerContainerDig`,
     **+1 de racha** (`digStreak++`, `bestDigStreak = max(...)`, §4.20), achievements/misiones,
     level-up toast. Ya NO acredita items (se acreditaron al destaparse).
   - `abandonManualDig`: los items ya destapados quedan acreditados; `registerContainerDig` UNA
     vez; racha intacta; sin castigo. `DECISIÓN:` comentario inline explicando que abandonar
     conserva el loot parcial y no dispara la trampa.
5. **UI/canvas — avisar por-reveal, sin economía** (`apps/game/src/dig/DigCanvas.js`). Hoy el
   canvas junta todo y llama `onComplete` al destapar TODO. Nuevo: en `scratch` (~534-546), por
   cada índice de `newlyRevealed`, invocar un callback nuevo `onRevealEntry(index, entry)` que el
   dueño (UIManager/store) mapea a `revealDugEntry`. El canvas NO sabe de dinero: solo sabe que la
   entry `index` es item o trampa (ya lo tiene en `this.entries[index].isTrap`) para elegir el
   juice. Si la entry destapada es la trampa → juice de trampa (shake+flash, §5.2) y frenar el
   escarbado (marcar `completed`, no seguir destapando); si es item → juice de hallazgo
   (pop+partícula+sonido, §5.2). `onComplete` (completado total sin trampa) sigue existiendo para
   `finishManualDig`. El modelo de revelado (`digRevealModel`) NO se toca — la trampa es una entry
   más, con su objeto y su huella (R29.1/R31.7).
6. **Juice** (PLAN.md §5.2): hallazgo por-ítem al destaparse cada uno (ya existe el patrón — que
   se dispare por reveal, no al final); trampa con shake+flash al saltarla; el conteo tweened del
   dinero suma por-ítem. Sin sonidos nuevos si no hacen falta.

### Tests RED de 31.3.B (Node/Vitest salvo el e2e)

- `ronda31-trampa-simultanea.test.js` (engine):
  - snapshot: `applyContainerResult` sin trampa da EXACTAMENTE lo mismo antes/después del
    refactor del paso 1 (deriva el esperado de la data, no lo hardcodees).
  - `rollContainerResult` con `random` que fuerza trampa devuelve `isTrap: true` **y** una lista
    de items no vacía con la entry-trampa marcada; el legendario NO aparece en un dig trampeado.
  - `creditDugItem` acredita un item (dinero o captura al Puesto según umbral/capacidad) y NO
    toca racha/nivel/trampa; `springTrap` pone `digStreak` en 0, `trapsHit++` y aplica el castigo
    correcto por grado (leve/normal/grave).
  - **Robot "guarda todo, come el castigo"**: `applyContainerResult(isAuto)` con trampa acredita
    los items Y aplica el castigo; el total de dinero es `Σ items − castigo` (cubrir el signo).
  - **Escáner descarta solo la trampa**: con `getAutoTrapDiscardChance` = 1 (nodo `escanerTrampas`
    nivel 3 seed), un contenedor trampeado deja los items acreditados, `trapsDiscarded++`, SIN
    castigo ni corte de racha. Con chance 0, cae al "guarda todo, come el castigo".
  - offline: el auto-dig offline con trampa sigue el mismo criterio que el robot online (mismo
    test con el path de `applyOfflineProgress`), sin romper el orden R23.3.
- `ronda31-credito-parcial.spec.js` (e2e, seeds por `addInitScript`, regla dura 9): sembrar un
  contenedor con un resultado de trampa+items forzado (RNG del store inyectado como en specs
  previos, o helper de `iniciarEscarbadoSinTrampa`/con-trampa de la ronda 30.B); destapar 2 items
  (gestos reales sobre `window.__digDebug.positions`) → `#money` sube por esos 2 (polling);
  **abandonar** → el dinero de esos 2 QUEDA y no hay castigo; en otro run, destapar la trampa →
  toast/estado de trampa, `#money` refleja lo destapado antes menos el castigo, y el escarbado se
  cierra sin destapar el resto. Recontá el baseline e2e completo (regla dura 18).
- Ajustar los e2e de dig existentes que asuman "trampa ⇒ 0 items" (ronda 20/30): con la
  co-ocurrencia un dig trampeado ahora TAMBIÉN trae items — declarar y actualizar, no tapar.

## 31.4 Riesgos

- R31.1 **Bóveda a Contrarreloj**: pincel más chico (areaRate) + resistencia más alta contra
  su límite DURO de tiempo puede volverla imposible. La calibración incluye un caso
  explícito: con las stats de banda (ritmo 0.9+, areaRate 0.95+) la bóveda se completa con
  ≥ 20% del timer de sobra. Si no, se ajusta SU fila de la tabla (es `fueraDeCadena`, no
  arrastra a nadie).
- R31.2 La curva temprana validada (primera mejora en 20-30s, primer prestigio 20-40 min,
  PLAN.md §3) es intocable: `tachoVereda` queda en 1.0/1.0 a propósito y la pasada manual de
  la Nota final de balance es OBLIGATORIA en esta ronda (es la ronda de dificultad).
- R31.3 Quitar los $250k tempranos alarga el early-mid game real del usuario: verificar en la
  pasada manual que el salto a `containerIndustrial`/`depositoAbandonado` sigue llegando en
  tiempos razonables sin ese regalo; si se estira feo, compensar en data (costos o valores
  de pool) con `AJUSTE:`, nunca devolviendo el regalo.
- R31.4 Tests existentes con resistencias viejas hardcodeadas (ronda 10/20/26/27): recontar y
  actualizar los fixtures citando esta ronda — el snapshot procedural (`resistencia × 1.32^n`)
  cambia de base numérica y sus asserts absolutos deben derivarse de containers.json.
- R31.5 El diagnóstico de la racha puede concluir que el bug vive en la build Electron: NO
  arrastrar esta ronda a re-empaquetar release — se documenta, se arregla el código, y el
  smoke del instalador queda para la ronda 33 (release final, que ya lo tiene en su DoD).
- R31.6 **El refactor de `applyContainerResult` es cirugía a corazón abierto de la economía**
  (containers.js:363; lo consumen robot, offline, stall, misiones, logros). El paso 1 de
  31.3.B es SOLO estructural: el snapshot-test "sin-trampa idéntico antes/después" va PRIMERO y
  todos los tests existentes de `applyContainerResult` deben pasar sin tocarse. Si un test
  existente se cae por el refactor, el refactor está mal — no se ajusta el test.
- R31.7 **La trampa simultánea sube el loot esperado** (antes un dig trampeado daba 0 items;
  ahora trae la lista normal + castigo). Esto AFLOJA la dificultad que sube el resto de la
  ronda: la calibración de la tarea 4 (31.3, `calibrate-resistencia-ronda31.mjs`) debe
  re-correrse CON este cambio activo y, si el ritmo del primer prestigio se acorta de nuevo,
  se ajustan constantes de data (`trapPenaltyMult`, valores de pool o costos) con `AJUSTE:` —
  nunca las fórmulas ni el diseño de la trampa. Documentar la corrida final en HANDOFF.
- R31.8 **Crédito por-ítem = riesgo de doble crédito o crédito fantasma.** El único disparador
  es `newlyRevealed` del modelo, con guard por índice ya acreditado; el repintado por
  `focus`/`visibilitychange` NO re-acredita. Cubrir con un test que repinte y verifique que el
  dinero no se duplica (patrón napkin: el canvas solo pinta, el estado vive en JS).
- R31.9 **Abandonar deja de ser gratis-sin-consecuencia**: hoy `abandonManualDig` no registra
  el nivel; con el crédito parcial pasa a registrar el dig UNA vez (el contenedor se compró y
  se consumió). Verificar que ningún e2e existente asuma "abandonar no cuenta para el nivel"
  (recontar baseline, regla dura 18) y documentar el cambio de contrato.

## 31.5 DoD

```
npm test + npm run test:e2e verdes (baselines recontados y anotados en HANDOFF)
Salida de calibrate-resistencia-ronda31.mjs en banda, pegada en HANDOFF
Pasada manual de juego real contra PLAN.md §3 (obligatoria): hitos tempranos intactos, dificultad nueva palpable en tiers 3+
Manual 375px: Tienda y selector muestran ritmo/pincel actuales; bóveda contrarreloj completable
Causa de los logros de racha identificada, testeada y documentada en HANDOFF
Trampa simultánea (§4.42/§4.43, bloque 31.3.B): manual acredita por-ítem, salta+corta al destapar la trampa, abandonar conserva el loot parcial; robot "guarda todo, come el castigo" y el Escáner descarta solo la trampa; offline consistente. Tests de 31.3.B verdes.
Manual 375px del escarbado: destapar items acredita al toque, abandonar con 1-2 items conserva su valor, saltar la trampa castiga y cierra el dig
Commit "feat: ronda 31 — dificultad y balance (resistencias, racha, fix 250k, trampa simultánea + crédito parcial)" + HANDOFF + push + PR link
```

---

# RONDA 32 — Nueva pantalla de inicio full-bleed (rama `feat/inicio-ronda32`, 1 agente, sin bump de save)

> Pedido del usuario (2026-07-19): reemplazar la pantalla de inicio actual por la de
> `reference/ui/NuevaPantallaInicio.webp` (emblema DUMPSTER EMPIRE arriba, botón JUGAR grande al
> centro, engranaje de Ajustes abajo a la derecha, marco dorado ornamentado y fondo de un
> contenedor-patio al atardecer). Requisito duro: **debe verse claramente en teléfono Y ajustarse
> a la ventana y a la resolución en PC**. Hoy, "en ventana se ve PERFECTO pero en pantalla completa
> quedan bordes vacíos". Ronda 100% de presentación: **cero engine, cero data de balance, cero
> save** (regla dura 17 no aplica). Corre después de la 31 (sobre la paleta y el arte definitivos
> de las rondas 28-30).

## 32.0 Causa raíz verificada contra el repo (2026-07-19) — leer antes de tocar nada

Mapa exacto (recontar líneas al ejecutar; el contenido manda):

- **Por qué quedan bordes vacíos en pantalla completa**: `apps/game/styles/layout.css` tiene
  `#app { max-width: 720px; margin: 0 auto; }` (~43-50). `#title-screen` es hijo directo de `#app`
  (`apps/game/index.html` ~46: `<div id="title-screen" class="title-screen" hidden></div>`), así
  que en una pantalla ancha/fullscreen la pantalla de inicio es una columna de 720px centrada con
  el fondo del body (`--bg-0`) a los costados. En una ventana ≤720px llena justo → "se ve
  perfecto". **Esa cota de 720px es la causa; no es el `object-fit` del arte.**
- **Cómo está armada hoy** (`apps/game/src/ui/TitleScreen.js` + `layout.css` ~83-242): un
  `<img class="title-bg" src="assets/title-bg.jpg">` con `object-fit: cover` y, encima, un botón
  JUGAR **calcado por píxeles** sobre el botón PINTADO en el arte (bloque
  `#title-screen[data-bg='ready'] .title-play-btn`, ~224-237: `--title-art-scale`,
  `translate(...)`, offsets medidos sobre `fpisp.png` de 1614×975). Ese calco es frágil: solo
  cuadra cerca de la proporción del arte original y es el segundo problema a eliminar.
- Estados de fondo (`data-bg` en `#title-screen`): `loading` (respaldo madera + logo SVG + botón
  centrado por flex), `ready` (arte visible; el logo de respaldo pasa a `.sr-only`), `error`
  (respaldo definitivo, el juego sigue jugable). El botón real y el engranaje ya existen como DOM:
  `#title-play-btn` (`.title-play-btn`) y `#title-settings-btn` (`.icon-btn-circle`), cableados a
  `onPlay`/`onSettings`. Las claves i18n `titleScreen.play` y `titleScreen.settings` existen en
  `es.js` y `en.js` (no romper, regla dura 11/15).
- La CSP de `index.html` ya permite imágenes locales (`'self'`) — los `.webp` de contenedores
  cargan hoy: **la CSP NO se toca** (regla dura 7) y `apps/game/tests/csp.test.js` sigue verde.

## 32.1 Diseño (el approach robusto: full-viewport + controles reales responsive)

La idea es dejar de calcar píxeles y hacer que el arte sea un **fondo de cobertura** con los
controles como **DOM real posicionado por layout** (se re-acomodan solos a cualquier resolución):

1. **Romper la cota de 720px SOLO para la pantalla de inicio**: `#title-screen` pasa a
   `position: fixed; inset: 0; width: 100vw; height: 100dvh` (con fallback `100vh`) y un `z-index`
   por token, alto pero por debajo de toasts/modales. `fixed` se mide contra el viewport, así que
   escapa del `#app { max-width: 720px }` sin tocar la columna de 720px del juego (que sigue
   mobile-first e intacta). Al apretar JUGAR el `#title-screen` se oculta (`[hidden]`) y el juego
   aparece como hoy.
2. **Fondo full-bleed**: el `<img class="title-bg">` (el `.webp` nuevo) con `object-fit: cover;
   object-position: center` a `100% × 100%` del `#title-screen` fijo → llena el viewport en
   cualquier proporción, recorta con gracia, **nunca deja bordes vacíos**. En portrait de teléfono
   recorta los costados; en fullscreen ancho recorta arriba/abajo. Por eso los controles NO
   dependen de la posición del arte (punto 3).
3. **Controles reales, responsive, sin calco de píxeles**:
   - Layout: `flex` en columna, centrado. Emblema arriba, JUGAR al centro; engranaje anclado
     abajo a la derecha (`position: absolute; right/bottom` con `env(safe-area-inset-*)` para
     notches).
   - JUGAR: reusar `.title-play-btn` (placa metálica viva, texto `t('titleScreen.play')` — sigue
     traducible). Tamaño con `clamp()` (teléfono ↔ desktop). **Eliminar** el bloque
     `#title-screen[data-bg='ready'] .title-play-btn { --title-art-scale … translate … }` y sus
     comentarios de medición: el botón ya no se ancla al arte.
   - Engranaje: reusar `#title-settings-btn` (`.icon-btn-circle`), tamaño con `clamp()`, anclado
     abajo-derecha con safe-area.
   - Emblema: `reference/ui/logo.png` como `<img class="title-logo-img">` (o el SVG actual)
     escalado con `clamp()`/`max-width` y centrado. Si el arte de fondo ya trae el logo horneado,
     se mantiene el logo DOM con `.sr-only` para accesibilidad (como hoy) — decidir y documentar.
   - Marco dorado: overlay CSS pegado a los bordes del viewport (`border-image` con un asset de
     esquina, o 4 esquinas absolutas) para que quede SIEMPRE flush a cualquier proporción. (Si el
     marco viene horneado en el arte, con `cover` se recorta en proporciones extremas y deja de
     estar flush — por eso el overlay CSS es más robusto; recomendado.)
4. **`TitleScreen.js`**: conserva los estados `loading`/`ready`/`error` (respaldo → nunca pantalla
   en blanco), pero el estado `ready` YA NO reposiciona el botón: solo hace fade-in del arte. El
   respaldo `loading`/`error` reusa el mismo layout responsive (fondo sólido por token + emblema +
   JUGAR centrado), así que se ve bien aunque el `.webp` no cargue.

## 32.2 Assets (convención + dependencia, patrón ronda 30)

- Archivo nuevo: `apps/game/assets/title-bg.webp` (derivado de `reference/ui/NuevaPantallaInicio.webp`).
  Se puede dejar `title-bg.jpg` como fallback o reemplazarlo — documentar la decisión.
- **El fondo provisto NO debe traer horneados el botón JUGAR ni el engranaje**: esos son DOM real,
  vivos (JUGAR es texto traducible; el engranaje es interactivo). El **logo** y el **marco dorado**
  SÍ pueden venir horneados (son decorativos), aunque el marco queda más robusto como overlay CSS.
  El `NuevaPantallaInicio.webp` actual trae JUGAR y engranaje horneados → **la ronda arranca
  BLOQUEADA** hasta que el usuario suba una versión de fondo limpia (escena + logo + marco, sin
  JUGAR ni engranaje) a `reference/ui/`, o confirme explícitamente la variante de compromiso de
  abajo. Si al empezar falta, detenete y pedísela con esta descripción exacta.
- **Variante de compromiso (NO recomendada, solo si el usuario la pide)**: usar el `.webp`
  completo tal cual como cover y poner el JUGAR real TRANSPARENTE (hitbox sin texto) sobre la zona
  del botón horneado. Reintroduce dependencia de posición y hornea "JUGAR" en español (rompe el
  pt/fr/de de la ronda 33). Se documenta como deuda de i18n si se elige.
- Peso/derechos: optimizar el `.webp` (anotar el peso final en HANDOFF, patrón R30.1); imágenes
  libres de uso comercial (van al build de Steam) — responsabilidad del usuario, dejar constancia.

## 32.3 Tareas

1. **CSS (`layout.css`)**: `#title-screen` a `position: fixed; inset: 0; 100vw/100dvh` con
   `z-index` por token nuevo (`--z-title`, en `tokens.css`, debajo de `--z-toast`/`--z-modal`);
   `.title-bg` cover a pantalla completa; layout flex de emblema/JUGAR/engranaje con `clamp()` y
   `env(safe-area-inset-*)`; overlay del marco dorado. **Borrar** el bloque de calco
   `#title-screen[data-bg='ready'] .title-play-btn` y sus `:active` asociados. Cero colores/medidas
   sueltas fuera de tokens salvo las de layout puro (regla dura 6).
2. **Markup/JS (`TitleScreen.js`)**: apuntar `title-bg` al `.webp` nuevo; agregar el `<img>` del
   emblema (o mantener el SVG) y el overlay del marco; simplificar `setBgState` (el `ready` ya no
   ancla el botón). Handlers `onPlay`/`onSettings` intactos. Sin `console.log`.
3. **i18n**: `titleScreen.play`/`titleScreen.settings` ya existen; si agregás algún `aria-label`
   nuevo, va en `es.js` Y `en.js` (regla dura 15). El copy español existente es intocable (11).
4. **Verificación de responsive**: probar 375×667 (teléfono portrait), teléfono alto (p. ej.
   390×844), 1280×720, 1920×1080 y 21:9 (2560×1080): el arte cubre TODO el viewport (cero bordes
   vacíos), el marco queda flush, y JUGAR + engranaje quedan dentro de la zona segura y son
   tocables. Matriz de screenshots al HANDOFF.

## 32.4 Tests / e2e

- `ronda32-inicio.spec.js` (nuevo): a 375×667 y a 1920×1080, `#title-screen` cubre el viewport
  completo — assert de que su bounding box == `window.innerWidth × innerHeight` (en 1920 el ancho
  del title es 1920, NO 720: esto prueba que se rompió la cota de `#app`). JUGAR visible y
  clickeable → transiciona al juego (`.game-shell` visible, `#title-screen` `[hidden]`);
  engranaje visible y clickeable → abre Ajustes. El `<img>` del arte carga (`naturalWidth > 0`) o
  se ve el respaldo; sabotear la ruta del arte (route-interception, patrón napkin/ronda 18) →
  cae al respaldo y JUGAR SIGUE funcionando.
- **e2e existentes que tocan la pantalla de inicio** (hoy referencian `titleScreen`:
  `smoke.spec.js`, `ronda4-regression.spec.js`, `ronda14-regression.spec.js`, `ronda16-i18n.spec.js`,
  `ronda23-puesto.spec.js`, `dig-regression.spec.js` y `e2e/helpers/dig.js`): recontar el baseline
  completo y actualizar los que dependan del markup/posición viejos del botón (regla dura 18: lo
  que se rompa por el rediseño se declara y se ajusta, no se saltea). El helper que aprieta JUGAR
  para entrar al juego debe seguir encontrando `#title-play-btn`.
- `apps/game/tests/csp.test.js` verde sin tocar la CSP (los assets son `'self'`).

## 32.5 Riesgos

- R32.1 `position: fixed; inset: 0` en `#title-screen` debe seguir tapando toasts/tutorial/modales
  mientras está activo (ya hay reglas `#title-screen:not([hidden]) ~ …` en layout.css ~110-114):
  verificar el `z-index` y que al ocultarse (`[hidden]`) no quede capturando toques sobre el juego.
- R32.2 `object-fit: cover` recorta en proporciones extremas: el contenido crítico (emblema,
  JUGAR, engranaje) NO puede depender de la posición horneada del arte — por eso son DOM real en
  la "zona segura" central/inferior. Verificar en portrait alto y en 21:9.
- R32.3 Notches/safe-areas: el engranaje abajo-derecha usa `env(safe-area-inset-*)` para no quedar
  bajo la barra de gestos en teléfono/Steam Deck.
- R32.4 `100vh` vs `100dvh` en móvil (barra de direcciones): usar `100dvh` con fallback `100vh`.
- R32.5 Eliminar el calco puede romper los 7 e2e que tocan la pantalla de inicio: recontar y
  actualizar en la MISMA ronda (no desactivar specs).
- R32.6 Fullscreen en Electron: verificar en la build empaquetada (patrón ronda 18,
  `--user-data-dir` temporal) que el arte cubre sin bordes y el juego arranca al apretar JUGAR.
- R32.7 Peso del `.webp`: optimizar y anotar el peso final en HANDOFF (R30.1).

## 32.6 DoD

```
npm test + npm run test:e2e verdes (baseline recontado y anotado en HANDOFF)
Matriz de screenshots (teléfono portrait, teléfono alto, 1280, 1920, 21:9) SIN bordes vacíos, marco flush, controles tocables — pegada en HANDOFF
Manual: JUGAR entra al juego, engranaje abre Ajustes, respaldo se ve bien si el arte no carga
Fullscreen Electron verificado (sin bordes vacíos)
Commit "feat: ronda 32 — nueva pantalla de inicio full-bleed" + HANDOFF + push + PR link
```

---

# RONDA 33 — Idiomas pt/fr/de + re-release (rama `feat/i18n-release-ronda33`, 1 agente)

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
5. **Higiene legal y de credenciales antes de publicar** (auditado el 2026-07-19, ronda 29.D):
   a. **`LICENSE` tiene `<TITULAR>` sin completar** — dice literalmente
      "Copyright (c) 2026 `<TITULAR>`. Todos los derechos reservados." Para un producto
      comercial hay que reemplazarlo por el nombre o razón social real del titular (el mismo
      que figure como editor en Steamworks). Es tarea del USUARIO (dato personal/fiscal), no
      del agente: si al llegar a esta ronda sigue con el placeholder, detenerse y pedirlo.
   b. **Secretos que NUNCA van al repo, ni siquiera privado**: la Steamworks Publisher API key
      y las credenciales de la cuenta de build de SteamPipe. Van como secrets de GitHub Actions
      o directamente fuera del control de versiones. En cambio el **appId y los depotId reales
      SÍ son públicos** (no son secreto) y por eso los `TODO(usuario)` de
      `tools/steam/app_build.vdf` y `depot_build.vdf` se completan y se committean normal.
      Verificación de cierre de la ronda: grep de `api[_-]?key|secret|password|token|credential`
      sobre el repo (excluyendo `node_modules` y los `tokens.css` de diseño) con resultado
      limpio, y confirmar que `ci.yml` no filtra ningún `secrets.*` a la salida de un job.
   c. **Visibilidad del repo**: auditado el 2026-07-19 estaba PÚBLICO (0 forks, 0 stars) y sin
      nada sensible commiteado, pero el juego es vanilla buildless — clonarlo es tenerlo
      jugable sin compilar. Decisión del usuario pasarlo a privado (Settings → General →
      Danger Zone → Change repository visibility); es reversible y no cambia el remote ni los
      clones locales. Única contra: en privado los minutos de Actions dejan de ser ilimitados
      (2000/mes en el plan gratis; el `ci.yml` actual no se acerca).
6. DoD: `npm test` + `npm run test:e2e` verdes (recontar baselines y dejarlos en HANDOFF);
   veredicto APTO; **`LICENSE` con titular real y grep de secretos limpio (§33.5)**; commit +
   push + PR link. **Después de mergear esta ronda, el usuario ejecuta el checklist U1-U9 de
   ROADMAPv3 §2 y lanza.**

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
