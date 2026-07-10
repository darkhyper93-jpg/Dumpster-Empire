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
export const SAVE_VERSION = 5;

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
 *   y nombre de ítem (`state.itemsFoundByItem[containerId][itemName]`), para el INDEX (PLAN.md §11.5)
 * @property {number} categoryFragments
 * @property {number} trapsHit
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
  };
}
