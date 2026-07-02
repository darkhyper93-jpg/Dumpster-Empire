/**
 * Forma del estado de la partida y su versión de esquema de guardado.
 * Cero DOM: este módulo no debe importar nada del navegador.
 */

/** Versión actual del esquema de guardado. Bump al cambiar la forma del estado. */
export const SAVE_VERSION = 1;

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
 * @property {Object<string, boolean>} automationOwned - si se compró cada mejora de automatización de un solo uso
 * @property {number} prestigeKeys
 * @property {number} prestigeCount
 * @property {Object<string, number>} prestigeTreeLevels - nivel por id de nodo del árbol de prestigio
 * @property {string[]} achievementsUnlocked
 * @property {number} itemsFoundCount
 * @property {Object<string, number>} itemsFoundByCategory
 * @property {number} categoryFragments
 * @property {number} trapsHit
 * @property {number} autoProcessedCount
 * @property {string[]} autoQueue - ids de contenedor en espera de ser procesados por el/los robot(s)
 * @property {AutoProcessingSlot[]} autoProcessing
 * @property {number} marketFluctuation
 * @property {number} marketFluctuationAt - epoch ms de la última recalculación
 * @property {number} tutorialStep
 * @property {boolean} soundOn
 * @property {number} lastSavedAt - epoch ms, usado para calcular progreso offline
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
    automationOwned: {},
    prestigeKeys: 0,
    prestigeCount: 0,
    prestigeTreeLevels: {},
    achievementsUnlocked: [],
    itemsFoundCount: 0,
    itemsFoundByCategory: {},
    categoryFragments: 0,
    trapsHit: 0,
    autoProcessedCount: 0,
    autoQueue: [],
    autoProcessing: [],
    marketFluctuation: 1,
    marketFluctuationAt: 0,
    tutorialStep: 0,
    soundOn: true,
    lastSavedAt: Date.now(),
  };
}
