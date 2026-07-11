# RoadmapV2.md — Rondas 10, 11 y 12: dificultad exponencial, contenedores de prestigio y celebraciones

> **Para el agente ejecutor.** Este plan cubre TRES rondas que se ejecutan EN ORDEN, cada una
> en su propia rama con su propio PR (el usuario mergea entre rondas). NO empieces la 11 sin
> que la 10 esté mergeada en main, ni la 12 sin la 11: la 11 se balancea contra las curvas de
> la 10, y la 12 celebra desbloqueos que recién existen con la 11.
>
> El plan es autocontenido. Seguí los pasos EN ORDEN, copiá el código EXACTAMENTE y verificá
> cada salida esperada. Si algo no coincide, **detenete y reportá la diferencia** — no
> improvises. Leé `CLAUDE.md` primero. Las reglas que mandan:
> 1. La economía vive SOLO en `packages/engine`; la UI lee estado y muestra.
> 2. Toda fórmula nueva se escribe primero en PLAN.md; las constantes de balance van en `data/*.json`.
> 3. TDD: tests RED antes de implementar.
> 4. Al balancear, se ajustan **constantes de datos**, nunca fórmulas.

---

## 0. Decisiones ya tomadas por el usuario (no re-preguntar)

- **Dificultad**: Fuerza, Búsqueda y Suerte recomendadas por contenedor suben **exponencialmente**.
  Son metas que **penalizan fuerte pero no bloquean** (sin carteles de "no podés"): con Fuerza
  corta el gesto se vuelve lento y chico, con Suerte corta perdés plata en promedio.
- **Contenido**: **4 contenedores nuevos en total** (12 finales), desbloqueados con
  `requiresPrestigeCount` **2, 3, 4 y 5**, cada uno con su pool de **7 ítems nuevos**. El árbol
  de prestigio completo cuesta **1.523 llaves** (verificado contra `prestigeTree.json`); las
  corridas cada vez más profundas que financian los contenedores nuevos lo completan en ~5-6
  prestigios.
- **Celebraciones**: modal **centrado sobre todo** con backdrop gris semitransparente, cierre
  **solo con la cruz** arriba a la derecha, con cola si caen varias. Tres disparadores: logro
  (con su recompensa), contenedor nuevo desbloqueado, y hallazgo excepcional (jackpot). Con
  sonido. El modal de logros **reemplaza** al toast de logros y absorbe al `CategoryUnlockModal`
  existente.

## 1. Reglas duras globales (las 3 rondas)

- **NO** committear `ReporteDeEstado.md`, `AdjLuck.md`, `ContainerLevels.md`, `RoadmapV2.md`
  (untracked del usuario). `.claude/napkin.md` SÍ está trackeado y puede committearse.
- **NO** tocar el save del jugador (`C:\Users\SANTI\AppData\Roaming\@dumpster\desktop\save.json`
  ni la clave `dumpsterEmpireSave` de un navegador real).
- **NO** usar `gh` CLI (no autenticado): el PR lo crea el usuario con el link del push. Si el
  push se cuelga >60s, es el credential manager esperando al usuario: avisale que corra
  `! git push -u origin <rama>` él mismo.
- Commits multilínea y appends a `agentes/HANDOFF.md`: con la tool **Bash** y heredoc
  (PowerShell 5.1 rompe here-strings; `Add-Content` arruina el UTF-8).
- **NO** usar emojis como íconos; los íconos nuevos van al registro `apps/game/src/icons/icons.js`
  (mapping `id → shape`, reusando `SHAPES` existentes salvo los 3 shapes nuevos que este plan da).
- CSS solo con tokens `var(--...)` existentes.
- Los toasts en e2e SIEMPRE con `page.locator('.toast').filter({ hasText: ... })` (napkin:
  strict mode con varios toasts). Asserts sobre `#money` SIEMPRE con polling
  (`expect(locator).not.toHaveText(...)`) — el contador tweenea por rAF.
- Tras cada ronda: `npm test` y `npm run test:e2e` verdes + verificación manual jugando
  (`npm run dev`, 375px y desktop) antes del commit.
- Estado de partida para e2e: seed por `addInitScript` + `serializeState(freshState())` mutado
  (patrón de `apps/game/e2e/ronda7-regression.spec.js` y `ronda9-regression.spec.js`).

---
---

# RONDA 10 — Dificultad exponencial (rama `fix/dificultad-ronda10`)

## 10.1 Rama

```
git switch main && git pull origin main && git switch -c fix/dificultad-ronda10
```

## 10.2 PLAN.md primero (el contrato)

En `PLAN.md` §11.2 (la sección de la Suerte recomendada), agregá al final de la sección:

```md
- Además de la Suerte, cada contenedor tiene **Fuerza recomendada** y **Búsqueda recomendada**
  (ronda 10): la Fuerza recomendada es su `resistencia` (con ella el ritmo de escarbado llega a
  1.0) y la Búsqueda recomendada es la constante de datos `areaRecomendada` (con ella el pincel
  compensa el tamaño del contenedor). Son metas VISIBLES que penalizan pero no bloquean: por
  debajo, el gesto es lento y chico (piso de ritmo 0.3) y la excavación rinde menos.
- Las tres metas crecen **exponencialmente** por tier (~×1.35 Fuerza/Búsqueda, ~×1.6 Suerte):
  la progresión exige invertir en las tres stats, no solo en Suerte.
```

## 10.3 Datos

**a) `apps/game/src/data/containers.json`** — cambiá `resistencia` y agregá `areaRecomendada`
(nueva clave, inmediatamente después de `resistencia`) en los 8 contenedores, en este orden:

| id | resistencia (antes → ahora) | areaRecomendada (nueva) |
|---|---|---|
| tachoVereda | 1.0 → **1.0** | **1** |
| contenedorBarrio | 1.15 → **1.35** | **1.35** |
| containerIndustrial | 1.4 → **1.85** | **1.8** |
| depositoAbandonado | 1.8 → **2.5** | **2.45** |
| mudanzaMansion | 2.2 → **3.4** | **3.3** |
| galeriaLiquidacion | 2.7 → **4.7** | **4.5** |
| bovedaPerdida | 3.3 → **6.4** | **6.1** |
| containerExtradimensional | 4.0 → **8.7** | **8.2** |

(Feasibilidad pre-verificada: con el presupuesto de la era de cada contenedor, la mejora de
Fuerza — costoBase 12, ×1.13, +0.04/nivel — alcanza la resistencia con inversión fuerte, y el
árbol de prestigio `brazosDeAcero`/`visionPeriferica` suma hasta +64%. Por debajo, el piso de
ritmo 0.3 mantiene todo jugable.)

Validá el JSON: `node -e "require('./apps/game/src/data/containers.json'); console.log('OK')"`.

## 10.4 Tests RED

Creá `packages/engine/tests/ronda10-dificultad.test.js`:

```js
/**
 * Ronda 10 (PLAN.md §11.2 ampliado): Fuerza y Búsqueda recomendadas por contenedor (metas
 * visibles, exponenciales) y nuevas metas de Suerte exponenciales (~×1.6 por tier).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getRecommendedDigPower, getRecommendedArea, getRecommendedLuck } from '../src/economy.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };

describe('Ronda 10 — dificultad exponencial (PLAN.md §11.2)', () => {
  it('la Fuerza recomendada es la resistencia del contenedor y crece exponencialmente', () => {
    const state = freshState();
    const rec = containers.map((c) => getRecommendedDigPower(state, c));
    expect(rec).toEqual([1.0, 1.35, 1.85, 2.5, 3.4, 4.7, 6.4, 8.7]);
    for (let i = 2; i < rec.length; i++) {
      const growthPrev = rec[i - 1] / rec[i - 2];
      const growth = rec[i] / rec[i - 1];
      expect(growth).toBeGreaterThan(1.2); // exponencial de verdad, no lineal
      expect(Math.abs(growth - growthPrev)).toBeLessThan(0.25); // razón ~constante
    }
  });

  it('la Búsqueda recomendada sale de la constante de datos areaRecomendada', () => {
    const state = freshState();
    const rec = containers.map((c) => getRecommendedArea(state, c));
    expect(rec).toEqual([1, 1.35, 1.8, 2.45, 3.3, 4.5, 6.1, 8.2]);
  });

  it('las metas de Suerte de la ronda 10 son exponenciales (~×1.6 por tier)', () => {
    const neutral = freshState();
    const rec = containers.map((c) => getRecommendedLuck(neutral, c, items, data));
    expect(rec).toEqual([0, 8, 20, 40, 72, 120, 190, 290]);
  });
});
```

**Corré `npm test`**: el archivo nuevo falla (no existen `getRecommendedDigPower` ni
`getRecommendedArea`, y las recs de Suerte siguen en las de ronda 8). **Además van a fallar
DOS guards viejos** que fijan `[0, 6, 16, 32, 56, 86, 126, 176]`: el de
`packages/engine/tests/fase9-balance.test.js` (ronda 8) y el test 6 de
`packages/engine/tests/ronda9-niveles.test.js` (nivel máximo). Es el RED esperado; ambos se
actualizan en 10.6. Cualquier OTRO fallo: frená y reportá.

## 10.5 Engine

En `packages/engine/src/economy.js`, inmediatamente después de `getRecommendedLuck`, agregá:

```js
/**
 * Fuerza de Escarbado recomendada para un contenedor (PLAN.md §11.2, ronda 10): su
 * resistencia — con ella getDigRate llega a ritmo 1.0. Meta visible; no bloquea.
 * @param {GameState} state
 * @param {Object} container
 * @returns {number}
 */
export function getRecommendedDigPower(state, container) {
  return container.resistencia;
}

/**
 * Tamaño de Búsqueda recomendado (PLAN.md §11.2, ronda 10): constante de datos
 * `areaRecomendada` del contenedor. Meta visible; no bloquea.
 * @param {GameState} state
 * @param {Object} container
 * @returns {number}
 */
export function getRecommendedArea(state, container) {
  return container.areaRecomendada || 1;
}
```

y exportá ambas en `packages/engine/src/index.js` junto a `getRecommendedLuck`.

En `getRecommendedLuck` (misma `economy.js`), el loop de búsqueda itera hoy hasta 500: subí ese
tope a **800** (las metas de la ronda 11 llegan a 580) con el comentario
`// AJUSTE (ronda 10/11): tope de búsqueda 800 — las metas de los contenedores de prestigio superan 500.`
El tope es un límite de iteración, no una fórmula: cambiarlo no altera ningún resultado previo.

## 10.6 Recalibrar la Suerte recomendada (script oráculo)

Copiá `agentes/scripts/calibrate-luck-ronda8.mjs` a
`agentes/scripts/calibrate-luck-ronda10.mjs` y cambiale SOLO el bloque `TARGETS` por:

```js
const TARGETS = {
  contenedorBarrio: 8,
  containerIndustrial: 20,
  depositoAbandonado: 40,
  mudanzaMansion: 72,
  galeriaLiquidacion: 120,
  bovedaPerdida: 190,
  containerExtradimensional: 290,
};
```

y la ruta de salida a `.../items.calibrated.ronda10.json` (dentro del scratchpad, NUNCA
escribir directo a `apps/game/src/data`). El script usa el engine como oráculo (bisección del
factor de escala por pool) y **falla ruidoso si algún target no calibra exacto** — corrélo, y
si imprime `CALIBRACION OK`, copiá el JSON calibrado sobre `apps/game/src/data/items.json`.
El pool del `tachoVereda` NO se toca (target 0, no está en TARGETS).

Actualizá los DOS guards viejos al array nuevo `[0, 8, 20, 40, 72, 120, 190, 290]`:
- `packages/engine/tests/fase9-balance.test.js` (el `toEqual` de ronda 8; renombrá la mención
  "ronda 8" a "ronda 10" en el nombre del test).
- `packages/engine/tests/ronda9-niveles.test.js` test "la Suerte recomendada NO cambia..." .

**Corré `npm test`: TODO verde** (los 3 nuevos incluidos). Si `fase9-balance.test.js` falla en
"rentable a la recomendada" o "ritmo temprano del tacho", la calibración quedó mal: NO ajustes
el test, re-corré el script y revisá qué copiaste.

## 10.7 UI — ShopView

En `apps/game/src/ui/ShopView.js`:
- Sumá `getRecommendedDigPower, getRecommendedArea, getDigPowerMult, getAreaMult` al import de
  `'@dumpster/engine'` (verificado: la Fuerza del jugador es `getDigPowerMult(state, data)` en
  `economy.js:178` y el Área es `getAreaMult(state, data)` en `economy.js:232`; ambos ya están
  exportados en `index.js`).
- Dentro del map de tarjetas desbloqueadas, junto a las consts de Suerte (`recommendedLuck` /
  `currentLuck` / `luckReached`), agregá:

```js
      // PLAN.md §11.2 (ronda 10): metas de Fuerza y Búsqueda — leídas del engine.
      const recDigPower = getRecommendedDigPower(state, c);
      const curDigPower = getDigPowerMult(state, data);
      const digPowerReached = curDigPower >= recDigPower;
      const recArea = getRecommendedArea(state, c);
      const curArea = getAreaMult(state, data);
      const areaReached = curArea >= recArea;
```

- En el HTML de la tarjeta, inmediatamente después del `<p class="shop-card-luck">...</p>`
  existente, agregá dos líneas con el MISMO patrón (misma clase base para heredar estilos):

```js
        `<p class="shop-card-luck ${digPowerReached ? 'shop-card-luck--reached' : ''}">` +
        `Fuerza recomendada: ×${recDigPower} ${digPowerReached ? '(alcanzada)' : `(tenés ×${curDigPower.toFixed(2)})`}` +
        `</p>` +
        `<p class="shop-card-luck ${areaReached ? 'shop-card-luck--reached' : ''}">` +
        `Búsqueda recomendada: ×${recArea} ${areaReached ? '(alcanzada)' : `(tenés ×${curArea.toFixed(2)})`}` +
        `</p>` +
```

Sin CSS nuevo (reusa `.shop-card-luck`). Cero economía en la UI: todo sale del engine.

## 10.8 E2e

Creá `apps/game/e2e/ronda10-regression.spec.js` (patrón de seed de `ronda9-regression.spec.js`):

1. **Metas visibles**: partida fresca → pestaña `[data-tab="tienda"]` → la tarjeta del tacho
   contiene `Fuerza recomendada: ×1` y `Búsqueda recomendada: ×1` con `(alcanzada)`; la del
   barrio contiene `Fuerza recomendada: ×1.35` SIN `(alcanzada)`.
2. **Suerte nueva visible**: seed con `ownedContainers` hasta el depósito (copiá el seed de
   `ronda7-regression.spec.js`) → las tarjetas pagas muestran `Suerte recomendada: 8`, `20` y
   `40`.
3. **La penalización se siente**: seed con Fuerza 0 → escarbá el tacho: `#dig-active` muestra
   el hint `Ritmo de escarbado:` SOLO en contenedores con resistencia > Fuerza (el tacho con
   Fuerza base NO lo muestra; abandoná y verificá contra el barrio seedeando
   `ownedContainers = { tachoVereda: 1 }` y `money: 100`, que con digPower 1 vs resistencia
   1.35 muestra `Ritmo de escarbado: 74%`).

**`npm run test:e2e`: 33 passed (30 + 3).** El spec de ronda 7 sigue verde sin cambios (sus
seeds tienen Fuerza alta y el contraste blando/duro se agranda con la curva nueva).

## 10.9 Verificación manual, docs, commit

- `npm run dev` (375px y desktop): tarjetas con las 3 metas sin desbordar; escarbar un
  contenedor duro con Fuerza corta se siente lento y chico; con las stats recomendadas, normal.
- `DESARROLLO.md` §10: bullet "Ronda 10 — dificultad exponencial: resistencia y areaRecomendada
  exponenciales (~×1.35), metas de Suerte recalibradas a 0/8/20/40/72/120/190/290 con el
  oráculo de ronda 8, y Fuerza/Búsqueda recomendadas visibles en la Tienda
  (getRecommendedDigPower/getRecommendedArea). Penalizan, no bloquean."
- `agentes/HANDOFF.md`: bloque "Ronda 10" (Bash heredoc) con qué cambió y los arrays nuevos.
- Commit (Bash heredoc) `fix: ronda 10 — dificultad exponencial (Fuerza/Busqueda/Suerte recomendadas)`
  + push `fix/dificultad-ronda10` + link de PR al usuario. **Esperá el merge antes de la ronda 11.**

---
---

# RONDA 11 — Contenedores de prestigio (rama `feat/prestigio-contenedores-ronda11`)

## 11.1 Rama (desde main YA con ronda 10 mergeada)

```
git switch main && git pull origin main && git switch -c feat/prestigio-contenedores-ronda11
```

## 11.2 PLAN.md primero

En `PLAN.md`, al final de la sección §2.6 (contenedores), agregá:

```md
- **Contenedores de prestigio (ronda 11)**: además del Extradimensional (prestigio 1), hay 4
  contenedores late-game gateados por `requiresPrestigeCount` 2/3/4/5 — Convoy Fantasma,
  Cripta del Coleccionista, Estación Orbital Caída y Vertedero de los Dioses — cada uno con su
  pool propio de 7 ítems (§11.4). Son el motor económico que hace cada corrida más profunda:
  el árbol de prestigio completo (1.523 llaves) se termina en ~5-6 prestigios. Aparecen en la
  Tienda (bloqueados dicen con qué prestigio se desbloquean), en el selector de escarbado y en
  el Índice al desbloquearse, como cualquier otro.
```

## 11.3 Datos — containers.json (4 bloques nuevos AL FINAL del array)

```json
  {
    "id": "convoyFantasma",
    "name": "Convoy Fantasma",
    "icon": "convoy-ghost",
    "costoInicial": 5000000000,
    "categorias": ["historic", "relics"],
    "probTrampaBase": 0.32,
    "digTime": 26,
    "slots": 6,
    "resistencia": 11.8,
    "areaRecomendada": 11,
    "trapPenaltyMult": 1.3,
    "levelUpDigsBase": 9,
    "levelUpDigsGrowth": 1.35,
    "levelRarityShiftPerLevel": 2.5,
    "levelValueMultPerLevel": 0.05,
    "requiresPrestigeCount": 2
  },
  {
    "id": "criptaColeccionista",
    "name": "Cripta del Coleccionista",
    "icon": "crypt-collector",
    "costoInicial": 80000000000,
    "categorias": ["art", "relics"],
    "probTrampaBase": 0.34,
    "digTime": 30,
    "slots": 6,
    "resistencia": 16,
    "areaRecomendada": 15,
    "trapPenaltyMult": 1.4,
    "levelUpDigsBase": 9,
    "levelUpDigsGrowth": 1.35,
    "levelRarityShiftPerLevel": 2.5,
    "levelValueMultPerLevel": 0.05,
    "requiresPrestigeCount": 3
  },
  {
    "id": "estacionOrbital",
    "name": "Estación Orbital Caída",
    "icon": "station-fallen",
    "costoInicial": 1200000000000,
    "categorias": ["relics", "future"],
    "probTrampaBase": 0.36,
    "digTime": 35,
    "slots": 7,
    "resistencia": 21.5,
    "areaRecomendada": 20,
    "trapPenaltyMult": 1.5,
    "levelUpDigsBase": 10,
    "levelUpDigsGrowth": 1.35,
    "levelRarityShiftPerLevel": 2.5,
    "levelValueMultPerLevel": 0.05,
    "requiresPrestigeCount": 4
  },
  {
    "id": "vertederoDivino",
    "name": "Vertedero de los Dioses",
    "icon": "dump-gods",
    "costoInicial": 20000000000000,
    "categorias": ["future"],
    "probTrampaBase": 0.38,
    "digTime": 40,
    "slots": 7,
    "resistencia": 29,
    "areaRecomendada": 27,
    "trapPenaltyMult": 1.6,
    "levelUpDigsBase": 10,
    "levelUpDigsGrowth": 1.35,
    "levelRarityShiftPerLevel": 2.5,
    "levelValueMultPerLevel": 0.05,
    "requiresPrestigeCount": 5
  }
```

OJO: el desbloqueo también exige haber comprado el contenedor ANTERIOR de la lista
(`isContainerUnlocked` mira el índice) — el orden del array ES la progresión, por eso van al
final y en este orden. No agregues `requiresAutomationId` (eso es solo del Extradimensional).

## 11.4 Datos — items.json (28 ítems nuevos) e íconos

En `apps/game/src/data/items.json`, dentro de `"containers"`, agregá las 4 claves nuevas. Los
`valorBase` de abajo son **semillas**: el script de calibración de 11.6 los escala hasta clavar
las metas de Suerte, así que importan las proporciones, no los valores absolutos.

```json
  "convoyFantasma": [
    { "icon": "cargo-manifest", "name": "Manifiesto de carga", "valorBase": 800, "categoria": "historic" },
    { "icon": "ghost-lantern", "name": "Farol del convoy", "valorBase": 1100, "categoria": "historic" },
    { "icon": "route-compass", "name": "Brújula de ruta", "valorBase": 1500, "categoria": "historic" },
    { "icon": "sealed-strongbox", "name": "Caja fuerte sellada", "valorBase": 950, "categoria": "relics" },
    { "icon": "captain-ring", "name": "Anillo del capitán", "valorBase": 1250, "categoria": "relics" },
    { "icon": "cursed-cargo", "name": "Carga maldita", "valorBase": 1600, "categoria": "relics" },
    { "icon": "phantom-bell", "name": "Campana fantasma", "valorBase": 2100, "categoria": "relics" }
  ],
  "criptaColeccionista": [
    { "icon": "framed-forgery", "name": "Falsificación enmarcada", "valorBase": 900, "categoria": "art" },
    { "icon": "marble-bust", "name": "Busto de mármol", "valorBase": 1200, "categoria": "art" },
    { "icon": "lost-masterpiece", "name": "Obra maestra perdida", "valorBase": 1700, "categoria": "art" },
    { "icon": "burial-mask", "name": "Máscara funeraria", "valorBase": 1000, "categoria": "relics" },
    { "icon": "grail-replica", "name": "Réplica del grial", "valorBase": 1350, "categoria": "relics" },
    { "icon": "saint-reliquary", "name": "Relicario del santo", "valorBase": 1800, "categoria": "relics" },
    { "icon": "collector-heart", "name": "El corazón del coleccionista", "valorBase": 2400, "categoria": "relics" }
  ],
  "estacionOrbital": [
    { "icon": "heat-shield", "name": "Escudo térmico", "valorBase": 950, "categoria": "relics" },
    { "icon": "zero-g-tool", "name": "Herramienta de gravedad cero", "valorBase": 1300, "categoria": "relics" },
    { "icon": "cosmonaut-log", "name": "Bitácora del cosmonauta", "valorBase": 1750, "categoria": "relics" },
    { "icon": "orbital-gyro", "name": "Giroscopio orbital", "valorBase": 1050, "categoria": "future" },
    { "icon": "plasma-cell", "name": "Celda de plasma", "valorBase": 1400, "categoria": "future" },
    { "icon": "ai-core-salvaged", "name": "Núcleo de IA rescatado", "valorBase": 1900, "categoria": "future" },
    { "icon": "station-heart", "name": "Reactor de la estación", "valorBase": 2500, "categoria": "future" }
  ],
  "vertederoDivino": [
    { "icon": "titan-bolt", "name": "Tornillo de titán", "valorBase": 900, "categoria": "future" },
    { "icon": "chrono-shard", "name": "Esquirla de cronos", "valorBase": 1150, "categoria": "future" },
    { "icon": "ambrosia-flask", "name": "Frasco de ambrosía", "valorBase": 1450, "categoria": "future" },
    { "icon": "olympus-circuit", "name": "Circuito del olimpo", "valorBase": 1800, "categoria": "future" },
    { "icon": "godling-idol", "name": "Ídolo de un dios menor", "valorBase": 2200, "categoria": "future" },
    { "icon": "thunder-coil", "name": "Bobina del trueno", "valorBase": 2700, "categoria": "future" },
    { "icon": "creation-seed", "name": "Semilla de creación", "valorBase": 3400, "categoria": "future" }
  ]
```

**Íconos** — en `apps/game/src/icons/icons.js`:

1. Agregá 3 shapes nuevos al objeto `SHAPES` (los contenedores nuevos; `convoy-ghost` reusa
   el shape `truck` existente):

```js
  crypt: '<path d="M6 21V10l6-6 6 6v11"/><line x1="4" y1="21" x2="20" y2="21"/><rect x="10" y="14" width="4" height="7"/><line x1="12" y1="6" x2="12" y2="10"/><line x1="10" y1="8" x2="14" y2="8"/>',
  satellite: '<rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><rect x="2" y="10" width="5" height="4" rx="0.5"/><rect x="17" y="10" width="5" height="4" rx="0.5"/><path d="M14 8l4-4"/><circle cx="18.5" cy="3.5" r="1.2"/>',
  temple: '<path d="M4 9l8-5 8 5"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="6" y1="9" x2="6" y2="18"/><line x1="10" y1="9" x2="10" y2="18"/><line x1="14" y1="9" x2="14" y2="18"/><line x1="18" y1="9" x2="18" y2="18"/><line x1="4" y1="18" x2="20" y2="18"/><line x1="3" y1="21" x2="21" y2="21"/>',
```

2. Agregá los mappings (sección `// Contenedores` y una sección nueva
   `// Items — contenedores de prestigio (ronda 11)`), reusando shapes existentes:

```js
  'convoy-ghost': 'truck',
  'crypt-collector': 'crypt',
  'station-fallen': 'satellite',
  'dump-gods': 'temple',
  'cargo-manifest': 'document',
  'ghost-lantern': 'lamp',
  'route-compass': 'watch',
  'sealed-strongbox': 'crate',
  'captain-ring': 'coin',
  'cursed-cargo': 'box',
  'phantom-bell': 'amulet',
  'framed-forgery': 'painting',
  'marble-bust': 'statue',
  'lost-masterpiece': 'painting',
  'burial-mask': 'helmet',
  'grail-replica': 'vase',
  'saint-reliquary': 'amulet',
  'collector-heart': 'crystal',
  'heat-shield': 'shield',
  'zero-g-tool': 'fist',
  'cosmonaut-log': 'document',
  'orbital-gyro': 'radar',
  'plasma-cell': 'chip',
  'ai-core-salvaged': 'implant',
  'station-heart': 'satellite',
  'titan-bolt': 'gear',
  'chrono-shard': 'crystal',
  'ambrosia-flask': 'bottle',
  'olympus-circuit': 'chip',
  'godling-idol': 'statue',
  'thunder-coil': 'cable',
  'creation-seed': 'crystal',
```

(Verificá con grep que `shield`, `gear`, `truck`, `loupe` etc. existan en `SHAPES`; si alguno
no existe, elegí el shape existente más parecido y anotalo en el HANDOFF.)

## 11.5 Tests RED

Creá `packages/engine/tests/ronda11-prestigio.test.js`:

```js
/**
 * Ronda 11 (PLAN.md §2.6 ampliado): 4 contenedores de prestigio (requiresPrestigeCount 2-5)
 * con pools propios, integrados a niveles (§11.3) y a las metas exponenciales (ronda 10).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getRecommendedLuck, getLevelValueMult } from '../src/economy.js';
import { isContainerUnlocked } from '../src/systems/containers.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const NEW_IDS = ['convoyFantasma', 'criptaColeccionista', 'estacionOrbital', 'vertederoDivino'];

describe('Ronda 11 — contenedores de prestigio', () => {
  it('hay 12 contenedores y los 4 nuevos gatean por prestigio 2/3/4/5', () => {
    expect(containers).toHaveLength(12);
    expect(containers.slice(8).map((c) => c.id)).toEqual(NEW_IDS);
    expect(containers.slice(8).map((c) => c.requiresPrestigeCount)).toEqual([2, 3, 4, 5]);
  });

  it('bloqueados sin el prestigio, desbloqueados con prestigio + contenedor anterior comprado', () => {
    const state = freshState();
    state.prestigeCount = 1;
    state.automationOwned.redDrones = true;
    for (const c of containers) state.ownedContainers[c.id] = 1;
    const convoy = containers.find((c) => c.id === 'convoyFantasma');
    expect(isContainerUnlocked(state, convoy, containers)).toBe(false); // falta prestigio 2
    state.prestigeCount = 2;
    expect(isContainerUnlocked(state, convoy, containers)).toBe(true);
    const cripta = containers.find((c) => c.id === 'criptaColeccionista');
    expect(isContainerUnlocked(state, cripta, containers)).toBe(false); // falta prestigio 3
  });

  it('cada contenedor nuevo tiene pool propio de 7 ítems de sus categorías', () => {
    for (const id of NEW_IDS) {
      const container = containers.find((c) => c.id === id);
      const pool = items.containers[id];
      expect(pool).toHaveLength(7);
      for (const item of pool) expect(container.categorias).toContain(item.categoria);
      for (const categoria of container.categorias) {
        expect(pool.some((item) => item.categoria === categoria)).toBe(true);
      }
    }
  });

  it('las metas de Suerte de los 12 son las de las rondas 10 y 11, exactas', () => {
    const neutral = freshState();
    const rec = containers.map((c) => getRecommendedLuck(neutral, c, items, data));
    expect(rec).toEqual([0, 8, 20, 40, 72, 120, 190, 290, 340, 420, 500, 580]);
  });

  it('los niveles de contenedor (§11.3) funcionan en los nuevos', () => {
    const state = freshState();
    state.containerLevels.vertederoDivino = 10;
    const vertedero = containers.find((c) => c.id === 'vertederoDivino');
    expect(getLevelValueMult(state, vertedero)).toBeCloseTo(1.45, 10);
  });
});
```

**`npm test`**: fallan el test de las 12 metas (los nuevos aún no calibran a 340/420/500/580) y
posiblemente el de longitud si aún no pegaste los datos — el resto del RED depende del orden en
que apliques 11.3/11.4. Estado esperado tras pegar datos: SOLO falla el de las metas.

## 11.6 Calibrar los 4 nuevos

Copiá `agentes/scripts/calibrate-luck-ronda10.mjs` a `calibrate-luck-ronda11.mjs`, con:

```js
const TARGETS = {
  convoyFantasma: 340,
  criptaColeccionista: 420,
  estacionOrbital: 500,
  vertederoDivino: 580,
};
```

(Metas pre-verificadas como alcanzables: en la era de cada uno — $1e11 a $1e14 de presupuesto —
la mejora de Suerte llega a ~370-450 puntos crudos, y `suerteAncestral` del árbol suma +30%.)
Corré, verificá `CALIBRACION OK`, copiá el resultado a `items.json`. Los pools de los 8 viejos
NO cambian (no están en TARGETS). `npm test`: **todo verde** (los 5 de ronda 11 incluidos).

## 11.7 UI

**a) `apps/game/src/ui/ShopView.js`** — la tarjeta bloqueada hoy dice "Bloqueado. Comprá el
contenedor anterior primero." para todo. Cambiá el bloque `if (!unlocked)` para distinguir la
razón:

```js
      if (!unlocked) {
        // PLAN.md §2.6 (ronda 11): la razón del bloqueo importa — prestigio vs. progresión.
        const needsPrestige = c.requiresPrestigeCount && state.prestigeCount < c.requiresPrestigeCount;
        const reason = needsPrestige
          ? `Se desbloquea con el Prestigio ${c.requiresPrestigeCount}.`
          : 'Bloqueado. Comprá el contenedor anterior primero.';
        return (
          `<article class="shop-card shop-card--locked">` +
          `<span class="shop-card-icon">${iconMarkup(c.icon, { size: 28 })}</span>` +
          `<h3>${c.name}</h3>` +
          `<p>${reason}</p>` +
          `</article>`
        );
      }
```

Nota: leer `c.requiresPrestigeCount` y compararlo con `state.prestigeCount` es mostrar la
condición de la data, no recalcular economía — permitido.

**b) `DigContainerPicker.js` y `CollectionView.js`**: NO necesitan cambios (iteran
`allContainers` filtrando por `isContainerUnlocked` / listando genéricamente). Verificalo
jugando con un seed de prestigio 2: el Convoy aparece en el picker y en el Índice recién al
desbloquearse. Si el Índice muestra los bloqueados de una forma rara, reportá antes de tocar.

## 11.8 E2e

Creá `apps/game/e2e/ronda11-regression.spec.js` (seed patrón ronda 7/9):

1. **Tienda con la razón real**: partida fresca → la tarjeta del Convoy Fantasma dice
   `Se desbloquea con el Prestigio 2` (y la del barrio NO dice eso).
2. **Desbloqueo por prestigio**: seed con `prestigeCount = 2`, `automationOwned.redDrones = true`,
   `ownedContainers` con los 8 viejos en 1 y `money` alto → el Convoy aparece en el picker de
   Escarbar (`[data-start-dig="convoyFantasma"]` existe) y su tarjeta de Tienda muestra
   `Suerte recomendada: 340`; la Cripta sigue bloqueada con `Se desbloquea con el Prestigio 3`.
3. **Índice**: mismo seed → en la pestaña `[data-tab="index"]`, el selector de contenedores
   incluye `Convoy Fantasma`.

**`npm run test:e2e`: 36 passed (33 + 3).**

## 11.9 Verificación manual, docs, commit

- Manual (`npm run dev` + seed por consola si hace falta): comprar/escarbar el Convoy de punta
  a punta; el Índice lista sus 7 ítems como "???" hasta encontrarlos.
- `DESARROLLO.md` §10 + `agentes/HANDOFF.md` (bloque Ronda 11: los 4 contenedores, metas
  340/420/500/580, 28 ítems, 3 shapes nuevos).
- Commit `feat: ronda 11 — 4 contenedores de prestigio con pools propios` + push
  `feat/prestigio-contenedores-ronda11` + link de PR. **Esperá el merge antes de la ronda 12.**

---
---

# RONDA 12 — Celebraciones (rama `feat/celebraciones-ronda12`)

## 12.1 Rama

```
git switch main && git pull origin main && git switch -c feat/celebraciones-ronda12
```

## 12.2 PLAN.md primero

En PLAN.md §5.2 (juice), agregá:

```md
- **Celebraciones (ronda 12)**: un modal centrado sobre TODO (backdrop gris semitransparente
  que atenúa el juego) celebra tres momentos: logro desbloqueado (ícono + nombre + recompensa),
  contenedor nuevo desbloqueado y hallazgo excepcional ("jackpot"). Se cierra SOLO con la cruz
  arriba a la derecha (sin auto-cierre, sin click en el backdrop); si caen varias celebraciones
  se encolan y se muestran una tras otra. El juego sigue corriendo detrás y el progreso nunca
  se pierde. Cada tipo tiene su sonido (WebAudio, sin archivos). Este modal reemplaza al toast
  de logros y al modal de categoría nueva.
- **Jackpot (definición literal)**: un ítem del escarbado MANUAL es jackpot si su categoría es
  la ÚLTIMA del array `categorias` del contenedor (la más rara) Y su varianza de valor cayó en
  el tope del rango (≥ 1.10 de un rango 0.85-1.15, constante `JACKPOT_VARIANCE_MIN`). La
  automatización no celebra jackpots (anti-spam).
```

## 12.3 Engine — isJackpot en el roll (test RED primero)

Creá `packages/engine/tests/ronda12-jackpot.test.js`:

```js
/**
 * Ronda 12 (PLAN.md §5.2 ampliado): jackpot = ítem de la categoría más rara del contenedor
 * con varianza en el tope (>= JACKPOT_VARIANCE_MIN de un rango 0.85-1.15).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { rollContainerResult } from '../src/systems/containers.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const barrio = containers.find((c) => c.id === 'contenedorBarrio');

describe('Ronda 12 — jackpot en el roll', () => {
  it('varianza al tope + categoría más rara ⇒ isJackpot true; varianza media ⇒ false', () => {
    // random = 0.99: no-trampa, categoría alta del weight, varianza 0.85+0.99*0.3 = 1.147.
    const high = rollContainerResult(freshState(), barrio, false, items, data, () => 0.99);
    expect(high.isTrap).toBe(false);
    expect(high.items.some((item) => item.isJackpot)).toBe(true);
    for (const item of high.items.filter((i) => i.isJackpot)) {
      expect(item.categoria).toBe(barrio.categorias[barrio.categorias.length - 1]);
    }
    // random = 0.5: varianza 1.0 (< 1.10) ⇒ nunca jackpot, caiga la categoría que caiga.
    const mid = rollContainerResult(freshState(), barrio, false, items, data, () => 0.5);
    expect(mid.items.every((item) => !item.isJackpot)).toBe(true);
  });
});
```

Corré `npm test` → falla (no existe `isJackpot`). Después, en
`packages/engine/src/systems/containers.js`:

- Arriba del archivo (junto a otras constantes o tras los imports):

```js
// PLAN.md §5.2 (ronda 12): un ítem es "jackpot" si es de la categoría más rara del contenedor
// y su varianza cayó en el tope del rango 0.85-1.15 de rollItemVariance (~1/6 de las veces).
const JACKPOT_VARIANCE_MIN = 1.10;
```

- En el loop de `rollContainerResult`, al armar el ítem (donde hoy hace
  `items.push({ icon, name, categoria, value })`), agregá el flag:

```js
    const isJackpot =
      categoria === container.categorias[container.categorias.length - 1] &&
      variance >= JACKPOT_VARIANCE_MIN;
    items.push({ icon: pick.icon, name: pick.name, categoria, value, isJackpot });
```

- Actualizá el `@typedef DigResult` del mismo archivo para incluir `isJackpot: boolean` en los
  ítems.

`npm test` → verde. (Verificá antes con el test que `() => 0.99` no dé trampa en el barrio:
`rollIsTrap(0.08, () => 0.99)` es false porque 0.99 > 0.08 — ya validado en el diseño.)

## 12.4 Store — desbloqueos nuevos de contenedor

En `apps/game/src/store.js`:

- Junto a `let newAchievements = []` agregá:

```js
  let newContainerUnlocks = [];
  /** Ids desbloqueados según el estado actual (baseline para detectar novedades). */
  const unlockedIdsNow = () =>
    new Set(allContainers.filter((c) => isContainerUnlocked(state, c, allContainers)).map((c) => c.id));
  let knownUnlocked = unlockedIdsNow();

  // PLAN.md §5.2 (ronda 12): cualquier acción que pueda desbloquear un contenedor (comprar el
  // anterior, comprar redDrones, prestigiar) pasa por acá; la diferencia se celebra en la UI.
  function detectContainerUnlocks() {
    const current = unlockedIdsNow();
    for (const id of current) {
      if (!knownUnlocked.has(id)) {
        newContainerUnlocks.push(allContainers.find((c) => c.id === id));
      }
    }
    knownUnlocked = current;
  }
```

- Llamá `detectContainerUnlocks();` inmediatamente ANTES de `persist()` en las acciones
  `finishManualDig` (comprar el contenedor se hace al iniciar, pero el nivel/prestigio pueden
  cambiar ahí), `buyAutomation` y `doPrestige`, y después de `applyContainerResult` del tick de
  automatización si la acción del tick existe en el store (buscá `automationTick` y agregalo en
  el mismo lugar del patrón). En `startManualDig`, agregalo después del `engineBuyContainer`
  exitoso (comprar el anterior desbloquea el siguiente).
- Junto a `consumeNewAchievements()` agregá:

```js
    consumeNewContainerUnlocks() {
      const list = newContainerUnlocks;
      newContainerUnlocks = [];
      return list;
    },
```

Baseline al cargar = estado actual ⇒ recargar la página NUNCA re-celebra (no hace falta
persistir nada; sin bump de saveVersion).

## 12.5 UI — CelebrationModal (reemplaza CategoryUnlockModal y el toast de logros)

**a) Audio** — en `apps/game/src/fx/audio.js`, después de `playCelebration`, agregá:

```js
/** Fanfarria de 3 notas ascendentes (arpegio mayor) para contenedor nuevo desbloqueado. */
export function playContainerFanfare() {
  if (!enabled) return;
  [440, 554, 659].forEach((freq, i) => {
    setTimeout(() => playTone({ freq, duration: 0.22, type: 'triangle', gain: 0.14 }), i * 110);
  });
}

/** "Sparkle" agudo y rápido para un hallazgo jackpot. */
export function playJackpot() {
  if (!enabled) return;
  [880, 1175, 1568, 2093].forEach((freq, i) => {
    setTimeout(() => playTone({ freq, duration: 0.16, type: 'sine', gain: 0.11 }), i * 70);
  });
}
```

**b) Creá `apps/game/src/ui/CelebrationModal.js`**:

```js
/**
 * Celebraciones centradas (PLAN.md §5.2, ronda 12): logro desbloqueado (con recompensa),
 * contenedor nuevo y jackpot. Overlay sobre todo con backdrop que atenúa el juego; se cierra
 * SOLO con la cruz (sin auto-cierre ni click en backdrop, pedido del usuario). Si llegan
 * varias, se encolan y se muestran una tras otra. Reemplaza al CategoryUnlockModal y al toast
 * de logros. El juego sigue corriendo detrás; acá no se muta estado.
 */

import { formatMoney, formatNumber } from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { playCelebration, playContainerFanfare, playJackpot } from '../fx/audio.js';

/**
 * @typedef {(
 *   { type: 'achievement', achievement: { name: string, icon: string, reward?: { type: string, amount: number } } } |
 *   { type: 'containerUnlock', container: { name: string, icon: string } } |
 *   { type: 'jackpot', item: { name: string, icon: string, value: number } }
 * )} Celebration
 */

const queue = [];
let showing = false;

function rewardLabel(reward) {
  if (!reward) return '';
  return reward.type === 'keys'
    ? `${formatNumber(reward.amount)} Llaves de Ciudad`
    : formatMoney(reward.amount);
}

function contentFor(celebration) {
  if (celebration.type === 'achievement') {
    const { achievement } = celebration;
    playCelebration();
    return (
      `<span class="celebration-icon">${iconMarkup(achievement.icon, { size: 44 })}</span>` +
      `<h2>¡Logro desbloqueado!</h2>` +
      `<p class="celebration-name">${achievement.name}</p>` +
      (achievement.reward ? `<p class="celebration-reward">Recompensa: ${rewardLabel(achievement.reward)}</p>` : '')
    );
  }
  if (celebration.type === 'containerUnlock') {
    const { container } = celebration;
    playContainerFanfare();
    return (
      `<span class="celebration-icon">${iconMarkup(container.icon, { size: 44 })}</span>` +
      `<h2>¡Contenedor nuevo!</h2>` +
      `<p class="celebration-name">${container.name}</p>` +
      `<p class="celebration-reward">Ya está disponible para escarbar.</p>`
    );
  }
  const { item } = celebration;
  playJackpot();
  return (
    `<span class="celebration-icon celebration-icon--jackpot">${iconMarkup(item.icon, { size: 44 })}</span>` +
    `<h2>¡Hallazgo excepcional!</h2>` +
    `<p class="celebration-name">${item.name}</p>` +
    `<p class="celebration-reward">${formatMoney(item.value)}</p>`
  );
}

export const CelebrationModal = {
  /**
   * Encola una celebración; si no hay ninguna en pantalla, la muestra ya.
   * @param {HTMLElement} container - overlay raíz (`#celebration-modal`, hidden por defecto).
   * @param {Celebration} celebration
   */
  push(container, celebration) {
    queue.push(celebration);
    if (!showing) this.showNext(container);
  },

  /** @param {HTMLElement} container */
  showNext(container) {
    const celebration = queue.shift();
    if (!celebration) {
      showing = false;
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    showing = true;
    container.innerHTML =
      `<div class="modal-card celebration-card" role="dialog" aria-modal="true">` +
      `<button type="button" class="celebration-close" data-action="close-celebration" aria-label="Cerrar">` +
      `${iconMarkup('close-x', { size: 20 })}` +
      `</button>` +
      contentFor(celebration) +
      `</div>`;
    container.hidden = false;
    container.querySelector('[data-action="close-celebration"]').addEventListener(
      'click',
      () => this.showNext(container),
      { once: true }
    );
  },
};
```

Nota: la cruz muestra la SIGUIENTE de la cola (o cierra si no hay más) — cumple "solo se sale
con la cruz" incluso encoladas. NO agregues listener de click en el backdrop.

**c) Ícono de la cruz** — en `icons.js`, agregá el shape y el mapping:

```js
  closeX: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
```
```js
  'close-x': 'closeX',
```

**d) `apps/game/index.html`** — renombrá el mount `#category-modal` a:

```html
    <div id="celebration-modal" class="modal-overlay" hidden></div>
```

**e) `apps/game/src/ui/UIManager.js`**:
- Borrá el import de `CategoryUnlockModal` y la const `CATEGORY_UNLOCK_ACHIEVEMENT_IDS`;
  importá `CelebrationModal`. Renombrá `this.categoryModalEl` a `this.celebrationModalEl`
  apuntando a `#celebration-modal`.
- Reemplazá el bloque de logros del `render()` por:

```js
    for (const achievement of this.store.consumeNewAchievements()) {
      CelebrationModal.push(this.celebrationModalEl, { type: 'achievement', achievement });
    }
    for (const container of this.store.consumeNewContainerUnlocks()) {
      CelebrationModal.push(this.celebrationModalEl, { type: 'containerUnlock', container });
    }
```

  (el toast `Logro desbloqueado: ...` desaparece; el toast queda para level-ups y errores).
- En `handleDigComplete`, después del toast de level-up, celebrá jackpots del resultado manual:

```js
    if (result && !result.isTrap) {
      for (const item of result.items.filter((i) => i.isJackpot)) {
        CelebrationModal.push(this.celebrationModalEl, { type: 'jackpot', item });
      }
    }
```

- **Borrá `apps/game/src/ui/CategoryUnlockModal.js`** (quedó absorbido; los logros a14-a19 se
  celebran como cualquier logro).

**f) CSS** — en `apps/game/styles/components.css`, junto a los estilos de `.modal-card`
(buscá `modal-card` con grep), agregá usando SOLO tokens:

```css
/* Celebraciones (PLAN.md §5.2, ronda 12): tarjeta centrada con cruz de cierre obligatoria. */
.celebration-card {
  position: relative;
  text-align: center;
  padding: var(--space-4);
}

.celebration-close {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--fg-1);
}

.celebration-icon {
  display: inline-flex;
  color: var(--amber);
}

.celebration-name {
  font-family: var(--font-display);
  color: var(--fg-0);
}

.celebration-reward {
  color: var(--amber);
  font-weight: 600;
}
```

El backdrop gris ya existe: `.modal-overlay` (verificá con grep que tenga un fondo
semitransparente; si su alpha es muy tenue para "atenuar el juego", subilo a ~0.6 en el token o
regla EXISTENTE, sin inventar colores nuevos).

## 12.6 E2e

Creá `apps/game/e2e/ronda12-regression.spec.js`:

1. **Logro celebra en modal con recompensa y solo cierra con la cruz**: partida fresca →
   completar un escarbado del tacho (flujo de `ronda9-regression.spec.js` test 3) → aparece
   `#celebration-modal` visible con `¡Logro desbloqueado!`; click en el CENTRO del backdrop
   (fuera de la tarjeta) NO lo cierra; click en `[data-action="close-celebration"]` muestra la
   SIGUIENTE celebración de la cola ("Primeros Pasos" y "Primer Objeto" caen juntos) y el texto
   `Recompensa:` está presente; cerrar todas → `#celebration-modal` hidden y el juego responde
   (el picker `#dig-empty` sigue visible y clickeable).
2. **No hay más toast de logro**: en el flujo del test 1, `page.locator('.toast').filter({
   hasText: 'Logro desbloqueado' })` tiene count 0 en todo momento.
3. **Contenedor nuevo celebra**: seed `money: 100` (sin barrio comprado) → click en
   `[data-start-dig="contenedorBarrio"]` — comprar el barrio (la compra ocurre al INICIAR el
   escarbado) desbloquea el Container Industrial ⇒ el modal aparece ahí mismo, con el escarbado
   de fondo: `#celebration-modal` visible con `¡Contenedor nuevo!` y `Container Industrial`;
   cerrarlo con la cruz deja `#dig-active` visible y el escarbado sigue rascable.
4. **Progreso intacto tras cerrar**: en el test 1, el dinero de `#money` después de cerrar el
   modal es el mismo que antes de abrirlo (assert con polling `toHaveText` del valor esperado
   capturado tras completar el dig).

**`npm run test:e2e`: 40 passed (36 + 4).** OJO: los specs viejos que esperaban el toast de
logro o el `#category-modal` pueden fallar — buscá con
`grep -rn "category-modal\|Logro desbloqueado" apps/game/e2e/` y adaptá esos asserts al modal
nuevo (es un cambio de comportamiento intencional, documentalo en el HANDOFF).

El jackpot NO tiene e2e (el roll no es seedeable desde la página): queda cubierto por el unit
test de 12.3 + verificación manual.

## 12.7 Verificación manual, docs, commit

- Manual: escarbar hasta un logro → modal centrado, fondo atenuado, suena, la cruz cierra y
  el juego sigue; comprar el barrio → fanfarria de contenedor nuevo; forzar un jackpot (escarbá
  el barrio muchas veces — categoría `reusable` con varianza alta, ~1 de cada 6 hallazgos de la
  categoría rara) → sparkle + modal con el valor. En 375px la cruz es tocable (44px).
- `DESARROLLO.md` §10 + `agentes/HANDOFF.md` (bloque Ronda 12: CelebrationModal reemplaza
  CategoryUnlockModal + toast de logros; regla literal del jackpot; cola con cruz).
- Commit `feat: ronda 12 — celebraciones centradas (logros, contenedores nuevos y jackpots)` +
  push `feat/celebraciones-ronda12` + link de PR.

---

## Criterios de aceptación globales

- [ ] Ronda 10: metas `[1.0→8.7]` Fuerza / `[1→8.2]` Búsqueda / `[0,8,20,40,72,120,190,290]`
      Suerte, visibles en la Tienda, penalizan sin bloquear; tests y guards actualizados.
- [ ] Ronda 11: 12 contenedores, los 4 nuevos gateados por prestigio 2/3/4/5 con 7 ítems
      propios c/u, metas `[340,420,500,580]`, visibles en Tienda/picker/Índice al desbloquear;
      la tarjeta bloqueada dice con qué prestigio se abre.
- [ ] Ronda 12: modal centrado con backdrop atenuante, cruz como único cierre, cola, sonido
      por tipo; celebra logros (con recompensa), contenedores nuevos y jackpots manuales;
      CategoryUnlockModal y el toast de logros eliminados; progreso intacto al cerrar.
- [ ] En cada ronda: PLAN.md actualizado ANTES del código; `npm test` y `npm run test:e2e`
      verdes; sin console.log/TODO/emojis; tokens CSS; sin bump de saveVersion (ninguna ronda
      agrega campos persistentes); save del jugador intacto; HANDOFF + DESARROLLO.md al día.
