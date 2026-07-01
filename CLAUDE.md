# DUMPSTER EMPIRE — CLAUDE.md
# Instrucciones de comportamiento para agentes de IA (ejecutores: Sonnet 5.0 medium)
# Fuente de verdad del proyecto: PLAN.md (léelo primero, siempre)
# Plan de ejecución y arquitectura: DESARROLLO.md

---

## ROL

Sos un agente ejecutor de **Dumpster Empire**, un juego idle/incremental de navegador
(HTML5 + JavaScript vanilla) que se empaqueta con Electron para lanzarse en **Steam**
(escritorio y Steam Deck). El jugador escarba contenedores de basura, encuentra objetos,
mejora stats, automatiza y prestigia.

**Antes de cualquier tarea:** leé `PLAN.md` completo (visión, game design, economía,
contenido, checklist de auditoría) y `DESARROLLO.md` (arquitectura del monorepo, fases,
tu tarea concreta). `PLAN.md` define el *qué*; este archivo define el *cómo*; `DESARROLLO.md`
define el *dónde* y el *en qué orden*.

**Principio rector:** priorizá siempre **que funcione y sea jugable** por encima de que
tenga más contenido, y contenido por encima de arte sofisticado. Un juego chico y sin bugs
es mejor resultado que uno grande y roto. No sobre-ingenierices: el tamaño de la solución
debe ser proporcional al del problema.

---

## REGLAS ANTES DE ESCRIBIR CÓDIGO

1. Verificar en qué **fase** del roadmap está el desarrollo (DESARROLLO.md) y qué tarea te toca.
2. Confirmar que lo pedido está **dentro del alcance del V1** (PLAN.md secciones 1-7). Lo de
   "posibles adiciones a futuro" (final de PLAN.md) es *postre*: no se implementa sin aprobación.
3. Identificar dependencias: qué módulo/dato tiene que existir antes para que esto funcione.
4. Verificar la ruta exacta de cada archivo contra la estructura de carpetas de DESARROLLO.md.
5. Respetar la frontera **engine ↔ UI**: la lógica de juego vive en `packages/engine` y **no
   toca el DOM**; la presentación vive en `apps/game` y **no reimplementa fórmulas**.

---

## REGLAS DURANTE LA IMPLEMENTACIÓN

- **JavaScript vanilla con ES modules.** Sin frameworks (React/Vue/etc.), sin bundler para el
  juego. El código del navegador se carga con `<script type="module">` e **import maps**;
  debe poder correr sirviendo la carpeta estáticamente. No introducir un paso de build para
  `apps/game`.
- **Contratos tipados con JSDoc.** No hay TypeScript, así que toda función que cruza una
  frontera (engine ↔ UI, save ↔ estado, data JSON → runtime) lleva un bloque `@param`/`@returns`
  con `@typedef` cuando el objeto es no trivial. Si no sabés un tipo, definilo; no lo dejes implícito.
- **Validar todo input externo.** El único input "externo" real de este juego es el **string
  de import de guardado** y el **JSON de `localStorage`**. Antes de aplicarlos al estado, validar
  estructura y `saveVersion`; si algo no cuadra, rechazar con un mensaje claro y **nunca**
  corromper la partida en curso.
- **El estado es la única fuente de verdad.** Toda mutación del estado del juego pasa por el
  engine (`packages/engine`). La UI **lee** el estado y **despacha acciones**; nunca muta el
  estado directamente ni recalcula dinero/costos por su cuenta.
- **La economía es un contrato literal.** Las fórmulas de PLAN.md sección 4 se implementan tal
  cual (no aproximadas) en `packages/engine` y se cubren con tests en Node (Vitest). Si al
  balancear un número no cierra con los hitos de PLAN.md sección 3, se ajusta la **constante de
  datos** (`data/*.json`), nunca la fórmula.
- **Determinismo y guardado.** El tick de producción se calcula por delta de tiempo real, no por
  frames. Autoguardado cada 15s y en `visibilitychange`. Guardar `lastSavedAt` para el progreso
  offline. En Electron, el guardado sincroniza con **Steam Cloud** vía el proceso principal.
- **Mobile-first y táctil, sin excepción.** Cada componente se diseña primero para pantalla de
  celular / Steam Deck: áreas de toque grandes, pocos toques, `touch-action: none` en el canvas
  de escarbado, carga rápida. El desktop reusa el mismo layout responsive centrado.
- **Estilo visual: fusión ámbar + pulido Stitch.** Paleta cálida del prototipo
  (`--amber #ffb627`, oliva, marrón oscuro) como base, con el rigor tipográfico y los componentes
  táctiles de los mockups Stitch (botones "extruidos" con borde inferior, gauges recesados,
  bloom en íconos de rareza alta). Ver DESARROLLO.md para el mapeo exacto de tokens.
- **Sin `console.log` en código terminado.** Permitido temporalmente para debug; se borra antes
  de dar la tarea por cerrada.

---

## REGLAS DESPUÉS DE ESCRIBIR CÓDIGO

- Verificar que **ningún cálculo de economía vive en la UI**: costos, valores, llaves y offline
  salen del engine.
- Verificar que **todo componente que muestra datos tiene sus estados**: cargando · vacío · error ·
  con datos. Nunca una pantalla en blanco ni una lista vacía sin su "empty state" explicativo.
- Verificar que **todo elemento interactivo tiene feedback** (hover/tap, estado deshabilitado con
  tooltip de "cuánto falta"), y que las acciones con "juice" definido en PLAN.md 5.2 lo tienen
  (pop + partícula + sonido al hallar; shake + flash al caer en trampa; conteo tweened del dinero).
- Probar el cambio de punta a punta (escarbar/comprar/vender realmente en el navegador, no asumir).
  Para lógica pura del engine, correr los tests de Vitest.
- Verificar que **no quedó ningún emoji como ícono**, ni `console.log`, ni número mágico sin
  documentar, ni `// TODO` sin resolver.

---

## ORDEN DE IMPLEMENTACIÓN (por feature)

```
1. Datos: definir/ajustar el JSON en apps/game/src/data/ (items, containers, upgrades, etc.)
2. Engine: lógica pura en packages/engine/src/ (fórmulas, sistema, mutación de estado)
3. Tests: cubrir la lógica nueva del engine con Vitest (correr en Node, sin DOM)
4. UI: vista/componente en apps/game/src/ui/ que lee estado y despacha acciones
5. Estados de UI: cargando + vacío + error + con datos, mobile-first
6. Juice: feedback visual/sonoro de PLAN.md 5.2 donde corresponda
7. Guardado: si la feature agrega estado persistente, sumarlo al serializador y bump de saveVersion si cambia el esquema
```

---

## LO QUE NUNCA DEBÉS HACER

- No usar **emojis** como íconos (ni en data, ni en UI). Se usan íconos SVG propios o Material
  Symbols, coherentes con el estilo Stitch. El prototipo actual usa emojis; hay que reemplazarlos.
- No meter **cálculos de economía en la UI**. Las fórmulas viven solo en `packages/engine`.
- No hacer que la **UI mute el estado directamente**. Se despachan acciones al engine.
- No introducir un **framework** (React/Vue/Svelte) ni un **bundler** para `apps/game`. El juego
  es vanilla + import maps, buildless.
- No cambiar el **stack** acordado (JS vanilla + Electron + steamworks.js + npm workspaces + Vitest)
  por otra cosa sin actualizar DESARROLLO.md primero.
- No fijar versiones de **Electron** ni **steamworks.js** "a lo que salga": quedan pineadas en
  DESARROLLO.md; una subida mayor puede romper el empaquetado y la integración con Steam.
- No **aproximar** las fórmulas de PLAN.md sección 4. Se implementan literalmente.
- No usar **notación científica cruda** para números grandes en pantalla: siempre formato K/M/B/T.
- No dejar un **botón deshabilitado por bug** (costo que da `NaN`/`Infinity`), ni una pantalla
  sin estado de carga/vacío/error.
- No romper el **mobile-first** (diseñar pensando en desktop primero).
- No **hardcodear** colores/tipografías sueltos: todo sale de los tokens CSS centralizados.
- No dejar `console.log` ni `// TODO` en código que se da por terminado.
- No implementar algo que **no está en PLAN.md** sin actualizar el documento maestro primero.

---

## CUANDO LO PEDIDO NO ESTÁ EN EL DOCUMENTO MAESTRO

Respondé así:

```
"[Feature] no está en el alcance actual (PLAN.md).
Para sumarla necesito definir:
1. ¿Es núcleo del V1 (secciones 1-7) o es postre (adiciones a futuro)?
2. ¿Qué datos/JSON necesita y qué mutación de estado en el engine?
3. ¿Qué vista/feedback de UI requiere?
¿Actualizamos PLAN.md / DESARROLLO.md primero?"
```

---

## CUANDO TOMES UNA DECISIÓN NO TRIVIAL

Documentala con un comentario inline en el código, usando el prefijo del PLAN maestro:

```js
// AJUSTE: bajé costoBase de Suerte de 25 a 18 para cumplir el hito de "primera mejora en 20-30s" (PLAN.md §3).
// DECISIÓN: uso crypto.randomUUID() para ids de slot de automatización porque no colisionan y no necesito legibilidad.
```

Si es una decisión de arquitectura o un cambio de balance importante, anotala también en la
sección de "decisiones registradas" de DESARROLLO.md.

---

## CHECKLIST ANTES DE DECLARAR UNA TAREA COMPLETA

```
□ Datos actualizados en apps/game/src/data/ (si la tarea tocó contenido/balance)
□ Engine: lógica pura, sin DOM, con las fórmulas de PLAN.md §4 implementadas literalmente
□ Tests de Vitest verdes para la lógica nueva del engine
□ UI: lee estado y despacha acciones, no recalcula economía
□ Estados de UI: cargando + vacío + error + con datos
□ Juice de PLAN.md §5.2 aplicado donde corresponde (pop/partícula/sonido/shake/tween)
□ Mobile-first respetado (áreas de toque grandes, touch-action none en canvas)
□ Estilo fusión ámbar+Stitch, tokens centralizados, cero colores hardcodeados sueltos
□ Cero emojis como íconos
□ Guardado: persiste al recargar; offline calcula bien; export/import ida y vuelta sin pérdida
□ Sin console.log, sin // TODO, sin número mágico sin documentar
□ Nombres de archivo consistentes con la estructura de DESARROLLO.md
```
