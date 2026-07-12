# ROADMAPv4.md — Rondas 19-29: expansión de contenido, Puesto de Chatarra, NPCs y lategame infinito

> **Para el agente ejecutor.** Este plan cubre ONCE rondas que se ejecutan EN ORDEN, cada una en
> su propia rama con su propio PR (el usuario mergea entre rondas). NO empieces una ronda sin que
> la anterior esté mergeada en main. Todo el contenido de este roadmap sale **antes del
> lanzamiento en Steam** (decisión del usuario, 2026-07-11): el orden es por dependencia técnica
> y el release final es la ronda 29.
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

## 0. Estado actual (2026-07-11, post-ronda 18, verificado contra el repo)

- Rondas 1-18 (ROADMAPv3 completo) hechas y mergeadas en main. Baselines: `npm test` →
  **299 passed (26 archivos)**; `npm run test:e2e` → **53 passed**.
- Data: **16 contenedores**, **111 ítems**, **35 logros** (`a1`..`a35`), **12 máquinas**,
  **13 nodos** de prestigio, **4 mejoras rápidas**, ~168 íconos, i18n es/en completo.
- `SAVE_VERSION = 7` (`packages/engine/src/state.js`).
- La venta es **instantánea**: `applyContainerResult` (systems/containers.js) suma el valor a
  `money` directo. El inventario del Puesto (ronda 22) es un sistema nuevo de verdad.
- `marketFluctuation` existe y afecta el valor, pero es **invisible** para el jugador (ronda 22
  lo vuelve visible como "cotización del día").
- **Conteos = indicativos.** NUNCA hardcodees un conteo en un test o script; recontá desde la
  data al ejecutar (regla heredada de ROADMAPv3 §0).

---

## 1. Reglas duras globales (las 10 rondas)

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
14. **Todo sistema con reloj** (misiones diarias, energía, pedidos, eventos, día/noche) usa
    deltas clampeados a ≥ 0 (`Math.max(0, now - since)`) y NUNCA regenera/avanza si el reloj
    retrocede. `JSON.parse` puede devolver `Infinity` (`1e999`): timestamps de save siempre
    con `Number.isFinite` (lección ronda 18).
15. **Todo copy nuevo entra en `es.js` Y `en.js` con traducción real de una** (el inglés ya
    shippeó en la ronda 16; no hay "placeholder en español" nunca más). Data nueva con nombre
    visible → entrada en `data-en.js`. Los tests de paridad de la ronda 16 lo vigilan.
16. Appends a `agentes/HANDOFF.md`: escribir el bloque a un archivo temporal (Write) y
    appendear con `cat archivo >> agentes/HANDOFF.md` en Bash — el heredoc multilínea se rompió
    con CRLF en la ronda 18.
17. **Cada ronda que agrega estado persistente bumpea `SAVE_VERSION`** (v8..v16, ver tabla §2)
    con su migración en `save.js` (backfill de defaults, nunca fabricar contenido que "lave"
    un save inválido — ver el comentario de la migración v6→v7) y tests de migración.
18. **El puesto y todo sistema nuevo degrada limpio**: si el jugador no lo desbloqueó, el juego
    es EXACTAMENTE el de hoy (los 53 e2e existentes deben pasar sin tocarse, salvo que una
    ronda declare lo contrario explícitamente).

---

## 2. Cobertura: idea → ronda (ninguna se queda afuera)

| Idea | Origen | Ronda | Save |
|---|---|---|---|
| Racha/combo de escarbados sin trampa | usuario + postre PLAN.md | **19** | v8 |
| Pantalla de estadísticas | brainstorm | 19 | v8 |
| % de completitud de colección visible | brainstorm | 19 | v8 |
| Logros secretos/ocultos | brainstorm | 19 | v8 |
| Vibración táctil (trampa/hallazgo épico) | postre PLAN.md | 19 | v8 |
| Botón JUGAR estilo placa metálica (`reference/ui/JUGARBUTTON.png`) | usuario (2026-07-12) | 19 | — |
| Trampas con grados + indicios visuales | postre PLAN.md | **20** | v9 |
| Espiar un slot gastando Energía | postre PLAN.md | 20 | v9 |
| Herramientas de escarbado equipables | brainstorm | 20 | v9 |
| Contenedores con mecánica propia (contrarreloj, oscuridad) | postre ROADMAPv3 §7 | 20 | v9 |
| Sets de colección con bonus | brainstorm | **21** | v10 |
| Legendarios 1-en-500 + vitrina/salón de trofeos | postre PLAN.md | 21 | v10 |
| **Puesto de venta + inventario + NPC + robot vendedor** | usuario | **22** | v11 |
| Pedidos de compradores (sobreprecio por categoría) | brainstorm | 22 | v11 |
| Negociación de venta / timing de mercado (marketFluctuation visible) | postre PLAN.md | 22 | v11 |
| NPCs con retrato y personalidad + historia liviana por prestigio | usuario | 22 | v11 |
| **Misiones diarias (3) con recompensa según progreso, llaves** | usuario | **23** | v12 |
| Eventos de contenedor dorado / en llamas | postre PLAN.md | 23 | v12 |
| Ciclo día/noche (hora del sistema) | postre PLAN.md | 23 | v12 |
| Especializaciones al prestigiar | postre PLAN.md | **24** | v13 |
| Desafíos / runs con modificador | brainstorm | 24 | v13 |
| Nodos infinitos del árbol | brainstorm | 24 | v13 |
| Segunda capa de prestigio ("Mudanza de Galaxia", Escrituras) | brainstorm | **25** | v14 |
| Contenedores procedurales post-Big Bang | brainstorm | 25 | v14 |
| Sufijos numéricos extendidos (Qa, Qi, …) | regla CLAUDE.md | 25 | v14 |
| Flota de robots asignables | brainstorm | **26** | v15 |
| Filtros por robot (umbral, reservar para el puesto) | brainstorm | 26 | v15 |
| Temas/skins por tokens CSS, desbloqueables | postre PLAN.md (DLC) | **27** | v16 |
| Puerta al DLC cosmético (PLAN.md §8) | PLAN.md | 27 | v16 |
| Leaderboards de Steam | brainstorm | 27 | v16 |
| **Objetos ilustrados reales en el canvas de escarbado (no íconos)** | usuario (2026-07-12) | **28** | — |
| Idiomas pt/fr/de | postre ROADMAPv3 §7 | **29** | — |
| Re-auditoría global + release final | proceso | 29 | — |

Ya implementadas antes de v4 (no repetir): progreso offline visible (modal), colección/álbum
(INDEX rondas 7-14), partículas/sonido por rareza (juice ronda 12).

---

## 3. Diseño transversal (leer antes de cualquier ronda)

### 3.1 NPCs (se crean en la ronda 22; los usan la 23, 25 y 27)

Cinco personajes fijos, data en `apps/game/src/data/npcs.json`
(`{ id, name, portrait, rol }`), retratos SVG en `apps/game/src/icons/portraits.js` (nuevo
registro hermano de `icons.js`, mismo vocabulario de shapes, viewBox 24, cero emojis).
Diálogos SIEMPRE por claves i18n `npc.<npcId>.<contexto>` (es.js + en.js reales).

| id | Nombre | Rol |
|---|---|---|
| `rita` | Doña Rita | Compradora fija del Puesto (ronda 22). Jubilada coleccionista, paga bien y opina de todo. |
| `salomon` | El Turco Salomón | Pedidos especiales del Puesto (ronda 22). Regateador teatral. |
| `chispa` | Chispa | Pibe fanático de robots. Da las misiones diarias (ronda 23) y el flavor de la flota (ronda 26). |
| `zoraida` | Madame Zoraida | Vidente del barrio. Anuncia eventos dorados y el ciclo día/noche (ronda 23). |
| `intendente` | El Intendente | Historia de prestigio: en cada ciudad reaparece con otro cargo (running gag); presenta la Mudanza de Galaxia (ronda 25). |

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
`localDayStamp(now)` (`'YYYY-MM-DD'` local). TODO sistema temporal nuevo (energía, pedidos,
misiones, eventos) pasa por acá. Nada de `Date.now()` crudo restado a un campo de save.

### 3.4 Convención de logros nuevos

Cada ronda agrega los suyos AL FINAL de `achievements.json` (ids consecutivos `a36`, `a37`, …
— recontá el último real al ejecutar, no asumas). Recompensas siguen el principio de la ronda
15: dinero ≈ 10% del hito, llaves para hitos duros. La ronda 29 regenera la tabla de
RELEASE.md con `node tools/steam/achievements-table.mjs` (el usuario re-registra en Steamworks).

### 3.5 Contratos entre rondas (análisis de dependencias 2026-07-12 — respetarlos a rajatabla)

El orden 19→29 se eligió por dependencia técnica; estos son los contratos exactos que lo
sostienen. Si tu ronda rompe uno, detenete y reportá:

1. La **racha** (19) se corta con trampa de CUALQUIER grado (20); los grados NO cambian la
   probabilidad de trampa (§4.6 intacto).
2. Los contenedores especiales de la 20 usan `fueraDeCadena: true` (ver 20.B) — único cambio
   permitido a `isContainerUnlocked`.
3. Los **legendarios** (21) se venden instantáneo SIEMPRE: jamás entran al inventario del
   Puesto (22) ni los toca el robot vendedor; su persistencia es `legendariesFound` (vitrina).
   El filtro de la 26 depende de esta regla.
4. La 23 consume contadores creados por la 19 (`digStreak`) y la 22 (`stallSoldCount`,
   `ordersFulfilledCount`); las misiones de puesto solo se generan con puesto desbloqueado.
5. La 25 consume `totalKeysEarned` (creado y backfilleado en la 24) y crea `flotaFundadora`,
   que consume la 26. La 26 además consume el inventario de la 22.
6. Los contenedores **procedurales** (25) quedan FUERA de: INDEX, sets (21), % de completitud
   (19) y generación de misiones (23). Solo existen para Tienda, escarbado y automatización.
   (Sin esta regla, cada tier Eco sería un "set" nuevo → bonus infinito, bug de balance.)
7. El arte ilustrado (28) cubre TODO ítem existente al ejecutarse; los procedurales reusan el
   arte del pool del Big Bang. Por eso la 28 va después de la última ronda que crea ítems (25).
8. La 27 desbloquea el tema `dorado` con los 8 legendarios (21) y `neonNocturno` con el logro
   de 100 trampas (`a32`, ya existente).

---
---

# RONDA 19 — Quick wins: racha, estadísticas, completitud, secretos, vibración (rama `feat/juice-ronda19`, 1 agente, save v8)

## 19.1 PLAN.md primero

- §4.20 **Racha de escarbado**: `bonusSuerteRacha = min(rachaMaxBonus, floor(racha / rachaTramo) × rachaBonusPorTramo)`.
  La racha sube +1 por escarbado manual completado sin trampa, se resetea a 0 al caer en
  trampa (de cualquier grado desde la ronda 20). El bonus suma a `getLuck` como término plano.
  Solo escarbado manual (el robot no genera ni corta racha). Constantes en `data/streak.json`:
  `{ "rachaTramo": 5, "rachaBonusPorTramo": 1, "rachaMaxBonus": 5 }`
  (AJUSTE: +1 Suerte cada 5, cap +5 — sensible pero no rompe la curva de §4.4).
- §5.4 gana: pantalla de Estadísticas (subvista de Ajustes o sección interna del INDEX —
  NUNCA una pestaña nueva del tabbar: la única pestaña que agrega v4 es el Puesto, ronda 22),
  % de completitud, logros ocultos ("???" hasta desbloquear), toggle de vibración.
- §5.3 gana la spec del **botón JUGAR estilo placa metálica** (pedido del usuario 2026-07-12,
  referencia `reference/ui/JUGARBUTTON.png`): placa verde oliva oscura con marco dorado
  biselado doble (borde grueso + filete interior), 4 remaches en las esquinas del filete y el
  texto en mayúsculas doradas con relieve.

## 19.2 Estado y save (v8)

`freshState()` gana `digStreak: 0`, `bestDigStreak: 0`, `vibrationOn: true`. Migración v7→v8
backfillea los tres. `REQUIRED_FIELDS` + validación de contenido (`digStreak >= 0`, enteros).

## 19.3 Tareas

1. **Data**: `streak.json`; en `achievements.json` sumar `hidden: true` a 2-3 logros existentes
   de hitos sorpresa (p. ej. el de trampas) y 3 nuevos: racha 10 / racha 25 (oculto) /
   `bestDigStreak` 50 (oculto) con cond type nuevo `digStreakAtLeast` (evalúa `bestDigStreak`).
2. **Engine**: racha en `applyContainerResult` (manual: trampa → 0; éxito → +1 y
   `bestDigStreak = max`); término en `getLuck` leyendo streak.json vía `data`. Stats: NO hay
   engine nuevo — la pantalla deriva del estado (`itemsFoundCount`, `trapsHit`,
   `totalMoneyEarned`, `autoProcessedCount`, `bestDigStreak`, niveles de contenedor, etc.).
3. **Tests RED**: racha sube/corta/bonus con cap; el robot no la toca; migración v8;
   `digStreakAtLeast`.
4. **UI**: contador de racha visible en la vista de escarbado (aparece desde racha ≥ 2, con
   pop al subir — juice §5.2); vista Estadísticas (estados cargando/vacío/error/con datos);
   % completitud global en el header del INDEX y por contenedor en cada tarjeta (derivado de
   `itemsFoundByItem` vs pools — recontar desde data); logros con `hidden` muestran "???" +
   ícono genérico hasta desbloquear; vibración: `navigator.vibrate?.()` en trampa (80ms) y
   hallazgo de categoría máxima (30ms) SOLO si `vibrationOn` — toggle en Ajustes (patrón
   `toggleSound`), no-op silencioso en desktop.
5. **e2e** (`ronda19-quickwins.spec.js`): racha visible tras 2 escarbados sin trampa (patrón
   `iniciarEscarbadoSinTrampa` de los helpers e2e); pantalla de stats muestra valores del
   seed; logro oculto aparece como "???" antes y con nombre después de desbloquear.
6. **Botón JUGAR de la placa metálica** (referencia `reference/ui/JUGARBUTTON.png`):
   reemplazar SOLO la piel de `.title-play-btn` (TitleScreen.js) — implementación 100% CSS
   sobre el botón existente: gradientes + box-shadows en capas para la placa y el bisel
   dorado, pseudo-elementos para el filete interior y los 4 remaches, texto con
   `background-clip: text` + text-shadow para el embose dorado. El texto SIGUE siendo
   `t('titleScreen.play')` (vivo, cambia por idioma — por eso el PNG no puede ir como asset
   con el texto horneado). Colores: tokens de la paleta ámbar; si el verde oliva de la placa
   no existe como token, se AGREGA a tokens.css (jamás un color suelto). Estados: hover/focus
   (brillo del marco) y active (la placa se hunde — patrón "extruido" de CLAUDE.md §estilo).
   OJO (skill verify del repo): la pantalla de título mide con unidades cqw/cqh su content
   box — NO agregar padding a `.title-screen` ni mover el botón; solo cambia su piel.
   Verificar la alineación con el arte a 375px y 1280px con screenshot contra la referencia.

## 19.4 Riesgos

- R19.1 La racha toca `getLuck`: los tests de economía existentes deben pasar SIN cambios con
  `digStreak: 0` (bonus 0). Cualquier test que siembre racha > 0 lo declara explícito.
- R19.2 `navigator.vibrate` no existe en Node/Electron: siempre con optional chaining y solo
  desde la UI (jamás engine).
- R19.3 El % de completitud NO cuenta legendarios (existen recién en la ronda 21; cuando
  lleguen, la 21 decide si van en un contador aparte — dejalo anotado en el código).

## 19.5 DoD

```
npm test (los previos + racha/migración/stats) y npm run test:e2e verdes
Manual 375px: racha visible al escarbar, stats navegable, "???" en ocultos, vibración en celu real si hay
Commit "feat: ronda 19 — racha, estadísticas, completitud, logros ocultos y vibración (save v8)"
HANDOFF + push + PR link
```

---

# RONDA 20 — Escarbado profundo: grados de trampa, Energía/espiar, herramientas, contenedores con mecánica (rama `feat/dig-ronda20`, 3 agentes A→C, save v9)

## 20.A — Engine (grados + energía + herramientas)

### PLAN.md primero

- §4.21 **Grados de trampa**: al salir trampa (roll de §4.6 sin cambios), roll secundario:
  **leve** 40% / **normal** 45% / **grave** 15% (constantes en `data/traps.json`). Efectos:
  leve → sin castigo de dinero (solo se pierde el contenedor, cuenta para nivel); normal →
  castigo actual §4.6; grave → castigo ×2 (clamp a `money` como hoy). El descarte del robot
  (Escáner, §4.7) aplica ANTES del grado.
- §4.22 **Energía y espionaje**: `energia = min(energiaMax, energia + floor(clampedElapsedMs(now, energiaAt) / msPorPunto))`.
  Espiar cuesta 1 punto y revela la categoría (no el ítem) de 1 slot ANTES de escarbar, o
  "TRAMPA" si el roll ya salió trampa. `data/energy.json`:
  `{ "energiaMax": 3, "msPorPunto": 90000, "costoEspiar": 1 }`
  (AJUSTE: 3 usos, 1 cada 90s — decisión táctica sin spam).
  Nota de balance: espiar y ABANDONAR es el counterplay intencional a la trampa — el
  contenedor ya pagado se pierde igual, así que no es gratis. Si el playtest muestra abuso
  (evitar toda trampa relevante), se sube `costoEspiar` o se baja `energiaMax` — constantes,
  nunca la fórmula.
- §4.23 **Herramientas**: modifican SOLO el pincel del escarbado —
  `radioPincel × radioMult`, `ritmo × ritmoMult` — nunca valor ni suerte. `data/tools.json`:

| id | name | costo | radioMult | ritmoMult |
|---|---|---|---|---|
| `manos` | Manos curtidas | 0 (inicial) | 1.0 | 1.0 |
| `palaAncha` | Pala Ancha | 75000 | 1.6 | 0.7 |
| `pincelFino` | Pincel de Arqueólogo | 250000 | 0.6 | 1.8 |
| `guanteHidraulico` | Guante Hidráulico | 5000000 | 1.3 | 1.3 |

### Estado y save (v9)

`energy: 3`, `energyAt: 0`, `equippedTool: 'manos'`, `toolsOwned: { manos: true }`,
`spiesUsed: 0`, `gravesHit: 0`. Validación: `energy` entero ≥ 0 (rango contra data en el
store), `equippedTool` string presente en `toolsOwned`, `toolsOwned` mapa booleano
(sumarlo a `BOOLEAN_MAP_FIELDS`).

### Tests RED

Grados (proporciones con `random` sembrado, castigos leve/normal/grave, la racha de la 19 se
corta en los tres); energía (regen clampeada, reloj hacia atrás NO regenera, espiar descuenta
y revela); herramientas (multiplicadores llegan al modelo, comprar/equipar, no tocan
`getLuck` ni `itemSaleValue`); migración v9.

## 20.B — Data + canvas (indicios + mecánicas especiales)

1. **Indicios visuales**: con probabilidad `hintProb: 0.6` (traps.json), el canvas dibuja el
   indicio del grado sobre la capa superior (leve: manchas de humedad / normal: grietas /
   grave: marcas de garras — shapes nuevos). REGLA DURA (napkin): el indicio vive en el
   MODELO (`digRevealModel` o el estado del dig en curso), el canvas solo lo pinta; jamás
   leer píxeles para decidir nada.
2. **Contenedores con mecánica propia** (2 nuevos al final de `containers.json`, prestigio-
   exclusivos, con pools de 7 ítems cada uno en `items.json` — valores interpolados entre los
   tiers 14 y 16, misma regla dura "cada categoría ≥ 1 ítem" de la ronda 15.B):
   - `bovedaContrarreloj` — "Bóveda a Contrarreloj" (`requiresPrestigeCount: 7`, mecánica
     `"mode": "timed"`): `digTime` es límite DURO; si no destapás todo a tiempo, el contenedor
     se pierde SIN castigo (cuenta para nivel). Loot +30% de valor (campo data
     `mechanicValueMult: 1.3`).
   - `sotanoSinLuz` — "Sótano Sin Luz" (`requiresPrestigeCount: 8`, `"mode": "dark"`): solo se
     ve un radio alrededor del puntero (máscara CSS/canvas encima, el modelo no cambia).
     Loot +40% (`mechanicValueMult: 1.4`).
   El campo `mode` es opcional (default `"normal"`): los 16 contenedores existentes no se tocan.
   **Fuera de la cadena de desbloqueo**: ambos llevan `"fueraDeCadena": true` (campo nuevo
   opcional) y `isContainerUnlocked` lo respeta — NO exigen poseer el contenedor anterior del
   array. Sin esto habría un bug de diseño: van al final del array, después de
   `vertederoBigBang` (`requiresPrestigeCount: 9`), y la regla de cadena actual ("poseer el
   anterior") contradiría sus gates de prestigio 7/8 — quedarían bloqueados hasta el prestigio
   9. Test de engine dedicado + confirmar que el e2e de cadena de la ronda 15
   (`ronda15-contenido.spec.js`) sigue verde.
3. Íconos: herramientas (4), indicios (3), contenedores (2) + sus 14 ítems, en icons.js.

## 20.C — UI + e2e + auditoría

1. UI: píldora de Energía en la vista de escarbado (n/máx + barrita de regen); botón "Espiar"
   por slot no revelado (deshabilitado sin energía, tooltip "cuánto falta" — regla CLAUDE.md);
   selector de herramienta (sección en Escarbar o Ajustes, decidir y documentar); timer visible
   en la Bóveda; máscara de oscuridad en el Sótano (touch y mouse). Todo copy es+en.
2. Logros nuevos: espiar 50 veces (`spiesUsedAtLeast`), sobrevivir 10 trampas graves (oculto,
   `gravesHitAtLeast`), comprar las 4 herramientas (`allToolsOwned`).
3. e2e (`ronda20-dig.spec.js`): espiar revela y descuenta; herramienta cambia el radio (medir
   revelado tras un gesto idéntico); Bóveda expira sin castigo (seed money antes/después);
   Sótano renderiza la máscara. Auditoría estilo 15.E sobre el diff (foco: `mode` desconocido
   en un save/data no crashea; energía con reloj manipulado).

## 20.D — Riesgos

- R20.1 El grado NO cambia la probabilidad de trampa (§4.6 intacto): los e2e existentes de
  trampa siguen verdes; el castigo "normal" es el actual.
- R20.2 `mode` nuevo: `rollContainerResult`/DigCanvas con contenedor de `mode` desconocido
  caen a `"normal"` (forward-compat).
- R20.3 El timer de la Bóveda usa el delta del loop (determinismo por tiempo real, CLAUDE.md),
  no `setTimeout`.

## 20.E — DoD

```
npm test + npm run test:e2e verdes · manual 375px (espiar táctil, oscuridad con dedo)
Commits por agente + HANDOFF + push + PR link
```

---

# RONDA 21 — Colección con dientes: sets, legendarios, vitrina (rama `feat/coleccion-ronda21`, 1 agente, save v10)

## 21.1 PLAN.md primero

- §4.24 **Sets**: completar el pool entero de un contenedor (todos sus ítems en
  `itemsFoundByItem`) otorga permanente `+setBonusPercent` al valor de venta de ESE contenedor.
  `data/collectionSets.json`: `{ "setBonusPercent": 0.02 }` (AJUSTE: +2%, suma con
  `levelValueMultPerLevel` sin romper §3). Derivado del estado — sin campo nuevo.
- §4.25 **Legendarios**: 1 ítem único por categoría (8 en total), FUERA de los pools normales
  (`data/legendaries.json`: `{ id, name, icon, categoria, valorBase }`, valorBase ≈ 40× el
  mejor ítem normal de su categoría). Tras un roll SIN trampa, con probabilidad
  `legendaryChance: 1/500` por escarbado (constante en el mismo json) y solo si la categoría
  rolleada en el slot 1 coincide y aún no se posee, el legendario REEMPLAZA el ítem del slot 1.
  Se registra en `state.legendariesFound: string[]` y NO entra en `itemsFoundByItem` (la
  vitrina es su casa). Solo escarbado manual (el robot no encuentra legendarios — son el
  premio del jugador activo).

## 21.2 Estado y save (v10)

`legendariesFound: []` (validar: array de strings; ids desconocidos se filtran al cargar en
el store contra legendaries.json — patrón `sanitizeContainerRefs`).

## 21.3 Tareas

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
4. e2e (`ronda21-coleccion.spec.js`): seed con pool completo → INDEX muestra "SET COMPLETO";
   seed con `legendariesFound` → vitrina lo exhibe; vitrina vacía muestra su empty state.

## 21.4 Riesgos

- R21.1 El legendario reemplaza el slot 1 ANTES de calcular `moneyDelta` (o se recalcula) —
  fijarlo con un test explícito del total.
- R21.2 `legendariesFound` con id desconocido (save manipulado / data renombrada): se filtra
  al cargar, nunca crashea la vitrina.
- R21.3 El % de completitud de la ronda 19 muestra los legendarios en contador APARTE
  ("Vitrina 3/8") — no ensucia el % de pools.

## 21.5 — DoD patrón estándar (tests verdes + manual 375px + commit + HANDOFF + push).

---

# RONDA 22 — EL PUESTO DE CHATARRA: inventario, NPCs, historia, robot vendedor (rama `feat/puesto-ronda22`, 5 agentes A→E, save v11)

> La ronda más grande de v4. Decisión del usuario: inventario real con umbral configurable,
> venta instantánea preservada como default y red de seguridad, desbloqueo avanzada la
> progresión (el tutorial NO se toca), robot vendedor que trabaja el inventario.

## 22.A — Agente A (engine): inventario + captura + venta

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
  - **Los legendarios (ronda 21) NUNCA se capturan**: venta instantánea siempre — su trofeo es
    la vitrina (contrato §3.5.3; el filtro del robot vendedor de la ronda 26 depende de esto).
  - **El progreso offline usa SOLO venta instantánea** para el loot nuevo (el modal offline no
    gestiona inventario); el robot vendedor SÍ vende offline lo ya guardado (ver §4.28).
- §4.26 **Precio de venta en el puesto**:
  `precioPuesto = baseValue × fluctuacionMercadoActual × (stallMultBase + stallMultPorNivel × (stallLevel - 1))`
  con `stallMultBase: 1.25`, `stallMultPorNivel: 0.05`, `stallNivelMax: 5` (costo de subir de
  nivel: `stallCost × 4^(nivel-1)`). La fluctuación se toma AL VENDER, no al guardar — esa es
  la mecánica de "negociación/timing" del postre de PLAN.md: guardar y vender cuando la
  cotización está alta. Toda acción de venta (manual o del robot) REFRESCA primero la
  fluctuación con el mismo helper del roll (`refreshMarketFluctuation`, rng.js) — si no, un
  jugador que no escarba vendería para siempre con la cotización congelada.
- §4.27 **Pedidos**: 2 activos, rotan cada `orderRotationMs: 1200000` (20 min, reloj clampeado
  §3.3) o al cumplirse. Un pedido = `{ npcId, categoria, cantidad (2-4), mult }` con
  `orderMult: 1.4` sobre `precioPuesto`. Generación con `random` inyectable sobre las
  categorías de los contenedores POSEÍDOS (nunca pedir lo inalcanzable).
- §4.28 **Robot vendedor** (máquina nueva en `automations.json`): vende 1 ítem del inventario
  cada `vendedorIntervalo: 20` s (en `automationTick`, mismo reloj por delta): prioridad
  (1) ítems que satisfacen un pedido activo, (2) el de mayor `baseValue`. Vende a
  `precioPuesto` (con mult de pedido si aplica). OFFLINE: dentro de `applyOfflineProgress`,
  vende a fluctuación 1 (sin timing gratis mientras dormís).

### Estado y save (v11)

`inventory: []` (validar CADA elemento: forma exacta, `baseValue` finito > 0, `itemId`/
`containerId`/`categoria` strings; elementos inválidos → save RECHAZADO, no lavado — regla de
la migración v6→v7), `stallLevel: 0`, `keepThreshold: 0`, `stallOrders: []` (misma dureza),
`ordersRotatedAt: 0`, `stallSoldCount: 0`, `ordersFulfilledCount: 0`, `storySeen: []`.
Capacidad: `stallCapacityBase: 12` + `stallCapacityPorNivel: 6` (constantes en
`data/stall.json`, junto con TODAS las de §4.26-4.28).

### Tests RED (los mínimos duros)

Captura respeta umbral/capacidad/fallback; `keepThreshold: 0` = juego idéntico a hoy
(snapshot de `applyContainerResult` con y sin puesto nivel 0); precio con fluctuación al
vender; pedido cumple y paga mult; rotación clampeada (reloj atrás = no rota); robot vendedor
prioriza pedidos y vende offline a fluctuación 1; migración v11; save con `inventory`
manipulado (`baseValue: 1e999`, ítem objeto-basura, array más grande que la capacidad máxima
teórica) se RECHAZA.

## 22.B — Agente B (data): NPCs, retratos, historia, textos

`npcs.json` y `portraits.js` (§3.1), `story.json` (§3.2 — los hitos de esta ronda: Rita al
comprar el puesto, Salomón al primer pedido), `stall.json`, máquina `robotVendedor` en
`automations.json` (`cost: 2000000`, insertada manteniendo el orden por costo — regla de la
ronda 15.C), diálogos es+en (Rita comenta la venta según categoría — 3-4 variantes),
3 logros: primer ítem guardado / 25 pedidos cumplidos (`ordersFulfilledAtLeast`) / puesto
nivel máximo (`stallLevelAtLeast`). Íconos: puesto, estantería, cartel de pedido, retratos.

## 22.C — Agente C (UI): pestaña Puesto

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

## 22.D — Agente D (e2e): `ronda22-puesto.spec.js`

1. Sin puesto: juego idéntico (un escarbado con ítem valioso va directo a `#money`).
2. Seed con puesto + umbral: el ítem valioso aparece en el inventario y el dinero NO sube;
   venderlo manualmente sube `#money` (polling).
3. Pedido sembrado + inventario que lo satisface → cumplir paga el mult (comparar contra
   vender sin pedido).
4. Robot vendedor sembrado → el inventario baja solo. Si el intervalo de 20s no es viable en
   e2e, cubrirlo en engine y aquí solo smoke del estado visible — documentar la decisión
   (precedente: 15.D con el descarte de trampas).
5. Viñeta de Rita aparece UNA vez (recargar → no repite: `storySeen` persistió).

## 22.E — Agente E: auditoría Verif&Audit.md del diff completo

Focos: `inventory` es el vector de save más rico hasta ahora (¿qué pasa el typeof pero rompe
la UI? — strings HTML en `itemId` interpolado, `baseValue` Infinity, arrays anidados);
pedidos/fluctuación con relojes manipulados; XSS vía diálogos NPC (params interpolados);
frontera engine↔UI (percentiles, precios — TODO del engine). Arreglar 🔴/🟡 con tests.
Manual 375px completo.

## Riesgos de la ronda 22

- R22.1 **El tabbar con 7 pestañas a 375px** es el riesgo de UX #1 — resolverlo ANTES de
  seguir (la auditoría 11 ya mordió acá; ver HANDOFF ronda 17).
- R22.2 La captura toca `applyContainerResult`, el corazón de la economía: el snapshot-test
  "sin puesto = idéntico" es OBLIGATORIO y va primero.
- R22.3 Offline + inventario: el vendedor offline NO debe duplicar la venta del período online
  (orden: primero vendedor offline sobre inventario persistido, después venta instantánea del
  loot offline).
- R22.4 `storySeen`/pedidos con ids que ya no existen en data: filtrar al cargar (patrón
  `sanitizeContainerRefs`).

---

# RONDA 23 — Retención: misiones diarias, eventos, día/noche (rama `feat/retencion-ronda23`, 1 agente, save v12)

## 23.1 PLAN.md primero

- §4.29 **Misiones diarias**: 3 por día (fácil / media / difícil). Regeneración: al abrir el
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

- §4.30 **Recompensas acordes al progreso** (pedido del usuario): sea
  `V = valorMedioDelPool(mejorContenedorPoseído) × slotsDeEseContenedor` (el engine expone
  `V`; la UI jamás lo calcula):
  fácil → `6 × V` de dinero; media → `15 × V`; **difícil → `1 + floor(prestigeCount / 3)`
  Llaves de Ciudad (cap 5)**. `moneyEarnedToday` usa `monto = 40 × V`. Constantes (6/15/40,
  cap 5) en missions.json con su `AJUSTE:`.
- §4.31 **Eventos de contenedor**: si no hay evento activo y
  `clampedElapsedMs(now, lastEventAt) > eventoCooldownMs (600000)`, cada tick tiene
  probabilidad `dt / 600` de disparar uno (esperanza ~10 min de juego activo) sobre un
  contenedor poseído al azar: **Dorado** (70%): `valor ×3` por `75` s. **En Llamas** (30%):
  `valor ×4` y `probTrampa +0.15` por `75` s. El evento activo es estado TRANSITORIO (no se
  persiste: cerrar el juego lo pierde — decisión: elimina todo exploit de reloj).
- §4.32 **Día/noche**: noche = hora local ∈ [20:00, 06:00): `Suerte +3` y `probTrampa +0.03`
  (constantes `data/dayNight.json`). Las funciones puras reciben `hour` como parámetro —
  testeables sin mock global.

## 23.2 Estado y save (v12)

`dailyMissions: []` (elementos `{ id, type, params, target, progress, claimed }`, validación
dura de forma y finitud), `missionsRolledAt: 0`, `missionsCompletedCount: 0`,
`lastEventAt: 0` (persistido para que reabrir no regale un evento instantáneo).

## 23.3 Tareas

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
de Zoraida) → e2e (`ronda23-retencion.spec.js`): misiones sembradas muestran progreso real
tras escarbar; reclamar paga (polling); seed `missionsRolledAt` de ayer → al bootear hay 3
misiones nuevas; seed de hoy → NO rerollea.

## 23.4 Riesgos

- R23.1 El snapshot de progreso es LA trampa: si las misiones cuentan con listeners en vez de
  deltas contra snapshot, el robot/offline las infla. Delta = `contadorActual − snapshotAlRollear`,
  clampeado ≥ 0.
- R23.2 Día/noche cambia stats efectivas: los tests de economía existentes corren con hora
  inyectada FIJA de día (12:00) para no volverse flaky según cuándo corra CI.
- R23.3 El evento muta el valor del roll: aplicarlo como multiplicador transitorio del store
  hacia `rollContainerResult`, NUNCA persistido.
- R23.4 **Día/noche vuelve flaky cualquier e2e que corra de noche** (Suerte +3 y trampa +0.03
  reales en el Chromium del test): los specs NUEVOS fijan la hora con `page.clock.install()`
  (Playwright ≥ 1.45; el repo pinea ^1.61) a las 12:00. Además, AUDITAR los e2e EXISTENTES:
  correr la suite completa una vez con `page.clock` simulando las 23:00 (fixture temporal) y
  confirmar que ninguno depende de valores afectados; el que dependa, fija su hora en el spec.
  Documentar el resultado de esa corrida en HANDOFF.

## 23.5 — DoD patrón estándar + verificación manual con el reloj del sistema cambiado a mano
(documentar el resultado en HANDOFF).

---

# RONDA 24 — Prestigio profundo: especializaciones, desafíos, nodos infinitos (rama `feat/prestigio-ronda24`, 1 agente, save v13)

## 24.1 PLAN.md primero

- §4.33 **Especializaciones**: al prestigiar (y solo ahí) se elige 1 de 3, o "Sin
  especialización". Dura hasta el próximo prestigio. `data/specializations.json`:

| id | name | bonus (sellMult) | penalidad (sellMult resto) |
|---|---|---|---|
| `coleccionista` | Coleccionista | ×1.5 en `antiques`, `art`, `relics` | ×0.85 |
| `chatarrero` | Chatarrero | ×1.5 en `common`, `reusable`, `electronics` | ×0.85 |
| `anticuario` | Anticuario | ×1.5 en `historic`, `relics`, `future` | ×0.85 |

- §4.34 **Desafíos**: se ACTIVAN al prestigiar (reemplazan la elección de especialización en
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
  fórmula usara un histórico y no existiera contador por run, se agrega en v13 (migración
  backfill: 0). NO uses `totalMoneyEarned` a secas: es histórico y completaría el desafío al
  instante en cualquier partida avanzada.
- §4.35 **Nodos infinitos**: 3 nodos nuevos SIN `nivelMaximo` (el campo pasa a opcional:
  ausente = infinito — la UI ya muestra "Máximo" cuando existe):
  `codiciaEterna` (+2% valor de venta global/nivel, costoBase 20, factor 2.0),
  `paladaEterna` (+3% Fuerza/nivel, costoBase 15, factor 1.9),
  `imanDeSuerte` (+1 Suerte/nivel, costoBase 25, factor 2.1). Sumidero infinito de Llaves.

## 24.2 Estado y save (v13)

`specialization: null` (string|null con allow-list — patrón `autoTargetContainerId`),
`activeChallenge: null` (ídem), `challengesCompleted: []` (strings),
`specializationsUsed: 0` (contador para su logro),
`totalKeysEarned: number` — **la migración v13 lo backfillea** con
`prestigeKeys + costoAcumulado(prestigeTreeLevels)` (computable desde la data del árbol; lo
necesita la fórmula de Escrituras de la ronda 25). Nota: la migración necesita la data del
árbol → se enhebra igual que `itemNameToId` en v7 (precedente en save.js).

## 24.3 Tareas

Data → Engine (el flujo de prestigio gana el paso de elección; modificadores de desafío en
los getters; goal chequeado al prestigiar y expuesto como cond-evaluator) → tests RED
(especialización aplica y expira al prestigiar; desafío activo modifica; completar paga UNA
vez; nodo sin `nivelMaximo` nunca topea y su costo crece; `totalKeysEarned` migra bien y suma
al ganar llaves) → UI (modal de prestigio: 3 tarjetas de especialización + pestaña/sección de
desafíos con estado activo/completado; badge de especialización o desafío activo visible en
Prestigio) → 4 logros (primer desafío / los 4 (oculto) / nodo infinito nivel 10 /
especialización usada 5 veces — contador `specializationsUsed`) → e2e
(`ronda24-prestigio.spec.js`: prestigiar eligiendo especialización y ver el sellMult
reflejado en un precio visible; desafío activo bloquea la compra de máquinas con su tooltip).

## 24.4 Riesgos

- R24.1 El flujo de prestigio resetea medio estado: la elección se aplica DESPUÉS del reset
  (la especialización sobrevive al reset de la run que arranca — obvio, pero testealo).
- R24.2 `nivelMaximo` opcional: TODO consumidor actual del campo (UI del árbol, validación,
  tests) debe tolerar ausencia — grep obligatorio de `nivelMaximo`.
- R24.3 Desafío y especialización son EXCLUYENTES por run — que la UI lo deje claro en el
  propio modal.

## 24.5 — DoD patrón estándar.

---

# RONDA 25 — Lategame infinito: Mudanza de Galaxia, contenedores procedurales, sufijos (rama `feat/lategame-ronda25`, 4 agentes A→D, save v14)

## 25.A — Engine: segunda capa de prestigio

### PLAN.md primero

- §2.10 **Mudanza de Galaxia**: disponible con `prestigeCount >= 10`. Resetea TODO lo que
  resetea un prestigio Y ADEMÁS: `prestigeKeys`, `prestigeTreeLevels`, `specialization`,
  `prestigeCount` (a 0). NO resetea: logros, colección/vitrina, sets, desafíos completados,
  herramientas, puesto y su nivel (el inventario se LIQUIDA a venta instantánea al mudarse —
  decisión: sin arbitraje entre galaxias), Escrituras y su árbol, `bestDigStreak`, contadores
  históricos. La tabla exhaustiva campo-por-campo se escribe PRIMERO como test RED (R25.1).
- §4.36 **Escrituras**: `escrituras = max(1, floor(sqrt(prestigeCount × totalKeysEarnedRun) / 5))`
  donde `totalKeysEarnedRun` = llaves ganadas desde la última mudanza. AJUSTE inicial: la
  primera mudanza (~10 prestigios, ~200-400 llaves) paga ~9-12 Escrituras; calibrar contra el
  árbol de abajo y documentar.
- §4.37 **Árbol de Escrituras** (`data/deedsTree.json`, 6 nodos, mismos mecanismos que
  prestigeTree): `ventajaGalactica` (+25% valor global/nivel, máx 4), `memoriaDeCiudades`
  (+1 Llave por prestigio/nivel, máx 3), `bolsilloCosmico` (+6 slots de inventario/nivel,
  máx 3), `agendaLlena` (+1 misión diaria/nivel, máx 2), `flotaFundadora` (+1 slot de robot,
  máx 2 — lo consume la ronda 26), `ecoDelBigBang` (desbloquea contenedores procedurales,
  máx 1).

### Estado y save (v14)

`deeds: 0`, `deedsTreeLevels: {}`, `galaxyMoveCount: 0`, `totalKeysEarnedRun: 0` (migración:
= `totalKeysEarned` de v13). Validación numérica dura estándar.

## 25.B — Contenedores procedurales + sufijos

- §4.38 **Tiers procedurales**: con `ecoDelBigBang` comprado, después de `vertederoBigBang`
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
  no cuentan para el % de completitud (19), no forman sets (21) y los generadores de misiones
  (23) los EXCLUYEN al elegir contenedor objetivo. Sus hallazgos SÍ suman `itemsFoundCount` y
  categorías (los logros siguen contando). Test que lo fije: poseer `bigbangPlus1` no cambia
  el denominador del % ni crea un set nuevo.
- **Sufijos** (regla CLAUDE.md: jamás notación científica cruda): extender el formateador a
  `K M B T Qa Qi Sx Sp Oc No Dc UDc DDc TDc QaDc QiDc` (1e3 … 1e48) con test de cada borde;
  el tope procedural se elige para que ningún número visible se quede sin sufijo.

## 25.C — UI + e2e

Pestaña Prestigio gana la sección "Mudanza de Galaxia" (bloqueada con tooltip antes del
prestigio 10; confirmación con resumen de lo que se pierde y lo que queda — patrón del
confirm de prestigio); árbol de Escrituras (reusa el componente del árbol); el Intendente
presenta la mudanza (viñeta story.json); la Tienda muestra el tier procedural siguiente.
3 logros: primera mudanza / 3 mudanzas / Eco 5 comprado (cond types sobre `galaxyMoveCount` y
ownedContainers procedurales). e2e (`ronda25-lategame.spec.js`): seed prestigio 10 → mudanza
disponible, ejecutarla resetea llaves y CONSERVA vitrina/logros (asserts sobre INDEX y árbol);
seed con `ecoDelBigBang` → el tier Eco 1 aparece y es comprable con money alto; un costo
≥ 1e21 se muestra con sufijo (assert de texto, jamás "e+21").

## 25.D — Auditoría (Verif&Audit.md sobre el diff)

Focos: la factory procedural con `n` hostil (0, negativo, 1e9, NaN → clamp/rechazo); mudanza
durante desafío activo (definir: el desafío se CANCELA sin recompensa — testearlo); overflow
de números; Escrituras con contadores manipulados (`Number.isFinite`).

## Riesgos de la ronda 25

- R25.1 La mudanza toca MÁS estado que el prestigio: el test-tabla "qué conserva / qué
  resetea" (campo por campo del GameState) se escribe RED antes de implementar.
- R25.2 Los ids procedurales son ahora parte del contrato de validación de saves — cambiar el
  patrón o el tope es breaking (documentarlo en save.js).
- R25.3 El "Auto" del robot (más caro afordable) debe considerar los tiers generados
  (`getQueueMax`/selección de target con contenedores que no están en containers.json).

---

# RONDA 26 — Flota de robots y filtros (rama `feat/flota-ronda26`, 1 agente, save v15)

## 26.1 PLAN.md primero

- §2.11 / §4.39 **Flota**: el robot actual pasa a ser el slot 1 de una flota. Slots extra: el
  2 lo da `flotaFundadora` (Escrituras, ronda 25) y el 3 una máquina nueva carísima
  (`hangarRobots`, cost 5e9, al final de automations.json por orden de costo). Cada robot:
  `{ targetContainerId: string|null (Auto), filters }`, procesando en paralelo. DECISIÓN de
  diseño a documentar en PLAN.md: los slots paralelos EXISTENTES (por máquinas,
  `getParallelAutoSlots`) pasan a ser "brazos" del robot 1; la flota multiplica robots
  enteros, cada uno con su target y sus filtros. La cola (`autoQueue`) sigue siendo GLOBAL y
  los robots toman de ahí (menor cambio de esquema).
- §4.40 **Filtros por robot** (los evalúa `automationTick`/el vendedor, NUNCA la UI):
  `descartarBajoValor: number` (0 = off; ítems con `value < X` se descartan directamente —
  higiene de lategame para no ensuciar inventario ni ruido), `reservarCategorias: string[]`
  (esas categorías van al inventario del puesto aunque estén bajo el umbral global). El robot
  vendedor (ronda 22) gana `mantenerStockPedidos: boolean` (no vender por debajo de lo que
  exige un pedido activo).

## 26.2 Estado y save (v15)

`robots: [{ targetContainerId: null, filters: {…defaults} }]`. **La migración v15 absorbe
`autoTargetContainerId` como target del robot 1 y ELIMINA el campo del esquema** — primera
migración que borra un campo: sacar de `REQUIRED_FIELDS`… no está (era opcional por
`string|null`, ver el comentario especial en save.js) — actualizar ESE comentario y
`validateDeepContent`, y testear que un v14 real migra limpio y que un v15 con
`autoTargetContainerId` residual no rompe. Validación dura de cada robot (target contra ids
válidos + procedurales; filtros con rangos y allow-list de categorías).

## 26.3 Tareas

Data (hangarRobots, íconos, 2 logros: 3 robots activos / 10.000 procesados con filtros —
contador `filteredProcessedCount`) → Engine (loop de flota, filtros, integración
vendedor/puesto) → tests RED (2 robots procesan 2 contenedores distintos en paralelo; filtro
descarta; reserva manda al inventario; migración v15 en ambos sentidos del campo borrado) →
UI (Automatización se reorganiza en tarjetas de robot: selector de target + filtros con
inputs validados por el engine, estados completos, Chispa de flavor) → e2e
(`ronda26-flota.spec.js`: seed 2 robots → ambas tarjetas visibles y procesando; filtro
visible aplicado).

## 26.4 Riesgos

- R26.1 La migración que elimina campo es nueva en el repo: cubrir el round-trip
  serialize/deserialize v15 y el import de un v14 real.
- R26.2 El drenaje de `autoQueue` con N robots: sin duplicar el mismo contenedor si el dinero
  no alcanza — la afordabilidad se evalúa secuencialmente dentro del MISMO tick.
- R26.3 `descartarBajoValor` mal configurado puede "comerse" el loot del jugador: la UI lo
  deja claro ("Se descartará el 43% de lo que encontrás al ritmo actual" — dato del engine) y
  el default es off.

## 26.5 — DoD patrón estándar.

---

# RONDA 27 — Cosmética y Steam social: temas, DLC-ready, leaderboards (rama `feat/cosmetica-ronda27`, 1 agente, save v16)

## 27.1 Temas/skins

- `data/themes.json`: cada tema = `{ id, name, unlock: {type,...}|null, tokens: { "--amber": "…", … } }`
  — SOLO overrides de tokens existentes de `tokens.css` (regla 6: cero colores sueltos; un
  módulo `applyTheme` setea las variables en `:root`). Temas iniciales: `taller` (default,
  tokens actuales, unlock null), `neonNocturno` (unlock: logro de 100 trampas), `dorado`
  (unlock: los 8 legendarios), `altoContraste` (unlock: primer prestigio — accesibilidad
  temprana, pensado para Steam Deck a distancia de sofá).
- Estado v16: `theme: 'taller'` (allow-list contra themes.json). Selector en Ajustes (temas
  bloqueados con candado + condición legible resuelta desde data — regla del napkin: ids
  nunca crudos). Verificación manual OBLIGATORIA de contraste a 375px por tema.
- **Puerta DLC** (PLAN.md §8): el esquema soporta `unlock: { "type": "dlc", "appId": null }`
  documentado (la compra real es post-release; NADA de código de pago ahora — solo el hook).

## 27.2 Leaderboards de Steam

- Dos tablas: riqueza histórica (`totalMoneyEarned` transformado — Steam guarda int32: subir
  `floor(log10(total) × 100)` y documentar la transformación en el propio steam.js) y
  progresión (`prestigeCount + galaxyMoveCount × 100`).
- IPC nuevo `leaderboard:submit` (preload → main → steamworks.js), submit al prestigiar y al
  mudarse (jamás cada tick). **Verificar la API real de steamworks.js@0.4**
  (`client.leaderboard` o equivalente): si 0.4 no la expone, dejar el bridge con no-op + test
  y documentarlo en HANDOFF para el bump futuro (las versiones pineadas NO se suben sin
  actualizar DESARROLLO.md). Degradación limpia sin Steam (patrón achievements/cloud).

## 27.3 Tareas y DoD

Data/engine/UI/e2e con el patrón estándar; e2e de temas: cambiar tema → una variable CSS
computada cambió y PERSISTIÓ al recargar; save v16 con migración y allow-list; 1 logro
oculto ("Cambiá de tema por primera vez"). DoD estándar.

---

# RONDA 28 — Objetos ilustrados: arte real en el escarbado (rama `feat/arte-ronda28`, 4 agentes A→D, sin bump de save)

> Pedido del usuario (2026-07-12): al escarbar, lo enterrado deben ser **objetos de verdad**,
> no un círculo de color con un pictograma de 32px encima (estado actual:
> `DigCanvas.drawEntry`, apps/game/src/dig/DigCanvas.js — círculo plano + glifo + etiqueta).
> Va ANTEÚLTIMA a propósito: para esta altura el catálogo de ítems de v4 está completo
> (pools de las rondas 20 y 25, legendarios de la 21) y el pase de arte se hace UNA sola vez.
> Es una ronda 100% de presentación: **cero engine, cero data de balance, cero save** — el
> modelo de revelado (`digRevealModel`) y la economía no se tocan.

## 28.A — Agente A: el sistema de arte (el "modelo bien diseñado")

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
  para que la huella jugable no cambie, ver R28.2), (b) **rotación leve** (±15°), (c)
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

## 28.B — Agente B: arte, tanda 1

Ilustrar los pools de los contenedores 1-8 (tachoVereda … el octavo real — recontá) + las 4
herramientas de la ronda 20 (se lucen en el selector). Al terminar: quitar esos ids de
`PENDING_ART`. Verificación visual por matriz de screenshots (script Playwright descartable
en el scratchpad que abre un escarbado sembrado por contenedor y captura a 375px y 1280px);
revisar silueta a tamaño real ANTES de pasar al siguiente pool.

## 28.C — Agente C: arte, tanda 2 + vitrina

Pools de los contenedores 9-16 + `bovedaContrarreloj`/`sotanoSinLuz` (ronda 20) + los 8
**legendarios** (ronda 21 — merecen el nivel de detalle más alto del juego: son el premio
aspiracional; bloom/glow acorde a §5.2). Los tiers procedurales (ronda 25) REUSAN el arte del
pool del Big Bang (ya cubierto por diseño — anotarlo en objectArt.js). Bonus de la ronda: la
**Vitrina** del INDEX pasa a mostrar el arte ilustrado grande (96px) en los pedestales; el
resto del INDEX conserva los íconos de 24px (densidad de grilla — decisión a documentar).
`PENDING_ART` queda VACÍA al cerrar esta tanda (el test de cobertura pasa sin lista).

## 28.D — Agente D: e2e + auditoría visual y de rendimiento

1. e2e (`ronda28-arte.spec.js`): con un escarbado sembrado, `window.__digDebug` expone por
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

## Riesgos de la ronda 28

- R28.1 **El modelo de revelado NO se toca**: `digRevealModel`, las posiciones, la huella de
  muestreo y el umbral de completado quedan bit a bit iguales (los e2e de dig existentes lo
  asertan). El arte es una capa de PINTURA sobre el mismo modelo.
- R28.2 La escala visual (0.7-1.4) es SOLO estética: la hitbox/huella de revelado sigue
  siendo `OBJECT_RADIUS` fijo. Si un objeto grande "parece" destapable por fuera de su
  huella, ajustar la viñeta de tierra, no el modelo (documentar si molesta en playtest).
- R28.3 Un catálogo de ~140 composiciones tienta a bajar la vara al final: el criterio de
  B/C es por tanda con screenshot-review — si una composición no se reconoce a 40px, se
  rehace ANTES de seguir.
- R28.4 `getObjectImage` comparte la trampa de `getIconImage` (napkin): SVG sin `xmlns` en
  data-URL falla en SILENCIO (`naturalWidth 0`) — el test de sanity y el chequeo en draw ya
  lo cubren; no confiar en `complete` solo.

## DoD de la ronda 28

```
npm test + npm run test:e2e verdes (cobertura de arte completa, PENDING_ART vacía)
Manual: matriz de screenshots revisada, rascado fluido, objetos reconocibles a medio destapar
Commits por agente + HANDOFF (con la comparación de FPS) + push + PR link
```

---

# RONDA 29 — Idiomas pt/fr/de + re-release (rama `feat/i18n-release-ronda29`, 1 agente)

1. `SUPPORTED_LANGUAGES = ['es','en','pt','fr','de']` (save.js) + diccionarios completos:
   `pt.js` / `fr.js` / `de.js` (UI — recontar las claves reales con todo v4) y
   `data-pt.js` / `data-fr.js` / `data-de.js` (contenedores, ítems, logros, máquinas, nodos,
   herramientas, legendarios, NPCs, diálogos, misiones, temas — generar los esqueletos por
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

- Multiplayer / co-op / economía entre jugadores.
- Contenido pago con ventaja de gameplay (PLAN.md §8 lo prohíbe; el DLC es SOLO cosmético).
- Mods / Steam Workshop.
- Reescritura del tutorial (v4 lo deja intacto a propósito; si el playtest post-v4 muestra que
  el Puesto necesita tutorial propio, se diseña en un v5).

## Nota final de balance

Cada ronda que toque números corre una pasada de juego real (manual) contra los hitos de
PLAN.md §3 y ajusta SOLO constantes de data con `AJUSTE:`. Si un sistema nuevo rompe el ritmo
del primer prestigio (20-40 min validados por el usuario), la constante cede, no la fórmula.
