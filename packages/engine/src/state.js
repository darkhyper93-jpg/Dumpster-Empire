/**
 * Forma del estado de la partida y su versión de esquema de guardado.
 * Cero DOM: este módulo no debe importar nada del navegador.
 */

/** Versión actual del esquema de guardado. Bump al cambiar la forma del estado. */
// AJUSTE (Fase 6, PLAN.md §11.3): bump a 2 por los dos campos nuevos de nivel de contenedor
// (containerLevels/containerLevelProgress). save.js migra saves v1 rellenando ambos en {}.
// AJUSTE (Fase 7, PLAN.md §11.5): bump a 3 por `itemsFoundByItem`. El INDEX por contenedor
// necesita saber qué ítem específico salió y cuántas veces (no solo la categoría agregada que
// ya trackeaba itemsFoundByCategory) — sin este campo la vista no puede revelar/ocultar ítems
// individuales ni contar hallazgos reales (incluye los del robot de automatización, que nunca
// pasan por la UI). save.js migra saves v1/v2 rellenando el campo en {}.
// AJUSTE (PUNTOS_A_MEJORAR_2.md §5): bump a 4 por `volume` (0..1) — el control de volumen de
// Configuración se persiste junto a `soundOn`. save.js migra saves v1/v2/v3 rellenando `volume: 1`.
// AJUSTE (ronda 14): v5 agrega autoTargetContainerId (selector del robot),
// digSensitivity (slider de sensibilidad) y language (base de i18n es/en).
// AJUSTE (ronda 15): v6 agrega trapsDiscarded (contador de contenedores con trampa que el
// robot descartó vía el nodo de prestigio "Escáner de Trampas", PLAN.md §4.7).
// AJUSTE (ronda 16): v7 cambia la clave de `itemsFoundByItem` de nombre-español a id estable
// de ítem (PLAN.md §16), para que la colección sobreviva a la traducción.
// AJUSTE (ronda 19): v8 agrega digStreak/bestDigStreak (racha de escarbado manual sin trampa,
// PLAN.md §4.20) y vibrationOn (toggle de vibración táctil, PLAN.md §5.4).
// AJUSTE (ronda 20): v9 agrega energy/energyAt (PLAN.md §4.22), equippedTool/toolsOwned
// (PLAN.md §4.23) y spiesUsed/gravesHit (contadores de logros de la ronda 20).
// AJUSTE (ronda 21): v10 ELIMINA energy/energyAt/spiesUsed — el espionaje se removió del juego
// por decisión del usuario (2026-07-14). Es la primera migración del repo que borra campos en
// vez de agregarlos (ver el patrón documentado en save.js, migración v9->v10). gravesHit y
// equippedTool/toolsOwned NO se tocan: son de las trampas graves y de las herramientas de
// escarbado, sistemas independientes que la ronda 21 conserva.
// AJUSTE (ronda 22): v11 agrega legendariesFound (PLAN.md §4.26) — ids de legendarios ya
// encontrados, FUERA de itemsFoundByItem (la vitrina es su casa, no el INDEX de contenedores).
// AJUSTE (ronda 23): v12 agrega el Puesto de Chatarra (PLAN.md §2.9/§4.27-§4.29): `inventory`
// (ítems capturados, sin vender), `stallLevel`/`keepThreshold` (compra y umbral de captura),
// `stallOrders`/`ordersRotatedAt` (pedidos de Salomón), `stallVendorAt` (reloj del robot
// vendedor, mismo patrón que `marketFluctuationAt`), `stallSoldCount`/`ordersFulfilledCount`
// (contadores para logros) y `storySeen` (viñetas de historia liviana ya vistas, PLAN.md §3.2).
// AJUSTE (ronda 24): v13 agrega misiones diarias (ROADMAPv4.md §4.30/§4.31): `dailyMissions`
// (hasta 3 activas), `missionsRolledAt` (reloj del reroll diario) y `missionsCompletedCount`
// (contador para logros). También agrega `lastEventAt` (§4.32): el evento de contenedor
// dorado/en llamas en sí es TRANSITORIO (nunca se persiste, decisión del roadmap para eliminar
// todo exploit de reloj), pero su cooldown sí, para que reabrir el juego no regale un evento
// instantáneo. `eventsUsedCount` cuenta escarbados exitosos aprovechando un evento activo, para
// el logro "primer evento aprovechado".
// AJUSTE (ronda 25): v14 agrega prestigio profundo (PLAN.md §4.31-§4.33): `specialization`
// (string|null, patrón autoTargetContainerId — save.js solo valida tipo; store.js sanitiza
// contra data/specializations.json real, igual que sanitizeLegendariesFound) y `activeChallenge`
// (ídem contra data/challenges.json), EXCLUYENTES entre sí por run. `challengesCompleted`
// (ids, recompensa permanente ya otorgada — nunca se repite). `specializationsUsed` cuenta
// prestigios con especialización elegida (para su logro). `totalKeysEarned` es un acumulado
// HISTÓRICO (nunca se resetea, a diferencia de `prestigeKeys` que sí se gasta) que la ronda 26
// necesita para la fórmula de Escrituras — la migración lo backfillea con
// `prestigeKeys + costoAcumulado(prestigeTreeLevels)` porque es el mejor estimado posible de lo
// ganado históricamente a partir de lo que el save YA tiene (Llaves sin gastar + Llaves ya
// invertidas en el árbol); un save nuevo simplemente empieza en 0 real desde acá en adelante.
export const SAVE_VERSION = 14;

// AJUSTE (ronda 23): cota de seguridad para `inventory` en validateDeepContent (save.js). No es
// la capacidad de diseño real (esa vive en data/stall.json y save.js es deliberadamente
// agnóstico de datos de balance) — es un techo generoso muy por encima de cualquier capacidad
// realista (12 base + 6×4 niveles = 36) que deja margen a futuros ajustes sin falsos rechazos,
// y a la vez rechaza un array absurdo de un save manipulado.
export const INVENTORY_MAX_SAFETY = 200;

// AJUSTE (auditoría post-ronda 14): rango de diseño de `digSensitivity`, exportado como única
// fuente de verdad. Antes el 0.5–1.5 estaba repetido como número mágico en save.js (validación),
// store.js (clamp), DigCanvas.js (clamp defensivo) y SettingsView.js (min/max del slider).
/** Mínimo del multiplicador del pincel de escarbado (settings). */
export const DIG_SENSITIVITY_MIN = 0.5;
/** Máximo del multiplicador del pincel de escarbado (settings). */
export const DIG_SENSITIVITY_MAX = 1.5;

/**
 * @typedef {Object} AutoProcessingSlot
 * @property {string} containerId
 * @property {number} totalTime
 * @property {number} remaining
 */

/**
 * @typedef {Object} GameState
 * @property {number} saveVersion
 * @property {number} money
 * @property {number} totalMoneyEarned
 * @property {Object<string, number>} upgradeLevels - nivel por id de mejora repetible (luck, digPower, area, capacity)
 * @property {Object<string, number>} ownedContainers - cantidad comprada por id de contenedor
 * @property {Object<string, number>} containerLevels - nivel (1-10) por id de contenedor (PLAN.md §11.3)
 * @property {Object<string, number>} containerLevelProgress - escarbados acumulados hacia el próximo nivel, por id de contenedor
 * @property {Object<string, boolean>} automationOwned - si se compró cada mejora de automatización de un solo uso
 * @property {number} prestigeKeys
 * @property {number} prestigeCount
 * @property {Object<string, number>} prestigeTreeLevels - nivel por id de nodo del árbol de prestigio
 * @property {string[]} achievementsUnlocked
 * @property {number} itemsFoundCount
 * @property {Object<string, number>} itemsFoundByCategory
 * @property {Object<string, Object<string, number>>} itemsFoundByItem - contador por contenedor
 *   e id de ítem (`state.itemsFoundByItem[containerId][itemId]`), para el INDEX (PLAN.md §11.5).
 *   Ronda 16: la clave es el id estable del ítem, no su nombre traducible (PLAN.md §16).
 * @property {number} categoryFragments
 * @property {number} trapsHit
 * @property {number} trapsDiscarded - contenedores con trampa descartados por el robot (PLAN.md §4.7)
 * @property {number} autoProcessedCount
 * @property {string[]} autoQueue - ids de contenedor en espera de ser procesados por el/los robot(s)
 * @property {AutoProcessingSlot[]} autoProcessing
 * @property {number} marketFluctuation
 * @property {number} marketFluctuationAt - epoch ms de la última recalculación
 * @property {number} tutorialStep
 * @property {boolean} soundOn
 * @property {number} volume - volumen maestro de SFX, 0..1 (PUNTOS_A_MEJORAR_2.md §5)
 * @property {number} lastSavedAt - epoch ms, usado para calcular progreso offline
 * @property {string|null} autoTargetContainerId - contenedor fijo que compra el robot; null = Auto (el más caro afordable)
 * @property {number} digSensitivity - multiplicador del pincel de escarbado, rango 0.5–1.5
 * @property {string} language - idioma de la UI: 'es' | 'en'
 * @property {number} digStreak - racha actual de escarbados manuales sin trampa (PLAN.md §4.20);
 *   se resetea a 0 al caer en trampa, sube +1 por escarbado manual exitoso. Solo manual.
 * @property {number} bestDigStreak - racha máxima histórica alcanzada, para logros ocultos.
 * @property {boolean} vibrationOn - toggle de vibración táctil (trampa/hallazgo máximo), ronda 19.
 * @property {string} equippedTool - id de la herramienta de escarbado equipada (PLAN.md §4.23);
 *   siempre una clave presente en `toolsOwned`.
 * @property {Object<string, boolean>} toolsOwned - herramientas de escarbado ya compradas.
 * @property {number} gravesHit - cantidad de trampas de grado grave sufridas (logro oculto ronda 20).
 * @property {string[]} legendariesFound - ids de legendarios ya encontrados (PLAN.md §4.26,
 *   ronda 22); FUERA de itemsFoundByItem — la vitrina es su única persistencia.
 * @property {StallInventoryItem[]} inventory - ítems capturados por el Puesto de Chatarra, sin
 *   vender todavía (PLAN.md §2.9, ronda 23).
 * @property {number} stallLevel - 0 = no comprado; 1-`stallNivelMax` con el puesto activo.
 * @property {number} keepThreshold - valor mínimo para capturar un ítem; 0 = puesto en pausa.
 * @property {StallOrder[]} stallOrders - hasta 2 pedidos activos de Salomón (PLAN.md §4.28).
 * @property {number} ordersRotatedAt - epoch ms de la última rotación completa de pedidos.
 * @property {number} stallVendorAt - epoch ms del último intento del robot vendedor (PLAN.md §4.29).
 * @property {number} stallSoldCount - ítems vendidos en el puesto (manual + robot), para logros.
 * @property {number} ordersFulfilledCount - pedidos cumplidos, para logros.
 * @property {string[]} storySeen - ids de viñetas de historia ya mostradas (PLAN.md §3.2).
 * @property {DailyMission[]} dailyMissions - hasta 3 misiones activas del día (ronda 24, §4.30).
 * @property {number} missionsRolledAt - epoch ms del último reroll diario de misiones.
 * @property {number} missionsCompletedCount - misiones reclamadas históricamente, para logros.
 * @property {number} lastEventAt - epoch ms del último evento de contenedor disparado (§4.32);
 *   el evento en sí es transitorio y NUNCA se persiste (ver systems/events.js).
 * @property {number} eventsUsedCount - escarbados resueltos con éxito mientras un evento de
 *   contenedor estaba activo sobre ESE contenedor (§4.32), para el logro "primer evento
 *   aprovechado".
 * @property {string|null} specialization - id de `data/specializations.json` elegida al último
 *   prestigio (PLAN.md §4.31, ronda 25); dura hasta el próximo. Excluyente con `activeChallenge`.
 * @property {string|null} activeChallenge - id de `data/challenges.json` activo en esta run
 *   (PLAN.md §4.32, ronda 25). Excluyente con `specialization`.
 * @property {string[]} challengesCompleted - ids de desafíos cuya recompensa permanente ya se
 *   otorgó (PLAN.md §4.32); nunca se repite ni se retira.
 * @property {number} specializationsUsed - prestigios donde se eligió una especialización
 *   (no "Sin especialización"), para su logro (ronda 25).
 * @property {number} totalKeysEarned - Llaves de Ciudad ganadas históricamente, nunca se
 *   resetea (a diferencia de `prestigeKeys`, que se gasta). La ronda 26 lo necesita para la
 *   fórmula de Escrituras.
 */

/**
 * @typedef {Object} DailyMission
 * @property {string} id
 * @property {string} type - uno de MISSION_TYPES (systems/missions.js)
 * @property {'easy' | 'medium' | 'hard'} difficulty
 * @property {{ categoria?: string, containerId?: string }} params
 * @property {number} target
 * @property {number} progress
 * @property {boolean} claimed
 * @property {number} snapshot - valor del contador base al momento del roll (delta de progreso)
 * @property {{ type: 'money' | 'keys', amount: number }} reward
 */

/**
 * @typedef {Object} StallInventoryItem
 * @property {string} itemId
 * @property {string} containerId
 * @property {string} categoria
 * @property {number} baseValue - valor con fluctuación de mercado 1 (PLAN.md §4.27), para no
 *   aplicarla dos veces al vender.
 */

/**
 * @typedef {Object} StallOrder
 * @property {string} id
 * @property {string} npcId
 * @property {string} categoria
 * @property {number} cantidad
 * @property {number} mult
 * @property {number} progress
 */

/**
 * Crea un estado nuevo de partida, tal cual arranca un jugador desde cero.
 * @returns {GameState}
 */
export function freshState() {
  return {
    saveVersion: SAVE_VERSION,
    money: 0,
    totalMoneyEarned: 0,
    upgradeLevels: { luck: 0, digPower: 0, area: 0, capacity: 0 },
    ownedContainers: {},
    containerLevels: {},
    containerLevelProgress: {},
    automationOwned: {},
    prestigeKeys: 0,
    prestigeCount: 0,
    prestigeTreeLevels: {},
    achievementsUnlocked: [],
    itemsFoundCount: 0,
    itemsFoundByCategory: {},
    itemsFoundByItem: {},
    categoryFragments: 0,
    trapsHit: 0,
    trapsDiscarded: 0,
    autoProcessedCount: 0,
    autoQueue: [],
    autoProcessing: [],
    marketFluctuation: 1,
    marketFluctuationAt: 0,
    tutorialStep: 0,
    soundOn: true,
    volume: 1,
    lastSavedAt: Date.now(),
    autoTargetContainerId: null,
    digSensitivity: 1,
    language: 'es',
    digStreak: 0,
    bestDigStreak: 0,
    vibrationOn: true,
    equippedTool: 'manos',
    toolsOwned: { manos: true },
    gravesHit: 0,
    legendariesFound: [],
    inventory: [],
    stallLevel: 0,
    keepThreshold: 0,
    stallOrders: [],
    ordersRotatedAt: 0,
    stallVendorAt: 0,
    stallSoldCount: 0,
    ordersFulfilledCount: 0,
    storySeen: [],
    dailyMissions: [],
    missionsRolledAt: 0,
    missionsCompletedCount: 0,
    lastEventAt: 0,
    eventsUsedCount: 0,
    specialization: null,
    activeChallenge: null,
    challengesCompleted: [],
    specializationsUsed: 0,
    totalKeysEarned: 0,
  };
}
