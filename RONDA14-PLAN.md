# RONDA 14 — QoL, íconos, settings y bases de i18n

> Plan de ejecución minucioso para agentes ejecutores (Sonnet) **sin contexto previo**.
> Formato: 4 agentes secuenciales (A → B → C → D) + 1 agente supervisor (E).
> Cada agente lee su sección completa ANTES de tocar código, sigue el orden literal,
> y no declara terminado hasta cumplir su Definition of Done con los comandos exactos.

---

## 0. Contexto — qué pide esta ronda (7 requisitos del usuario)

| # | Requisito | Agente |
|---|-----------|--------|
| 1 | Aclarar en la UI que cada nivel de **Suerte da +2** (leído de data, jamás hardcodeado) | B |
| 2 | **Acortar los textos largos** (explainer de Automatización y similares): escaneables, conservando lo esencial (ej. "necesitás el Robot Clasificador Básico para usar la cola") | B |
| 3 | El jugador **elige QUÉ contenedor compra/automatiza el robot** (hoy el robot decide solo: siempre el más caro afordable). Debe existir un selector; "Auto" queda como opción, pero la selección manual es el punto del feature | A (engine) + B (UI) |
| 4 | El modal de "¡Hallazgo excepcional!" sale **solo la PRIMERA vez** que se encuentra ESE ítem, y **solo si es de la categoría más rara** del contenedor. El pop/partícula/sonido por objeto revelado queda igual. Los hallazgos del **robot NUNCA celebran**: solo se registran en el Índice | A (engine) + B (UI) |
| 5 | **Íconos**: 10 ítems muestran el pentágono genérico de fallback y el candelabro parece una copa; además muchos comparten forma. Objetivo: **cada ítem se asemeja a su objeto** | C |
| 6 | **Settings**: eliminar la sección "Créditos"; agregar slider de **sensibilidad de escarbado** (mouse/touch) persistido | A (save) + B (UI) |
| 7 | **Bases de i18n** (español + inglés, ningún otro): módulo i18n + migrar TODOS los textos de vistas al diccionario español; el inglés queda con las mismas claves listo para traducir. **Sin selector de idioma visible todavía** | D |

**Lectura obligatoria para TODOS los agentes antes de empezar:**
1. `CLAUDE.md` — reglas duras (engine sin DOM, UI sin fórmulas, JSDoc, sin emojis, sin console.log, mobile-first, tokens CSS).
2. `.claude/napkin.md` — lecciones de bugs reales de este proyecto. Las trampas relevantes están repetidas inline en cada agente, pero leelo entero.
3. Este documento completo (no solo tu sección: las decisiones D1–D7 aplican a todos).

**Comandos base del repo** (correr desde la raíz `C:\Users\SANTI\Desktop\dumpire`):
```
npm test              # Vitest (engine + apps), corre en Node sin DOM
npm run test:e2e      # Playwright
npm run web           # sirve apps/game estático (ver skill "verify" si existe duda)
npm run desktop       # Electron
```

---

## 1. Decisiones de diseño registradas (D1–D7)

Estas decisiones ya están tomadas. **No se re-discuten durante la ejecución.** El Agente A las copia a la sección "decisiones registradas" de `DESARROLLO.md`.

- **D1 — Un solo bump `SAVE_VERSION` 4→5 con TRES campos nuevos**: `autoTargetContainerId: string|null` (default `null` = modo Auto), `digSensitivity: number` (rango 0.5–1.5, default 1) y `language: 'es'|'en'` (default `'es'`). El `language` entra ya aunque no haya selector: evita un v6 en la ronda futura de traducción. Los tres viajan en el save (y Steam Cloud), igual que `soundOn`/`volume`.
- **D2 — Orden estricto A → B → C → D.** i18n va ÚLTIMO porque A y B agregan/acortan strings: así la extracción al diccionario captura el copy FINAL una sola vez.
- **D3 — Los hallazgos del robot NUNCA disparan el modal de celebración.** El robot corre desatendido (apilaría modales); sus hallazgos solo incrementan `itemsFoundByItem` y aparecen en el Índice (CollectionView), como ya ocurre. Precedente en el código: los level-ups de contenedor por automatización son silenciosos (`apps/game/src/store.js:186`). Consecuencia asumida: si el robot encuentra primero un ítem raro, ese ítem ya no celebra nunca — el modal es exclusivo del hallazgo manual.
- **D4 — El target del robot se lee del state DENTRO de `bestAffordableUnlockedContainer` (la firma NO cambia).** Motivo: `packages/engine/src/systems/offline.js` llama a la misma función para estimar la tasa offline; leyendo del state, la estimación offline respeta el target sin tocar nada más.
- **D5 — Semántica del target fijo: si no alcanza el dinero, el robot ESPERA/AHORRA.** Sin fallback silencioso a otro contenedor. La UI muestra cuánto falta.
- **D6 — `doPrestige` resetea `autoTargetContainerId` a `null`.** El prestigio ya resetea `automationOwned`, `ownedContainers`, `autoQueue` y `autoProcessing` (`packages/engine/src/systems/prestige.js` ~líneas 83-87); un target apuntando a un contenedor re-bloqueado dejaría al robot idle sin explicación.
- **D7 — `isJackpot` se renombra a `isFirstRareFind` y cambia su definición.** Antes: categoría más rara + varianza ≥ 1.10 (`JACKPOT_VARIANCE_MIN`), cada vez. Ahora: categoría más rara + primera vez que se encuentra ESE ítem. La constante de varianza se elimina. El flag se calcula en `rollContainerResult`, que corre ANTES de que `applyContainerResult` incremente los contadores.

---

## 2. AGENTE A — Engine + Save v5

### Identidad
Trabajás SOLO en `packages/engine`. Cero DOM (`document`/`window` prohibidos ahí). Todo lo que cruce frontera lleva JSDoc con `@param`/`@returns`. Las fórmulas existentes no se tocan.

### Tarea A1 — Estado y versión de save

**`packages/engine/src/state.js`:**
- Subir `SAVE_VERSION` de 4 a 5, con comentario:
  ```js
  // AJUSTE (ronda 14): v5 agrega autoTargetContainerId (selector del robot),
  // digSensitivity (slider de sensibilidad) y language (base de i18n es/en).
  ```
- En `freshState()` agregar:
  ```js
  autoTargetContainerId: null,
  digSensitivity: 1,
  language: 'es',
  ```
- En el `@typedef GameState` agregar las tres propiedades:
  ```js
  * @property {string|null} autoTargetContainerId - contenedor fijo que compra el robot; null = Auto (el más caro afordable)
  * @property {number} digSensitivity - multiplicador del pincel de escarbado, rango 0.5–1.5
  * @property {string} language - idioma de la UI: 'es' | 'en'
  ```

### Tarea A2 — Migración y validación del save

**`packages/engine/src/save.js`** (mirar cómo se hizo v3→v4 con `volume`, ~líneas 176-181, y calcar el patrón):

1. En `migrate()`, bloque nuevo:
   ```js
   if (migrated.saveVersion < 5) {
     migrated.autoTargetContainerId = null;
     migrated.digSensitivity = 1;
     migrated.language = 'es';
     migrated.saveVersion = 5;
   }
   ```
2. En `REQUIRED_FIELDS` agregar `digSensitivity: 'number'` y `language: 'string'`.
   **NO agregar `autoTargetContainerId` acá**: `typeof null === 'object'` y el campo es unión `string|null` — su chequeo va en `validateDeepContent()`.
3. En `validateDeepContent()` (lección del napkin: el `typeof` de arriba NO alcanza, hay que validar contenido):
   - `autoTargetContainerId`: debe ser `null` o `string`; cualquier otra cosa → rechazo con mensaje claro.
   - `digSensitivity`: `Number.isFinite()` y dentro de 0.5–1.5 → si no, rechazo. (`typeof 'number'` deja pasar `NaN`.)
   - `language`: contra allow-list. Exportar la constante para que i18n la reuse después:
     ```js
     export const SUPPORTED_LANGUAGES = ['es', 'en'];
     ```
   - Ya que estás: agregar `Number.isFinite` también a `volume` (hoy `NaN` pasa). Es una línea y cierra la misma clase de bug.
4. En `sanitizeContainerRefs()` (o donde se sanitiza `autoQueue` contra `validContainerIds`): si `autoTargetContainerId` no es `null` y NO está en los ids válidos → ponerlo en `null` (save aceptado, target descartado). Mismo tratamiento que un id huérfano en `autoQueue`. Esto también es defensa contra saves manipulados: un string arbitrario jamás sobrevive hasta la UI.

### Tarea A3 — Selector de target en automatización

**`packages/engine/src/systems/automation.js`:**

1. Modificar `bestAffordableUnlockedContainer(state, allContainers, data)` (~líneas 35-47). Al inicio:
   ```js
   if (state.autoTargetContainerId) {
     const target = allContainers.find((c) => c.id === state.autoTargetContainerId);
     if (!target) return null;
     if (!isContainerUnlocked(state, target, allContainers)) return null;
     if (getContainerCost(state, target) > state.money) return null; // D5: espera/ahorra
     return target;
   }
   // ... comportamiento actual (Auto: el más caro desbloqueado y afordable)
   ```
   (Usar los nombres/firmas REALES de los helpers que ya usa esa función — verificalos en el archivo antes de escribir; no inventes firmas.)
2. Función nueva, exportada:
   ```js
   /**
    * Fija (o limpia) el contenedor objetivo del robot.
    * @param {GameState} state
    * @param {string|null} containerId - null vuelve al modo Auto
    * @param {Array<Object>} allContainers - data de containers.json (allow-list)
    * @returns {{ ok: true } | { ok: false, error: string }}
    */
   export function setAutoTarget(state, containerId, allContainers)
   ```
   - `containerId === null` → setea `null`, `{ ok: true }`.
   - String que existe en `allContainers` → setea, `{ ok: true }`.
   - Cualquier otra cosa → `{ ok: false, error: '...' }` SIN mutar el estado.
3. `automationTick` NO se toca (ya consume `bestAffordableUnlockedContainer`).
4. Exportar `setAutoTarget` desde `packages/engine/src/index.js` junto al resto del sistema de automatización.

**`packages/engine/src/systems/prestige.js`:** en `doPrestige`, junto al reset de automatización existente, agregar `state.autoTargetContainerId = null;` (D6).

### Tarea A4 — Primer hallazgo raro (reemplaza al jackpot)

**`packages/engine/src/systems/containers.js`:**

1. Eliminar la constante `JACKPOT_VARIANCE_MIN` (~línea 23) y toda referencia.
2. En `rollContainerResult`, donde hoy se calcula `isJackpot` (~líneas 112-115), reemplazar por:
   ```js
   const rarest = container.categorias[container.categorias.length - 1];
   const alreadyFound =
     Boolean(state.itemsFoundByItem?.[container.id]?.[pick.name]) ||
     seenInThisRoll.has(pick.name);
   const isFirstRareFind = categoria === rarest && !alreadyFound;
   seenInThisRoll.add(pick.name);
   ```
   con `const seenInThisRoll = new Set();` declarado ANTES del loop de slots. Motivo del Set: un contenedor multi-slot puede sacar el mismo ítem dos veces en el MISMO roll — solo la primera lleva el flag. El chequeo funciona porque `rollContainerResult` corre antes de que `applyContainerResult` incremente `itemsFoundByItem`.
3. Renombrar el campo `isJackpot` → `isFirstRareFind` en el objeto del resultado y en el `@typedef` del `DigResult`. Buscá TODAS las referencias: `grep -rn "isJackpot" packages apps` — las del engine las arreglás vos; las de `apps/` (UIManager, CelebrationModal, e2e) quedan documentadas en tu handoff para el Agente B (no las toques vos: frontera de agentes).

### Tarea A5 — Tests (Vitest, en `packages/engine/tests/`)

Mirá `automation.test.js` y `ronda12-jackpot.test.js` para el estilo: importan `freshState`, cargan los JSON reales de `apps/game/src/data/`, e inyectan RNG determinista.

1. **`ronda14-automatizacion.test.js`** (nuevo):
   - Target fijo afordable y desbloqueado → `bestAffordableUnlockedContainer` lo devuelve aunque exista otro más caro también afordable.
   - Target fijo NO afordable → devuelve `null`, y tras `automationTick` el dinero está intacto y la cola vacía (el robot ahorra, D5).
   - Target `null` → devuelve el más caro afordable (regresión del modo Auto).
   - Target bloqueado → `null`.
   - `setAutoTarget(state, 'idInventado', containers)` → `{ ok: false }` y el estado NO mutó; con `null` y con un id válido → `{ ok: true }`.
   - `doPrestige` deja `autoTargetContainerId` en `null`.
2. **`ronda14-primerhallazgo.test.js`** (nuevo):
   - Primer roll de un ítem de la categoría más rara **con varianza media (random que dé varianza ~1.0)** → `isFirstRareFind: true`. (Prueba que la condición de varianza murió.)
   - Tras `applyContainerResult`, un segundo roll del mismo ítem → `false`.
   - Ítem de categoría común → `false` siempre.
   - Roll multi-slot que saca el mismo ítem raro dos veces → exactamente UN `true`.
3. **`ronda12-jackpot.test.js`**: su contrato ya no existe. Reescribilo como regresión del nuevo comportamiento (o borralo si el punto 2 ya cubre todo), pero **conservá el comentario-lección sobre el orden de las llamadas a `random()`** migrándolo al test nuevo — documenta el orden real de consumo del RNG y evita horas de debugging.
4. **`save.test.js`** (ampliar):
   - Un save v4 real migra a v5 con `autoTargetContainerId: null`, `digSensitivity: 1`, `language: 'es'`.
   - Rechazos: `autoTargetContainerId: 123` · `digSensitivity: NaN` · `digSensitivity: 99` · `language: '<img src=x>'`.
   - Target huérfano (id que no existe en containers) → save aceptado con target saneado a `null`.
   - Export → import ida y vuelta sin pérdida de los tres campos.

### Lo que NO debés hacer (Agente A)
- No tocar NADA de `apps/game` (ni siquiera los usos de `isJackpot` — eso es del Agente B).
- No cambiar firmas de funciones existentes del engine (D4 existe justamente para eso).
- No tocar fórmulas de economía.

### Definition of Done (Agente A)
```
□ npm test                                                  → verde
□ grep -rn "JACKPOT_VARIANCE_MIN" packages apps             → vacío
□ grep -rn "isJackpot" packages                             → vacío (en apps queda, documentado para B)
□ grep -rn "document\.\|window\." packages/engine/src       → vacío
□ grep -rn "console.log\|// TODO" packages/engine/src       → vacío
□ D1–D7 copiadas a la sección de decisiones de DESARROLLO.md
□ Handoff escrito en agentes/HANDOFF.md (sección "Ronda 14 — Agente A"):
  qué tocaste + lista exacta de referencias a isJackpot que quedan en apps/ para B
```

---

## 3. AGENTE B — UI: selector del robot, textos cortos, +2 Suerte, settings

### Identidad
Trabajás en `apps/game`. La UI lee estado y despacha acciones al store; JAMÁS recalcula economía ni muta estado directo. Requiere que el Agente A esté mergeado (usás `setAutoTarget` y `isFirstRareFind` del engine).

### Trampas conocidas de este proyecto (leer 2 veces)
1. **XSS**: cualquier valor derivado de `state` interpolado en `innerHTML` → números con `Number(x) || 0` (NUNCA `x || 0`), strings/ids SIEMPRE resueltos contra la data estática (`allContainers.find(...)`) y mostrando `.name`; el id crudo solo va en atributos `value=`/`data-*`.
2. **Ids crudos**: el jugador nunca ve un id de data (`tachoVereda`); siempre el campo `name`.
3. **Bind-once**: las vistas de `#tab-content` comparten host. Toda marca de binding lleva nombre de vista (`boundChangeAutomation`), jamás una genérica (`boundChange`).
4. **Re-render por tick**: `automationTick` notifica cada tick y `UIManager.renderTabContent` re-renderiza. Hoy protege `TEXTAREA`/`INPUT` enfocados pero NO `SELECT` → sin el fix de B3, el dropdown del selector se cierra solo cada segundo.

### Tarea B1 — Acciones en el store

**`apps/game/src/store.js`** (calcar el patrón de `setVolume`, ~líneas 275-279):
```js
setAutoTarget(containerId) {
  const normalized = containerId === 'auto' || containerId === '' ? null : containerId;
  const result = engineSetAutoTarget(state, normalized, allContainers);
  if (result.ok) { persist(); notify(); }
  return result;
},
setDigSensitivity(value) {
  const v = Math.min(1.5, Math.max(0.5, Number(value) || 1));
  state.digSensitivity = v;   // si el proyecto exige mutación vía engine incluso para settings,
                              // seguí el patrón EXACTO que hoy usa setVolume — copialo tal cual
  persist(); notify();
},
```
Importar `setAutoTarget` del engine con alias (`engineSetAutoTarget`), como ya se hace con `buyAutomation`.

### Tarea B2 — AutomationView: selector + copy corto

**`apps/game/src/ui/AutomationView.js`:**

1. **Selector de target**, dentro del bloque de estado de la cola (visible solo cuando `autoDigActive`):
   ```html
   <label class="automation-target">Objetivo del robot
     <select data-action="set-auto-target">
       <option value="auto">Auto (el más caro que puedas pagar)</option>
       <!-- una <option> por contenedor DESBLOQUEADO: value = c.id, texto = c.name -->
     </select>
   </label>
   ```
   - Solo contenedores desbloqueados (usar el helper de desbloqueo del engine que ya importa el store/las vistas — verificar el nombre real; no reimplementar la regla).
   - `selected` según `state.autoTargetContainerId`. Antes de marcar `selected`, validar que el id del state exista en la data (allow-list); si no existe, tratarlo como `auto`.
2. **Listener nuevo de `change`** con marca propia:
   ```js
   if (!container.dataset.boundChangeAutomation) {
     container.dataset.boundChangeAutomation = 'true';
     container.addEventListener('change', (e) => {
       const sel = e.target.closest('[data-action="set-auto-target"]');
       if (sel) store.actions.setAutoTarget(sel.value);
     });
   }
   ```
3. **Estado "esperando"** (estados de UI obligatorios): si hay target fijo y `getContainerCost(target) > state.money`, mostrar bajo el selector:
   `El robot espera juntar ${formatMoney(costo - dinero)} para ${target.name}.`
   (El costo sale del engine — `getContainerCost` — no se recalcula en la UI.)
4. **Copy corto** — reemplazar el explainer largo (~líneas 80-99) por texto escaneable:
   - Explainer (2 frases máx.):
     `El robot compra contenedores con tu dinero, los encola y los procesa (más riesgo de trampa que a mano). Elegí abajo cuál compra, o dejá "Auto". Las demás máquinas agrandan la cola o suman robots.`
   - Callout cuando la cola está inactiva:
     `Necesitás el <strong>Robot Clasificador Básico</strong> para usar la cola.`
   - Hint de botones grises:
     `Botón gris = todavía no te alcanza; el tooltip dice cuánto falta.`

### Tarea B3 — UIManager: guard de SELECT, primer hallazgo, sensibilidad

**`apps/game/src/ui/UIManager.js`:**
1. En `renderTabContent` (~línea 237), donde se protege el elemento activo del re-render, agregar `SELECT`:
   ```js
   active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.tagName === 'SELECT'
   ```
2. En `handleDigComplete` (~líneas 122-126): cambiar el filtro de `isJackpot` a `isFirstRareFind`. La celebración SOLO se dispara acá (flujo manual). En el flujo de automatización no hay ningún hook de celebración — verificá que no exista otro caller: `grep -rn "CelebrationModal.push" apps/game/src`.
3. En `render(state)`: propagar la sensibilidad al canvas — `this.digCanvas.setSensitivity(state.digSensitivity)` (patrón espejo de cómo se propaga el volumen al audio).

**`apps/game/src/ui/CelebrationModal.js`:** renombrar el `type` `'jackpot'` → `'firstFind'` y el título a `¡Hallazgo nuevo!` (más honesto con la nueva semántica). Actualizar el typedef/JSDoc.

### Tarea B4 — QuickUpgrades: efecto por nivel visible

**`apps/game/src/ui/QuickUpgrades.js`:**
```js
/**
 * Texto del efecto por nivel de un upgrade repetible, leído de data.
 * @param {{mode:string, perNivel:number, label:string}} upgrade
 * @returns {string} ej. "+2 Suerte por nivel"
 */
function upgradeEffectLabel(upgrade) {
  if (upgrade.mode === 'flat') return `+${upgrade.perNivel} ${upgrade.label} por nivel`;
  return `+${Math.round(upgrade.perNivel * 100)}% por nivel`;  // verificar el nombre real del mode multiplicador en upgrades.json
}
```
- El "2" sale de `perNivel` de `upgrades.json`. **Cero números hardcodeados.**
- Mostrarlo como línea chica dentro de cada botón (`<span class="quick-upgrade-effect">`), para los 3 quick upgrades (Suerte, Fuerza, Área). Clase nueva en `apps/game/src/styles/components.css` usando SOLO tokens existentes.
- Aplicar el mismo helper al botón "Ampliar Capacidad" de `AutomationView.js` (importándolo o duplicando el span con el mismo patrón — preferí exportar el helper a un módulo chico `ui/upgradeEffect.js` si lo usan dos vistas).
- Ojo tipografía (lección napkin): texto chico con weight ≤ 500 o font-size ≥ 15.2px.

### Tarea B5 — Settings: sin Créditos, con sensibilidad

**`apps/game/src/ui/SettingsView.js`:**
1. Eliminar la sección Créditos completa (`<section class="settings-block settings-credits">`, ~líneas 59-65). Actualizar también:
   - el docstring del propio archivo si la menciona,
   - el comentario de `apps/game/index.html` (~líneas 22-28) que dice "se acredita igual en Ajustes > Créditos" — quedaría mintiendo. Mover la atribución de la tipografía a ese mismo comentario del HTML (la licencia SIL OFL exige atribución: no la borres del repo, solo de la UI).
2. Slider de sensibilidad, CALCADO del slider de volumen (~líneas 49-53 y su handler `input` en 35-41):
   ```html
   <label data-sensitivity-label>Sensibilidad de escarbado: 100%</label>
   <input type="range" min="50" max="150" step="5" value="${Math.round((Number(state.digSensitivity) || 1) * 100)}" data-action="set-sensitivity">
   ```
   En el handler `input` existente, rama nueva: actualizar el label en vivo y despachar `store.actions.setDigSensitivity(Number(value) / 100)`.

**`apps/game/src/dig/DigCanvas.js`:**
1. Campo `this.sensitivity = 1;` en el constructor + método `setSensitivity(value)` con clamp defensivo 0.5–1.5.
2. En `eraseRadius()` (~líneas 436-439): multiplicar por `this.sensitivity`:
   ```js
   const radius = BASE_ERASE_RADIUS * Math.sqrt(this.areaMult) * this.digRate * this.sensitivity;
   return Math.min(radius, OBJECT_RADIUS * ERASE_RADIUS_MAX_VS_OBJECT);
   ```
   El cap queda intacto. Comentario obligatorio: `// DECISIÓN: con Área alta, sensibilidad >100% puede saturar el cap — intencional, el cap es el guard de diseño.`

### Tarea B6 — e2e

- Buscar specs que asserten el jackpot viejo o el copy largo: `grep -rln "jackpot\|excepcional\|encola nada a mano" apps/game/e2e tests e2e` (ajustar a la carpeta real de specs). Actualizarlos a la nueva semántica. **Ojo**: si un spec sembraba `itemsFoundByItem` para forzar estado, ese seed ahora SUPRIME el modal — re-sembrar con el ítem NO encontrado.
- Spec nuevo `ronda14-regression.spec.js`:
  1. Comprar robot → elegir un target fijo → verificar que la cola solo encola ese contenedor.
  2. Mover sensibilidad a 50% → recargar → sigue en 50%.
  3. Forzar un primer hallazgo raro → modal visible → cerrarlo → repetir el hallazgo → NO hay modal.
- Regla napkin: toda assertion de toast/modal usa `.filter({ hasText: ... })`, nunca el selector pelado (strict-mode en CI).

### Definition of Done (Agente B)
```
□ npm test && npm run test:e2e                              → verdes
□ grep -rn "isJackpot" apps packages                        → vacío
□ grep -n "SELECT" apps/game/src/ui/UIManager.js            → guard presente
□ grep -rn "boundChange\b\|boundClick\b" apps/game/src/ui   → sin marcas genéricas nuevas (todas con sufijo de vista)
□ grep -rn "Créditos" apps/game/src                         → vacío
□ Verificación manual (npm run web o skill verify):
    · comprar robot → elegir target → el robot compra SOLO ese; con "Auto" vuelve al más caro
    · target caro sin dinero → se ve "El robot espera juntar $X para …"
    · abrir el dropdown con la automatización corriendo → NO se cierra solo
    · sensibilidad 50% y 150% → el pincel se siente distinto; persiste tras recargar
    · "+2 Suerte por nivel" visible en el botón de Suerte (y equivalentes en Fuerza/Área/Capacidad)
    · Ajustes sin sección Créditos; estados de carga/vacío/error intactos
□ Handoff en agentes/HANDOFF.md ("Ronda 14 — Agente B")
```

---

## 4. AGENTE C — Íconos: cada ítem se asemeja a su objeto

### Identidad
Trabajás casi exclusivamente en `apps/game/src/icons/icons.js` + un test nuevo. No tocás data, engine ni vistas.

### Contexto técnico
- `icons.js` tiene `SHAPES` (formas SVG inline, viewBox `0 0 24 24`, line-art: `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`, caps redondeados) y `ICON_MAP` (key de item → shapeId).
- Fallback (~línea 257): `ICON_MAP[key] || 'artifact'` — `artifact` es **el pentágono** que reportó el usuario.
- `getIconImage` rasteriza el SVG a data-URL para el canvas de escarbado: **el `xmlns` en el markup es vital** (sin él, la imagen falla en silencio con `naturalWidth 0`). `iconMarkup` ya lo emite — no lo rompas.

### Tarea C1 — Fase A: los 10 en fallback + candelabro

Crear 11 formas nuevas en `SHAPES` y mapearlas en `ICON_MAP`:

| key en items.json | Ítem | Forma a dibujar |
|---|---|---|
| `cigarette-butt` | Colilla de cigarrillo | cilindro corto inclinado + filtro marcado + hilo de humo |
| `chip-bag` | Bolsa de papas vacía | bolsa arrugada con sellos dentados arriba/abajo |
| `cork-bottle` | Corcho de botella | cilindro con leve conicidad + líneas de textura |
| `napkin-used` | Servilleta usada | cuadrado doblado en diagonal con pliegue |
| `fan-old` | Ventilador viejo | círculo de rejilla + 3 aspas + pie |
| `floppy-disk` | Disquete raro | cuadrado con muesca, shutter rectangular y etiqueta |
| `ivory-figurine` | Estatuilla de marfil | silueta de figurilla sobre pedestal |
| `regiment-flag` | Bandera de regimiento | mástil + bandera ondeada con emblema |
| `ritual-mask` | Máscara ritual | máscara oval con ojos huecos y marcas |
| `legendary-sword` | Espada legendaria | hoja + guarda cruzada + pomo, punta arriba |
| `candelabrum` | Candelabro | base + 3 brazos con velas y llamas (hoy mapea a `lamp` y parece una copa — crear forma propia y re-mapear) |

### Tarea C2 — Fase B: desambiguar formas compartidas

Inventario de repetidos (verificar con un grep de valores de `ICON_MAP` antes de empezar — el mapa es la fuente de verdad, no esta tabla):
- `document` ×9: diario viejo, libro antiguo, mapa antiguo, foto histórica, grabado original, boceto de maestro, pergamino arcano, manifiesto de carga, bitácora… → formas propias: `newspaper` (pliegue + columnas), `book` (lomo + tapa), `foldedMap` (paneles + ruta punteada), `photoFrame`, `engravingPlate`, `sketch` (hoja + trazo suelto), `scroll` (rollos en ambas puntas), etc.
- `chip` ×5 (motherboard, fusion-core, quantum-chip, plasma-cell, olympus-circuit) → `motherboard` (placa + pistas), `fusionCore` (núcleo radiante), `plasmaCell` (pila + rayo), etc.
- `vase` ×4 (porcelain-vase, vase-decorative, idol-jade, grail-replica) → `idol`, `grail` propios.
- `crystal` ×4, `painting` ×3 (`tapestry` con flecos), `amulet` ×3, `statue` ×3, `coin` ×3 (`ring` para captain-ring si existe), `watch` ×2, `lamp` ×2.

**Regla de cierre**: el objetivo es "cada ítem se asemeja a su objeto", no "cero repetición". Si una forma representa BIEN a dos ítems (ej. dos monedas distintas), el reuso es válido pero se documenta:
```js
// DECISIÓN: coin sirve para X e Y porque ambos son monedas; se diferencian por color de rareza.
```

**Convención obligatoria para toda forma nueva**: viewBox 24×24 implícito, solo elementos internos (`<path>`, `<circle>`, `<rect>`, `<line>`, `<polyline>`), sin atributo `fill` (hereda `fill="none"`), trazos legibles a 16px (el tamaño mínimo usado en la UI), sin detalle microscópico.

### Tarea C3 — Test anti-regresión

**`apps/game/tests/icons.test.js`** (nuevo; `vitest.config.js` ya incluye `apps/*/tests`):
1. Todo `icon` de todos los pools de `items.json` (`Object.values(items.containers).flat()`) cumple `hasIcon(icon)` → **el pentágono fallback queda detectable para siempre**.
2. Ídem para los campos `icon` de `containers.json`, `automations.json`, `upgrades.json`, `prestigeTree.json` y `achievements.json` (los que tengan `icon`).
3. Todo valor de `ICON_MAP` existe como clave de `SHAPES` (exportar ambos desde `icons.js` con comentario `// exportados para tests`).
4. `iconMarkup('coin')` contiene `xmlns="http://www.w3.org/2000/svg"` (regresión de la lección del data-URL).

### Definition of Done (Agente C)
```
□ npm test                                                   → verde (incluye icons.test.js)
□ El test 1 falla si se agrega un ítem sin ícono (probalo rompiéndolo a propósito y volviéndolo a arreglar)
□ grep -n 'fill="' apps/game/src/icons/icons.js              → solo los fill="none"/existentes, ninguno nuevo con color
□ Verificación manual (npm run web):
    · Índice (INDEX): los 11 de Fase A + los desambiguados de Fase B se ven y se distinguen
    · Canvas de escarbado: los ítems nuevos se rasterizan (ningún objeto invisible — sería naturalWidth 0)
    · Cada ícono es reconocible a tamaño 16px
□ Cero emojis, cero console.log
□ Handoff en agentes/HANDOFF.md ("Ronda 14 — Agente C") con la lista de formas nuevas y los reusos decididos
```

---

## 5. AGENTE D — Bases de i18n (español + inglés)

### Identidad
Creás el módulo i18n y migrás TODOS los textos de las vistas al diccionario español. **El texto renderizado NO debe cambiar ni en una letra** — si los e2e pasan sin tocarlos, la migración fue correcta. Sin selector de idioma visible (ronda futura). Requiere A y B mergeados (el campo `language` existe y el copy ya es el final).

### Restricción dura
El juego es buildless (ES modules + import maps). El módulo se importa por **ruta relativa** (`../i18n/i18n.js`). **PROHIBIDO tocar el bloque `<script type="importmap">` o la CSP de `index.html`** — la CSP usa hash y el juego dejaría de cargar.

### Tarea D1 — Módulo `apps/game/src/i18n/`

1. **`i18n.js`**:
   ```js
   import { SUPPORTED_LANGUAGES } from '@dumpire/engine' /* o la ruta real del export del Agente A */;
   let current = 'es';
   /** @param {string} lang - se ignora si no está en SUPPORTED_LANGUAGES */
   export function setLanguage(lang) { ... }
   export function getLanguage() { ... }
   /**
    * @param {string} key - clave del diccionario, ej. 'automation.explainer'
    * @param {Object<string,string|number>} [params] - interpola {name} → params.name
    * @returns {string} el texto; si la clave no existe, devuelve la clave (detectable en tests/e2e)
    */
   export function t(key, params) { ... }
   ```
   (Verificar cómo exporta el engine sus símbolos hacia apps/game — usar el mismo mecanismo de import que ya usan las vistas para importar del engine. Si `SUPPORTED_LANGUAGES` no es importable limpiamente, duplicarla con un comentario que apunte a `save.js` como fuente.)
2. **`es.js`**: `export default { ... }` — mapa plano, claves con namespace por vista: `'tabs.escarbar'`, `'settings.volume': 'Volumen: {pct}%'`, `'automation.explainer': '...'`, etc.
3. **`en.js`**: MISMAS claves, valores **copiados del español** (la traducción real es otra ronda; así no hay agujeros y la paridad es testeable).

### Tarea D2 — Migración de textos

Migrar todo string visible al jugador desde estas fuentes a `t('...')`:
- Vistas: `Topbar.js`, `QuickUpgrades.js`, `DigContainerPicker.js`, `ShopView.js`, `AutomationView.js`, `AchievementsView.js`, `PrestigeView.js`, `CollectionView.js`, `SettingsView.js`, `Tutorial.js`, `OfflineModal.js`, `CelebrationModal.js`, `TitleScreen.js`.
- `UIManager.js` (toasts de level-up, mensajes de error de vista) y `main.js` (mensajes de boot/error).
- `DigCanvas.js` (`Arrastrá para escarbar`).
- `index.html`: los labels de tabs y botones (`Abandonar`, etc.) pasan a inyectarse con `t('tabs.*')`. **Ojo**: `UIManager.injectTabIcons` lee `btn.textContent` como label — cambiarlo a `t('tabs.' + btn.dataset.tab)`. El texto estático pre-JS del boot puede quedar en español como fallback.
- **NO migrar** los `name`/`desc` de `data/*.json` (ver D4 abajo).
- **Trampa XSS**: `t()` NO sanitiza. Los `params` que vengan del state siguen las reglas de siempre: números con `Number(x) || 0`, strings resueltos contra data ANTES de pasarlos. Documentarlo en el JSDoc de `t()`.

### Tarea D3 — Boot

**`apps/game/src/main.js`**: después de crear el store, `setLanguage(store.getState().language)` (el campo existe desde el Agente A; el selector visible llegará en otra ronda).

### Tarea D4 — Estrategia para la data JSON (solo documentar, NO implementar)

Registrar en `DESARROLLO.md` (decisiones): los `name`/`desc` de `apps/game/src/data/*.json` quedan como fuente de verdad en español. La ronda futura de traducción agregará overlays `apps/game/src/i18n/data.en.js` con mapas `id → { name, desc }` que `main.js` aplicará sobre la data cargada cuando `language !== 'es'`. La data cruda no se bifurca, los ids no cambian, el engine jamás ve texto de UI.

### Tarea D5 — Test

**`apps/game/tests/i18n.test.js`**:
1. `es` y `en` tienen EXACTAMENTE el mismo conjunto de claves (diff en ambos sentidos).
2. `t('settings.volume', { pct: 80 })` interpola.
3. Clave inexistente → devuelve la clave.
4. `setLanguage('hack')` no cambia el idioma actual.

### Definition of Done (Agente D)
```
□ npm test && npm run test:e2e                               → verdes SIN modificar ningún spec
  (es LA prueba de que el copy renderizado no cambió — si un e2e falla, la migración alteró un texto: arreglá el diccionario, no el spec)
□ git diff apps/game/index.html                              → NO toca importmap ni CSP
□ grep -rn "[áéíóúñ¡¿]" apps/game/src/ui/*.js apps/game/src/main.js
  → solo comentarios/JSDoc; ningún template literal con copy suelto
□ Paridad de claves es/en cubierta por test
□ Estrategia de data JSON registrada en DESARROLLO.md
□ Handoff en agentes/HANDOFF.md ("Ronda 14 — Agente D")
```

---

## 6. AGENTE E — Supervisor final (no construye)

Estilo `agentes/agente11-prompt.md`: verificás intención, no solo existencia de código. Sos escéptico: en este proyecto hubo fases "hechas" que no lo estaban.

### Checklist
```
□ git status limpio, todo commiteado, sin ramas colgando
□ npm test && npm run test:e2e                               → verdes
□ Barridos ≈ 0:
    grep -rn "console.log" apps/game/src packages/engine/src
    grep -rn "// TODO" apps/game/src packages/engine/src
    grep -rn "isJackpot\|JACKPOT" apps packages
    grep -rn "Créditos" apps/game/src
    emojis como íconos, hex sueltos fuera de tokens.css, document/window en packages/engine
    sinks state→innerHTML sin Number()/allow-list en el código NUEVO de la ronda
□ Intención, requisito por requisito (jugando de verdad, npm run web):
    1. Botón de Suerte muestra "+2 Suerte por nivel" (y viene de data: cambiar perNivel a 3 en
       upgrades.json y ver que la UI diga +3; revertir)
    2. Textos de Automatización escaneables en <5 segundos; lo esencial está (robot básico → cola)
    3. Selector de target: elegir uno fijo → el robot compra SOLO ese; sin dinero → espera con
       mensaje de cuánto falta; "Auto" → el más caro; prestigio → vuelve a Auto
    4. Modal de hallazgo: sale la 1ª vez de un ítem de la categoría más rara; NO la 2ª; NUNCA
       con hallazgos del robot; el pop/sonido por objeto sigue en todos los objetos
    5. Índice: ningún pentágono genérico; candelabro es un candelabro; document/chip/vase
       desambiguados; íconos reconocibles a 16px y visibles en el canvas de escarbado
    6. Ajustes: sin Créditos; slider de sensibilidad funciona (50% vs 150% se siente) y persiste
       tras recargar y tras cerrar/abrir Electron
    7. i18n: es.js/en.js con paridad; las vistas no tienen copy hardcodeado; el juego se ve
       EXACTAMENTE igual que antes de la migración
□ Guardado: export → import ida y vuelta sin pérdida; save v4 viejo carga y migra bien
□ Responsive 375 / 1280×800 / 1440 sin desbordes (el selector y el slider nuevos incluidos)
□ Checklist de verificación manual final para el humano en agentes/HANDOFF.md
```

---

## 7. Riesgos conocidos (leer antes de ejecutar)

1. **`<select>` vs re-render por tick** — el riesgo #1 de la ronda. Sin el guard de `SELECT` en `UIManager.renderTabContent`, el dropdown se cierra cada segundo con la automatización activa. Es parte del DoD del Agente B.
2. **e2e de ronda 12** — asserta el jackpot por varianza. Hay que re-sembrar por "primera vez"; y si el seed pre-carga `itemsFoundByItem` con el ítem, ahora **suprime** el modal en vez de habilitarlo.
3. **Target fijo barato + mucho dinero** = el robot compra en loop el mismo contenedor barato. Es el comportamiento pedido (selección literal); el copy lo aclara ("Auto = el más caro").
4. **Robot sin celebración (D3)** — decidido por el usuario: los hallazgos del robot solo se registran en el Índice. Si en el futuro se quisiera feedback, sería un toast + eventos desde `automationTick` (cambio de firma, postre — NO en esta ronda).
5. **Import map / CSP** — cualquier cambio en `index.html` cerca del importmap o la CSP rompe la carga del juego en silencio. Los agentes B y D tocan `index.html`: solo comentarios y labels, nada del head crítico.
6. **Sensibilidad >100% con Área alta** no se nota por el cap del pincel (`OBJECT_RADIUS × 1.5`). Intencional y documentado; no "arreglarlo".
