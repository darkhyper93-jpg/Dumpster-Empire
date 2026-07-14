# PLAN.md — Documento maestro de diseño: "Dumpster Empire"
### Fuente de verdad del diseño. Ejecutan agentes Sonnet 5.0 medium en un monorepo.

> **Cómo se usa este documento:** `PLAN.md` es la **fuente de verdad del diseño** (el *qué*): visión,
> game design, economía, contenido y reglas de experiencia. No se ejecuta directo pegándolo a un
> modelo: el desarrollo lo llevan adelante agentes ejecutores guiados por dos documentos hermanos:
> `CLAUDE.md` (el *cómo*: reglas de comportamiento de los agentes) y `DESARROLLO.md` (el *dónde* y el
> *en qué orden*: arquitectura del monorepo, stack de lanzamiento en Steam, fases y tareas). Donde este
> documento y `DESARROLLO.md` difieran en un detalle de arquitectura, manda `DESARROLLO.md`; donde
> falte un detalle menor de diseño, el agente decide siguiendo el espíritu de este documento (sección 9).
>
> **Estado del proyecto:** existe un prototipo de un solo archivo (`reference/dumpster-empire.html`) que sirve
> como **referencia suelta de comportamiento, no como código a portar**. Tiene funciones rotas o
> inútiles (p. ej. la stat de Fuerza) que **no se copian**: se rediseñan desde el engine y este plan.

---

## INSTRUCCIONES DE ROL

Actuá como un estudio de desarrollo de videojuegos completo y autónomo: game designer, economista de sistemas, programador senior, diseñador de UI/UX y QA, todo en una sola entidad. Tu tarea es construir **"Dumpster Empire"**, un juego idle/incremental de navegador (HTML5), completo y jugable, sin pedirme confirmaciones intermedias.

Reglas de comportamiento durante todo el desarrollo:

1. **No me preguntes nada.** Si falta un dato (un color exacto, un nombre de objeto, un valor de balance), decidilo vos mismo siguiendo el espíritu de este documento y seguí adelante.
2. **Generá el proyecto completo**, archivo por archivo, hasta que sea jugable de principio a fin (incluyendo prestigio funcional).
3. **Revisá cada archivo antes de darlo por terminado**: leelo de nuevo buscando errores de sintaxis, referencias rotas, lógica inconsistente con la economía definida en la sección 4, y corregilo vos mismo sin esperar que yo lo note.
4. **Continuá automáticamente** de una parte a la siguiente hasta completar todo el checklist de la sección 10. No te detengas a mitad de camino a pedir permiso para seguir.
5. Si en algún punto detectás que una decisión de diseño anterior (tuya o de este documento) generó una inconsistencia, **corregila y dejá una nota breve en el código** (comentario `// AJUSTE:`) explicando qué cambiaste y por qué.
6. Priorizá siempre: **que funcione y sea jugable** > que tenga muchísimo contenido > que tenga arte sofisticado. Un juego pequeño y sin bugs es mejor resultado que uno grande y roto.

---

## 1. VISIÓN DEL JUEGO

**Dumpster Empire** es un idle game de navegador donde el jugador empieza escarbando un contenedor de basura con las manos y termina dirigiendo un imperio global de recuperación de objetos, desde plantas de reciclaje automatizadas hasta casas de subastas de reliquias.

La inspiración mecánica es **Scritchy Scratchy** (Lunch Money Games): ese juego usa el gesto físico de "arrastrar para raspar" tarjetas de rasca y gana, con tres estadísticas centrales (Suerte, Potencia de Rascado, Tamaño de Área), automatización vía un "Auto Scratcher", y un sistema de prestigio basado en puntos permanentes. Dumpster Empire traduce esa misma estructura a un tema distinto:

| Scritchy Scratchy | Dumpster Empire |
|---|---|
| Rascar tarjetas de lotería | Escarbar contenedores de basura |
| Lavar platos (acción inicial) | Revisar el primer contenedor a mano |
| Suerte / Potencia de Rascado / Área | Suerte / Fuerza de Escarbado / Tamaño de Búsqueda |
| Auto Scratcher | Robot Clasificador Automático |
| Jack Points (prestigio) | Llaves de Ciudad (prestigio) |
| Tarjetas con distintos riesgos/pagos | Contenedores con distinto riesgo/contenido |

El objetivo de diseño: que el jugador sienta progreso casi constante desde el segundo 1, con decisiones estratégicas reales (qué contenedor comprar, cuándo automatizar, cuándo prestigiar) y una sensación de "una partida más" infinita.

**Plataforma objetivo:** **Steam** (escritorio Windows/Mac/Linux y **Steam Deck**), empaquetado con
Electron. El juego es HTML5 + JS vanilla y se ejecuta dentro del shell de Electron. **Sin cuentas y
sin backend propio:** el guardado es local y sincroniza con **Steam Cloud**. Diseño **mobile-first
y táctil**, lo cual encaja además con la pantalla táctil del Steam Deck; en desktop el mismo layout
responsive se centra con ancho máximo. Título **premium** (compra única), sin anuncios ni compras
in-app. Ver stack completo en `DESARROLLO.md` sección 3.

---

## 2. GAME DESIGN DOCUMENT

### 2.1 Core Loop

```
Escarbar contenedor → obtener objetos/dinero → comprar mejoras o contenedores nuevos
   → escarbar más rápido / más contenedores en paralelo → desbloquear automatización
   → dejar que los robots trabajen solos → acumular dinero offline
   → cuando el progreso se estanca → Prestigio (nueva ciudad) → bonos permanentes → loop más rápido
```

### 2.2 Mecánica táctil principal: "Escarbar"

Igual que en Scritchy Scratchy el jugador arrastra el cursor/dedo sobre la tarjeta para revelarla, en Dumpster Empire el jugador **arrastra el cursor/dedo sobre el contenedor** para apartar capas de basura y revelar lo que hay debajo. Técnicamente: un `<canvas>` con una capa "sucia" dibujada encima de los objetos, y `globalCompositeOperation = "destination-out"` para ir "borrando" la suciedad donde el usuario arrastra (idéntico patrón técnico que usan los juegos de rasca y gana en HTML5 canvas).

Reglas del gesto:
- Al revelar un porcentaje del área (configurable, por defecto 60%) el contenedor se considera "completado" y se entregan automáticamente los objetos restantes.
- Cada contenedor tiene una probabilidad de contener una **"trampa"** (vidrio roto, objeto podrido, animal que muerde) que penaliza con pérdida de dinero o de tiempo — esto agrega la capa de riesgo/recompensa que hace interesante al juego de referencia.

### 2.3 Estadísticas principales del jugador

| Stat | Efecto | Cómo se mejora |
|---|---|---|
| **Suerte** | Aumenta la probabilidad de objetos raros y reduce la probabilidad de trampas | Mejoras compradas con dinero / prestigio |
| **Fuerza de Escarbado** | Baja el **umbral de revelado** necesario para completar un contenedor y añade un **bonus de valor por profundidad** (cavar con más fuerza desentierra objetos más valiosos): a mayor Fuerza, cada contenedor se completa con menos arrastre y rinde más $ por objeto | Mejoras + herramientas (guantes → pala → excavadora) |
| **Tamaño de Búsqueda** | Aumenta el área de canvas revelada por cada gesto de arrastre (pincel más grande) | Mejoras + herramientas |
| **Capacidad** | Cuántos contenedores se pueden tener "abiertos" en simultáneo (manual + auto) | Mejoras de infraestructura |

> **Nota de diseño (revisión de stats).** En el prototipo la Fuerza estaba mal implementada y
> resultaba inútil: solo afectaba una "velocidad de limpieza" que se solapaba con el Área y no
> cambiaba ningún número que al jugador le importara. Rediseño: **cada stat debe modificar un valor
> que el jugador perciba y que sea distinto del de las otras.** Área = *ancho* del trazo (revelás
> más superficie por gesto); Fuerza = *profundidad* del trazo (completás el contenedor con menos
> esfuerzo) **más** un multiplicador de valor por objeto (recompensa directa). Así Fuerza y Área
> dejan de ser redundantes y las dos valen la pena. Regla general para el engine: si una mejora no
> cambia un número visible y relevante para el jugador, no se implementa hasta rediseñarla. Los
> valores exactos (peso del bonus de valor, curva del umbral) se calibran en el pase de balance
> (sección 9 y `DESARROLLO.md` Fase 5) contra los hitos de la sección 3.

### 2.4 Recursos y moneda

- **Monedas ($):** moneda principal, se gana vendiendo objetos encontrados. Sirve para comprar mejoras y contenedores nuevos.
- **Fragmentos de Categoría:** cada categoria de objeto rara (Antigüedades, Arte, Reliquias, Tecnología) genera además un recurso secundario coleccionable, usado para desbloquear mejoras especiales de esa rama (igual función que tener "estadísticas paralelas" para dar profundidad sin complicar la moneda principal).
- **Llaves de Ciudad:** moneda de prestigio, ver 2.8.

### 2.5 Rarezas y categorías de objetos (orden de progresión)

| # | Categoría | Color de rareza | Multiplicador base de valor | Desbloqueo |
|---|---|---|---|---|
| 1 | Basura común | Gris | x1 | Inicio |
| 2 | Objetos reutilizables | Verde | x3 | Nivel de cuenta 3 |
| 3 | Electrónica | Azul | x10 | Nivel de cuenta 8 |
| 4 | Antigüedades | Morado | x35 | Nivel de cuenta 15 |
| 5 | Objetos históricos | Naranja | x120 | Nivel de cuenta 25 |
| 6 | Arte | Rosa/Magenta | x400 | Nivel de cuenta 40 |
| 7 | Reliquias | Dorado | x1.500 | Nivel de cuenta 60 |
| 8 | Tecnología futurista | Cian brillante (con partícula animada) | x6.000 | Solo tras el primer Prestigio |

Cada categoría tiene **6 a 8 objetos individuales** con nombre propio, ícono y un rango de valor propio dentro del multiplicador de su rareza (la IA debe generar listas completas de nombres al implementar — ej. en "Basura común": lata aplastada, cáscara de banana, periódico viejo, zapato sin par, botella plástica, caja de cartón).

### 2.6 Contenedores (equivalente a los "tickets"/tarjetas)

Cada contenedor es la unidad de compra-y-escarbado, con su propio costo, tiempo, distribución de probabilidad y riesgo. Como mínimo, implementar estos 8, en orden de desbloqueo:

| Contenedor | Costo (fijo) | Categorías posibles | Prob. de trampa | Nota de diseño |
|---|---|---|---|---|
| Tacho de vereda | $0 (gratis, tutorial) | Solo Basura común | 5% | Punto de entrada, siempre disponible |
| Contenedor de barrio | $25 | Basura común, Reutilizables | 8% | Primera compra real |
| Container industrial | $300 | Reutilizables, Electrónica | 15% | Introduce riesgo medio |
| Depósito abandonado | $4.000 | Electrónica, Antigüedades | 20% | Requiere Suerte mínima para abrir rentable |
| Mudanza de mansión | $50.000 | Antigüedades, Histórico | 12% | Pagos altos, trampa cara si falla |
| Galería en liquidación | $700.000 | Histórico, Arte | 18% | Introduce el recurso de Fragmentos de Arte |
| Bóveda perdida | $10.000.000 | Arte, Reliquias | 25% | Alto riesgo/alta recompensa, ideal para pre-prestigio |
| Contenedor extradimensional | $150.000.000, solo post-Prestigio | Reliquias, Tecnología futurista | 30% | Desbloqueado por Llaves de Ciudad |

El precio de cada contenedor es fijo (no crece con la cantidad comprada, ver sección 4.2);
la progresión la marcan los saltos ×10–×15 entre tiers (ronda 6 de playtest).

- **Contenedores de prestigio (ronda 11)**: además del Extradimensional (prestigio 1), hay 4
  contenedores late-game gateados por `requiresPrestigeCount` 2/3/4/5 — Convoy Fantasma,
  Cripta del Coleccionista, Estación Orbital Caída y Vertedero de los Dioses — cada uno con su
  pool propio de 7 ítems (§11.4). Son el motor económico que hace cada corrida más profunda:
  el árbol de prestigio completo (1.523 llaves) se termina en ~5-6 prestigios. Aparecen en la
  Tienda (bloqueados dicen con qué prestigio se desbloquean), en el selector de escarbado y en
  el Índice al desbloquearse, como cualquier otro.

- **Contenedores de prestigio (ronda 15)**: 4 contenedores más, continuando la curva de costo
  ×15 por tier y gateados por `requiresPrestigeCount` 6/7/8/9, cada uno con su pool propio de 7
  ítems:

  | Contenedor | Costo (fijo) | Categorías posibles | Prob. de trampa | Prestigio requerido |
  |---|---|---|---|---|
  | Chatarrería de Titanes | $300.000.000.000.000 | Reliquias, Tecnología futurista | 40% | 6 |
  | Naufragio Temporal | $4.500.000.000.000.000 | Histórico, Reliquias | 41% | 7 |
  | Archivo del Multiverso | $70.000.000.000.000.000 | Arte, Reliquias | 42% | 8 |
  | Vertedero del Big Bang | $1.000.000.000.000.000.000 | Tecnología futurista | 44% | 9 |

  Suerte recomendada calibrada en esta ronda (script de calibración por búsqueda binaria sobre
  `valorBase`, mismo método que ronda 10): 651 / 740 / 831 / 920 respectivamente — continúa la
  progresión de ~15% por tier de la ronda 10/11 (…420, 500, 580 → 651, 740, 831, 920). El tope de
  búsqueda de `getRecommendedLuck` (economy.js) sube de 800 a 1500 para poder encontrarlas.

### 2.7 Automatización

Progresión de herramientas, calcada de la curva manual→automático del juego de referencia:

1. **Guantes** (mejora pasiva de Fuerza de Escarbado, sin automatizar nada)
2. **Carrito** (permite tener 2 contenedores abiertos a la vez)
3. **Detector de metales** (mejora Suerte en Electrónica)
4. **Robot Clasificador Básico** — equivalente al "Auto Scratcher": escarba contenedores solo, a ciegas y sin criterio, por lo que sufre más trampas que el jugador manual (igual trade-off que el original).
5. **Cinta Transportadora** — permite encolar contenedores para que el Robot los procese en cadena.
6. **Servobrazos Reforzados** (ronda 15) — +40% Fuerza de Escarbado del robot (solo automatización, ver 4.7).
7. **Planta de Reciclaje** — multiplica el valor de venta de Basura común y Reutilizables automáticamente.
8. **Chip Overclockeado** (ronda 15) — +25% velocidad de procesamiento del robot (ver 4.7).
9. **Centro de Subastas** — vende automáticamente Arte y Reliquias al mejor precio del mercado simulado (con fluctuación aleatoria ±20%, ver 4.4).
10. **Red de Drones** (estructura late-game) — procesa contenedores extradimensionales sin supervisión.
11. **Servobrazos de Titanio** (ronda 15) — +80% adicional de Fuerza de Escarbado del robot (ver 4.7).
12. **Núcleo Cuántico** (ronda 15) — +50% adicional de velocidad de procesamiento del robot (ver 4.7).

Regla de balance: la automatización siempre debe ser **más lenta en ganancia por segundo que jugar manualmente de forma óptima**, pero permite progreso mientras el jugador está ausente (offline progress, ver 4.5). Esto es lo que hace que el juego siga siendo "incremental" y no solo un *idler* pasivo.

### 2.8 Sistema de Prestigio: "Llaves de Ciudad"

- Disponible desde que el jugador alcanza el Contenedor "Bóveda perdida" y ha acumulado un umbral de dinero total ganado (no dinero actual) de **$1.000.000.000** (mil millones) en la primera vuelta.
- Al prestigiar: el jugador reinicia dinero, contenedores comprados y mejoras compradas con dinero normal, pero conserva:
  - Llaves de Ciudad obtenidas (fórmula en sección 4.3).
  - Mejoras permanentes compradas con Llaves (árbol de prestigio).
  - Una nueva "ciudad" desbloqueada con multiplicador base de valor más alto y nuevo set visual (cambia la paleta de fondo del juego).
- Árbol de mejoras permanentes (13 nodos desde ronda 15): bonus inicial de dinero al empezar, Suerte base +X%, desbloqueo de Contenedor extradimensional, reducción de probabilidad de trampa global, multiplicador de progreso offline, slot extra de contenedor automático simultáneo, y (ronda 15) **Escáner de Trampas** — el robot descarta contenedores trampeados en vez de sufrir el castigo, con `min(1, nivel * 0.34)` de probabilidad (nivel máx. 3), colgando de Instinto de Carroñero. Costo alto a propósito (≈65 Llaves los 3 niveles, ver 4.7): es la mejora más cara del árbol después de completarlo entero.
- Cada prestigio sucesivo debe sentirse notablemente más rápido que el anterior (es el "one more run" hook).

### 2.9 El Puesto de Chatarra (ronda 23)

Un puesto físico que el jugador compra en la Tienda: convierte la venta instantánea (la de
siempre, y que sigue siendo el default) en un sistema de inventario con timing de mercado.

- **Compra**: `stallCost` en la Tienda, entre los tiers 4-5 de contenedor (~30-60 min de juego).
- **Captura**: con el puesto comprado y un umbral (`keepThreshold`) fijado por el jugador (> 0),
  cada objeto encontrado que valga `keepThreshold` o más se guarda en el inventario del puesto en
  vez de venderse al toque — siempre que haya lugar. `keepThreshold: 0` (default al comprar) deja
  el puesto en pausa: todo sigue vendiéndose instantáneo como hoy. **El loot jamás se pierde**: sin
  espacio o por debajo del umbral, cae a la venta instantánea de siempre.
- **Precio de venta en el puesto**: sube con el nivel del puesto y depende de la cotización del día
  (fluctuación de mercado, ver 4.4) — vender cuando la cotización está alta paga más (ver 4.27).
- **Pedidos**: Doña Rita compra lo que sea; El Turco Salomón pide categorías específicas por
  cantidad y paga de más por cumplir (ver 4.28).
- **Robot vendedor**: automatización que vende del inventario solo, incluso con el juego cerrado
  (ver 4.29). Los **legendarios NUNCA entran al inventario del puesto**: se venden siempre
  instantáneo, contrato irrevocable (ver 4.26).

---

## 3. CONTRATO DE EXPERIENCIA — RITMO ESPERADO

Para que el juego "enganche" como el de referencia, la IA debe verificar (jugando mentalmente la curva, no solo escribiendo código) que se cumplan estos hitos aproximados en una partida nueva, sin gastar dinero en nada fuera de lo obvio:

- Primera compra de mejora: dentro de los primeros **20-30 segundos**.
- Primer contenedor de pago comprado: antes de los **2 minutos**.
- Primera automatización (Robot Clasificador): entre los **8 y 15 minutos**.
- Primer acceso a Electrónica: antes de los **15 minutos**.
- Sensación de "todo desbloqueado, falta plata": alrededor de los **45-60 minutos**, momento en que el juego empuja naturalmente hacia el Prestigio.
- Primer Prestigio disponible: entre **20 y 40 minutos** de juego activo.
  <!-- AJUSTE (2026-07-10): el estimado original era "1.5-3 horas" y venía de una simulación de la
  auditoría 11 que no representaba el juego activo real. El usuario validó jugando (post-rondas
  10-11) que el primer Prestigio sale en ~20-30 min y dio el ritmo por bueno: este hito se
  actualiza a la realidad y la "deuda de ritmo" queda cerrada (ver ROADMAPv3.md §7). -->

Si al implementar la economía (sección 4) estos hitos no se cumplen con los números elegidos, ajustar las constantes hasta que se cumplan — esto tiene prioridad sobre mantener números "redondos".

---

## 4. ECONOMÍA Y FÓRMULAS DE BALANCE

Estas fórmulas son el contrato que el código debe implementar literalmente. No reemplazar por aproximaciones.

### 4.1 Costo de mejoras repetibles

Para cualquier mejora comprable múltiples veces (Suerte, Fuerza de Escarbado, Tamaño de Búsqueda, slots de capacidad):

```
costo(nivel) = costoBase * (factorCrecimiento ^ nivel)
```

- `factorCrecimiento` por defecto: **1.13** para mejoras de stats básicas (Suerte/Fuerza/Área).
- `factorCrecimiento`: **1.22** para slots de capacidad (deben crecer más caro, son más poderosos).
- `costoBase` se define por mejora; documentar cada valor en `src/data/upgrades.json`.

### 4.2 Costo de contenedores adicionales del mismo tipo

```
costo = costoInicial   (precio fijo: no crece con la cantidad ya comprada)
```

(Cambiado en la ronda 6 de playtest: antes crecía `1.08 ^ cantidadYaComprada`. Comprar
contenedores ES el loop principal — encarecer cada compra castigaba justamente la acción
que el juego pide repetir, y el freno de progresión ya lo ponen los saltos de precio entre
tiers, ×10–×15 entre contenedor y contenedor. La sensación de meta de ahorro vive en el
salto al próximo tier, no en encarecer el tier actual.)

### 4.3 Fórmula de Llaves de Ciudad al prestigiar

```
llaves = floor( raiz_cuadrada( dineroTotalGanado / 1.000.000.000 ) * 10 )
```

Con un mínimo de 1 llave si se cumplió el umbral de prestigio. Esto da crecimiento sub-lineal: hace falta jugar mucho más para duplicar las llaves que para obtener la primera tanda, lo cual es intencional (evita "prestigio infinito sin esfuerzo").

### 4.4 Valor de venta de un objeto encontrado

```
valorFinal = valorBaseObjeto * multiplicadorRareza * (1 + suerte/100) * fluctuacionMercado
```

- `fluctuacionMercado`: número aleatorio entre 0.85 y 1.20, recalculado cada 60 segundos de juego (simula un mercado vivo, relevante sobre todo para el Centro de Subastas automatizado de 2.7).

### 4.5 Progreso offline

```
gananciaOffline = gananciaAutomaticaPorSegundo * segundosAusente * factorOffline
```

- `factorOffline` por defecto: **0.5** (el jugador gana la mitad de lo que ganaría si estuviera mirando la pantalla activamente con automatización corriendo).
- Tope duro: el offline nunca calcula más de **8 horas** de ausencia (a partir de ahí, no sigue acumulando) salvo que se compre la mejora de prestigio que extiende este tope.
- Al volver, mostrar un resumen modal: "Mientras no estabas, tus robots encontraron: [resumen de objetos y dinero]".

### 4.6 Trampas: probabilidad y castigo

```
probTrampaEfectiva = max(0.03, probTrampaBaseDelContenedor - (suerte * 0.002))
penaTrampa = max(1, costoInicial * trapPenaltyMult)   (monto FIJO por tier)
```

Nunca debe llegar a 0% (piso del **3%**, subido de 1% en la ronda 7: el riesgo nunca desaparece,
ni en late-game). El **monto** del castigo es fijo por tier (costo del contenedor × su
`trapPenaltyMult` de data) y **no se suaviza con la Suerte** — la Suerte reduce la *probabilidad*
de la trampa, no cuánto duele: el rol de la Suerte es que caigas menos veces, y cada caída tiene
que sacar una cantidad decente de dinero para que suba la presión de mejorar la Suerte antes de
avanzar al siguiente contenedor (decisión de la ronda 7; antes el monto también bajaba hasta ×0.4
con la Suerte y en late-game perder era irrelevante).

### 4.7 Mejoras del robot (ronda 15)

- **Mejoras del robot (ronda 15).** Tres efectos nuevos, todos data-driven:
  - `autoDigPowerPercent` (máquinas): la Fuerza efectiva del robot es
    `getDigPowerMult(state) × (1 + Σ percent de máquinas compradas)`. Afecta SOLO el tiempo de
    procesamiento automático (vía `getDigRate(..., isAuto=true)`), nunca el escarbado manual.
    Pega más fuerte contra contenedores de alta `resistencia` (el ritmo clampa 0.3–1.5).
  - `autoSpeedPercent` (máquinas): multiplicador plano de velocidad de procesamiento;
    `remaining` decrece a razón de `dt × (1 + Σ percent)`. Aplica también a slots ya en curso.
  - Los dos efectos de máquinas alimentan también la **estimación de tasa del progreso offline**
    (§4.5): `estimateAutomationRatePerSecond` usa el tiempo efectivo con `isAuto=true` y
    multiplica por la velocidad del robot — el robot trabaja al mismo ritmo con el juego abierto
    o cerrado (auditoría ronda 15).
  - `trapDiscardChancePerNivel` (nodo de prestigio, se paga con Llaves): al completarse un slot
    cuyo roll dio trampa, con probabilidad `min(1, nivel × percentPerNivel)` el robot DESCARTA
    el contenedor: no hay castigo ni loot, el contenedor se pierde (ya se pagó), cuenta para el
    nivel del contenedor y suma `state.trapsDiscarded`. No cuenta como "procesado" (a26/a33).
    Vive en el árbol de prestigio y no en máquinas porque `automationOwned` se resetea al
    prestigiar y las Llaves son la moneda permanente.

### 4.21 Grados de trampa (ronda 20)

Al salir trampa (roll de §4.6 sin cambios — el grado NUNCA altera la probabilidad de caer),
un roll secundario e independiente decide el grado, con constantes en `data/traps.json`
(`gradosProb: { leve, normal, grave }`, suman 1):

```
grado ~ { leve: 0.40, normal: 0.45, grave: 0.15 }
penaTrampa(leve)   = 0
penaTrampa(normal) = penaTrampa (§4.6, sin cambios)
penaTrampa(grave)  = penaTrampa (§4.6) * gravePenaltyMult   (gravePenaltyMult = 2, data/traps.json)
```

El descarte del robot (Escáner de Trampas, §4.7) se decide ANTES del grado — el robot descarta
por `result.isTrap`, nunca llega a rollear/pagar un grado. El corte de la racha de escarbado
(§4.20) sigue el mismo criterio de siempre: cualquier grado de trampa manual la corta a 0.

### 4.22 — (removido) Energía y espionaje: removido por decisión del usuario 2026-07-14 (ronda 21 de ROADMAPv4).

### 4.23 Herramientas de escarbado (ronda 20)

Modifican SOLO el pincel del escarbado manual — `radioPincel × radioMult`,
`ritmo × ritmoMult` — nunca `getLuck` ni `itemSaleValue`. Constantes en `data/tools.json`:

| id | costo | radioMult | ritmoMult |
|---|---|---|---|
| `manos` (inicial) | 0 | 1.0 | 1.0 |
| `palaAncha` | 75000 | 1.6 | 0.7 |
| `pincelFino` | 250000 | 0.6 | 1.8 |
| `guanteHidraulico` | 5000000 | 1.3 | 1.3 |

Solo una herramienta equipada a la vez (`state.equippedTool`); comprar no equipa automáticamente.

### 4.24 Indicios visuales y contenedores con mecánica propia (ronda 20, Agente B)

- **Indicio visual de grado de trampa**: `hintProb: 0.6` en `data/traps.json`. Al iniciar un
  escarbado que salió trampa (con `data.traps` presente), un roll independiente decide si se
  muestra un indicio visual del grado (`leve` → manchas de humedad, `normal` → grietas, `grave`
  → marcas de garras) pintado en la capa superior del canvas. El indicio es cosmético (no
  garantiza nada, solo sugiere): vive en el estado del dig en curso (`DigCanvas`, función pura
  `rollTrapHintGrade` de `digRevealModel.js`), nunca se decide leyendo píxeles del canvas.
- **Contenedores con mecánica propia** (`containers.json`, campo `mode` opcional, default
  `"normal"` — los 16 contenedores existentes no lo declaran y no cambian):
  - `bovedaContrarreloj` (`mode: "timed"`, `requiresPrestigeCount: 7`): `digTime` es límite
    duro; si no se completa a tiempo, el contenedor se pierde SIN castigo de dinero (pero
    cuenta para el nivel, igual que una trampa leve). Loot ×1.3.
  - `sotanoSinLuz` (`mode: "dark"`, `requiresPrestigeCount: 8`): solo se ve un radio alrededor
    del puntero durante el escarbado (máscara puramente visual, el modelo de revelado no
    cambia). Loot ×1.4.
  - Ambos van **fuera de la cadena de desbloqueo** (`fueraDeCadena: true`): no exigen poseer el
    contenedor anterior del array, solo su `requiresPrestigeCount` — sin este campo, la regla de
    cadena actual (posición N exige poseer N-1) los dejaría bloqueados hasta el prestigio 9
    (`vertederoBigBang`, que va después en el array). `isContainerUnlocked` es el único punto
    del engine que lo respeta (ROADMAPv4 §3.5.2).
  - `mechanicValueMult` (multiplicador de valor, 1.3/1.4): compensa el riesgo/dificultad de la
    mecánica propia. Se aplica al valor final del ítem junto a `getLevelValueMult`
    (`getMechanicValueMult(container)` en `economy.js`, default 1 — neutro para los 16
    contenedores existentes). Valores de `costoInicial`/`digTime`/`resistencia`/
    `areaRecomendada`/`trapPenaltyMult`/`levelUpDigsBase`/`probTrampaBase` interpolados entre
    `naufragioTemporal` (tier 14, prestigio 7) y `vertederoBigBang` (tier 16, prestigio 9) por
    interpolación geométrica (costos/resistencia/área) o lineal (el resto), con `t = 0.33` para
    la Bóveda y `t = 0.67` para el Sótano — mismo criterio para los 14 ítems de sus pools.
  - El timer visible de la Bóveda y la máscara de oscuridad del Sótano (interacción/UI) son
    tarea de 20.C: acá solo se define la data y el gate de desbloqueo.

### 4.25 Sets de colección (ronda 22)

Completar el pool ENTERO de un contenedor (todos sus ítems presentes en
`state.itemsFoundByItem[containerId]` con contador > 0) otorga, mientras siga completo, un bonus
permanente al valor de venta de ESE contenedor:

```
multSet(contenedor) = 1 + setBonusPercent   (si el set está completo)
multSet(contenedor) = 1                     (si no)
```

`setBonusPercent: 0.02` (AJUSTE: +2%, `data/collectionSets.json`) suma con `getLevelValueMult`
(§11.3) — ambos son multiplicadores independientes sobre el valor final del ítem, ninguno
reemplaza al otro. El estado de "set completo" es puramente derivado de `itemsFoundByItem` contra
`itemsData.containers[id].length` (mismo criterio que `getCollectionCompletion`, ronda 19): sin
campo nuevo persistido, no puede desincronizarse. `getSetBonus(state, container, itemsData)` en
`economy.js` es la única fuente de este multiplicador; se aplica en el mismo punto de
`rollContainerResult` donde ya se aplica `getMechanicValueMult`.

### 4.26 Legendarios (ronda 22)

1 ítem único por categoría de rareza (8 en total — una por cada entrada de `items.json.rarities`),
FUERA de los pools normales de `items.json`. Viven en `data/legendaries.json`:
`{ legendaryChance: number, items: [{ id, name, icon, categoria, valorBase }] }`, con
`valorBase ≈ 40×` el mejor ítem normal de esa categoría (el de mayor `valorBase` entre todos los
contenedores).

- **Roll**: en `rollContainerResult`, tras resolver el slot 1 (y solo si el resultado NO fue
  trampa), un roll independiente con `legendaryChance: 1/500` (constante en `legendaries.json`)
  decide si aparece un legendario. Si sale y la categoría rolleada en el slot 1 coincide con la
  `categoria` de algún legendario que el jugador **todavía no posee**
  (`!state.legendariesFound.includes(id)`), ese legendario **reemplaza** el ítem del slot 1
  (mismo `moneyDelta`, recalculado con el valor del legendario en vez del ítem normal). Un
  legendario ya poseído nunca vuelve a salir (ni consume el roll de probabilidad si su categoría
  no tiene legendario disponible: el roll de `legendaryChance` en sí siempre se consume desde
  `random`, para que la secuencia de RNG sea estable, pero la sustitución solo ocurre si hay un
  legendario elegible).
- **Solo escarbado manual**: `isAuto` en `true` nunca rollea legendario — es el premio del
  jugador activo, no del robot (mismo criterio que la racha de escarbado, §4.20).
- **Persistencia**: `state.legendariesFound: string[]` (ids). Los legendarios NUNCA entran a
  `itemsFoundByItem` (la vitrina es su casa, no el INDEX) y no cuentan para el % de completitud
  de §5.4/ronda 19 — tienen su propio contador "Vitrina X/8".
- **Contrato §3.5.3 (irrevocable)**: los legendarios se venden SIEMPRE de forma instantánea, nunca
  entran al inventario de un puesto de venta futuro ni los toca ninguna automatización de venta;
  su persistencia es exclusivamente `legendariesFound`.

### 4.27 Precio de venta en el Puesto de Chatarra (ronda 23)

```
precioPuesto = baseValue × fluctuacionMercadoActual × (stallMultBase + stallMultPorNivel × (stallLevel - 1))
```

`baseValue` es el MISMO cálculo de `itemSaleValue` que el roll normal (incluye rareza, Suerte,
`getLevelValueMult`, `getMechanicValueMult` y `getSetBonus`), pero con `fluctuacionMercado: 1` — se
persiste así en el inventario para no aplicar la fluctuación dos veces (una al hallar, otra al
vender). La fluctuación real se toma **al vender**, no al guardar: es la mecánica de timing de
mercado — guardar y vender cuando la cotización está alta. Toda venta (manual o del robot vendedor)
refresca primero la fluctuación con `refreshMarketFluctuation` (rng.js, el mismo helper del roll),
para que un jugador que no escarba no venda para siempre con la cotización congelada.

Constantes (`data/stall.json`): `stallCost: 30000` (AJUSTE: entre los tiers 4-5 de contenedor,
~30-60 min de juego), `stallMultBase: 1.25`, `stallMultPorNivel: 0.05`, `stallNivelMax: 5`. Costo de
subir de nivel: `stallCost × 4^(nivel-1)` (con `nivel` el nivel de destino; comprar el puesto en sí
es alcanzar el nivel 1, mismo costo `stallCost`). Capacidad del inventario:
`stallCapacityBase: 12 + stallCapacityPorNivel: 6 × (stallLevel - 1)`.

### 4.28 Pedidos del Puesto (ronda 23)

2 pedidos activos a la vez, generados sobre las categorías de los contenedores **poseídos**
(nunca se pide algo inalcanzable). Un pedido: `{ id, npcId: 'salomon', categoria, cantidad (2-4),
mult: orderMult, progress }`. Vender un ítem cuya categoría coincide con un pedido activo con
`progress < cantidad` paga `precioPuesto × orderMult` (`orderMult: 1.4`) y suma 1 a `progress`; al
llegar a `cantidad` el pedido se cumple (se retira de `state.stallOrders` y se cuenta en
`state.ordersFulfilledCount`). La reposición a 2 pedidos activos y la rotación completa cada
`orderRotationMs: 1200000` (20 min, reloj clampeado §3.3, aunque no se haya cumplido nada) viven en
`rotateStallOrders` — función aparte de la venta (el engine mantiene la venta de un ítem y la
generación de pedidos como responsabilidades separadas); el llamador (store/UI, 23.C) invoca
`rotateStallOrders` tras cada venta y periódicamente para completar el par.

### 4.29 Robot vendedor (ronda 23)

Automatización nueva (`data/automations.json`, efecto `enablesStallVendor`): cada
`vendedorIntervalo: 20` s (reloj clampeado §3.3, mismo patrón que la fluctuación de mercado) vende 1
ítem del inventario del puesto, con prioridad (1) ítems que satisfacen un pedido activo, (2) el de
mayor `baseValue`. Vende a `precioPuesto` (con el mult del pedido si corresponde), refrescando la
fluctuación como cualquier venta. **Offline**: dentro de `applyOfflineProgress`, vende sobre el
inventario ya persistido a fluctuación fija 1 (sin timing gratis mientras el jugador duerme), ANTES
de sumar la ganancia instantánea del loot generado offline (ese loot nunca pasa por el inventario:
el modal offline no gestiona captura).

---

## 5. UI / UX

Inspirado en la interfaz limpia y minimalista del juego de referencia, donde el foco siempre está en el área de interacción principal y las estadísticas relevantes son visibles sin abrir menús.

### 5.1 Layout de pantalla principal (desktop y mobile, responsive)

```
┌─────────────────────────────────────────┐
│  [Dinero: $1,234]   [Llaves: 3]   [⚙]    │  ← barra superior fija
├─────────────────────────────────────────┤
│                                           │
│         ÁREA DE ESCARBADO ACTIVA         │  ← canvas principal, ocupa
│        (contenedor actual + canvas)      │     el 55-65% de la pantalla
│                                           │
├─────────────────────────────────────────┤
│  [Suerte ▲]  [Fuerza ▲]  [Área ▲]        │  ← mejoras rápidas, siempre visibles
├─────────────────────────────────────────┤
│  Tienda de contenedores | Automatización │  ← pestañas inferiores
│  | Logros | Prestigio                    │
└─────────────────────────────────────────┘
```

En mobile: la barra de pestañas inferior se vuelve barra de íconos fijos (estilo app nativa), y el área de escarbado pasa a ocupar casi toda la pantalla con las stats colapsadas en un panel deslizable desde abajo.

### 5.2 Feedback visual obligatorio

- Al revelar un objeto: pequeña animación de "pop" + partícula de color según rareza + sonido corto.
- Al activar una trampa: vibración visual (shake) breve de la pantalla + flash rojo tenue + sonido grave (nunca usar sonidos agresivos o de "alarma" fuerte — el castigo debe sentirse como un chasco, no como un fallo grave).
- Contador de dinero: nunca debe saltar de golpe; animar el conteo numérico (tween) en 300-500ms.
- Botones de compra: deshabilitados (grises, opacidad 50%) cuando no alcanza el dinero, con tooltip mostrando cuánto falta.
- Al desbloquear una categoría nueva de objeto: modal corto y celebratorio, no bloqueante (auto-cierra en 3s o con tap).
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

### 5.3 Identidad visual: "The Workshop" (mockup canónico)

Dirección de arte **canónica y única**: el mockup
`reference/ui/stitch_est_tica_de_vanguardia/dumpster_empire_clean_scavenge_area/code.html`
("The Workshop"). Todas las pantallas se re-anclan a ese diseño; reemplaza cualquier "fusión"
anterior. Es el mejor diseño disponible y la fuente de verdad visual.

- **Paleta:** fondo muy oscuro cálido tipo taller/madera (`#191208` de base), superficies de
  madera/banco de trabajo, acentos ámbar/verde para acciones. Warm, no frío.
- **Tipografía:** **Plus Jakarta Sans** (400/500/700/800) para todo — titulares, números y cuerpo.
  (Reemplaza Fredoka/Nunito/JetBrains Mono del intento anterior.)
- **Componentes táctiles del mockup:** tarjetas con extrusión fuerte (`box-shadow: 0 8px 0 0
  rgba(0,0,0,.4)`, se hunden 4px al `:active` → `.tactile-card`), botones "squishy" (`0 6px 0 0`,
  hundimiento con easing elástico → `.squishy-button`), texturas de **veta de madera** (`.wood-texture`)
  y de **superficie rascable** (`.scratch-surface`), y bordes "rasgados" (`.torn-edge`, clip-path).
- **Colores de rareza (sección 2.5):** los ocho tonos (`--r-common` … `--r-future`) resaltan sobre
  el fondo oscuro; los objetos de rareza alta llevan **bloom** (glow de color).
- **Íconos:** **Material Symbols** (como el mockup) o el registro SVG propio ya existente, pero con
  el trazo/estilo del mockup. **Cero emojis**, en ningún lado (data ni UI). Si se usan Material
  Symbols, se auto-hospedan para el build offline de Steam y se acredita su licencia (Apache/OFL).
- Todos los tokens (colores, tipografía, radios, sombras, texturas) viven centralizados en
  `apps/game/styles/tokens.css`. Cero valores sueltos hardcodeados.

### 5.4 Pantallas secundarias requeridas

1. Tienda de contenedores (grid de tarjetas con imagen, costo, categorías posibles, botón comprar/escarbar).
2. Panel de Automatización (lista de robots/maquinaria, estado on/off, throughput actual).
3. Logros (grid con estado bloqueado/desbloqueado, mínimo 25 logros).
4. Árbol de Prestigio (visualización tipo árbol o grid de nodos conectados, con botón grande de "Prestigiar" que muestra una preview de cuántas Llaves se obtendrían si se prestigiara ahora).
5. Configuración (volumen, reset de partida con doble confirmación, exportar/importar guardado como texto).
6. Estadísticas (vista propia, abierta desde un botón del header — no es subvista de Configuración
   desde la ronda 21 de ROADMAPv4).

El selector de herramientas de escarbado (§4.23) vive como sección de la vista Escarbar (no de
Configuración) desde la ronda 21 de ROADMAPv4.

---

## 6. ARQUITECTURA TÉCNICA

### 6.1 Stack

> El detalle completo y las versiones pineadas están en `DESARROLLO.md` sección 3. Resumen:

- **HTML5 + CSS3 + JavaScript vanilla (ES modules), buildless.** Sin frameworks (React/Vue/etc.) ni
  bundler para el juego. El navegador carga los módulos con `<script type="module">` e **import maps**;
  el juego se sirve estáticamente. La lógica de juego se importa desde un paquete compartido
  (`packages/engine`) vía import map, sin paso de build.
- **Monorepo con npm workspaces** que separa **lógica pura** de **presentación** de **empaquetado**:
  `packages/engine` (economía y sistemas, cero DOM, testeable con **Vitest** en Node), `apps/game`
  (HTML/CSS/canvas/UI) y `apps/desktop` (**Electron + steamworks.js** para Steam).
- Canvas 2D nativo para la mecánica de escarbado (sección 2.2).
- `localStorage` para guardado + **Steam Cloud** vía el proceso principal de Electron. Estado completo
  serializado en JSON, con `saveVersion` y validación al importar.
- Sin backend propio, sin librerías de terceros pesadas. Si se necesita algo puntual (tweening de
  números, partículas, SFX), se implementa en una función propia corta (WebAudio/Canvas) en vez de
  sumar una librería.

### 6.2 Estructura de carpetas

> La estructura **obligatoria y actual** es la del monorepo, definida en `DESARROLLO.md` sección 4.
> Separa `packages/engine` (lógica pura, cero DOM) de `apps/game` (presentación) y `apps/desktop`
> (Electron/Steam). Resumen:

```
dumpster-empire/                 ← monorepo (npm workspaces)
├── packages/engine/             ← lógica pura: state, economy (§4 literal), systems, save, format
│   └── tests/                   ← Vitest (economía, save, prestigio, offline)
├── apps/game/                   ← index.html (import map) + styles/ + src/{dig,ui,fx,icons,data}
├── apps/desktop/                ← Electron + steamworks.js (logros + Steam Cloud) + electron-builder
├── tools/steam/                 ← VDF de SteamPipe
├── reference/                   ← SOLO consulta: dumpster-empire.html + ui/ (mockups). NO se buildea.
├── agentes/                     ← prompts por agente + HANDOFF.md
├── PLAN.md · CLAUDE.md · DESARROLLO.md · README.md
```

La frontera es dura: **el engine no toca el DOM** y la **UI no reimplementa fórmulas**. La UI lee
estado y despacha acciones; toda la economía vive en `packages/engine`. (La estructura de un solo
`src/` que aparecía en versiones anteriores de este plan queda reemplazada por la de `DESARROLLO.md`.)

### 6.3 Sistema de guardado

- Autoguardado cada 15 segundos y al cerrar/ocultar (`visibilitychange`) y en `before-quit` de Electron.
- Guardar también un timestamp `lastSavedAt` para calcular el progreso offline al volver (sección 4.5).
- Versión de esquema de guardado (`saveVersion`) incluida en el JSON, con función de migración simple si en el futuro cambia la estructura — aunque sea v1, dejar el campo listo.
- **Steam Cloud:** en Electron, el archivo de guardado vive en `userData` y se mapea a Steam Cloud
  para sincronizar entre máquinas (PC ↔ Steam Deck). Manejar el caso de **conflicto de guardado en
  la nube** (elegir el más reciente por `lastSavedAt`, nunca pisar en silencio una partida más avanzada).
- Botón de exportar/importar: codifica el JSON de guardado en base64 como texto que el usuario puede
  copiar y pegar (backup manual, independiente de Steam Cloud).

### 6.4 Rendimiento

- El loop principal corre con `requestAnimationFrame` para todo lo visual, y un `setInterval` separado de 1 segundo (o cálculo por delta de tiempo real, preferible) para la lógica de producción automática — para que la economía no dependa de que la pestaña esté en foco.
- El canvas de escarbado debe limpiar y redibujar solo el área afectada por el gesto, no todo el canvas en cada frame.

---

## 7. CONTENIDO MÍNIMO A GENERAR

La IA debe crear, como mínimo, antes de considerar el proyecto terminado:

- [ ] 8 categorías de objetos (sección 2.5), cada una con 6-8 objetos únicos (nombre, ícono SVG simple, rango de valor).
- [ ] 8 contenedores (sección 2.6) completamente balanceados según las fórmulas de la sección 4.
- [ ] Al menos 4 mejoras repetibles (Suerte, Fuerza, Área, Capacidad) + 8 mejoras de automatización de un solo uso (sección 2.7).
- [ ] Árbol de prestigio con mínimo 12 nodos (sección 2.8).
- [ ] Mínimo 25 logros, cubriendo: hitos de dinero total, hitos de objetos encontrados por categoría, hitos de prestigios, logros "raros" (ej. encontrar un objeto legendario específico).
- [ ] Tutorial mínimo: las primeras 3 acciones del jugador (escarbar el tacho gratis, comprar la primera mejora, comprar el primer contenedor de pago) deben tener un tooltip guiado que se muestra una sola vez.

---

## 8. MONETIZACIÓN

Modelo definido: **título premium en Steam (compra única).** No hay anuncios, no hay compras in-app,
no hay mecánicas de retención forzada ni "pagar para no esperar" (el progreso offline de 4.5 ya
cubre esa necesidad gratis para todos). El jugador paga una vez y tiene el juego completo.

- Cualquier contenido pago futuro debe ser **DLC cosmético opcional** (skins de contenedor, temas de
  color) sin ventaja de gameplay — y es **postre**, no parte del V1.
- Nada de anuncios intersticiales ni recompensados: rompen el loop y no aplican a un título premium.
- Esta sección es de **baja prioridad**: el foco del V1 es un juego completo y sin bugs (secciones 1-7 y 9).

---

## 9. INSTRUCCIONES DE EJECUCIÓN

El orden de construcción real, por fases y con tareas asignables a agentes Sonnet, está en
`DESARROLLO.md` sección 7 (Roadmap) y sección 8 (Desglose de tareas). Resumen del orden:

1. Andamiaje del monorepo (npm workspaces, `packages/engine` + `apps/game` vacíos, Vitest, import map).
2. `packages/engine`: fórmulas de la sección 4 (literales) + **tests de Vitest** que confirman los
   costos de los primeros 10 niveles de cada mejora, llaves de prestigio, offline y prob. de trampa.
3. Data completa en `apps/game/src/data/*.json` con los valores que arrojan las fórmulas ya aplicadas
   (sin placeholders "TODO: definir valor").
4. Mecánica de canvas de escarbado (`apps/game/src/dig/`) + vistas que consumen el engine.
5. Sistemas de automatización, offline, prestigio (árbol de nodos conectados) y logros.
6. Cerrar huecos de UI del PLAN (§5.2/§5.4): sonido, partículas, tween, íconos SVG (sin emojis).
7. Pulido visual fusión ámbar+Stitch (§5.3), mobile-first / Steam Deck.
8. Pase de balance contra los hitos de la sección 3 (ajustar **constantes de data**, no fórmulas).
9. Empaquetado Steam (`apps/desktop`: Electron + steamworks.js + electron-builder).
10. **Auditoría final** (sección 10) antes de entregar.

**Decisiones que te corresponde tomar sin consultarme** (lista no exhaustiva, pero ejemplo del criterio a aplicar): nombres exactos de cada objeto individual, íconos SVG simples (formas geométricas básicas está bien, no hace falta arte complejo), textos de logros, copys de la UI, paleta exacta dentro del rango indicado en 5.3, nombres de las 2-3 "ciudades" de prestigio adicionales más allá de la primera.

**Si encontrás un problema durante el desarrollo, arreglalo sin preguntarme y dejá registrado el cambio en un comentario `// AJUSTE:` en el código correspondiente.** No te detengas a esperar mi confirmación en ningún punto del proceso — segui trabajando hasta haber cubierto el checklist completo de la sección 10.

---

## 10. CHECKLIST DE AUTOAUDITORÍA FINAL

Antes de considerar el proyecto entregado, recorré esta lista explícitamente y corregí cualquier ítem que falle. No declares el proyecto "terminado" si hay ítems sin marcar.

**Jugabilidad**
- [ ] El juego abre y es jugable tanto sirviendo `apps/game` estáticamente como dentro de Electron (`apps/desktop`), sin errores de consola.
- [ ] Cada stat (Suerte, Fuerza, Área, Capacidad) cambia un número visible y relevante para el jugador (nada de mejoras inútiles como la Fuerza del prototipo).
- [ ] Se puede completar el loop entero: escarbar → vender → mejorar → comprar contenedor nuevo → automatizar → prestigiar, al menos una vez, de punta a punta.
- [ ] Los hitos de ritmo de la sección 3 se cumplen aproximadamente con los valores numéricos implementados.
- [ ] Ningún botón de acción queda permanentemente deshabilitado por un bug (ej. costo mal calculado que da `NaN` o `Infinity` prematuro).

**Economía**
- [ ] Las fórmulas de la sección 4 están implementadas literalmente (no aproximadas).
- [ ] Los números grandes se formatean legibles (K, M, B, T...) y nunca se muestran con notación científica cruda al jugador.
- [ ] No existe ninguna combinación de compras que rompa la economía (ej. un loop infinito de dinero sin gastar tiempo real).

**Guardado**
- [ ] El guardado persiste correctamente al recargar y al cerrar/abrir la app de Electron.
- [ ] El progreso offline se calcula correctamente al volver tras cerrar la app.
- [ ] Exportar/importar guardado funciona ida y vuelta sin pérdida de datos.
- [ ] Steam Cloud sincroniza el guardado y resuelve conflictos por `lastSavedAt` sin pisar la partida más avanzada.

**UI/UX**
- [ ] El layout responde correctamente en mobile, Steam Deck (1280×800) y desktop (probar en al menos 375px, 1280px y 1440px de ancho).
- [ ] Todo elemento interactivo tiene feedback visual al hacer hover/tap.
- [ ] No hay texto cortado o desbordado en ningún panel con números grandes.
- [ ] No queda ningún emoji como ícono; todos los íconos son SVG/Material Symbols.

**Contenido**
- [ ] Las 8 categorías de objetos están completas, con ningún campo vacío o placeholder.
- [ ] Los 8 contenedores están balanceados según fórmulas, sin valores copiados sin ajustar.
- [ ] Los 25+ logros tienen condición de desbloqueo verificable en código (no solo texto decorativo).

**Código**
- [ ] No quedan `console.log` de debug olvidados.
- [ ] No quedan comentarios `// TODO` sin resolver.
- [ ] Los archivos siguen la estructura del monorepo (`DESARROLLO.md` sección 4) sin desvíos no justificados.
- [ ] La frontera engine↔UI se respeta: `packages/engine` no toca el DOM y la UI no reimplementa fórmulas.
- [ ] Los tests de Vitest del engine están verdes (economía, save, prestigio, offline).

**Steam / empaquetado**
- [ ] `electron-builder` produce instalables para Win/Mac/Linux (Linux cubre Steam Deck).
- [ ] Los logros del engine disparan logros de Steam; Steam Cloud queda configurado contra el appId.

**Cierre**
- [ ] Un `README.md` explica cómo correr el juego localmente en 3 pasos o menos.
- [ ] Se entregó una nota final breve (no extensa) resumiendo qué se construyó y qué quedaría como posible expansión futura.

---

## REGLA FINAL

Trabajá de forma continua hasta entregar el proyecto completo y auditado contra la sección 10. No te detengas a mitad de camino. No me pidas que confirme decisiones de diseño menores — este documento ya contiene todo lo necesario para que tomes esas decisiones vos mismo. Priorizá siempre tener un juego pequeño y funcional por sobre uno grande y roto.


## 11. REVISIÓN POST-PLAYTEST — SCOPE V1.1

> Tras jugar el V1 (Agentes S y 0–4 cerrados), se detectaron ajustes de diseño y features nuevas que
> **entran al V1**. Esta sección **extiende y, donde se indica, reemplaza** partes anteriores del plan.
> El detalle de ejecución (fases, agentes) está en `DESARROLLO.md`.

### 11.1 Fixes de UX (corrigen comportamiento actual)

- El prompt "Elegí un contenedor para escarbar" y el botón "Escarbar el Tacho de Vereda (gratis)"
  aparecen hoy en **todas** las pestañas. Deben mostrarse **solo en la Tienda**; en el resto, ninguno.
- Las mejoras rápidas (Suerte / Fuerza / Tamaño) hoy están **siempre visibles**. Deben mostrarse
  **solo en la pantalla de escarbado**, no en otras secciones (son cosas distintas).
- En Prestigio, el copy "Prestigiar" se reemplaza por **"Hacer Prestigio"**.
- La sección de **exportar/importar guardado se elimina** (Steam Cloud cubre la persistencia; era
  ruido inútil para el jugador).
- La sección de **Automatización debe explicar cómo funciona** (qué hace cada máquina, cómo se
  encola y procesa). Hoy no se entiende. (Nota: que los botones estén deshabilitados es correcto —
  es falta de dinero, que se corrige en el pase de balance, no un bug.)

### 11.2 Economía jugable (extiende §2.3, §2.6, §4)

- **Se pierde demasiada plata.** La pérdida debe **bajar a medida que sube la Suerte** y ningún
  contenedor recién comprado debe ser una ruina segura. Objetivo: con la Suerte recomendada de un
  contenedor (ver abajo), ese contenedor es **rentable en promedio**. Perder sigue siendo posible,
  pero acotado.
- **Suerte recomendada por contenedor:** cada contenedor muestra, al lado, un **nivel de Suerte
  recomendado** a partir del cual conviene comprarlo (punto de rentabilidad esperada positiva). Es
  un dato derivado de la economía (lo calcula el engine), visible en la Tienda. **Se calcula contra
  un jugador neutro** (sin mejoras, contenedor a nivel 0): es una meta FIJA de progresión por
  contenedor y no baja a 0 a medida que la partida avanza (ronda 7; antes usaba los
  multiplicadores actuales del jugador y en partidas avanzadas colapsaba a "0 (alcanzada)").
- **Resistencia por contenedor (extiende §2.3 Fuerza):** cada contenedor tiene una **resistencia**;
  escarbarlo requiere una **Fuerza mínima** para hacerlo a ritmo normal — con menos Fuerza se puede
  igual, pero es mucho más lento. A mejor contenedor, más resistencia. El ritmo del engine es
  `ritmo = clamp(Fuerza / resistencia, 0.3, 1.5)` (ronda 7: si tu Fuerza supera la resistencia
  escarbás MÁS grande que lo normal, hasta +50%; si no llega, mucho más chico). En el gesto, el
  radio del pincel es `radioBase × √multÁrea × ritmo`, con tope duro de **1.5× el radio del
  objeto**: el Área crece con raíz (no lineal — a nivel alto trivializaba todo contenedor por
  igual) y ningún build convierte el escarbado en un toque único.
- **Trampas más caras (extiende §4.6):** el castigo de trampa debe **sacar más plata** y escalar con
  el tier del contenedor, para que el riesgo importe de verdad. El monto es fijo por tier; la
  Suerte solo reduce la probabilidad (ver §4.6, ronda 7).
- Además de la Suerte, cada contenedor tiene **Fuerza recomendada** y **Búsqueda recomendada**
  (ronda 10): la Fuerza recomendada es su `resistencia` (con ella el ritmo de escarbado llega a
  1.0) y la Búsqueda recomendada es la constante de datos `areaRecomendada` (con ella el pincel
  compensa el tamaño del contenedor). Son metas VISIBLES que penalizan pero no bloquean: por
  debajo, el gesto es lento y chico (piso de ritmo 0.3) y la excavación rinde menos.
- Las tres metas crecen **exponencialmente** por tier (~×1.35 Fuerza/Búsqueda, ~×1.6 Suerte):
  la progresión exige invertir en las tres stats, no solo en Suerte.

### 11.3 Niveles de contenedor (NUEVO — extiende §2.6)

- Cada contenedor tiene un **nivel propio, de 1 a 10**, que sube a medida que el jugador lo escarba
  (por cantidad de escarbados o de progreso acumulado en ese contenedor).
- A mayor nivel, **mejoran las probabilidades de ítems de mejor rareza** dentro de ese contenedor.
- El nivel es **persistente** (parte del save) y por contenedor.
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
- Fórmula de subida y curva de mejora de odds: se definen en el engine y se calibran en el pase de
  balance (§3). Documentar las constantes en `data/containers.json`.

### 11.4 Ítems únicos por contenedor (NUEVO — reemplaza el modelo de categorías compartidas de §2.5)

- Hoy los contenedores comparten *categorías*, así que el mismo ítem sale en varios. **Cada
  contenedor debe tener su propio set de ítems, sin ninguno repetido entre contenedores.**
- Se conservan las **rarezas** (§2.5) como escala de valor, pero cada ítem individual pertenece a un
  único contenedor. Cada contenedor tiene 6–8 ítems propios con nombre, ícono y rango de valor.
- Esto habilita la Colección/INDEX (abajo) y hace que descubrir un contenedor nuevo se sienta distinto.

### 11.5 Colección / INDEX por contenedor (NUEVO — promovido desde "postre")

- Cada contenedor tiene una vista **INDEX** que lista **todas sus recompensas posibles**.
- Las que el jugador **todavía no encontró** aparecen **ocultas** (silueta / "???").
- Una vez que salió al menos una vez, la recompensa se **revela** mostrando: **ícono, nombre,
  probabilidad (%), valor/precio y cantidad obtenida** (contador de cuántas veces se encontró).
- El tracking se apoya en lo ya existente (`itemsFoundByCategory` / hallazgos por ítem).

### 11.6 Recompensas de logros (NUEVO — extiende §7)

- Los logros dejan de ser solo texto: **otorgan recompensa**.
- **Llaves de Ciudad** para hitos difíciles o significativos (p. ej. primer millón, primer prestigio,
  hallar un ítem muy raro).
- **Dinero** para el resto — una cantidad **buena pero no rota** (no regalar dinero que vuelva OP al
  jugador). Los montos se calibran en el pase de balance.
- Cada logro declara su recompensa en `data/achievements.json` (tipo + cantidad), verificable en engine.

### 11.7 Árbol de prestigio real y simétrico (reemplaza el layout plano actual, extiende §2.8)

- El árbol actual es una grilla/agrupación visual sin dependencias reales. Se rediseña como un
  **árbol conectado y simétrico**, estilo grafo de nodos (referencia visual: n8n o Scritchy Scratchy).
- Para que sea un árbol de verdad, `data/prestigeTree.json` debe declarar **dependencias reales**
  entre nodos (`requires`), de modo que desbloquear ramas tenga orden y estructura.
- Las conexiones se dibujan explícitas y balanceadas (simétricas), no una lista.

### 11.8 Pantalla de inicio / menú (NUEVO — extiende §5)

- El juego **arranca en una pantalla de inicio** (title screen) con **logo del juego**, botón
  **"Jugar"**, acceso a **Configuración** (engranaje abajo a la derecha) y los elementos clásicos de
  un menú. "Jugar" entra directo a la pantalla de escarbado.
- Estética: la misma de §5.3 ("The Workshop").

### 11.9 Flujo de pantallas (extiende §5.1)

`Pantalla de inicio` → "Jugar" → `Pantalla de escarbado` (default). La pantalla de escarbado muestra
las mejoras rápidas; las demás pestañas (Tienda / Automatización / Logros / Prestigio / INDEX) no
muestran ni el prompt de "elegí contenedor" ni las mejoras rápidas.

---

## Posibles adiciones a futuro:
> **Nota:** varios ítems que antes estaban acá fueron **promovidos al V1** en la sección 11
> (colección/INDEX, y las bases para logros con recompensa). Lo que sigue queda como postre real.

Contenido nuevo (fácil de sumar con la estructura actual)

Objetos especiales/legendarios raros: un ítem único por categoría con probabilidad bajísima (ej. 1 en 500) que dé un logro + un multiplicador cosmético o un "trofeo" visible en un salón de la casa.
Eventos de contenedor: de vez en cuando aparece un contenedor "dorado" o "en llamas" (tiempo limitado, 60-90s) con mejor loot o más trampa, para generar urgencia.
Clima/turnos: de noche (real, según hora del sistema) más suerte pero más trampa; de día al revés. Le da un motivo para volver en distintos horarios.
Misiones diarias/semanales: "encontrá 5 antigüedades hoy", dan dinero o llaves de prestigio extra. Ya tenés itemsFoundByCategory, así que el tracking es casi gratis.

🧠 Mecánicas de decisión (le falta algo de "riesgo/recompensa" activo)

~~Espiar antes de cavar gastando "energía" para revelar 1 de los 3 slots antes de decidir si seguís o abandonás.~~ Implementado en la ronda 20 y descartado ("es totalmente inútil") por decisión del usuario 2026-07-14 (ronda 21 de ROADMAPv4) — idea descartada, no reabrir.
Trampas con grados: en vez de solo "trampa sí/no", que algunas trampas solo te hagan perder el ítem actual y otras te hagan perder tiempo/plata, con indicios visuales (grietas, olor, sonido) para que el jugador aprenda a leerlas.
Negociación de venta: al vender, ofrecer "vender ahora" vs "guardar para el mercado" (ligado a marketFluctuation), agregando un mini-inventario temporal.
 
🏆 Progresión / prestigio

Segunda moneda de prestigio con su propio árbol temático (ej. "contactos" que desbloquean compradores especiales por categoría, no solo multiplicadores).
Especializaciones: al prestigiar, elegir un "estilo" (Coleccionista, Chatarrero, Anticuario) que da bonus fuerte a 2-3 categorías pero penaliza el resto — le da rejugabilidad a las runs.
Contenedores prestigio-exclusivos ya tenés 1 (containerExtradimensional); podrías escalar con 2-3 más atados a prestigeCount más alto, cada uno con una mecánica nueva (ej. cavar con tiempo límite estricto, o "modo oscuridad" donde no ves el minimapa de suciedad).

🎨 Feedback / juice (mejoras rápidas de sensación)

Partículas y sonido al encontrar rareza alta (ya tenés colores por rareza, aprovechalos con un destello/confeti en finishDig).
Racha de excavación: contador visual de "combo" si encadenás varios cavados sin trampa, con un pequeño bonus de suerte temporal.
Vibración táctil (Vibration API) en trampas y hallazgos épicos en mobile, ya que el juego está claramente pensado para touch (touch-action:none).

💰 Retención / meta

Progreso offline visible con resumen "mientras no estabas" al volver (ya calculás applyOfflineProgress; se puede mostrar como un modal tipo "encontraste 12 objetos, ganaste $X" con lista de highlights).
Sistema de colección/album: una vitrina donde se van "fichando" todos los ítems únicos encontrados alguna vez (ya tenés los nombres/iconos en ITEMS), con % de completitud por categoría.