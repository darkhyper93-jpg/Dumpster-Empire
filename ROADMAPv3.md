# ROADMAPv3.md — Rondas 15-18: contenido nuevo, inglés completo, pulido y release

> **Para el agente ejecutor.** Este plan cubre CUATRO rondas que se ejecutan EN ORDEN, cada una
> en su propia rama con su propio PR (el usuario mergea entre rondas). NO empieces la 16 sin que
> la 15 esté mergeada en main (la traducción de la 16 cubre el contenido que crea la 15), ni la
> 17 sin la 16, ni la 18 sin la 17.
>
> El plan es autocontenido. Seguí los pasos EN ORDEN, copiá el código EXACTAMENTE y verificá cada
> salida esperada. Si algo no coincide, **detenete y reportá la diferencia** — no improvises.
> Leé `CLAUDE.md` primero (siempre), y `PLAN.md` + `DESARROLLO.md` para el contexto. Las reglas
> que mandan:
> 1. La economía vive SOLO en `packages/engine`; la UI lee estado y despacha acciones.
> 2. Toda fórmula nueva se escribe primero en PLAN.md; las constantes de balance van en `data/*.json`.
> 3. TDD: tests RED antes de implementar.
> 4. Al balancear, se ajustan **constantes de datos**, nunca fórmulas.

---

## 0. Estado actual (2026-07-10, verificado contra el repo)

- Rondas 1-14 + auditoría post-14 hechas y mergeadas. Solo existe la rama `main`.
- Baselines verdes: `npm test` → **226 passed (20 archivos)**; `npx playwright test --list` →
  **43 tests en 11 archivos**.
- Data actual: **12 contenedores** (`containers.json`), **83 ítems** (`items.json`, 6-7 por
  contenedor, 8 rarezas), **27 logros** (`a1`..`a27`), **8 máquinas** (`automations.json`),
  **12 nodos** (`prestigeTree.json`), **4 mejoras rápidas** (`upgrades.json`), **136 íconos**
  (`apps/game/src/icons/icons.js`), **100 claves i18n** (es.js/en.js — en.js tiene los valores
  en español a propósito, la traducción real es la ronda 16).
- `SAVE_VERSION = 5` (`packages/engine/src/state.js:18`). Release en Steam bloqueado por: ítems
  externos del usuario (§2), contenido nuevo (ronda 15) e inglés (ronda 16).
- **Conteos = indicativos.** Se va a seguir agregando contenido: NUNCA hardcodees un conteo en
  un test o script; recontá desde la data al ejecutar. Los tests de paridad se derivan
  dinámicamente de las claves/ids reales.

---

## 1. Reglas duras globales (las 4 rondas)

1. **NO** committear archivos untracked ajenos a tu ronda. `.claude/napkin.md` está **ignorado
   por git** desde `c592789`: NO lo re-agregues con `git add -f` (se edita, pero no se versiona).
2. **NO** tocar el save real del jugador: ni `C:\Users\SANTI\AppData\Roaming\@dumpster\desktop\save.json`
   ni la clave `dumpsterEmpireSave` de un navegador real.
3. **NO** usar `gh` CLI (no autenticado): el PR lo crea el usuario con el link del push. Si el
   push se cuelga >60s es el credential manager: avisale al usuario que corra
   `! git push -u origin <rama>` él mismo.
4. Commits multilínea y appends a `agentes/HANDOFF.md`: con la tool **Bash** y heredoc
   (PowerShell 5.1 rompe here-strings; `Add-Content` arruina el UTF-8).
5. **NO** usar emojis como íconos; los íconos nuevos van al registro `apps/game/src/icons/icons.js`
   (mapping `id → shapes`, reusando el vocabulario `SHAPES`; podés agregar shapes nuevos).
   Todo SVG que pueda terminar en data-URL lleva `xmlns="http://www.w3.org/2000/svg"`.
6. CSS solo con tokens `var(--...)` existentes. Cero colores/tipografías hardcodeados.
7. **NO** tocar el importmap ni la CSP de `apps/game/index.html` (líneas 34-40): el juego es
   buildless; los módulos nuevos se importan por ruta relativa.
8. Los toasts en e2e SIEMPRE con `page.locator('.toast').filter({ hasText: ... })` (strict mode
   con varios toasts conviviendo). Asserts sobre `#money` SIEMPRE con polling
   (`expect(locator).not.toHaveText(...)`) — el contador tweenea por rAF.
9. Estado de partida para e2e: seed por `addInitScript` + `serializeState(freshState())` mutado
   (patrón de `apps/game/e2e/ronda14-regression.spec.js`).
10. Tras cada ronda: `npm test` y `npm run test:e2e` verdes + verificación manual jugando
    (`npm run dev`, 375px y desktop) ANTES del commit final.
11. (ronda 16) **No cambiar ni una letra del copy español**: los 43 e2e existentes lo asertan.
12. Números de balance nuevos: siempre con comentario `AJUSTE:` explicando el porqué, y los
    cambios de contenido se reflejan en las tablas de PLAN.md (documento maestro primero).

---

## 2. Checklist del usuario (nadie más puede hacerlo)

| # | Ítem | Dónde |
|---|---|---|
| U1 | Pagar el fee de Steamworks (~USD 100) y obtener el **appId real** | partner.steamgames.com |
| U2 | Reemplazar `STEAM_APP_ID = 480` por el appId real | `apps/desktop/steam.js:12` |
| U3 | Reemplazar los `480` de los VDF (appId y depotIds) | `tools/steam/app_build.vdf:6,12` y `tools/steam/depot_build.vdf:7` |
| U4 | Registrar los **API Names de logros** en el panel de Steamworks. Hoy son `a1`..`a27`; tras la ronda 15 serán `a1`..`a35`. La ronda 18 genera la tabla exacta desde `achievements.json` | Steamworks → Stats & Achievements |
| U5 | Habilitar **Steam Cloud** para el appId (el código ya sincroniza vía proceso principal) | Steamworks → Cloud |
| U6 | `LICENSE` línea 1: reemplazar `<TITULAR>` por el nombre legal | `LICENSE:1` |
| U7 | Página de tienda: cápsulas, screenshots, tráiler, precio; review de Valve (~2-5 días hábiles) | Steamworks |
| U8 | Probar el build Linux (AppImage) en una **Steam Deck real** | `npm run build:linux` |
| U9 | Probar el ciclo Steam Cloud entre **2 máquinas** (guardar en una, abrir en la otra) | — |

---
---

# RONDA 15 — Contenido: mejoras del robot, 16 contenedores, logros (rama `feat/contenido-ronda15`)

Cinco agentes secuenciales en la MISMA rama: **A** (engine) → **B** (contenedores+ítems) →
**C** (máquinas+nodo+logros) → **D** (UI+e2e) → **E** (auditor). Cada uno committea lo suyo y
appendea su bloque a `agentes/HANDOFF.md`.

```
git switch main && git pull origin main && git switch -c feat/contenido-ronda15
```

## 15.A — Agente A (engine): 3 efectos nuevos + 2 cond types + save v6

### A1. PLAN.md primero (el contrato)

En PLAN.md §4 (fórmulas), al final de la subsección de automatización, agregá:

```md
- **Mejoras del robot (ronda 15).** Tres efectos nuevos, todos data-driven:
  - `autoDigPowerPercent` (máquinas): la Fuerza efectiva del robot es
    `getDigPowerMult(state) × (1 + Σ percent de máquinas compradas)`. Afecta SOLO el tiempo de
    procesamiento automático (vía `getDigRate(..., isAuto=true)`), nunca el escarbado manual.
    Pega más fuerte contra contenedores de alta `resistencia` (el ritmo clampa 0.3–1.5).
  - `autoSpeedPercent` (máquinas): multiplicador plano de velocidad de procesamiento;
    `remaining` decrece a razón de `dt × (1 + Σ percent)`. Aplica también a slots ya en curso.
  - `trapDiscardChancePerNivel` (nodo de prestigio, se paga con Llaves): al completarse un slot
    cuyo roll dio trampa, con probabilidad `min(1, nivel × percentPerNivel)` el robot DESCARTA
    el contenedor: no hay castigo ni loot, el contenedor se pierde (ya se pagó), cuenta para el
    nivel del contenedor y suma `state.trapsDiscarded`. No cuenta como "procesado" (a26/a33).
    Vive en el árbol de prestigio y no en máquinas porque `automationOwned` se resetea al
    prestigiar y las Llaves son la moneda permanente.
```

### A2. Tests RED

Creá `packages/engine/tests/ronda15-robot.test.js`. Importá igual que
`packages/engine/tests/save.test.js` (rutas relativas `../src/...`). Necesitás data inyectada
mínima, NO los JSON reales (los efectos todavía no existen en la data — eso es de B/C):

```js
/**
 * Ronda 15 (PLAN.md §4 ampliado): mejoras del robot — Fuerza del robot (autoDigPowerPercent),
 * velocidad de procesamiento (autoSpeedPercent) y descarte de trampas (trapDiscardChancePerNivel).
 */
import { describe, it, expect } from 'vitest';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { validateSave, serializeState, deserializeState } from '../src/save.js';
import {
  getAutoDigPowerMult,
  getAutoSpeedMult,
  getAutoTrapDiscardChance,
  getEffectiveDigTime,
} from '../src/economy.js';
import { automationTick } from '../src/systems/automation.js';
import { checkAchievements } from '../src/systems/achievements.js';
```

Armá un `dataStub` con la misma forma que arma `apps/game/src/main.js:87-91`
(`{ upgrades, automations, prestigeTree }` — mirá `packages/engine/tests/` para el patrón de
stubs existente) y cubrí como mínimo:

1. `getAutoDigPowerMult` = 1 sin máquinas; = 1.4 con una máquina `autoDigPowerPercent 0.4`
   comprada; = 2.2 con dos (0.4 + 0.8) — los percent SUMAN sobre la base 1.
2. `getEffectiveDigTime(state, container, data, true)` < `getEffectiveDigTime(state, container, data, false)`
   con la máquina comprada, y AMBOS iguales sin máquina (el default `isAuto=false` no cambia nada:
   los 43 e2e y el resto de la suite deben pasar sin tocarse).
3. `getAutoSpeedMult` = 1 sin máquinas; = 1.75 con 0.25 + 0.5. En `automationTick`, un slot con
   `remaining: 10` avanza `dt × mult` (tras 1s con mult 1.75 → `remaining` 8.25).
4. `getAutoTrapDiscardChance` = 0 sin nodo; = 0.34/0.68/1 (clampeado) con nivel 1/2/3 de un nodo
   `trapDiscardChancePerNivel 0.34`.
5. Descarte end-to-end: estado con robot + nodo nivel 3, un slot a punto de completarse sobre un
   contenedor con `probTrampaBase: 1` (stub), `random` sembrado para forzar trampa →
   `state.money` NO baja, `state.trapsDiscarded` pasa de 0 a 1, `state.autoProcessedCount` NO
   sube, `state.trapsHit` NO sube.
6. Sin el nodo (chance 0), el mismo escenario SÍ castiga: `trapsHit` sube y `money` baja.
7. Migración v5→v6: un save v5 sin `trapsDiscarded` se acepta y sale con `trapsDiscarded: 0` y
   `saveVersion === SAVE_VERSION`. Un `trapsDiscarded: NaN` se rechaza (lo cubre gratis el loop
   de finitud de REQUIRED_FIELDS — igual asertalo).
8. Cond types: `trapsDiscardedAtLeast` (con `state.trapsDiscarded = 50` desbloquea `value: 50`)
   y `containerOwnedAtLeast` (con `ownedContainers.x = 1` desbloquea `{containerId:'x', value:1}`).

`npm test` → los casos nuevos en ROJO, los 226 existentes verdes.

### A3. Implementación

**`packages/engine/src/state.js`**: `SAVE_VERSION = 5` → `6` con su comentario `AJUSTE (ronda 15)`;
en `freshState()` agregá `trapsDiscarded: 0` (después de `trapsHit`); agregá la línea al typedef.

**`packages/engine/src/save.js`**: en `REQUIRED_FIELDS` agregá `trapsDiscarded: 'number'`
(después de `trapsHit`). En `migrate()` (después del bloque v4→v5):

```js
  // v5 -> v6 (ronda 15): agrega trapsDiscarded (contador de contenedores con trampa que el
  // robot descartó vía el nodo "Escáner de Trampas"). Saves viejos arrancan en 0.
  if (migrated.saveVersion < 6) {
    migrated = { ...migrated, trapsDiscarded: 0, saveVersion: 6 };
  }
```

**`packages/engine/src/economy.js`** — tres getters nuevos (mismo patrón que
`getParallelAutoSlots`, economy.js:267, y `getQueueMax`):

```js
/**
 * Multiplicador de Fuerza de Escarbado extra del robot (ronda 15). Solo automatización.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getAutoDigPowerMult(state, data) {
  let mult = 1;
  for (const { automationId, effect } of automationEffectsOfType(data, 'autoDigPowerPercent')) {
    if (state.automationOwned[automationId]) mult += effect.percent;
  }
  return mult;
}

/**
 * Multiplicador de velocidad de procesamiento del robot (ronda 15). Solo automatización.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getAutoSpeedMult(state, data) {
  let mult = 1;
  for (const { automationId, effect } of automationEffectsOfType(data, 'autoSpeedPercent')) {
    if (state.automationOwned[automationId]) mult += effect.percent;
  }
  return mult;
}

/**
 * Probabilidad (0..1) de que el robot descarte un contenedor cuyo roll dio trampa (ronda 15).
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getAutoTrapDiscardChance(state, data) {
  let chance = 0;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'trapDiscardChancePerNivel')) {
    chance += prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  return Math.min(1, chance);
}
```

`getDigRate(state, container, data)` → agregá 4º param opcional `isAuto = false`; dentro,
`const digPowerMult = getDigPowerMult(state, data) * (isAuto ? getAutoDigPowerMult(state, data) : 1);`
`getEffectiveDigTime(state, container, data)` → mismo 4º param, lo pasa a `getDigRate`.
(Firma retro-compatible: los llamadores existentes de UI/store no se tocan.)

**`packages/engine/src/systems/automation.js`** — importá `getAutoSpeedMult`,
`getAutoTrapDiscardChance` y `registerContainerDig` desde `../economy.js`. Tres cambios en
`automationTick`:

- Línea ~94: `slot.remaining -= dtSeconds;` → `slot.remaining -= dtSeconds * getAutoSpeedMult(state, data);`
- Bloque `if (container) { ... }` (líneas ~101-104) →

```js
      if (container) {
        const result = rollContainerResult(state, container, true, itemsData, data, random);
        // Ronda 15 (PLAN.md §4): el Escáner de Trampas descarta el contenedor trampeado — sin
        // castigo ni loot; el contenedor ya pagado se pierde y el escarbado cuenta para su nivel.
        if (result.isTrap && random() < getAutoTrapDiscardChance(state, data)) {
          registerContainerDig(state, container);
          state.trapsDiscarded++;
        } else {
          applyContainerResult(state, container, result, true, data);
        }
      }
```

- Línea ~115: `getEffectiveDigTime(state, container, data)` → `getEffectiveDigTime(state, container, data, true)`

**`packages/engine/src/systems/achievements.js`** — en `CONDITION_EVALUATORS` agregá:

```js
  trapsDiscardedAtLeast: (state, cond) => state.trapsDiscarded >= cond.value,
  containerOwnedAtLeast: (state, cond) => (state.ownedContainers[cond.containerId] || 0) >= cond.value,
```

Verificá que `getAutoDigPowerMult`/`getAutoSpeedMult`/`getAutoTrapDiscardChance` queden
re-exportados por `packages/engine/src/index.js` si ese barrel enumera exports (miralo; si usa
`export *` no hay nada que hacer).

### A4. DoD del Agente A

```
npm test                    → ~236+ passed (226 previos + los nuevos), 0 failed
npm run test:e2e            → 43 passed (nada de UI cambió)
git add -A && commit        → "feat(engine): ronda 15 — efectos del robot, descarte de trampas y save v6"
```

Append a HANDOFF (Bash heredoc) + reportar al usuario.

## 15.B — Agente B (data): 4 contenedores nuevos + 28 ítems + íconos

### B1. `apps/game/src/data/containers.json` — 4 entradas nuevas AL FINAL (el orden del array es
el orden de desbloqueo: `isContainerUnlocked` exige poseer el anterior). Copiá el formato de
`vertederoDivino` (líneas 194-211) con estos valores exactos:

| campo | chatarreriaTitanes | naufragioTemporal | archivoMultiverso | vertederoBigBang |
|---|---|---|---|---|
| name | Chatarrería de Titanes | Naufragio Temporal | Archivo del Multiverso | Vertedero del Big Bang |
| icon | junkyard-titans | shipwreck-temporal | archive-multiverse | dump-bigbang |
| costoInicial | 300000000000000 | 4500000000000000 | 70000000000000000 | 1000000000000000000 |
| categorias | ["relics","future"] | ["historic","relics"] | ["art","relics"] | ["future"] |
| probTrampaBase | 0.40 | 0.41 | 0.42 | 0.44 |
| digTime | 45 | 50 | 56 | 62 |
| slots | 7 | 7 | 8 | 8 |
| resistencia | 38 | 50 | 66 | 88 |
| areaRecomendada | 36 | 47 | 62 | 82 |
| trapPenaltyMult | 1.7 | 1.8 | 1.9 | 2.0 |
| levelUpDigsBase | 11 | 11 | 12 | 12 |
| levelUpDigsGrowth | 1.35 | 1.35 | 1.35 | 1.35 |
| levelRarityShiftPerLevel | 2.5 | 2.5 | 2.5 | 2.5 |
| levelValueMultPerLevel | 0.05 | 0.05 | 0.05 | 0.05 |
| requiresPrestigeCount | 6 | 7 | 8 | 9 |

`// AJUSTE:` en HANDOFF (JSON no lleva comentarios): la progresión continúa la real — costo
×15 por tier, resistencia ×~1.32, trampa +0.01-0.02, igual que los tiers 9-12.

### B2. `apps/game/src/data/items.json` — 4 pools nuevos bajo `containers`, clave = id del
contenedor. REGLA DURA: cada `categoria` listada en `categorias` del contenedor DEBE tener al
menos un ítem en su pool (un pool filtrado vacío crashea `rollItem`). Valores derivados del pool
de `vertederoDivino` × el ratio de costos (~×15 por tier):

**chatarreriaTitanes** (3 relics / 4 future):
| name | icon | categoria | valorBase |
|---|---|---|---|
| Remache colosal | rivet-colossal | relics | 525000000 |
| Eslabón de cadena titánica | chain-titanic | relics | 670000000 |
| Yunque agrietado de titán | anvil-titan | relics | 845000000 |
| Engranaje de coloso | gear-colossus | future | 1050000000 |
| Pistón sísmico | piston-seismic | future | 1280000000 |
| Núcleo de forja estelar | core-starforge | future | 1580000000 |
| Corazón de autómata titán | heart-automaton | future | 1980000000 |

**naufragioTemporal** (3 historic / 4 relics):
| name | icon | categoria | valorBase |
|---|---|---|---|
| Brújula que gira al revés | compass-reversed | historic | 7900000000 |
| Mapa de rutas extintas | map-extinct | historic | 10100000000 |
| Mascarón de proa fantasmal | figurehead-ghost | historic | 12700000000 |
| Reloj de arena congelado | hourglass-frozen | relics | 15800000000 |
| Ancla de un mar que no existe | anchor-lostsea | relics | 19300000000 |
| Cronómetro del capitán eterno | chronometer-eternal | relics | 23700000000 |
| Timón del tiempo | helm-time | relics | 29800000000 |

**archivoMultiverso** (3 art / 4 relics):
| name | icon | categoria | valorBase |
|---|---|---|---|
| Autorretrato de otro vos | portrait-alternate | art | 123000000000 |
| Partitura de una realidad muda | score-silent | art | 157000000000 |
| Escultura de geometría imposible | sculpture-impossible | art | 197000000000 |
| Tomo de historias que no pasaron | tome-unhappened | relics | 246000000000 |
| Llave de infinitas puertas | key-infinite | relics | 300000000000 |
| Espejo de líneas temporales | mirror-timelines | relics | 369000000000 |
| Catálogo del multiverso | catalog-multiverse | relics | 463000000000 |

**vertederoBigBang** (7 future):
| name | icon | categoria | valorBase |
|---|---|---|---|
| Polvo de la primera estrella | dust-firststar | future | 1760000000000 |
| Burbuja de vacío primordial | bubble-void | future | 2240000000000 |
| Fragmento de horizonte | fragment-horizon | future | 2820000000000 |
| Eco del estallido inicial | echo-bigbang | future | 3510000000000 |
| Átomo primigenio embotellado | atom-primordial | future | 4290000000000 |
| Chispa de génesis | spark-genesis | future | 5270000000000 |
| Resto del día cero | relic-dayzero | future | 6620000000000 |

Validá: `node -e "const i=require('./apps/game/src/data/items.json'); const c=require('./apps/game/src/data/containers.json'); c.forEach(k=>{ const pool=i.containers[k.id]; if(!pool) throw k.id; k.categorias.forEach(cat=>{ if(!pool.some(it=>it.categoria===cat)) throw k.id+'/'+cat; }); }); console.log('OK', c.length, 'contenedores')"` → `OK 16 contenedores`.

### B3. `apps/game/src/icons/icons.js` — 32 claves nuevas (4 contenedores + 28 ítems) compuestas
desde `SHAPES`. Agregá los shapes que te falten (engranaje grande, ancla, brújula, espejo ya
existe `mirror`, etc.) siguiendo el estilo del archivo: trazos simples sobre viewBox 24. Cada
clave de `icon` usada en B1/B2 DEBE existir; verificá con:
`node -e "..."` recorriendo la data nueva contra el registro (hay un patrón igual en tests o
escribilo inline). Cero emojis.

### B4. PLAN.md: en la tabla/lista de contenedores (§ del contenido) agregá las 4 filas nuevas
con costo y prestigio requerido. Documento maestro primero (regla 12 de §1).

### B5. DoD del Agente B

```
node (validación B2)        → OK 16 contenedores
npm test                    → verde (los tests data-driven existentes toman la data nueva; si
                              alguno hardcodeaba "12", arreglalo para derivar de la data)
npm run test:e2e            → 43 passed
npm run dev + jugar         → la tienda muestra los 4 nuevos como bloqueados ("Se desbloquea con
                              el Prestigio 6/7/8/9"); el Índice muestra sus pools con "???"
git commit                  → "feat(data): ronda 15 — 4 contenedores de prestigio 6-9 con sus 28 ítems e íconos"
```

## 15.C — Agente C (data): máquinas del robot + nodo Escáner + rebalanceo de logros

### C1. `apps/game/src/data/automations.json` — 4 máquinas nuevas, insertadas MANTENIENDO el
array ordenado por `cost` ascendente (posiciones: entre `cintaTransportadora` 45000 y
`plantaReciclaje` 220000; entre `plantaReciclaje` 220000 y `centroSubastas` 1600000; y las dos
últimas al final, después de `redDrones` 9000000):

```json
{
  "id": "servobrazosReforzados",
  "name": "Servobrazos Reforzados",
  "icon": "servo-arm",
  "cost": 150000,
  "desc": "+40% Fuerza de Escarbado del robot (no afecta tu escarbado manual).",
  "effects": [{ "type": "autoDigPowerPercent", "percent": 0.4 }]
},
{
  "id": "chipOverclock",
  "name": "Chip Overclockeado",
  "icon": "chip-overclock",
  "cost": 800000,
  "desc": "+25% velocidad de procesamiento del robot.",
  "effects": [{ "type": "autoSpeedPercent", "percent": 0.25 }]
},
{
  "id": "servobrazosTitanio",
  "name": "Servobrazos de Titanio",
  "icon": "servo-arm-titanium",
  "cost": 25000000,
  "desc": "+80% adicional de Fuerza de Escarbado del robot.",
  "effects": [{ "type": "autoDigPowerPercent", "percent": 0.8 }]
},
{
  "id": "nucleoCuantico",
  "name": "Núcleo Cuántico",
  "icon": "core-quantum",
  "cost": 120000000,
  "desc": "+50% adicional de velocidad de procesamiento del robot.",
  "effects": [{ "type": "autoSpeedPercent", "percent": 0.5 }]
}
```

### C2. `apps/game/src/data/prestigeTree.json` — 1 nodo nuevo al final:

```json
{
  "id": "escanerTrampas",
  "name": "Escáner de Trampas",
  "icon": "scanner-trap",
  "costoBase": 8,
  "factorCrecimiento": 2.2,
  "nivelMaximo": 3,
  "desc": "El robot detecta trampas y descarta esos contenedores: +34% de probabilidad por nivel.",
  "effects": [{ "type": "trapDiscardChancePerNivel", "percentPerNivel": 0.34 }],
  "requires": ["instintoCarronero"]
}
```

(Costo total de los 3 niveles ≈ 8 + 18 + 39 = **65 llaves** — "bastante caro" por pedido del
usuario: es más que `guardiaPermanente` completo. AJUSTE documentado en HANDOFF.)

### C3. `apps/game/src/data/achievements.json` — rebalanceo de recompensas (mismo `id`, `name`,
`icon`, `cond`; SOLO cambia `reward`). Principio (AJUSTE): los hitos de dinero pagan ~10% de su
umbral (la curva vieja pagaba 20%→4%, castigando el esfuerzo); los de esfuerzo real suben; las
llaves para hitos duros. Tabla vieja → nueva:

| id | reward viejo | reward nuevo |
|---|---|---|
| a1 | money 5 | money 5 (igual) |
| a2 | money 20 | money 10 |
| a3 | money 150 | money 100 |
| a4 | money 1200 | money 1000 |
| a5 | money 10000 | money 10000 (igual) |
| a6 | money 80000 | money 100000 |
| a7 | money 600000 | money 1000000 |
| a8 | money 4000000 | money 10000000 |
| a9 | keys 2 | keys 3 |
| a10 | money 5 | money 5 (igual) |
| a11 | money 100 | money 100 (igual) |
| a12 | money 2000 | money 5000 |
| a13 | money 30000 | money 250000 |
| a14 | money 50 | money 500 |
| a15 | money 100 | money 2000 |
| a16 | money 150 | money 10000 |
| a17 | money 300 | money 100000 |
| a18 | keys 1 | keys 1 (igual) |
| a19 | keys 2 | keys 2 (igual) |
| a20 | keys 3 | keys 10 (ahora exige 16 contenedores, hasta prestigio 9) |
| a21 | keys 3 | keys 6 (ahora exige 12 máquinas, hasta $120M) |
| a22 | keys 5 | keys 5 (igual) |
| a23 | keys 10 | keys 10 (igual) |
| a24 | keys 25 | keys 30 |
| a25 | money 5000 | money 50000 |
| a26 | money 20000 | money 100000 |
| a27 | keys 5 | keys 8 |

Nota: los logros YA reclamados en saves existentes no se re-otorgan (la recompensa se aplica una
sola vez al desbloquear — `applyAchievementReward`); el rebalanceo solo afecta desbloqueos futuros.

### C4. 8 logros nuevos `a28`..`a35` al final del array:

```json
{ "id": "a28", "name": "Billonario Galáctico", "icon": "bank-vault", "cond": { "type": "totalMoneyEarnedAtLeast", "value": 1000000000000 }, "reward": { "type": "keys", "amount": 4 } },
{ "id": "a29", "name": "Fortuna Cósmica", "icon": "crown-gold", "cond": { "type": "totalMoneyEarnedAtLeast", "value": 1000000000000000 }, "reward": { "type": "keys", "amount": 8 } },
{ "id": "a30", "name": "Cincuenta Mil Objetos", "icon": "magnifier", "cond": { "type": "itemsFoundCountAtLeast", "value": 50000 }, "reward": { "type": "keys", "amount": 5 } },
{ "id": "a31", "name": "Ciudadano del Multiverso", "icon": "city-skyline", "cond": { "type": "prestigeCountAtLeast", "value": 6 }, "reward": { "type": "keys", "amount": 15 } },
{ "id": "a32", "name": "Cicatrices de Guerra", "icon": "bone-cracked", "cond": { "type": "trapsHitAtLeast", "value": 100 }, "reward": { "type": "money", "amount": 5000000 } },
{ "id": "a33", "name": "Ejército de Robots", "icon": "robot-sorter", "cond": { "type": "autoProcessedCountAtLeast", "value": 2000 }, "reward": { "type": "money", "amount": 10000000 } },
{ "id": "a34", "name": "Ojo Biónico", "icon": "scanner-trap", "cond": { "type": "trapsDiscardedAtLeast", "value": 50 }, "reward": { "type": "keys", "amount": 5 } },
{ "id": "a35", "name": "Basura Primordial", "icon": "dump-bigbang", "cond": { "type": "containerOwnedAtLeast", "containerId": "vertederoBigBang", "value": 1 }, "reward": { "type": "keys", "amount": 10 } }
```

(`scanner-trap` lo creás en icons.js con C1/C2 si no existe; `dump-bigbang` ya lo creó B.)

### C5. Íconos de C: `servo-arm`, `servo-arm-titanium`, `chip-overclock`, `core-quantum`,
`scanner-trap` en icons.js (reusar/derivar de `robot-sorter`, `gear-set`, `metal-detector`).

### C6. PLAN.md: tablas de automatización, árbol de prestigio y logros actualizadas.

### C7. DoD del Agente C

```
npm test                    → verde (si algún test hardcodeaba "27 logros"/"1.523 llaves" del
                              árbol, actualizalo derivando de la data)
npm run test:e2e            → 43 passed
npm run dev + jugar         → las 4 máquinas aparecen en Automatización con su costo; el nodo
                              Escáner aparece en Prestigio colgando de Instinto de Carroñero
git commit                  → "feat(data): ronda 15 — máquinas del robot, nodo Escáner de Trampas y rebalanceo de logros (a1-a35)"
```

## 15.D — Agente D (UI + e2e)

### D1. Toast de descarte. Clave nueva en `apps/game/src/i18n/es.js` Y `apps/game/src/i18n/en.js`
(mismo valor español en ambos — la traducción es de la ronda 16), sección AutomationView:

```js
  'automation.trapDiscarded': 'El robot descartó un contenedor con trampa.',
```

En `apps/game/src/ui/UIManager.js`, dentro de `render(state)`: guardá `this.lastTrapsDiscarded`;
si `state.trapsDiscarded > this.lastTrapsDiscarded` y `this.lastTrapsDiscarded !== undefined`,
mostrá el toast `t('automation.trapDiscarded')` (usá el helper de toasts existente). Inicializá
en el primer render SIN toast (si `undefined`, solo guardar). La UI solo LEE el contador — cero
economía en la UI.

### D2. `apps/game/e2e/ronda15-contenido.spec.js` (patrón de seed de `ronda14-regression.spec.js`):

1. **Contenedores por prestigio**: seed `prestigeCount: 6` + `money` alto + poseer 1 de cada
   contenedor previo → en la tienda, "Chatarrería de Titanes" comprable y "Naufragio Temporal"
   bloqueado con el texto `Se desbloquea con el Prestigio 7.`
2. **Máquinas del robot**: seed con dinero para `servobrazosReforzados` → comprar desde
   Automatización → queda "Activo" y el dinero bajó (polling sobre `#money`).
3. **Nodo Escáner**: seed `prestigeKeys: 70`, `prestigeTreeLevels: { capitalInicial: 1, suerteAncestral: 1, instintoCarronero: 1 }`
   → comprar Escáner de Trampas 3 veces → muestra "Máximo" y las llaves bajaron 65.
4. **Logro nuevo**: seed `totalMoneyEarned: 1e12` justo por debajo + un escarbado que lo cruza →
   modal/toast de "Billonario Galáctico" con `.filter({ hasText: ... })`.

DECISIÓN a documentar: el descarte de trampas NO tiene e2e (RNG no determinista en browser);
está cubierto por el test de engine de A2 caso 5 y por la verificación manual de E.

### D3. DoD del Agente D

```
npm test && npm run test:e2e  → todo verde; e2e = 47 (43 + 4)
git commit                    → "test(e2e): ronda 15 — contenido nuevo cubierto + toast de descarte"
```

## 15.E — Agente E (auditor Verif&Audit.md)

1. Leé `Verif&Audit.md` (raíz del repo) y aplicalo TAL CUAL — mentalidad adversarial — sobre
   TODO el diff de la ronda (`git diff main...HEAD`) y su integración con el resto (save/import,
   XSS vía data nueva interpolada en innerHTML, NaN/Infinity en balances, pools vacíos, límites).
2. Reportá en el formato del prompt (🔴/🟡/🔵/✅) en un bloque de HANDOFF.
3. **ARREGLÁ** todo 🔴 y 🟡 en commits propios (`audit: ...`), con test de regresión cada uno
   (regla del napkin: toda validación de save nueva pregunta "¿qué valor pasa el typeof pero
   rompe la UI?").
4. Checklist manual jugando (`npm run dev`): comprar las 4 máquinas, ver el robot acelerar;
   prestigiar con el nodo y ver el toast de descarte en un contenedor de trampa alta; 375px.
5. DoD: `npm test` + `npm run test:e2e` verdes; HANDOFF actualizado; push de la rama y link de
   PR para el usuario.

## Riesgos de la ronda 15 (leelos ANTES de empezar)

- R1. `evaluateCondition` LANZA ante cond type desconocido: si C committea `a34`/`a35` antes de
  que A haya mergeado los evaluadores, el juego crashea al primer tick. Orden A → C es duro.
- R2. Pool filtrado vacío = crash en `rollItem`: cada categoría de `categorias` necesita ≥1 ítem
  (validación de B2 obligatoria).
- R3. Tests data-driven que asuman conteos viejos (12 contenedores, 27 logros, suma de llaves del
  árbol 1.523): NO parchees el número — derivalo de la data.
- R4. `slots: 8` en los nuevos: verificar en el Índice/colección que la grilla no rompa el layout
  a 375px.
- R5. El toast de descarte NO debe dispararse al bootear con un save que ya tenía
  `trapsDiscarded > 0` (inicializar `lastTrapsDiscarded` en el primer render sin toast).
- R6. `getDigRate` con `isAuto` default false: ningún llamador existente debe cambiar de
  comportamiento (asegurado por el caso 2 de A2).
- R7. a20/a21 se endurecen solos (16 contenedores / 12 máquinas) — es intencional; NO "arreglar".
- R8. Valores nuevos enormes (1e18): el formato K/M/B/T de la UI debe cubrirlos — verificá cómo
  formatea 1e15+ (`formatMoney` o equivalente en la UI); si muestra notación científica cruda,
  extendé los sufijos (regla de CLAUDE.md).

---
---

# RONDA 16 — Inglés completo (rama `feat/i18n-ronda16`)

Cinco agentes secuenciales: **A** (ids de ítems + save v7) → **B** (plomería de idioma) →
**C** (traducción real) → **D** (e2e) → **E** (auditor). Requiere la ronda 15 mergeada.

```
git switch main && git pull origin main && git switch -c feat/i18n-ronda16
```

Arquitectura decidida (no re-discutir): el JSON español es la ÚNICA fuente de verdad; el inglés
es un **overlay por id** aplicado in-place sobre la data cargada al cambiar de idioma. Las vistas
siguen leyendo `c.name`/`a.desc` sin enterarse. Detección automática por `navigator.language`
SOLO en partida nueva; selector en Ajustes con cambio en runtime; `state.language` ya se persiste
y valida (allow-list `SUPPORTED_LANGUAGES`, `packages/engine/src/save.js:9`).

## 16.A — Agente A: ids estables de ítems + save v7

El problema: `state.itemsFoundByItem` persiste `{ containerId: { "<nombre español>": count } }` —
el nombre del ítem es CLAVE de guardado (`systems/containers.js:114` y `:151`,
`CollectionView.js:76`). Si el nombre se traduce, la colección se pierde. Solución: id estable.

1. **`items.json`**: a CADA ítem agregale `"id"` como primer campo = el valor de su `icon`
   (único dentro de cada pool; verificá con
   `node -e "const i=require('./apps/game/src/data/items.json'); for (const [c,pool] of Object.entries(i.containers)) { const s=new Set(pool.map(x=>x.icon)); if (s.size!==pool.length) throw c; } console.log('OK ids únicos por pool')"`).
2. **`systems/containers.js`**: en `rollContainerResult`, el objeto pusheado a `items` suma
   `id: pick.id`; `alreadyFound`/`seenInThisRoll` (líneas ~113-117) usan `pick.id`; en
   `applyContainerResult`, `byContainer[item.name]` (línea ~151) → `byContainer[item.id]`.
   El typedef `DigResult` gana `id: string`.
3. **`CollectionView.js:76`**: `foundInContainer[item.name]` → `foundInContainer[item.id]`
   (línea 92 sigue mostrando `item.name` — el display es traducible, la clave no).
4. **`state.js`**: `SAVE_VERSION = 7`; typedef de `itemsFoundByItem` ahora "por id de ítem".
5. **`save.js`**: `migrate(raw)` → `migrate(raw, itemNameToId)`;
   `validateSave(candidate, validContainerIds, itemNameToId)` y
   `deserializeState`/`importSave` enhebran el 3er param (precedente: `validContainerIds`).
   Migración:

```js
  // v6 -> v7 (ronda 16): itemsFoundByItem pasa de nombre-español a id de ítem como clave, para
  // que la colección sobreviva a la traducción. Claves desconocidas pasan tal cual (idempotente).
  if (migrated.saveVersion < 7) {
    const remapped = {};
    for (const [containerId, byItem] of Object.entries(migrated.itemsFoundByItem || {})) {
      const nameMap = (itemNameToId && itemNameToId[containerId]) || {};
      remapped[containerId] = {};
      for (const [key, count] of Object.entries(byItem)) {
        remapped[containerId][nameMap[key] || key] = count;
      }
    }
    migrated = { ...migrated, itemsFoundByItem: remapped, saveVersion: 7 };
  }
```

6. **`store.js`**: antes de `loadState()` (línea ~66) construí el mapa desde la data PRISTINA
   (todavía en español — ver riesgo R-16.3):

```js
  const itemNameToId = {};
  for (const [containerId, pool] of Object.entries(itemsData.containers)) {
    itemNameToId[containerId] = Object.fromEntries(pool.map((it) => [it.name, it.id]));
  }
```

   y pasalo en `deserializeState(raw, containerIds, itemNameToId)` (línea ~92) y en
   `engineImportSave(text, containerIds, itemNameToId)` (línea ~248).
7. **`apps/game/e2e/ronda14-regression.spec.js`** (línea ~48): el seed de `itemsFoundByItem`
   pasa de nombres a ids (los saves sembrados salen de `freshState()` v7: no se migran).
8. Tests (RED primero, `packages/engine/tests/ronda16-i18n-save.test.js`): save v6 con claves en
   español migra a ids; clave desconocida pasa tal cual; doble migración es idempotente; ida y
   vuelta v7 sin pérdida; sin `itemNameToId` las claves quedan como están (compat).

DoD: `npm test` verde (todo lo previo + nuevos), `npm run test:e2e` → 47, commit
`"feat(engine): ronda 16 — ids estables de ítems y save v7 (colección sobrevive a la traducción)"`.

## 16.B — Agente B: plomería de idioma

1. **`apps/game/src/i18n/i18n.js`** — función pura nueva (testeable en Node, NO accede a
   `navigator` adentro):

```js
/**
 * Idioma inicial para una partida NUEVA a partir del locale del navegador (es-* → es; resto en).
 * @param {string | undefined} navLang - típicamente navigator.language
 * @returns {string}
 */
export function resolveInitialLanguage(navLang) {
  return typeof navLang === 'string' && navLang.toLowerCase().startsWith('es') ? 'es' : 'en';
}
```

2. **`apps/game/src/i18n/dataI18n.js`** (nuevo) — overlay in-place:
   - `initDataLocalization(loaded)`: captura el baseline español (deep-copy de los campos de
     display: `containers[].name`, `items.containers[*][].name`, `items.rarities[].name`,
     `achievements[].name`, `automations[].name/desc`, `prestigeTree[].name/desc`,
     `upgrades[].label` — verificá el nombre real del campo en `upgrades.json`).
   - `applyDataLanguage(loaded, lang)`: si `'en'`, pisa esos campos con `data-en.js` (mapas
     `id → string` con fallback al baseline si falta la clave); si `'es'`, restaura el baseline.
   Importarlo por ruta relativa (regla 7: sin tocar el importmap).
3. **`apps/game/src/i18n/data-en.js`** (nuevo) — placeholder con TODOS los ids y los valores en
   ESPAÑOL (la traducción real es de C; la paridad es testeable desde ya). Estructura:

```js
export default {
  containers: { tachoVereda: 'Tacho de Vereda', /* ...los 16 */ },
  items: { tachoVereda: { 'can-crushed': 'Lata aplastada', /* id → nombre */ }, /* ...por contenedor */ },
  rarities: { common: 'Basura Común', /* ...las 8 */ },
  achievements: { a1: 'Primeros Pasos', /* ...a35 */ },
  automations: { guantes: { name: 'Guantes', desc: '+20% Fuerza de Escarbado permanente.' }, /* ...12 */ },
  prestigeTree: { capitalInicial: { name: 'Capital Inicial', desc: '+$100 de dinero inicial por nivel.' }, /* ...13 */ },
  upgrades: { luck: 'Suerte', /* ...4, con el campo real */ },
};
```

   (Los ids de ítems son los `id` que agregó A — generá el esqueleto con un script de Node desde
   la data, no a mano.)
4. **`apps/game/src/store.js`** — acción nueva `setLanguage(lang)` calcada de `setVolume`
   (línea 278): valida contra `SUPPORTED_LANGUAGES` (import desde `@dumpster/engine`), asigna
   `state.language`, persiste y notifica. `resetGame` conserva el idioma actual
   (`freshState()` trae `'es'`: copiá `language` del estado saliente — DECISIÓN: resetear la
   partida no debe cambiar el idioma de la UI).
5. **`apps/game/src/main.js`** — orden de boot NUEVO dentro de `boot()` (reemplaza la línea 98):

```js
  const store = createStore({ data, itemsData, allContainers, achievementsData, initialSaveText });
  // Partida nueva: si no había save, el idioma inicial sale del navegador (es-* → es, resto en).
  if (!initialSaveText && !localStorage.getItem(SAVE_KEY)) {
    store.actions.setLanguage(resolveInitialLanguage(globalThis.navigator?.language));
  }
  initDataLocalization(loaded);
  setLanguage(store.getState().language);
  applyDataLanguage(loaded, store.getState().language);
  document.documentElement.lang = store.getState().language;
```

   OJO: `initDataLocalization` va DESPUÉS de `createStore` (el store construyó `itemNameToId`
   con los nombres españoles) pero ANTES del primer `applyDataLanguage`.
6. **`apps/game/src/ui/UIManager.js`** — en `render(state)`, sync de idioma (patrón del sync de
   audio/sensibilidad que ya hace render): si `getLanguage() !== state.language` →
   `setLanguage(state.language)`, `applyDataLanguage(loadedRef, state.language)`,
   `document.documentElement.lang = state.language`, y `this.refreshStaticTexts()`. Para el
   `loadedRef`, UIManager necesita acceso a la data cargada: pasásela en el constructor o exponé
   un callback desde main.js — elegí lo mínimo, documentalo. `refreshStaticTexts()`: re-ejecuta
   `injectTabIcons()` (UIManager.js:84, re-etiqueta los tabs), re-asigna el texto del botón
   `dig.abandon`, y borra `dataset.iconReady` de los nodos del Topbar (Topbar.js:22-36) para que
   se re-rendericen con el idioma nuevo.
7. **`apps/game/src/ui/SettingsView.js`** — bloque nuevo (patrón de los existentes):

```js
      `<section class="settings-block">` +
      `<label class="settings-volume-label" for="language-select">${t('settings.language')}</label>` +
      `<select id="language-select" data-action="set-language">` +
      `<option value="es"${state.language === 'es' ? ' selected' : ''}>Español</option>` +
      `<option value="en"${state.language === 'en' ? ' selected' : ''}>English</option>` +
      `</select>` +
      `</section>` +
```

   Listener `change` en el bloque bind-once: `evt.target.blur()` ANTES de
   `store.actions.setLanguage(value)` — el guard de UIManager.js:242-246 NO re-renderiza mientras
   un SELECT tiene foco; sin el blur, la vista quedaría en el idioma viejo hasta el próximo click.
   Claves nuevas en es.js y en.js: `'settings.language': 'Idioma'` (+ inglés real en la tarea C).
8. **`playwright.config.js`** — en `use:` agregá `locale: 'es-ES'`. **CRÍTICO**: Chromium
   reporta `en-US` por defecto; sin esta línea, cada e2e con partida nueva bootea en inglés y los
   43 tests existentes (asertan copy español) mueren.
9. Tests: `resolveInitialLanguage` ('es', 'es-AR', 'ES-mx' → 'es'; 'en-US', 'pt-BR', undefined →
   'en'); paridad DINÁMICA (mismas claves es.js/en.js; mismos `{params}` por clave — regex
   `\{(\w+)\}` sobre ambos valores; ids de data-en.js ⊆ ids de la data real, y viceversa para
   detectar huecos). Nada de conteos hardcodeados.

DoD: `npm test` verde, `npm run test:e2e` → 47 (¡siguen en español por el locale!), manual: el
selector cambia TODO en vivo (tabs, tienda, nombres de ítems en el Índice) y persiste al recargar.
Commit: `"feat(ui): ronda 16 — plomería de idioma (detección, selector, overlay de data)"`.

## 16.C — Agente C: traducción real (SOLO diccionarios, cero código)

1. `en.js`: traducí los ~102 valores (los 100 + los nuevos de las rondas 15/16 — recontá).
   Reglas: conservar los `{params}` EXACTOS (el test de B los vigila); conservar HTML embebido
   (`automation.calloutInactive` lleva `<strong>{name}</strong>`); conservar el espacio inicial
   de `' · Ritmo de escarbado...'` (`dig.rateHint`); plurales con `{plural}` → en inglés
   `key{plural}` funciona igual (s/vacío); tono: idle game casual, segunda persona.
2. `data-en.js`: traducí TODOS los valores (~230 strings tras la ronda 15 — recontá desde la
   data). Nombres de ítems: inventiva equivalente, no literal ("Autorretrato de otro vos" →
   "Self-Portrait of Another You").
3. Glosario fijo (registralo en HANDOFF): Llaves de Ciudad → City Keys; Escarbar → Dig;
   Fuerza de Escarbado → Dig Power; Área de Búsqueda → Search Area; Suerte → Luck; Contenedor →
   Container; Trampa → Trap; Prestigio → Prestige; Mejora → Upgrade; Basura Común → Common Junk.
4. DoD: `npm test` verde (paridad pasa con traducciones reales), `npm run test:e2e` → 47,
   manual en inglés sin ningún string español visible. Commit:
   `"feat(i18n): ronda 16 — traducción completa al inglés (UI + data)"`.

## 16.D — Agente D: e2e de i18n + boot bilingüe

1. `apps/game/index.html:44`: `Cargando Dumpster Empire…` → `Cargando… / Loading…` (es lo único
   que se ve antes de que cargue el JS; bilingüe corto).
2. `apps/game/e2e/ronda16-i18n.spec.js` — 3 tests (usá `test.use({ locale: 'en-US' })` a nivel
   de describe para simular navegador inglés):
   1. Partida nueva con locale `en-US` → title screen "Play", tabs en inglés, tienda con
      "Cost:" — cero texto español.
   2. Cambiar idioma en Settings (select) → un texto ancla cambia SIN recargar; `reload()` →
      sigue en inglés (persistió).
   3. Migración v6→v7: seed vía `addInitScript` de un save `saveVersion: 6` armado A MANO (JSON
      literal con `itemsFoundByItem` usando el NOMBRE español de un ítem de `tachoVereda` —
      sacalo de items.json) → bootea, el Índice muestra ese ítem como encontrado con su
      contador, y `store` re-exporta… no: asertá vía UI (contador visible) y vía
      `localStorage.getItem('dumpsterEmpireSave')` conteniendo el id nuevo y no el nombre.
3. DoD: `npm test` + `npm run test:e2e` → 50 (47 + 3). Commit:
   `"test(e2e): ronda 16 — i18n cubierto (detección, switch, migración v7)"`.

## 16.E — Agente E (auditor Verif&Audit.md)

Igual que 15.E, sobre el diff de la ronda 16. Focos extra: XSS vía diccionarios (los valores de
en.js entran a `innerHTML` — ¿algún param interpolado viene del estado sin coerción?); el
overlay de data NO debe romper la frontera engine↔UI; `resolveInitialLanguage` con inputs
basura; import de un save v5 REAL (generá uno con freshState v5 simulado) conserva colección.
Push + link de PR.

## Riesgos de la ronda 16

- R-16.1. **`locale: 'es-ES'` en playwright.config.js es lo PRIMERO que hace B** — sin eso, 43
  e2e rojos con partida nueva en inglés.
- R-16.2. La clave de colección es PERSISTENCIA: cualquier vista/sistema que use `item.name`
  como clave (no display) que se te escape = colección rota al traducir. Grep obligatorio:
  `grep -rn "itemsFoundByItem" apps packages` y revisar cada acceso.
- R-16.3. `itemNameToId` se construye ANTES de cualquier `applyDataLanguage` (si la data ya está
  en inglés, el mapa queda mal y la migración no matchea). El orden de boot de B5 es duro.
- R-16.4. El guard de SELECT (UIManager.js:242) se traga el re-render del selector: `blur()`
  antes de despachar, siempre.
- R-16.5. Bind-once sobre contenedor compartido (napkin): el listener del selector va en el
  bloque `container.dataset.bound` PROPIO de SettingsView, no en `#tab-content` genérico.
- R-16.6. Copy español INTOCABLE (los e2e lo asertan). La traducción solo toca en.js/data-en.js.
- R-16.7. Ítems con `icon` repetido ENTRE contenedores está OK (la clave es por pool); repetido
  DENTRO de un pool rompe los ids — la verificación de A1 es obligatoria.
- R-16.8. `navigator` no existe en Node: `resolveInitialLanguage` recibe el valor por parámetro;
  ningún módulo del engine ni test toca `navigator`.
- R-16.9. El snapshot de `DigResult` viaja a la UI con `name` ya localizado — el "¡Hallazgo
  nuevo!" (isFirstRareFind) usa `id` para decidir, `name` solo para mostrar.
- R-16.10. Import de save en idioma distinto: el `language` del save manda (el sync de
  UIManager.render aplica el cambio solo en el próximo render — verificar manualmente).

---
---

# RONDA 17 — Pulido menor (rama `chore/pulido-ronda17`, 1 agente)

1. **Tabbar mobile**: con la pestaña Escarbar activa en 375px, `#tab-content` queda oculto y el
   tabbar flota a media pantalla (documentado por la auditoría 11). Fix CSS con tokens (probable:
   el contenedor del tabbar ancla al fondo con `margin-top: auto` o `position: sticky/fixed`
   según el layout — mirá `styles/layout.css` y verificá a 375px con la pestaña Escarbar Y las
   demás).
2. **`apps/desktop/electron-builder.yml:1`**: el comentario dice `^24.x`; lo pineado real es
   `^26` (el propio AJUSTE de la línea 29 habla de electron-builder 26). Corregí el comentario.
3. **Archivar docs viejos** (están TRACKEADOS — verificado): `git mv` a `agentes/archivo/` de:
   `ReporteDeEstado.md`, `PUNTOS_A_MEJORAR.md`, `PUNTOS_A_MEJORAR_2.md`, `PUNTOS_A_MEJORAR_3.md`,
   `PUNTOS_A_MEJORAR_4.md`, `PUNTOS_A_MEJORAR_5.md`, `PLAN_PAM3.md`, `AdjLuck.md`,
   `ContainerLevels.md`, `RONDA14-PLAN.md`, `RoadmapV2.md`. NO borrar nada. Quedan en la raíz:
   `PLAN.md`, `DESARROLLO.md`, `CLAUDE.md`, `README.md`, `Verif&Audit.md`, `ROADMAPv3.md`,
   `LICENSE`. Si algún doc archivado es referenciado por código/tests, actualizá la referencia.
4. **`npm audit`**: revisá; si hay fixes sin breaking changes (respetando versiones pineadas de
   DESARROLLO.md — Electron ^43, steamworks.js ^0.4, electron-builder ^26, vitest ^4), aplicalos.
5. **Barridos**: `grep -rn "console.log" apps packages` (cero en código terminado);
   `grep -rn "TODO" apps packages` (solo los `TODO(usuario)` de `tools/steam/`); cero emojis en
   data/UI.
6. DoD: `npm test` + `npm run test:e2e` verdes; manual 375px con las 6 pestañas; commit + push +
   PR link.

---
---

# RONDA 18 — Preparación de release (rama `chore/release-ronda18`, 1 agente)

1. **`tools/steam/RELEASE.md`** (nuevo): guía paso a paso PARA EL USUARIO:
   - Instalar steamcmd; estructura de `tools/steam/*.vdf`; dónde va el appId real
     (`app_build.vdf:6`), los depotIds (`app_build.vdf:12`, `depot_build.vdf:7`) y en
     `apps/desktop/steam.js:12`.
   - Comandos: `npm run build:win` / `build:linux`; qué carpeta de `dist/` sube cada depot;
     `steamcmd +login <user> +run_app_build ...`.
   - Launch options en Steamworks (ejecutable por plataforma).
   - **Tabla de los 35 logros** (API Name = id, nombre, condición legible, recompensa) GENERADA
     desde `achievements.json` con un one-liner de Node (incluí el comando en el doc para
     regenerarla si la data cambia).
   - Steam Cloud: qué archivo sincroniza el proceso principal y qué configurar en el panel.
   - `steam_appid.txt`: para probar la integración fuera de Steam se crea al lado del ejecutable
     con el appId (480 para Spacewar en dev); NO se committea.
   - Checklist final de Steam Deck (mando, tamaños de toque, AppImage).
2. **Verificación real**: `npm run desktop` levanta y guarda; `npm run build:win` produce el
   instalador en `dist/` y el ejecutable instalado abre y juega (smoke manual). Documentar
   resultado y hardware en HANDOFF.
3. **Auditoría global final**: aplicá `Verif&Audit.md` sobre el repo COMPLETO (no solo un diff):
   fugas (claves hardcodeadas, URLs internas), inputs externos (save/import), errores que
   filtren stack al jugador. Arreglá y documentá. Veredicto final explícito: apto o no para
   producción.
4. DoD: `npm test` + `npm run test:e2e` verdes; RELEASE.md completo; veredicto en HANDOFF;
   commit + push + PR link.

---

## 7. Postre (NO implementar sin aprobación del usuario)

- Las "posibles adiciones a futuro" del final de PLAN.md (modo oscuridad, contenedores con
  mecánica propia, etc.).
- Deuda de ritmo: **CERRADA** — el usuario validó jugando que el primer Prestigio sale en
  ~20-40 min y está conforme; PLAN.md §3 ya refleja el rango real (la simulación de ~3.5h de la
  auditoría 11 no representaba el juego activo real).
- Más idiomas (pt/fr/de): la arquitectura de la ronda 16 (diccionario + overlay por id) los
  soporta agregando `SUPPORTED_LANGUAGES` + diccionarios; es trabajo de datos, no de código.
