# AdjLuck.md — Ronda 8: subir los requerimientos de Suerte de cada contenedor

> **Para el agente ejecutor.** Este plan es autocontenido: NO necesitás contexto previo de las
> rondas anteriores. Seguí los pasos EN ORDEN, copiá el código EXACTAMENTE como está y verificá
> cada salida esperada antes de pasar al paso siguiente. Si una salida no coincide con lo que
> dice el plan, **detenete y reportá la diferencia** — no improvises un arreglo.
>
> Leé primero `CLAUDE.md` (reglas del proyecto). Las dos que mandan acá:
> 1. La economía es un contrato literal: para balancear se ajustan **constantes de datos**
>    (`apps/game/src/data/*.json`), **nunca** las fórmulas del engine.
> 2. TDD: el test que guarda el resultado se escribe **antes** (RED) y la implementación lo
>    pone verde después.

---

## 1. Objetivo y decisión tomada (ya aprobada — no re-preguntar)

La "Suerte recomendada" de cada contenedor (la meta de Suerte que la Tienda muestra al lado de
cada contenedor) quedó **baja**: el jugador la alcanza demasiado rápido y los contenedores caros
se vuelven rentables demasiado pronto. Hay que **subirla**.

**Cómo funciona hoy (no lo cambies):** `getRecommendedLuck(state, container, itemsData, data)`
en `packages/engine/src/economy.js` devuelve la mínima Suerte entera con la que comprar+escarbar
el contenedor tiene valor esperado ≥ 0, calculada contra un **jugador neutro** (meta fija por
contenedor, decisión de la ronda 7). Es un valor **derivado**: depende del costo del contenedor,
de su trampa y de los `valorBase` de su pool de ítems en `apps/game/src/data/items.json`.

**Decisión (opción recomendada, ya elegida):** subir la recomendada **bajando los `valorBase`
del pool de cada contenedor pago** en `items.json` — con menos valor por ítem, hace falta más
Suerte para que el contenedor sea rentable. **No se toca ninguna fórmula, ni `containers.json`,
ni precios, ni trampas.** La calibración la hace un script que usa **el propio engine como
oráculo** (búsqueda binaria del factor de escala hasta que `getRecommendedLuck` devuelve
exactamente el target), así que no hay fórmulas re-derivadas que puedan divergir del engine.

### Targets (nuevos requerimientos de Suerte)

Elegidos **pares** (la Suerte del jugador siempre sube de a 2: upgrade `luck` con `perNivel: 2`),
estrictamente crecientes y < 200 (límite del test de fase 9 existente):

| # | Contenedor (id) | Recomendada HOY | Recomendada NUEVA |
|---|---|---|---|
| 0 | `tachoVereda` (gratis) | 0 | **0 (sin cambio — su pool NO se toca)** |
| 1 | `contenedorBarrio` | 2 | **6** |
| 2 | `containerIndustrial` | 9 | **16** |
| 3 | `depositoAbandonado` | 20 | **32** |
| 4 | `mudanzaMansion` | 35 | **56** |
| 5 | `galeriaLiquidacion` | 56 | **86** |
| 6 | `bovedaPerdida` | 81 | **126** |
| 7 | `containerExtradimensional` | 122 | **176** |

Estos números **ya fueron validados** contra el engine real: la calibración de más abajo produce
exactamente estas recomendadas y la suite unit completa (138 tests) queda verde con los datos
resultantes. Si a vos te da otra cosa, algo hiciste distinto: frená y reportá.

---

## 2. Reglas duras (qué NO hacer)

- **NO** editar `packages/engine/src/**` (ninguna fórmula, ni `getRecommendedLuck`).
- **NO** editar `apps/game/src/data/containers.json`, `upgrades.json`, ni ningún otro data que
  no sea `items.json`.
- **NO** tocar el pool de `tachoVereda` en `items.json` (queda con sus `valorBase: 2.2`).
- **NO** editar `valorBase` a mano: los escribe el script del Paso 4. Si el diff muestra números
  con basura de punto flotante (ej. `1.9000000000000001`), el script está mal copiado — los
  valores correctos son limpios (tabla del Paso 5).
- **NO** committear `ReporteDeEstado.md` ni `AdjLuck.md` (quedan untracked, son del usuario).
- **NO** tocar el save real del jugador (`C:\Users\SANTI\AppData\Roaming\@dumpster\desktop\save.json`
  y la clave `dumpsterEmpireSave` de localStorage). Nada de este plan lo requiere.
- **NO** usar `gh` CLI para crear el PR (no está autenticado y va a fallar): el PR lo crea el
  usuario con el link que imprime `git push` (Paso 9).
- **Cuidado con PowerShell 5.1**: los here-strings `@'...'@` exigen el cierre `'@` SOLO en su
  línea (sin `;` ni nada después) o el comando se rompe silenciosamente. Para el commit
  multilínea y para anexar a `agentes/HANDOFF.md` usá la tool **Bash** con heredoc, como indican
  los pasos 8 y 9 (además preserva el UTF-8 del archivo).

---

## 3. Paso 1 — Rama nueva desde main

```
git switch main
git pull origin main
git switch -c fix/balance-ronda8-suerte
```

Verificá con `git status` que el árbol esté limpio (solo `ReporteDeEstado.md` y `AdjLuck.md`
untracked — dejarlos así).

---

## 4. Paso 2 — Test RED primero (guarda los targets exactos)

Editá `packages/engine/tests/fase9-balance.test.js`. Inmediatamente **después** del bloque
`describe('Ronda 6 — la Suerte recomendada es real (no 0) y crece por tier', ...)` (cierra en la
línea ~73) y **antes** de `describe('PLAN.md §11.2 — la pérdida esperada baja...`, insertá:

```js
// Ronda 8: los requerimientos de Suerte subieron (~×1.5–×3 por tier) recalibrando SOLO los
// valorBase de items.json (fórmulas y containers.json intactos) con el script
// agentes/scripts/calibrate-luck-ronda8.mjs. Este test fija los targets EXACTOS: si un
// rebalanceo futuro de data los mueve, tiene que verse acá a propósito.
describe('Ronda 8 — requerimientos de Suerte por contenedor (targets exactos)', () => {
  it('la Suerte recomendada de los 8 contenedores es exactamente la tabla de la ronda 8', () => {
    const state = freshState();
    const recommended = containers.map((c) => getRecommendedLuck(state, c, items, data));
    expect(recommended).toEqual([0, 6, 16, 32, 56, 86, 126, 176]);
  });
});
```

No hace falta agregar imports: `freshState`, `getRecommendedLuck`, `containers`, `items` y
`data` ya están importados/definidos arriba en ese archivo.

**Corré `npm test` y verificá el RED esperado:** exactamente **1 test falla** (el nuevo), con
un diff tipo `expected [0, 2, 9, 20, 35, 56, 81, 122] to deeply equal [0, 6, 16, 32, 56, 86, 126, 176]`,
y los otros 138 pasan. Si falla cualquier otro test, frená y reportá.

---

## 5. Paso 3 — Crear el script de calibración

Creá el archivo `agentes/scripts/calibrate-luck-ronda8.mjs` con EXACTAMENTE este contenido
(los `console.log` acá son legítimos: es una herramienta de desarrollo en `agentes/scripts/`,
no código del juego — no los borres):

```js
/**
 * Calibración ronda 8: sube la Suerte recomendada de cada contenedor pago a un target más
 * alto escalando SOLO los valorBase de su pool en items.json (fórmulas y containers intactos).
 *
 * Método: el ENGINE es el oráculo. getRecommendedLuck(neutral, c, items, data) es monótona
 * decreciente respecto de un factor de escala f aplicado a los valorBase del pool (el bruto
 * es lineal en valorBase). Se busca por bisección el intervalo de f donde rec == target y se
 * toma su centro geométrico, para que el redondeo a 3 cifras significativas no lo saque del
 * intervalo. Al final se VERIFICA rec == target exacto; si algo no coincide, NO escribe nada
 * y sale con código 1.
 *
 * Uso: node agentes/scripts/calibrate-luck-ronda8.mjs   (desde cualquier cwd)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { freshState } from '../../packages/engine/src/state.js';
import { getRecommendedLuck } from '../../packages/engine/src/economy.js';

const dataUrl = (name) => new URL(`../../apps/game/src/data/${name}`, import.meta.url);
const j = (name) => JSON.parse(readFileSync(dataUrl(name), 'utf8'));
const containers = j('containers.json');
const items = j('items.json');
const data = { upgrades: j('upgrades.json'), automations: j('automations.json'), prestigeTree: j('prestigeTree.json') };

// Targets ronda 8 (pares: la Suerte del jugador sube de a 2 por nivel). tachoVereda queda en 0.
const TARGETS = {
  contenedorBarrio: 6,
  containerIndustrial: 16,
  depositoAbandonado: 32,
  mudanzaMansion: 56,
  galeriaLiquidacion: 86,
  bovedaPerdida: 126,
  containerExtradimensional: 176,
};

const neutral = freshState();

/** rec del contenedor con su pool escalado por f (sin redondear, para la búsqueda). */
function recAtScale(container, f) {
  const scaled = {
    rarities: items.rarities,
    containers: {
      ...items.containers,
      [container.id]: items.containers[container.id].map((it) => ({ ...it, valorBase: it.valorBase * f })),
    },
  };
  return getRecommendedLuck(neutral, container, scaled, data);
}

/** Redondeo a 3 cifras significativas, granularidad mínima 0.1 (legible en UI; el tacho ya usa 2.2). */
function round3sig(x) {
  const exp = Math.floor(Math.log10(x)) - 2;
  // Para x < 100 se redondea vía enteros/décimas (dividir, no multiplicar por 0.1) para que
  // el JSON quede limpio (1.9, no 1.9000000000000001).
  if (exp <= -1) return Math.round(x * 10) / 10;
  const mag = Math.pow(10, exp);
  return Math.round(x / mag) * mag;
}

/** Menor f (bisección) tal que rec(f) <= recWanted. rec es decreciente en f. */
function minScaleFor(container, recWanted) {
  let lo = 1e-4; // rec(lo) altísima (pool casi sin valor)
  let hi = 100; // rec(hi) = 0 (pool carísimo)
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (recAtScale(container, mid) <= recWanted) hi = mid;
    else lo = mid;
  }
  return hi;
}

let ok = true;
for (const container of containers) {
  const target = TARGETS[container.id];
  if (target === undefined) continue;
  const fEnter = minScaleFor(container, target); // desde acá rec == target
  const fExit = minScaleFor(container, target - 1); // desde acá rec < target
  const f = Math.sqrt(fEnter * fExit); // centro geométrico del intervalo rec == target
  for (const item of items.containers[container.id]) {
    item.valorBase = round3sig(item.valorBase * f);
  }
  const rec = getRecommendedLuck(neutral, container, items, data);
  const pass = rec === target;
  if (!pass) ok = false;
  console.log(
    container.id.padEnd(26),
    `target=${String(target).padStart(3)}`,
    `rec=${String(rec).padStart(3)}`,
    `f=${f.toFixed(4)}`,
    pass ? 'OK' : '** NO COINCIDE **'
  );
}

if (!ok) {
  console.error('\nCALIBRACION FALLIDA — NO se escribió items.json');
  process.exit(1);
}
writeFileSync(dataUrl('items.json'), JSON.stringify(items, null, 2) + '\n', 'utf8');
console.log('\nCALIBRACION OK — items.json actualizado');
```

---

## 6. Paso 4 — Correr la calibración y verificar la salida EXACTA

```
node agentes/scripts/calibrate-luck-ronda8.mjs
```

**Salida esperada (tiene que coincidir línea por línea, incluidos los `f=`):**

```
contenedorBarrio           target=  6 rec=  6 f=0.9433 OK
containerIndustrial        target= 16 rec= 16 f=0.9040 OK
depositoAbandonado         target= 32 rec= 32 f=0.8436 OK
mudanzaMansion             target= 56 rec= 56 f=0.7966 OK
galeriaLiquidacion         target= 86 rec= 86 f=0.7215 OK
bovedaPerdida              target=126 rec=126 f=0.6315 OK
containerExtradimensional  target=176 rec=176 f=0.7331 OK

CALIBRACION OK — items.json actualizado
```

Después verificá el diff: `git diff apps/game/src/data/items.json` debe tocar **solo líneas
`"valorBase"`** (49 ítems, todos los pools menos `tachoVereda`; nada de `rarities`, nombres,
íconos ni categorías). Los valores nuevos exactos, por contenedor (en el orden del archivo):

| Contenedor | valorBase viejos → nuevos |
|---|---|
| `contenedorBarrio` | 2→1.9 · 4→3.8 · 2→1.9 · 9→8.5 · 7→6.6 · 9→8.5 · 7→6.6 |
| `containerIndustrial` | 16→14.5 · 12→10.8 · 12→10.8 · 12→10.8 · 18→16.3 · 20→18.1 · 24→21.7 |
| `depositoAbandonado` | 45→38 · 57→48.1 · 41→34.6 · 73→61.6 · 81→68.3 · 49→41.3 · 69→58.2 |
| `mudanzaMansion` | 99→78.9 · 146→116 · 125→99.6 · 199→159 · 165→131 · 185→147 · 146→116 |
| `galeriaLiquidacion` | 380→274 · 196→141 · 282→203 · 601→434 · 710→512 · 437→315 · 380→274 |
| `bovedaPerdida` | 738→466 · 494→312 · 822→519 · 2130→1350 · 1640→1040 · 1310→827 · 2300→1450 |
| `containerExtradimensional` | 1240→909 · 1440→1060 · 1960→1440 · 3920→2870 · 3270→2400 · 3660→2680 · 5230→3830 |

Si algún número difiere, frená y reportá (no "corrijas" a mano).

> Nota: el JSON queda reindentado por `JSON.stringify(items, null, 2)` — la indentación original
> ya es de 2 espacios, así que el diff NO debería mostrar cambios de formato. Si el diff muestra
> el archivo entero reescrito, revisá que no hayas cambiado el `null, 2`.

---

## 7. Paso 5 — Tests en verde

1. **Unit:** `npm test` → **139 passed** (los 138 previos + el test nuevo de la ronda 8, ahora
   GREEN). Ninguno más debe cambiar: los guards existentes (`fase9-balance.test.js` ronda 6:
   recomendada > 0, < 200, creciente; rentable a la recomendada; ritmo temprano del tacho —
   cuyo pool no se tocó) siguen cumpliéndose con los valores nuevos.
2. **E2e:** `npm run test:e2e` → **25 passed** (Playwright levanta el server solo, puerto 5185).
   No hay que tocar ningún spec: `apps/game/e2e/ronda7-regression.spec.js` solo exige
   recomendadas > 0 y crecientes en la Tienda (con 6/16/32 sigue cumpliendo).

Si algo falla, leé el mensaje completo, verificá que los pasos anteriores dieron las salidas
esperadas y reportá — no parches tests para que pasen.

---

## 8. Paso 6 — Verificación manual (jugando, no asumiendo)

`npm run dev` y abrir el juego en el navegador (viewport móvil ~375px y también desktop):

- En la **Tienda**, las tarjetas de contenedor muestran "Suerte recomendada: 6 / 16 / 32 / 56 /
  86 / 126 / 176" (las que estén visibles según progreso; en partida nueva se ven las primeras).
- Escarbar el **tacho** se siente igual que antes (su pool no cambió).
- Escarbar el **barrio** con Suerte 0 debe tender a pérdida y cerca de Suerte 6 empezar a
  convenir (sensación, no medición exacta).
- Ningún costo/valor muestra `NaN`, `Infinity` ni notación científica.

---

## 9. Paso 7 — Documentación

**a) `DESARROLLO.md` §10 "Decisiones registradas":** agregá este bullet al final de la lista
(después del bullet "Ronda 7 — ...", antes del `---` que precede a la sección 11):

```md
- **Ronda 8 — requerimientos de Suerte más altos por contenedor**: las recomendadas pasan de
  0/2/9/20/35/56/81/122 a **0/6/16/32/56/86/126/176** (pares: la Suerte sube de a 2) bajando
  SOLO los `valorBase` de `items.json` (fórmulas, precios y trampas intactos). Calibrado con
  `agentes/scripts/calibrate-luck-ronda8.mjs`, que usa `getRecommendedLuck` del engine como
  oráculo (bisección del factor de escala por pool); targets exactos guardados por test en
  `fase9-balance.test.js`.
```

**b) `agentes/HANDOFF.md`:** anexá al FINAL del archivo un bloque "Ronda 8" usando la tool
**Bash** (preserva UTF-8; no usar `Add-Content` de PowerShell):

```bash
cat >> agentes/HANDOFF.md <<'EOF'

---

## Ronda 8 — requerimientos de Suerte más altos por contenedor (rama `fix/balance-ronda8-suerte`)

Pedido: "hay que aumentar los requerimientos de suerte de cada contenedor". Rebalanceo 100% por
datos (CLAUDE.md: constantes de datos, nunca fórmulas).

### Qué cambió
- `apps/game/src/data/items.json`: bajan los `valorBase` de los pools de los 7 contenedores
  pagos (factores 0.63–0.94 por pool; el tacho gratis no se toca). Recomendadas resultantes:
  **0 / 6 / 16 / 32 / 56 / 86 / 126 / 176** (antes 0/2/9/20/35/56/81/122). Targets pares a
  propósito: la Suerte del jugador siempre sube de a 2 (`perNivel: 2`).
- `agentes/scripts/calibrate-luck-ronda8.mjs` (nuevo): calibrador que usa el engine como
  oráculo — bisección del factor de escala f por pool hasta que `getRecommendedLuck` devuelve
  el target exacto, redondeo a 3 cifras significativas (granularidad mínima 0.1) y verificación
  final; si no coincide, no escribe. Reutilizable para futuros ajustes cambiando `TARGETS`.
- `packages/engine/tests/fase9-balance.test.js`: nuevo describe "Ronda 8" que fija los 8
  targets EXACTOS con `toEqual` (escrito RED primero, GREEN tras calibrar).

### Por qué así
- La recomendada es un valor derivado (EV≥0 con jugador neutro, ronda 7): la única perilla de
  datos que la mueve sin tocar precios/trampas es el valor de los pools.
- Oráculo en vez de fórmula re-derivada: la EV interna de `getRecommendedLuck` (con factor
  `(1 − trapProb)` sobre el bruto e iteración de a 1 punto de Suerte) difiere de la EV
  aproximada de los tests de fase 9; calibrar contra el engine real evita el corrimiento de
  1–5 puntos que daba calcular k a mano.

### Verificación
`npm test`: 139 verdes (1 nuevo) · `npm run test:e2e`: 25 verdes (sin cambios de specs) ·
manual en `npm run dev`: recomendadas nuevas visibles en Tienda, tacho intacto.
EOF
```

**c) `PLAN.md`:** NO hace falta tocarlo — §11.2 define la recomendada conceptualmente y no lista
números por contenedor; ninguna fórmula cambió.

---

## 10. Paso 8 — Revisión final, commit y PR

1. `git status` — deben aparecer modificados/creados SOLO estos 4 archivos:
   `apps/game/src/data/items.json`, `packages/engine/tests/fase9-balance.test.js`,
   `agentes/scripts/calibrate-luck-ronda8.mjs`, `agentes/HANDOFF.md`, `DESARROLLO.md`
   (5 rutas). `ReporteDeEstado.md` y `AdjLuck.md` siguen untracked: **no agregarlos**.
2. Checklist de CLAUDE.md que aplica acá: sin `console.log` en código del juego (el script de
   `agentes/scripts/` está exento por ser tooling), sin `// TODO`, sin emojis, la UI no se tocó,
   las fórmulas no se tocaron.
3. Commit con la tool **Bash** (mensaje multilínea seguro):

```bash
git add apps/game/src/data/items.json packages/engine/tests/fase9-balance.test.js agentes/scripts/calibrate-luck-ronda8.mjs agentes/HANDOFF.md DESARROLLO.md
git commit -m "$(cat <<'EOF'
fix: ronda 8 — requerimientos de Suerte más altos por contenedor

Recomendadas 0/6/16/32/56/86/126/176 (antes 0/2/9/20/35/56/81/122) bajando
solo los valorBase de items.json; calibrado con el engine como oráculo
(agentes/scripts/calibrate-luck-ronda8.mjs) y targets exactos guardados por
test en fase9-balance.test.js. Sin cambios de fórmulas ni de UI.
EOF
)"
git push -u origin fix/balance-ronda8-suerte
```

4. `git push` imprime el link para crear el PR
   (`https://github.com/darkhyper93-jpg/Dumpster-Empire/pull/new/fix/balance-ronda8-suerte`).
   **Pasale ese link al usuario** — él crea y mergea el PR por web (no usar `gh`).

---

## 11. Criterios de aceptación (resumen)

- [ ] `getRecommendedLuck` devuelve exactamente 0/6/16/32/56/86/126/176 (test nuevo GREEN).
- [ ] `git diff` de `items.json` toca solo `valorBase` de los 7 pools pagos (49 ítems).
- [ ] `npm test` → 139 verdes · `npm run test:e2e` → 25 verdes.
- [ ] Tienda muestra las recomendadas nuevas jugando en `npm run dev`.
- [ ] Ninguna fórmula del engine, precio, trampa ni archivo de UI modificado.
- [ ] HANDOFF ronda 8 + bullet en DESARROLLO.md §10; commit y push con el link del PR reportado.
