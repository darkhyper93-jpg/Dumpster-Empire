# ContainerLevels.md — Ronda 9: multiplicador de valor por nivel, nivel VISIBLE y explicación real de la automatización

> **Para el agente ejecutor.** Este plan es autocontenido: NO necesitás contexto de rondas
> anteriores. Seguí los pasos EN ORDEN, copiá el código EXACTAMENTE y verificá cada salida
> esperada antes de avanzar. Si algo no coincide con lo que dice el plan, **detenete y reportá
> la diferencia** — no improvises.
>
> Leé primero `CLAUDE.md`. Las reglas que mandan acá:
> 1. La economía vive SOLO en `packages/engine`; la UI lee estado y muestra, jamás recalcula.
> 2. Las fórmulas nuevas se escriben primero en PLAN.md (contrato literal) y las constantes de
>    balance van en `data/*.json`.
> 3. TDD: tests RED antes de implementar.

---

## 1. Contexto y decisión tomada (ya aprobada — no re-preguntar)

Los **niveles de contenedor ya existen** en el engine (PLAN.md §11.3): cada contenedor tiene
nivel 1–10 (`state.containerLevels`), sube escarbándolo (`registerContainerDig` en
`packages/engine/src/economy.js:452`, curva `levelUpDigsBase × levelUpDigsGrowth^(nivel−1)`), y
cada nivel corre las probabilidades hacia la categoría rara (`getLevelRarityShift`). El save del
jugador ya los persiste. **Pero son invisibles**: cero usos de `getContainerLevel` en
`apps/game/src` — el jugador no sabe que existen.

Esta ronda agrega **tres cosas** (decididas, opción recomendada):

**A. Multiplicador de dinero por nivel** (mecánica nueva → PLAN.md se actualiza en el Paso 2):

```
multNivel(contenedor) = 1 + (nivel − 1) × levelValueMultPerLevel
```

con `levelValueMultPerLevel` como **constante de datos** en `containers.json` (0.05 para los 8
contenedores en V1 ⇒ ×1.00 a nivel 1, ×1.45 a nivel 10 — útil sin ser OP). Multiplica el valor
de los ítems de ese contenedor en los 3 puntos del pipeline (escarbado real, automatización,
offline). **NO** toca la Suerte recomendada: `getRecommendedLuck` evalúa contra un jugador
neutro (nivel 1 ⇒ mult ×1), así que las metas de la ronda 8 (`0/6/16/32/56/86/126/176`) quedan
idénticas — hay un test que lo garantiza y DEBE seguir verde.

**B. Visibilidad**: la tarjeta de la Tienda muestra nivel, bonus y progreso; el selector de
escarbado muestra un badge "Nv. X"; al subir de nivel por escarbado manual aparece un toast.
Los level-ups de la automatización NO muestran toast (decisión: evita spam; el nivel se ve en
las vistas).

**C. Explicación real de la automatización** (fix de UX reportado por el usuario jugando: "no
entiendo cómo poner items en la Cola"): la cola NO se llena a mano — el **Robot Clasificador
Básico** compra contenedores solo con el dinero del jugador y los procesa. El texto actual de
`AutomationView.js` es engañoso (dice que "al comprar una automatización nueva se van sumando
contenedores a la cola", cuando solo el Robot habilita eso) y el panel de estado muestra
"Cola: 0/2 · Nada en curso" aunque no tengas robot, que parece un bug. Se reescribe la
explicación nombrando al Robot y el panel de estado pasa a ser **consciente del estado**: sin
robot muestra un aviso destacado de qué comprar para activarla, con robot muestra la cola real.

---

## 2. Reglas duras (qué NO hacer)

- **NO** tocar `items.json`, `upgrades.json`, precios, trampas ni ninguna fórmula existente.
- **NO** calcular economía en la UI: el nivel, el bonus y los escarbados restantes salen de
  `getContainerLevel` / `getLevelValueMult` / `digsNeededForNextLevel` / `CONTAINER_LEVEL_MAX`
  del engine (redondear `(mult−1)×100` para mostrar "%" es formato, no economía — está bien).
- **NO** usar emojis como íconos ni colores hardcodeados: cualquier CSS nuevo usa los tokens
  `var(--...)` existentes.
- **NO** committear `ReporteDeEstado.md`, `AdjLuck.md` ni `ContainerLevels.md` (untracked, del usuario).
- **NO** tocar el save del jugador (`C:\Users\SANTI\AppData\Roaming\@dumpster\desktop\save.json`
  ni la clave `dumpsterEmpireSave`). No hay cambio de esquema de save: `containerLevels` y
  `containerLevelProgress` ya se persisten ⇒ **sin bump de `saveVersion`**.
- **NO** usar `gh` CLI (no está autenticado): el PR lo crea el usuario con el link del push.
- Para el commit multilínea y para anexar a `agentes/HANDOFF.md` usá la tool **Bash** con
  heredoc (PowerShell 5.1 rompe los here-strings si el cierre `'@` no va solo en su línea, y
  `Add-Content` arruina el UTF-8).

---

## 3. Paso 1 — Rama nueva desde main

```
git switch main
git pull origin main
git switch -c feat/niveles-ronda9
```

`git status` limpio (solo los .md untracked del usuario).

---

## 4. Paso 2 — Actualizar PLAN.md §11.3 (el contrato, antes que el código)

En `PLAN.md`, sección **"11.3 Niveles de contenedor"** (~línea 524), después del bullet
"El nivel es **persistente** (parte del save) y por contenedor.", agregá estos dos bullets:

```md
- Cada nivel suma además un **multiplicador de valor** a los ítems de ese contenedor:
  `multNivel = 1 + (nivel − 1) × levelValueMultPerLevel` (constante de datos por contenedor en
  `containers.json`; 0.05 en V1 ⇒ ×1.00 a nivel 1, ×1.45 a nivel 10). Aplica al valor real de
  cada escarbado, a la automatización y al offline. NO aplica al cálculo de la Suerte
  recomendada (§11.2 la evalúa contra un jugador neutro a nivel 1), así que las metas de
  Suerte por contenedor no cambian.
- El nivel es **visible**: la tarjeta de la Tienda muestra nivel actual, bonus de valor y
  escarbados restantes para el siguiente nivel; el selector de escarbado muestra un badge
  "Nv. X"; al subir de nivel por escarbado manual se notifica con un toast (los level-ups de
  la automatización no notifican, para no spamear).
```

---

## 5. Paso 3 — Datos: `levelValueMultPerLevel` en containers.json

En `apps/game/src/data/containers.json`, a **cada uno de los 8 contenedores** agregale la línea

```json
    "levelValueMultPerLevel": 0.05,
```

inmediatamente **después** de su línea `"levelRarityShiftPerLevel": 2.5,`. Ojo con las comas:
`levelRarityShiftPerLevel` hoy es la última clave en 7 de los 8 bloques (el octavo,
`containerExtradimensional`, sigue con `requiresPrestigeCount`) — al insertar debajo, la línea
de arriba pasa a necesitar coma y la nueva lleva coma solo si no queda última. Validá con
`node -e "require('C:/Users/SANTI/Desktop/dumpire/apps/game/src/data/containers.json'); console.log('JSON OK')"`.

---

## 6. Paso 4 — Tests RED (engine)

Creá `packages/engine/tests/ronda9-niveles.test.js` con EXACTAMENTE:

```js
/**
 * Ronda 9 (PLAN.md §11.3 ampliado): multiplicador de valor por nivel de contenedor.
 * multNivel = 1 + (nivel − 1) × levelValueMultPerLevel. Aplica al roll real, a la
 * automatización/offline, y NO mueve la Suerte recomendada (meta neutra de rondas 7/8).
 */
import { describe, it, expect } from 'vitest';
import { freshState } from '../src/state.js';
import { getLevelValueMult, getRecommendedLuck, CONTAINER_LEVEL_MAX } from '../src/economy.js';
import { rollContainerResult } from '../src/systems/containers.js';
import { expectedContainerValue } from '../src/systems/offline.js';
import upgrades from '../../../apps/game/src/data/upgrades.json';
import containers from '../../../apps/game/src/data/containers.json';
import automations from '../../../apps/game/src/data/automations.json';
import prestigeTree from '../../../apps/game/src/data/prestigeTree.json';
import items from '../../../apps/game/src/data/items.json';

const data = { upgrades, automations, prestigeTree };
const tacho = containers.find((c) => c.id === 'tachoVereda');

describe('Ronda 9 — multiplicador de valor por nivel (PLAN.md §11.3)', () => {
  it('literal: multNivel = 1 + (nivel − 1) × levelValueMultPerLevel', () => {
    const state = freshState();
    expect(getLevelValueMult(state, tacho)).toBe(1);
    state.containerLevels.tachoVereda = 5;
    expect(getLevelValueMult(state, tacho)).toBeCloseTo(1 + 4 * tacho.levelValueMultPerLevel, 10);
    state.containerLevels.tachoVereda = CONTAINER_LEVEL_MAX;
    expect(getLevelValueMult(state, tacho)).toBeCloseTo(1.45, 10);
  });

  it('el valor real de un escarbado escala con el nivel (roll determinista; el tacho tiene una sola categoría, así que el corrimiento de rareza no contamina el ratio)', () => {
    const random = () => 0.5;
    const low = freshState();
    const high = freshState();
    high.containerLevels.tachoVereda = 5;
    const a = rollContainerResult(low, tacho, false, items, data, random);
    const b = rollContainerResult(high, tacho, false, items, data, random);
    expect(a.isTrap).toBe(false);
    expect(b.isTrap).toBe(false);
    expect(b.moneyDelta / a.moneyDelta).toBeCloseTo(getLevelValueMult(high, tacho), 10);
  });

  it('el valor esperado de automatización/offline escala igual que el roll', () => {
    const low = freshState();
    const high = freshState();
    high.containerLevels.tachoVereda = CONTAINER_LEVEL_MAX;
    const ratio = expectedContainerValue(high, tacho, items, data) / expectedContainerValue(low, tacho, items, data);
    expect(ratio).toBeCloseTo(1.45, 10);
  });

  it('todos los contenedores definen levelValueMultPerLevel > 0 (constante de datos, no hardcode)', () => {
    for (const c of containers) expect(c.levelValueMultPerLevel).toBeGreaterThan(0);
  });

  it('la Suerte recomendada NO cambia aunque todos los contenedores estén a nivel máximo (meta neutra de rondas 7/8 intacta)', () => {
    const advanced = freshState();
    for (const c of containers) advanced.containerLevels[c.id] = CONTAINER_LEVEL_MAX;
    const rec = containers.map((c) => getRecommendedLuck(advanced, c, items, data));
    expect(rec).toEqual([0, 6, 16, 32, 56, 86, 126, 176]);
  });
});
```

**Corré `npm test` y verificá el RED esperado:** el archivo nuevo **falla al cargar** (no existe
`getLevelValueMult` en `economy.js`) — Vitest reporta ese archivo como failed y los **139**
tests previos pasan. Si falla cualquier otro archivo, frená y reportá.

Dato pre-verificado (por si dudás del test 2): hoy, con `random = () => 0.5`, el roll del tacho
da `moneyDelta = 6.765` idéntico a nivel 1 y a nivel 5 — el nivel no toca nada más del roll en
un contenedor de una sola categoría, así que el ratio medirá exactamente el multiplicador nuevo.

---

## 7. Paso 5 — Implementación en el engine (4 archivos)

**a) `packages/engine/src/economy.js`** — inmediatamente después de `getLevelRarityShift`
(cierra en la línea ~443), agregá:

```js
/**
 * Multiplicador de valor por nivel del contenedor (PLAN.md §11.3, ronda 9).
 * multNivel = 1 + (nivel − 1) × levelValueMultPerLevel
 * Aplica al valor de venta de los ítems de ESTE contenedor (roll real, automatización y
 * offline). No entra en getRecommendedLuck en la práctica: esa meta se evalúa contra un
 * jugador neutro (nivel 1 ⇒ mult 1), a propósito (§11.2).
 * @param {GameState} state
 * @param {Object} container
 * @returns {number}
 */
export function getLevelValueMult(state, container) {
  const level = getContainerLevel(state, container.id);
  return 1 + (level - 1) * (container.levelValueMultPerLevel || 0);
}
```

Y en la MISMA `economy.js`, dentro de `averageItemValueForContainer` (~línea 531), multiplicá el
retorno (mantiene honesto el modelo de EV; con estado neutro es ×1):

```js
  return (
    itemSaleValue({
      valorBaseObjeto: avgBase,
      multiplicadorRareza: rarity.mult,
      suerte: luck,
      fluctuacionMercado: 1,
      sellMult: getSellMult(state, categoria, data),
      depthValueMult,
    }) * getLevelValueMult(state, container)
  );
```

**b) `packages/engine/src/systems/containers.js`** — en `rollContainerResult`, sumá
`getLevelValueMult` al import de `'../economy.js'` y aplicá el multiplicador al valor de cada
ítem. Junto a la línea `const levelShift = getLevelRarityShift(state, container);` (~línea 86)
agregá:

```js
  // PLAN.md §11.3 (ronda 9): a mayor nivel del contenedor, más valen sus ítems.
  const levelValueMult = getLevelValueMult(state, container);
```

y cambiá la asignación del valor (~línea 96) a:

```js
    const value =
      itemSaleValue({
        valorBaseObjeto: pick.valorBase * variance,
        multiplicadorRareza: rarity.mult,
        suerte: luck,
        fluctuacionMercado: state.marketFluctuation,
        sellMult: getSellMult(state, categoria, data),
        depthValueMult,
      }) * levelValueMult;
```

**c) `packages/engine/src/systems/offline.js`** — sumá `getLevelValueMult` al import de
`'../economy.js'` y en `averageItemValue` (~línea 22) multiplicá el retorno igual que en (a):
`}) * getLevelValueMult(state, container)` envolviendo el `itemSaleValue({...})` en paréntesis.

**d) `packages/engine/src/index.js`** — agregá `getLevelValueMult,` al bloque de exports de
economy, junto a `getLevelRarityShift` (~línea 33).

**Corré `npm test`: 144 passed (139 + 5 nuevos).** El test de la ronda 8 en
`fase9-balance.test.js` (`toEqual([0, 6, 16, 32, 56, 86, 126, 176])`) DEBE seguir verde — si se
rompió, aplicaste el multiplicador dentro del camino neutro de `getRecommendedLuck` con un
estado que no corresponde: revisá (a).

---

## 8. Paso 6 — UI (5 archivos + CSS)

**a) `apps/game/src/ui/ShopView.js`** — al import de `'@dumpster/engine'` sumá
`getContainerLevel, getLevelValueMult, digsNeededForNextLevel, CONTAINER_LEVEL_MAX`. Dentro del
map de tarjetas desbloqueadas, junto a las otras consts (~línea 46), agregá:

```js
      // PLAN.md §11.3: nivel del contenedor y su bonus — leídos del engine, nunca recalculados.
      const level = getContainerLevel(state, c.id);
      const levelBonusPct = Math.round((getLevelValueMult(state, c) - 1) * 100);
      const levelProgress =
        level >= CONTAINER_LEVEL_MAX
          ? 'nivel máximo'
          : `${formatNumber(Number(state.containerLevelProgress[c.id]) || 0)}/` +
            `${formatNumber(digsNeededForNextLevel(c, level))} escarbados para el nivel ${level + 1}`;
```

y en el HTML de la tarjeta, después de la línea de `Comprados:`, agregá:

```js
        `<p class="shop-card-level">Nivel ${level}/${CONTAINER_LEVEL_MAX} (+${levelBonusPct}% valor) — ${levelProgress}</p>` +
```

**b) `apps/game/src/ui/DigContainerPicker.js`** — sumá `getContainerLevel` al import de
`'@dumpster/engine'` y en el botón de cada tarjeta, después del span del costo (~línea 45):

```js
        `<span class="dig-picker-card-level">Nv. ${getContainerLevel(state, c.id)}</span>` +
```

**c) `apps/game/src/store.js`** — sumá `getContainerLevel, getLevelValueMult` al import de
`'@dumpster/engine'`. En `finishManualDig` (~línea 145) detectá el level-up alrededor de
`applyContainerResult` y devolvelo:

```js
    finishManualDig() {
      if (!pendingDig) return { ok: false, error: 'No hay escarbado en curso.' };
      const { container, result } = pendingDig;
      const levelBefore = getContainerLevel(state, container.id);
      applyContainerResult(state, container, result, false, data);
      const levelAfter = getContainerLevel(state, container.id);
      if (state.tutorialStep === 0) state.tutorialStep = 1;
      pendingDig = null;
      runAchievements();
      persist();
      notify();
      return {
        ok: true,
        // PLAN.md §11.3 (ronda 9): solo el escarbado manual notifica el level-up (la
        // automatización sube niveles en silencio para no spamear toasts).
        levelUp:
          levelAfter > levelBefore
            ? {
                containerName: container.name,
                level: levelAfter,
                bonusPct: Math.round((getLevelValueMult(state, container) - 1) * 100),
              }
            : null,
      };
    },
```

**d) `apps/game/src/ui/UIManager.js`** — en `handleDigComplete` (~línea 117), capturá el retorno
y mostrá el toast (la clase `Toast` expone `push(message)`, no `show`):

```js
  handleDigComplete() {
    const pending = this.store.getPendingDig();
    const result = pending ? pending.result : null;
    const res = this.store.actions.finishManualDig();
    if (result) this.playDigFeedback(result);
    if (res && res.ok && res.levelUp) {
      this.toast.push(
        `${res.levelUp.containerName} subió a nivel ${res.levelUp.level}: +${res.levelUp.bonusPct}% de valor`
      );
    }
  }
```

**e) `apps/game/src/ui/AutomationView.js`** — la explicación real de la cola (parte C del plan).
Tres cambios:

1. Sumá `hasAutoDig` al import de `'@dumpster/engine'` (línea 9; ya está exportado — el store lo
   usa).
2. Después de `const parallelSlots = getParallelAutoSlots(state, data);` (~línea 43) agregá:

```js
    // Parte C (ronda 9): el panel de estado depende de si el jugador ya tiene auto-escarbado.
    const autoDigActive = hasAutoDig(state, data);
```

3. En el `container.innerHTML` (~línea 77), reemplazá el PRIMER `<p>` del
   `automation-explainer` (el que empieza con "Cada máquina que comprás abajo hace un trabajo
   fijo..." y termina en "...si se te llena seguido.</p>") por:

```js
      `<p>Acá no se encola nada a mano: el <strong>Robot Clasificador Básico</strong> es el que` +
      ` trabaja. Cuando lo tenés, él solo <strong>compra contenedores con tu dinero</strong>` +
      ` (siempre el más caro que tengas desbloqueado y te alcance), los suma a la` +
      ` <strong>cola</strong> y los procesa — a cambio, con más riesgo de trampa que escarbar a` +
      ` mano. Las demás máquinas lo potencian: Carrito y Cinta Transportadora agrandan la cola` +
      ` (igual que la mejora de Capacidad de abajo) y la Red de Drones suma un segundo robot en` +
      ` paralelo.</p>` +
```

   (el `<p class="automation-explainer-hint">` de los botones grises queda como está), y
   reemplazá las tres líneas de estado de la `automation-status` (Cola / Slots / Procesando,
   ~líneas 90-92) por el bloque consciente del estado:

```js
      (autoDigActive
        ? `<p>Cola: ${state.autoQueue.length} / ${formatNumber(queueMax)}</p>` +
          `<p>Slots simultáneos: ${parallelSlots}</p>` +
          `<p>Procesando: ${processingItems ? `<ul>${processingItems}</ul>` : 'Nada en curso.'}</p>`
        : `<p class="automation-callout">La cola está <strong>inactiva</strong>: comprá el` +
          ` <strong>Robot Clasificador Básico</strong> (abajo) y se va a llenar y procesar sola` +
          ` con tu dinero. No hay nada que encolar a mano.</p>`) +
```

   El botón de "Ampliar Capacidad" queda igual, visible en ambos estados.

**f) CSS** — buscá dónde está definida `.shop-card-luck` (`grep -rn "shop-card-luck" apps/game`
sobre los .css) y al lado definí `.shop-card-level`, `.dig-picker-card-level` y
`.automation-callout` usando SOLO tokens existentes (`var(--...)`), sin colores nuevos ni
tamaños mágicos. Sugerencia mínima: `.shop-card-level` con el mismo tratamiento tipográfico que
`.shop-card-luck`; el badge del picker más chico y en el color de acento ámbar del tema; el
`.automation-callout` como caja destacada (borde o fondo con el acento ámbar, padding cómodo
para touch) para que se distinga del texto normal y se entienda que es EL paso a seguir.
Verificá en 375px que ni la tarjeta del picker ni el callout desborden.

Estados de UI: no hay estados nuevos sin cubrir — Tienda y picker ya tienen su empty state, el
toast auto-cierra solo, y el callout de automatización ES el estado "cola vacía/inactiva" que
antes faltaba.

---

## 9. Paso 7 — E2e (regresión ronda 9)

Creá `apps/game/e2e/ronda9-regression.spec.js`. Estructura y seed calcados de
`apps/game/e2e/ronda7-regression.spec.js` (mismo patrón `addInitScript` + helpers de
`./helpers/dig.js`); para el flujo de completar un escarbado entero copiá el del test
"3+4" de `apps/game/e2e/ronda5-regression.spec.js` (usa `window.__digDebug` + `rascarObjeto`).
Tres tests:

1. **Tienda muestra nivel y bonus**: seed con `containerLevels = { tachoVereda: 7 }` y
   `containerLevelProgress = { tachoVereda: 3 }` → en la pestaña Contenedores, la tarjeta del
   tacho contiene `Nivel 7/10 (+30% valor)` y `3/31 escarbados para el nivel 8`
   (31 = ceil(5 × 1.35^6), verificado contra `digsNeededForNextLevel`).
2. **Picker muestra el badge**: mismo seed → en la pantalla Escarbar, la tarjeta del tacho
   contiene `Nv. 7`.
3. **Toast de level-up**: seed con `containerLevelProgress = { tachoVereda: 4 }` (nivel 1
   necesita 5 escarbados) → completar UN escarbado del tacho (flujo de ronda 5; da igual si
   sale trampa: el escarbado cuenta para el nivel igual) → esperar
   `expect(page.locator('.toast')).toContainText('subió a nivel 2')`.
4. **Automatización sin robot muestra el callout, no una cola muerta**: partida fresca (sin
   seed de automatización) → click en `[data-tab="automatizacion"]` → `.automation-callout`
   visible y su texto contiene `Robot Clasificador`; el texto `Cola:` NO está en la vista.
5. **Automatización con robot muestra la cola real**: seed con
   `automationOwned = { robotClasificador: true }` → en la pestaña Automatización se ve
   `Cola: 0 /` y `Slots simultáneos: 1`, y `.automation-callout` NO existe.

**Corré `npm run test:e2e`: 30 passed (25 + 5).** Ningún spec existente debería necesitar
cambios (ninguno asserta montos absolutos de dinero afectados por el multiplicador ni el texto
viejo del explainer de automatización).

---

## 10. Paso 8 — Verificación manual (jugando, no asumiendo)

`npm run dev` (web, 375px y desktop) y `npm run desktop` (Electron):

- Tienda: cada contenedor desbloqueado muestra "Nivel X/10 (+Y% valor) — n/m escarbados...".
  Con el save real del jugador el tacho debe decir Nivel 7 (+30% valor).
- Escarbar: cada tarjeta del picker muestra "Nv. X" sin romper el layout móvil.
- Completar escarbados del tacho hasta subir de nivel → aparece el toast y el bonus de la
  Tienda sube. El dinero ganado por ítem es mayor que antes en contenedores nivel > 1.
- Automatización SIN robot (partida nueva): se ve el callout destacado que manda a comprar el
  Robot Clasificador, sin "Cola: 0/2" suelta. Tras comprar el Robot ($2.000): la cola se llena
  y procesa sola, y el callout desaparece.
- Sin `NaN`/`Infinity`, sin notación científica, sin errores en consola.

---

## 11. Paso 9 — Documentación

**a) `DESARROLLO.md` §10 "Decisiones registradas"** — bullet al final de la lista (después del
de "Ronda 8"):

```md
- **Ronda 9 — niveles de contenedor con valor y visibles**: los niveles (§11.3) existían pero
  eran invisibles y solo movían rarezas. Ahora cada nivel multiplica el valor de los ítems del
  contenedor: `multNivel = 1 + (nivel − 1) × levelValueMultPerLevel` (0.05 en data ⇒ tope
  ×1.45 a nivel 10), aplicado en roll real, automatización y offline. La Suerte recomendada NO
  cambia (meta neutra a nivel 1, guard de ronda 8 intacto). UI: nivel+bonus+progreso en la
  Tienda, badge "Nv. X" en el picker, toast al subir por escarbado manual (la automatización
  no notifica). PLAN.md §11.3 actualizado ANTES de implementar. De paso, fix de UX de la
  Automatización: el explainer nombraba mal la mecánica (nada se encola a mano; el Robot
  Clasificador compra y procesa solo) y el panel de estado ahora es consciente del estado —
  sin robot muestra un callout con el paso a seguir en vez de una cola muerta "0/2".
```

**b) `agentes/HANDOFF.md`** — anexá al final con **Bash**:

```bash
cat >> agentes/HANDOFF.md <<'EOF'

---

## Ronda 9 — multiplicador de valor por nivel + nivel visible (rama `feat/niveles-ronda9`)

Pedido: "meterle niveles a los contenedores... multiplicador al dinero... visible, no OP pero
útil". Los niveles YA existían (§11.3, engine completo, save persistente) pero eran invisibles
y solo corrían rarezas.

### Qué cambió
- PLAN.md §11.3: se agregó el contrato del multiplicador ANTES de implementar (CLAUDE.md).
- `containers.json`: `levelValueMultPerLevel: 0.05` en los 8 contenedores (constante de datos).
- Engine: `getLevelValueMult(state, container)` en `economy.js` (exportado en `index.js`),
  aplicado en `rollContainerResult`, `offline.js averageItemValue` y
  `averageItemValueForContainer` (este último con jugador neutro es ×1 ⇒ la Suerte recomendada
  de ronda 8 no se mueve; test guard intacto + test nuevo que lo fija a nivel máximo).
- UI: ShopView (Nivel X/10, +Y% valor, n/m escarbados), DigContainerPicker (badge "Nv. X"),
  store.finishManualDig devuelve `levelUp` y UIManager muestra toast. Los level-ups de la
  automatización no notifican (decisión anti-spam).
- AutomationView (fix de UX reportado jugando): el explainer decía que "al comprar una
  automatización nueva se van sumando contenedores a la cola" (solo el Robot Clasificador
  habilita eso) y mostraba "Cola: 0/2 · Nada en curso" sin robot, como si estuviera rota.
  Ahora el texto nombra al Robot y lo que hace (compra el contenedor más caro afordable con
  tu dinero y lo procesa; +riesgo de trampa; Carrito/Cinta/Capacidad agrandan la cola; Drones
  = segundo robot), y el panel de estado sin robot muestra un callout destacado
  (`.automation-callout`) con el paso a seguir en vez de la cola muerta.
- Tests: `ronda9-niveles.test.js` (5, RED primero; el del roll usa el tacho porque tiene una
  sola categoría y el corrimiento de rareza no contamina el ratio) y
  `ronda9-regression.spec.js` (5 e2e: tarjeta, badge, toast, callout sin robot, cola con robot).

### Verificación
`npm test`: 144 verdes · `npm run test:e2e`: 30 verdes · manual en dev y desktop: nivel visible,
toast al subir, automatización explicada y con callout, sin NaN. Sin bump de saveVersion
(containerLevels/Progress ya persistían).
EOF
```

---

## 12. Paso 10 — Revisión final, commit y PR

1. `git status` — modificados/creados SOLO: `PLAN.md`, `apps/game/src/data/containers.json`,
   `packages/engine/src/economy.js`, `packages/engine/src/systems/containers.js`,
   `packages/engine/src/systems/offline.js`, `packages/engine/src/index.js`,
   `packages/engine/tests/ronda9-niveles.test.js`, `apps/game/src/ui/ShopView.js`,
   `apps/game/src/ui/DigContainerPicker.js`, `apps/game/src/ui/AutomationView.js`,
   `apps/game/src/store.js`, `apps/game/src/ui/UIManager.js`, el CSS tocado,
   `apps/game/e2e/ronda9-regression.spec.js`, `DESARROLLO.md`, `agentes/HANDOFF.md`.
   Los .md del usuario siguen untracked.
2. Checklist CLAUDE.md: sin `console.log` nuevos, sin `// TODO`, sin emojis, UI sin economía,
   mobile-first verificado, tokens CSS centralizados.
3. Commit y push con **Bash**:

```bash
git add PLAN.md apps/game/src/data/containers.json packages/engine/src apps/game/src/ui apps/game/src/store.js apps/game/e2e/ronda9-regression.spec.js packages/engine/tests/ronda9-niveles.test.js DESARROLLO.md agentes/HANDOFF.md
git add -u
git status
git commit -m "$(cat <<'EOF'
feat: ronda 9 — valor por nivel de contenedor, nivel visible y automatizacion explicada

multNivel = 1 + (nivel-1) x levelValueMultPerLevel (0.05 en data, tope x1.45)
aplicado en roll real, automatizacion y offline; la Suerte recomendada no
cambia (meta neutra, guard de ronda 8 intacto). UI: nivel+bonus+progreso en
Tienda, badge Nv. en el picker y toast de level-up manual. Fix UX de la
Automatizacion: explainer que nombra al Robot Clasificador (nada se encola a
mano) y callout de cola inactiva sin robot. PLAN.md 11.3 actualizado primero;
5 tests engine nuevos + 5 e2e.
EOF
)"
git push -u origin feat/niveles-ronda9
```

   (antes del commit, revisá el `git status` de ese paso: si aparece algo fuera de la lista
   del punto 1 — p. ej. los .md del usuario — sacalo con `git restore --staged <archivo>`).
4. Pasale al usuario el link que imprime el push
   (`https://github.com/darkhyper93-jpg/Dumpster-Empire/pull/new/feat/niveles-ronda9`).

---

## 13. Criterios de aceptación (resumen)

- [ ] PLAN.md §11.3 define el multiplicador ANTES del código (contrato literal).
- [ ] `getLevelValueMult` en el engine, aplicado en los 3 puntos del pipeline; nivel 10 = ×1.45.
- [ ] La Suerte recomendada sigue exactamente `0/6/16/32/56/86/126/176` (guard ronda 8 verde +
      test nuevo a nivel máximo).
- [ ] `npm test` → 144 verdes · `npm run test:e2e` → 30 verdes.
- [ ] Tienda muestra Nivel X/10, +Y% valor y n/m escarbados; picker muestra "Nv. X"; toast al
      subir de nivel manual; automatización sin toast.
- [ ] Automatización: el explainer nombra al Robot Clasificador y su mecánica real (compra
      contenedores solo con tu dinero); sin robot se ve el callout destacado en vez de
      "Cola: 0/2"; con robot se ve la cola real.
- [ ] Sin bump de saveVersion; save del jugador intacto; sin economía en la UI; sin emojis;
      tokens CSS centralizados.
- [ ] HANDOFF ronda 9 + bullet en DESARROLLO.md §10; commit, push y link de PR reportado.
