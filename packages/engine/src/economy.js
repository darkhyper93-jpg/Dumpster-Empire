/**
 * Economía y fórmulas de balance — PLAN.md §4, implementadas literalmente.
 * Cero DOM. Toda función es pura: recibe estado + data, devuelve un número.
 */

import { categoryWeights } from './rng.js';
import { freshState } from './state.js';

/**
 * @typedef {import('./state.js').GameState} GameState
 */

/**
 * §4.1 — Costo de una mejora repetible en un nivel dado.
 * costo(nivel) = costoBase * (factorCrecimiento ^ nivel)
 * @param {number} costoBase
 * @param {number} factorCrecimiento
 * @param {number} nivel
 * @returns {number}
 */
export function upgradeCost(costoBase, factorCrecimiento, nivel) {
  return Math.ceil(costoBase * Math.pow(factorCrecimiento, nivel));
}

/**
 * §4.2 — Costo de un contenedor: PRECIO FIJO, no crece con la cantidad ya comprada.
 * AJUSTE (ronda 6 de playtest, PLAN.md §4.2 actualizado): antes era costoInicial * 1.08^n.
 * Comprar contenedores es el loop principal — encarecer la repetición castigaba la acción
 * central; la progresión ahora la marcan los saltos ×10–×15 de costoInicial entre tiers.
 * `cantidadYaComprada` se conserva en la firma (los llamadores ya la pasan y documenta que
 * el precio es deliberadamente independiente de ella).
 * @param {number} costoInicial
 * @param {number} cantidadYaComprada - ignorada por diseño desde la ronda 6
 * @returns {number}
 */
export function containerCost(costoInicial, cantidadYaComprada) {
  return Math.ceil(costoInicial);
}

/**
 * §4.3 — Llaves de Ciudad que se obtendrían prestigiando ahora mismo.
 * llaves = floor( sqrt(dineroTotalGanado / 1e9) * 10 ), mínimo 1 si se cumplió el umbral.
 * @param {number} dineroTotalGanado
 * @returns {number}
 */
export function prestigeKeysEarned(dineroTotalGanado) {
  if (dineroTotalGanado < 1_000_000_000) return 0;
  return Math.max(1, Math.floor(Math.sqrt(dineroTotalGanado / 1_000_000_000) * 10));
}

/**
 * §4.4 — Valor de venta final de un objeto encontrado.
 * valorFinal = valorBaseObjeto * multiplicadorRareza * (1 + suerte/100) * fluctuacionMercado
 * `sellMult` y `depthValueMult` son multiplicadores adicionales (automatización/prestigio/Fuerza)
 * que se aplican sobre el resultado literal de la fórmula, no lo reemplazan.
 * @param {Object} params
 * @param {number} params.valorBaseObjeto
 * @param {number} params.multiplicadorRareza
 * @param {number} params.suerte
 * @param {number} params.fluctuacionMercado
 * @param {number} [params.sellMult]
 * @param {number} [params.depthValueMult]
 * @returns {number}
 */
export function itemSaleValue({
  valorBaseObjeto,
  multiplicadorRareza,
  suerte,
  fluctuacionMercado,
  sellMult = 1,
  depthValueMult = 1,
}) {
  const valorFinal = valorBaseObjeto * multiplicadorRareza * (1 + suerte / 100) * fluctuacionMercado;
  return valorFinal * sellMult * depthValueMult;
}

/**
 * §4.5 — Progreso offline.
 * gananciaOffline = gananciaAutomaticaPorSegundo * segundosAusente(topeado) * factorOffline
 * @param {Object} params
 * @param {number} params.gananciaAutomaticaPorSegundo
 * @param {number} params.segundosAusente
 * @param {number} params.factorOffline
 * @param {number} params.capSegundos
 * @returns {{ ganancia: number, segundosEfectivos: number }}
 */
export function offlineEarnings({ gananciaAutomaticaPorSegundo, segundosAusente, factorOffline, capSegundos }) {
  const segundosEfectivos = Math.max(0, Math.min(segundosAusente, capSegundos));
  return {
    ganancia: gananciaAutomaticaPorSegundo * segundosEfectivos * factorOffline,
    segundosEfectivos,
  };
}

// AJUSTE (ronda 7, PLAN.md §4.6): piso de trampa 1% → 3%. Con el monto de trampa ahora fijo
// por tier, el piso es lo único que garantiza que perder siga siendo posible en late-game.
const TRAP_PROBABILITY_FLOOR = 0.03;

/**
 * §4.6 — Probabilidad de trampa, literal. Nunca baja del piso del 3%.
 * probTrampaEfectiva = max(0.03, probTrampaBaseDelContenedor - suerte*0.002)
 * @param {number} probTrampaBaseDelContenedor
 * @param {number} suerte
 * @returns {number}
 */
export function trapProbability(probTrampaBaseDelContenedor, suerte) {
  return Math.max(TRAP_PROBABILITY_FLOOR, probTrampaBaseDelContenedor - suerte * 0.002);
}

// ---------------------------------------------------------------------------
// Getters de stats — derivan de state + data (upgrades/automations/prestigeTree).
// Cada stat cambia un número real y distinto de las demás (PLAN.md §2.3).
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EngineData
 * @property {Array<Object>} upgrades
 * @property {Array<Object>} automations
 * @property {Array<Object>} prestigeTree
 * @property {{ rachaTramo: number, rachaBonusPorTramo: number, rachaMaxBonus: number }} [streak]
 *   constantes de la racha de escarbado (data/streak.json, ronda 19). Opcional: ver getLuck.
 * @property {{ gradosProb: {leve:number,normal:number,grave:number}, gravePenaltyMult: number }} [traps]
 *   constantes de grados de trampa (data/traps.json, ronda 20). Opcional: ver rollContainerResult.
 * @property {Array<{id:string,costo:number,radioMult:number,ritmoMult:number}>} [tools]
 *   herramientas de escarbado (data/tools.json, ronda 20). Opcional: ver getToolRadiusMult.
 * @property {{ setBonusPercent: number }} [collectionSets]
 *   constante del bonus por set completo (data/collectionSets.json, ronda 22). Opcional: ver getSetBonus.
 * @property {{ legendaryChance: number, items: Array<{id:string,name:string,icon:string,categoria:string,valorBase:number}> }} [legendaries]
 *   legendarios fuera de pool (data/legendaries.json, ronda 22). Opcional: ver rollContainerResult.
 * @property {{ stallCost: number, stallMultBase: number, stallMultPorNivel: number, stallNivelMax: number,
 *   stallCapacityBase: number, stallCapacityPorNivel: number, orderRotationMs: number, orderMult: number,
 *   vendedorIntervalo: number }} [stall]
 *   constantes del Puesto de Chatarra (data/stall.json, ronda 23). Opcional: ver getStallCapacity/
 *   getStallUpgradeCost/getStallSalePrice — sin él, la captura nunca se activa (mismo patrón que
 *   data.streak/data.traps/data.tools).
 */

function upgradeDef(data, id) {
  return data.upgrades.find((u) => u.id === id);
}

function prestigeLevel(state, id) {
  return state.prestigeTreeLevels[id] || 0;
}

function prestigeEffectsOfType(data, type) {
  const out = [];
  for (const node of data.prestigeTree) {
    for (const effect of node.effects || []) {
      if (effect.type === type) out.push({ nodeId: node.id, effect });
    }
  }
  return out;
}

function automationEffectsOfType(data, type) {
  const out = [];
  for (const auto of data.automations) {
    for (const effect of auto.effects || []) {
      if (effect.type === type) out.push({ automationId: auto.id, effect });
    }
  }
  return out;
}

/**
 * Suerte total del jugador. Sube probabilidad de rareza y baja probabilidad de trampa.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getLuck(state, data) {
  const def = upgradeDef(data, 'luck');
  const level = state.upgradeLevels.luck || 0;
  let luck = def.baseValue + level * def.perNivel;
  for (const { automationId, effect } of automationEffectsOfType(data, 'statFlat')) {
    if (effect.stat === 'luck' && state.automationOwned[automationId]) luck += effect.flat;
  }
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'statPercentFinal')) {
    if (effect.stat === 'luck') luck *= 1 + prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  // AJUSTE (ronda 19, PLAN.md §4.20): bonus plano de racha de escarbado manual sin trampa, en
  // tramos de `data.streak` (data/streak.json). `data.streak` es opcional: los tests/llamadores
  // anteriores a esta ronda construyen `data` sin él y siempre corren con `state.digStreak === 0`
  // (nadie más muta ese campo), así que omitir el bonus en ese caso no cambia ningún resultado.
  if (data.streak) {
    const bonus = Math.min(
      data.streak.rachaMaxBonus,
      Math.floor(state.digStreak / data.streak.rachaTramo) * data.streak.rachaBonusPorTramo
    );
    luck += bonus;
  }
  return luck;
}

/**
 * Multiplicador de Fuerza de Escarbado. Rediseño PLAN.md §2.3: la Fuerza ya no mueve un número
 * inútil ("velocidad de limpieza" del prototipo) sino dos cosas que el jugador sí percibe:
 * el umbral de revelado (ver getRevealThreshold) y el bonus de valor por profundidad
 * (ver getDepthValueMult). Este getter devuelve el multiplicador base común a ambos usos.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getDigPowerMult(state, data) {
  const def = upgradeDef(data, 'digPower');
  const level = state.upgradeLevels.digPower || 0;
  let mult = def.baseValue + level * def.perNivel;
  for (const { automationId, effect } of automationEffectsOfType(data, 'statPercent')) {
    if (effect.stat === 'digPower' && state.automationOwned[automationId]) mult *= 1 + effect.percent;
  }
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'statPercentFinal')) {
    if (effect.stat === 'digPower') mult *= 1 + prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  return mult;
}

// AJUSTE (agentes/rework-escarbado-y-landing-prompt.md, PLAN.md §11.2): el 60%/30% original se
// completaba de un solo gesto continuo (el radio de borrado era grande contra el canvas). Subido
// a 72%/40% para que escarbar cueste esfuerzo real desde el primer contenedor, incluso con Fuerza
// base; sigue bajando con la Fuerza para que la mejora se sienta, pero nunca a "un toque".
const REVEAL_THRESHOLD_BASE = 0.72;
const REVEAL_THRESHOLD_FLOOR = 0.4;
const REVEAL_THRESHOLD_DROP_PER_MULT = 0.25;

/**
 * Umbral de revelado (fracción de suciedad limpiada) para completar un contenedor.
 * Baja con la Fuerza de Escarbado: a mayor Fuerza, menos arrastre hace falta.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getRevealThreshold(state, data) {
  const digPowerMult = getDigPowerMult(state, data);
  const drop = (digPowerMult - 1) * REVEAL_THRESHOLD_DROP_PER_MULT;
  return Math.max(REVEAL_THRESHOLD_FLOOR, REVEAL_THRESHOLD_BASE - drop);
}

// AJUSTE (PLAN.md §2.3): bonus de valor por profundidad — la otra mitad del rediseño de Fuerza.
const DEPTH_VALUE_BONUS_PER_MULT = 0.5;

/**
 * Multiplicador de valor por objeto ("cavar con más fuerza desentierra objetos más valiosos").
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getDepthValueMult(state, data) {
  const digPowerMult = getDigPowerMult(state, data);
  return 1 + (digPowerMult - 1) * DEPTH_VALUE_BONUS_PER_MULT;
}

/**
 * Multiplicador de Área de Búsqueda (ancho del trazo de escarbado).
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getAreaMult(state, data) {
  const def = upgradeDef(data, 'area');
  const level = state.upgradeLevels.area || 0;
  let mult = def.baseValue + level * def.perNivel;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'statPercentFinal')) {
    if (effect.stat === 'area') mult *= 1 + prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  return mult;
}

/**
 * Cantidad máxima de contenedores en la cola de automatización.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getQueueMax(state, data) {
  const def = upgradeDef(data, 'capacity');
  const level = state.upgradeLevels.capacity || 0;
  let queue = def.baseValue + level * def.perNivel;
  for (const { automationId, effect } of automationEffectsOfType(data, 'queueSlots')) {
    if (state.automationOwned[automationId]) queue += effect.flat;
  }
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'queueSlotsFlatPerNivel')) {
    queue += prestigeLevel(state, nodeId) * effect.flatPerNivel;
  }
  return queue;
}

/**
 * Cantidad de contenedores que el/los robot(s) pueden procesar en simultáneo.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getParallelAutoSlots(state, data) {
  let slots = 0;
  for (const { automationId, effect } of automationEffectsOfType(data, 'parallelSlots')) {
    if (state.automationOwned[automationId]) slots += effect.flat;
  }
  return slots;
}

/**
 * Multiplicador de valor de venta para una categoría de objeto dada.
 * @param {GameState} state
 * @param {string} categoria
 * @param {EngineData} data
 * @returns {number}
 */
export function getSellMult(state, categoria, data) {
  let mult = 1;
  for (const { automationId, effect } of automationEffectsOfType(data, 'sellPercentCategories')) {
    if (state.automationOwned[automationId] && effect.categorias.includes(categoria)) {
      mult *= 1 + effect.percent;
    }
  }
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'sellPercentGlobalPerNivel')) {
    mult *= 1 + prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  return mult;
}

/**
 * Factor de progreso offline (§4.5), con el bonus de eficiencia del árbol de prestigio.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getOfflineFactor(state, data) {
  const FACTOR_OFFLINE_BASE = 0.5;
  let factor = FACTOR_OFFLINE_BASE;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'offlineEfficiencyPercentPerNivel')) {
    factor *= 1 + prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  return factor;
}

/**
 * Tope de segundos de progreso offline (§4.5, default 8h ampliable por prestigio).
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getOfflineCapSeconds(state, data) {
  const CAP_HORAS_BASE = 8;
  let horas = CAP_HORAS_BASE;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'offlineCapHorasFlatPerNivel')) {
    horas += prestigeLevel(state, nodeId) * effect.horasPerNivel;
  }
  return horas * 3600;
}

/**
 * Multiplicador de Fuerza de Escarbado extra del robot (ronda 15, PLAN.md §4.7). Solo automatización.
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
 * Multiplicador de velocidad de procesamiento del robot (ronda 15, PLAN.md §4.7). Solo automatización.
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
 * Probabilidad (0..1) de que el robot descarte un contenedor cuyo roll dio trampa (ronda 15,
 * PLAN.md §4.7). Vive en el árbol de prestigio: `automationOwned` se resetea al prestigiar y
 * las Llaves son la moneda permanente.
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

/**
 * Costo de un contenedor, con los descuentos de prestigio (Negociador / Portal Estable) aplicados.
 * @param {GameState} state
 * @param {Object} container
 * @param {EngineData} data
 * @returns {number}
 */
export function getContainerCost(state, container, data) {
  const owned = state.ownedContainers[container.id] || 0;
  let cost = containerCost(container.costoInicial, owned);
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'containerCostPercentReductionPerNivel')) {
    cost *= 1 - prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'containerSpecificPerNivel')) {
    if (effect.containerId === container.id) {
      cost *= 1 - prestigeLevel(state, nodeId) * effect.costPercentPerNivel;
    }
  }
  return Math.ceil(Math.max(0, cost));
}

/**
 * Probabilidad efectiva de trampa de un contenedor, componiendo la fórmula literal §4.6 con
 * las reducciones de prestigio y la penalización de automatización (el robot escarba a ciegas
 * y sin criterio, ver PLAN.md §2.3).
 * @param {GameState} state
 * @param {Object} container
 * @param {boolean} isAuto
 * @param {EngineData} data
 * @returns {number}
 */
export function getEffectiveTrapProbability(state, container, isAuto, data) {
  const luck = getLuck(state, data);
  let prob = container.probTrampaBase - luck * 0.002;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'trapPercentReductionPerNivel')) {
    prob -= prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'containerSpecificPerNivel')) {
    if (effect.containerId === container.id) {
      prob -= prestigeLevel(state, nodeId) * effect.trapPercentPerNivel;
    }
  }
  if (isAuto) {
    for (const { automationId, effect } of automationEffectsOfType(data, 'autoTrapMultiplier')) {
      if (state.automationOwned[automationId]) prob *= effect.mult;
    }
  }
  return Math.max(TRAP_PROBABILITY_FLOOR, prob);
}

/**
 * Fragmentos de categoría ganados por objeto encontrado en una categoría rara (§2.4).
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getFragmentMult(state, data) {
  let mult = 1;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'fragmentPercentPerNivel')) {
    mult *= 1 + prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  return mult;
}

/**
 * Dinero inicial al prestigiar, según el nodo Capital Inicial del árbol de prestigio.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getPrestigeStartMoney(state, data) {
  let money = 0;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'startMoneyFlatPerNivel')) {
    money += prestigeLevel(state, nodeId) * effect.flatPerNivel;
  }
  return money;
}

// ---------------------------------------------------------------------------
// Niveles de contenedor (PLAN.md §11.3). Suben con la cantidad de escarbados de ESE contenedor
// y mejoran las probabilidades de rareza dentro de su propio pool de ítems (§11.4). Persistente
// (state.containerLevels/containerLevelProgress), nivel máximo 10. Curva y constantes viven en
// `data/containers.json` (levelUpDigsBase/levelUpDigsGrowth/levelRarityShiftPerLevel) para que el
// pase de balance (Fase 9) las ajuste sin tocar este archivo.
// ---------------------------------------------------------------------------

export const CONTAINER_LEVEL_MAX = 10;

/**
 * Nivel actual (1-10) de un contenedor. 1 si todavía no se registró ningún escarbado.
 * Clampeado a entero en [1, CONTAINER_LEVEL_MAX]: el save es input externo (import/localStorage)
 * y su validación garantiza "número finito" pero no rango — sin el clamp, un nivel manipulado
 * (negativo, gigante o fraccionario) envenena getLevelValueMult/getLevelRarityShift y la UI.
 * @param {GameState} state
 * @param {string} containerId
 * @returns {number}
 */
export function getContainerLevel(state, containerId) {
  const raw = Math.floor(Number(state.containerLevels[containerId]) || 1);
  return Math.min(CONTAINER_LEVEL_MAX, Math.max(1, raw));
}

/**
 * Escarbados necesarios para subir del nivel dado al siguiente.
 * digsNecesarios(nivel) = ceil(levelUpDigsBase * levelUpDigsGrowth ^ (nivel - 1))
 * @param {Object} container
 * @param {number} level
 * @returns {number}
 */
export function digsNeededForNextLevel(container, level) {
  return Math.ceil(container.levelUpDigsBase * Math.pow(container.levelUpDigsGrowth, level - 1));
}

/**
 * Corrimiento de probabilidad (puntos porcentuales) hacia la categoría rara del contenedor,
 * a favor del jugador, según el nivel actual del contenedor. Alimenta a `categoryWeights`.
 * @param {GameState} state
 * @param {Object} container
 * @returns {number}
 */
export function getLevelRarityShift(state, container) {
  const level = getContainerLevel(state, container.id);
  return (level - 1) * container.levelRarityShiftPerLevel;
}

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

/**
 * §4.25 (ronda 22) — ¿el pool ENTERO de un contenedor ya se encontró al menos una vez?
 * Puramente derivado de `itemsFoundByItem` contra `itemsData.containers[id]` (mismo criterio
 * que `getCollectionCompletion`, ronda 19): sin contador paralelo, no puede desincronizarse.
 * @param {GameState} state
 * @param {Object} container
 * @param {{ containers: Object<string, Array<Object>> }} itemsData
 * @returns {boolean}
 */
export function isSetComplete(state, container, itemsData) {
  const pool = itemsData.containers[container.id] || [];
  if (!pool.length) return false;
  const found = state.itemsFoundByItem[container.id] || {};
  return pool.every((item) => (Number(found[item.id]) || 0) > 0);
}

/**
 * §4.25 (ronda 22) — multiplicador de valor por set completo. `data.collectionSets` es opcional
 * (mismo patrón que data.streak/data.traps/data.tools): sin él, neutro (1). Se aplica sobre el
 * valor final del ítem, junto a `getMechanicValueMult`.
 * @param {GameState} state
 * @param {Object} container
 * @param {{ containers: Object<string, Array<Object>> }} itemsData
 * @param {EngineData} data
 * @returns {number}
 */
export function getSetBonus(state, container, itemsData, data) {
  const percent = data?.collectionSets?.setBonusPercent;
  if (!percent) return 1;
  return isSetComplete(state, container, itemsData) ? 1 + percent : 1;
}

/**
 * Multiplicador de valor de contenedores con mecánica propia (PLAN.md §4.24, ronda 20):
 * Bóveda a Contrarreloj / Sótano Sin Luz declaran `mechanicValueMult` en containers.json como
 * compensación por su riesgo (contrarreloj) o dificultad (oscuridad). Neutro (1) si el
 * contenedor no lo define — los 16 contenedores previos a la ronda 20 no se tocan.
 * @param {Object} container
 * @returns {number}
 */
export function getMechanicValueMult(container) {
  return container.mechanicValueMult || 1;
}

/**
 * Registra un escarbado (trampa o no) contra el progreso de nivel de un contenedor, y sube de
 * nivel si corresponde. Se llama una vez por resolución de contenedor (ver systems/containers.js).
 * @param {GameState} state
 * @param {Object} container
 * @returns {void}
 */
export function registerContainerDig(state, container) {
  const level = getContainerLevel(state, container.id);
  if (level >= CONTAINER_LEVEL_MAX) return;
  const progress = (state.containerLevelProgress[container.id] || 0) + 1;
  const needed = digsNeededForNextLevel(container, level);
  if (progress >= needed) {
    state.containerLevels[container.id] = level + 1;
    state.containerLevelProgress[container.id] = 0;
  } else {
    state.containerLevelProgress[container.id] = progress;
  }
}

// ---------------------------------------------------------------------------
// Resistencia / Fuerza mínima por contenedor (PLAN.md §11.2, extiende §2.3). Escarbar de noche...
// no: escarbar más rápido requiere Fuerza acorde al tier del contenedor; con menos Fuerza igual
// se puede, pero mucho más lento. La UI lee `getEffectiveDigTime`, nunca recalcula el ritmo.
// ---------------------------------------------------------------------------

/**
 * Ritmo de escarbado relativo (1 = normal). Baja proporcional si la Fuerza del jugador
 * (getDigPowerMult) queda por debajo de la resistencia requerida por el contenedor.
 * @param {GameState} state
 * @param {Object} container
 * @param {EngineData} data
 * @param {boolean} [isAuto] - ronda 15 (PLAN.md §4.7): suma la Fuerza extra del robot
 *   (getAutoDigPowerMult), solo en automatización. Default false: no cambia el comportamiento
 *   de los llamadores existentes (escarbado manual, resto de la suite).
 * @returns {number}
 */
export function getDigRate(state, container, data, isAuto = false) {
  const digPowerMult = getDigPowerMult(state, data) * (isAuto ? getAutoDigPowerMult(state, data) : 1);
  // AJUSTE (ronda 7, PLAN.md §11.2): ritmo = clamp(Fuerza/resistencia, 0.3, 1.5). Antes el
  // ritmo se topeaba en 1 (la sobre-Fuerza no daba nada) y el piso era 0.15: en la práctica
  // todos los contenedores ya dominados se sentían idénticos. Ahora superar la resistencia
  // premia hasta +50% y quedarse corto castiga hasta 0.3 — la Fuerza contra la resistencia
  // de CADA contenedor se siente en el gesto (radio del pincel) y en la automatización
  // (getEffectiveDigTime).
  return Math.min(1.5, Math.max(0.3, digPowerMult / container.resistencia));
}

/**
 * Tiempo efectivo de escarbado de un contenedor, ya afectado por resistencia/Fuerza.
 * @param {GameState} state
 * @param {Object} container
 * @param {EngineData} data
 * @param {boolean} [isAuto] - ver getDigRate.
 * @returns {number}
 */
export function getEffectiveDigTime(state, container, data, isAuto = false) {
  return container.digTime / getDigRate(state, container, data, isAuto);
}

// ---------------------------------------------------------------------------
// Trampas más caras por tier (PLAN.md §11.2/§4.6). AJUSTE (ronda 7): el castigo es FIJO por
// tier (costoInicial × trapPenaltyMult) y ya NO se suaviza con la Suerte — el rol de la Suerte
// es reducir la PROBABILIDAD de caer (hasta el piso del 3%), no cuánto duele. Antes el
// dampening (hasta ×0.4) hacía que en late-game perder fuera irrelevante.
// ---------------------------------------------------------------------------

function fixedTrapPenalty(container) {
  return Math.max(1, container.costoInicial * container.trapPenaltyMult);
}

/**
 * Penalización de dinero al caer en trampa en un contenedor: monto fijo por tier.
 * La firma conserva state/data para no romper llamadores y por si un nodo de prestigio
 * futuro la modifica; hoy solo depende del contenedor (ronda 7).
 * @param {GameState} state
 * @param {Object} container
 * @param {EngineData} data
 * @returns {number}
 */
export function getTrapPenalty(state, container, data) {
  return fixedTrapPenalty(container);
}

// ---------------------------------------------------------------------------
// Suerte recomendada por contenedor (PLAN.md §11.2). Busca la Suerte mínima (entera) a partir de
// la cual el valor esperado de comprar+escarbar el contenedor es >= 0 (rentable en promedio).
// Es un dato puramente derivado; la UI solo lo lee (ShopView, Fase 7).
// ---------------------------------------------------------------------------

function averageItemValueForContainer(state, container, categoria, itemsData, data, luck, depthValueMult) {
  const rarity = itemsData.rarities.find((r) => r.id === categoria);
  const pool = itemsData.containers[container.id].filter((item) => item.categoria === categoria);
  const avgBase = pool.reduce((sum, item) => sum + item.valorBase, 0) / pool.length;
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
}

function expectedNetValueAtLuck(state, container, itemsData, data, luck) {
  const levelShift = getLevelRarityShift(state, container);
  const weights = categoryWeights(container.categorias, luck, levelShift);
  const depthValueMult = getDepthValueMult(state, data);
  const expectedPerSlot = Object.entries(weights).reduce(
    (sum, [categoria, weight]) =>
      sum + weight * averageItemValueForContainer(state, container, categoria, itemsData, data, luck, depthValueMult),
    0
  );
  let trapProb = container.probTrampaBase - luck * 0.002;
  for (const { nodeId, effect } of prestigeEffectsOfType(data, 'trapPercentReductionPerNivel')) {
    trapProb -= prestigeLevel(state, nodeId) * effect.percentPerNivel;
  }
  trapProb = Math.max(TRAP_PROBABILITY_FLOOR, trapProb);
  const grossExpected = container.slots * expectedPerSlot * (1 - trapProb);
  const expectedTrapLoss = trapProb * fixedTrapPenalty(container);
  const cost = getContainerCost(state, container, data);
  return grossExpected - expectedTrapLoss - cost;
}

/**
 * Nivel de Suerte recomendado: el mínimo entero a partir del cual comprar y escarbar este
 * contenedor tiene valor esperado positivo (ganancia esperada >= costo + pérdida esperada de trampa).
 *
 * AJUSTE (ronda 7, PLAN.md §11.2): se calcula contra un JUGADOR NEUTRO (sin mejoras, sin
 * automatización/prestigio, contenedor a nivel 0): es la meta fija de progresión del contenedor.
 * Antes usaba los multiplicadores actuales del jugador y en partidas avanzadas colapsaba a
 * "0 (alcanzada)" para todo. La firma conserva `state` para no romper llamadores.
 * @param {GameState} state - ignorado por diseño desde la ronda 7 (meta fija por contenedor)
 * @param {Object} container
 * @param {{ containers: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {EngineData} data
 * @returns {number}
 */
export function getRecommendedLuck(state, container, itemsData, data) {
  // AJUSTE (ronda 15): tope de búsqueda 1500 (antes 800) — los 4 contenedores nuevos de
  // prestigio 6-9 (chatarreriaTitanes..vertederoBigBang) recomiendan hasta ~950, continuando
  // la misma progresión de ~15% por tier que ya venía de la ronda 10/11.
  const MAX_LUCK_SEARCH = 1500;
  const neutral = freshState();
  for (let luck = 0; luck <= MAX_LUCK_SEARCH; luck++) {
    if (expectedNetValueAtLuck(neutral, container, itemsData, data, luck) >= 0) return luck;
  }
  return MAX_LUCK_SEARCH;
}

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

// ---------------------------------------------------------------------------
// Herramientas de escarbado (PLAN.md §4.23, ronda 20). Modifican SOLO el pincel del escarbado
// manual (radio y ritmo) — nunca getLuck ni itemSaleValue. `data.tools` es opcional (mismo
// patrón que data.streak/data.traps): sin él, ambos multiplicadores son neutros (1.0).
// ---------------------------------------------------------------------------

function equippedToolDef(state, data) {
  return data.tools?.find((t) => t.id === state.equippedTool);
}

/**
 * Multiplicador de radio de pincel de la herramienta equipada.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getToolRadiusMult(state, data) {
  return equippedToolDef(state, data)?.radioMult ?? 1;
}

/**
 * Multiplicador de ritmo de escarbado de la herramienta equipada.
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getToolRhythmMult(state, data) {
  return equippedToolDef(state, data)?.ritmoMult ?? 1;
}

// ---------------------------------------------------------------------------
// El Puesto de Chatarra (PLAN.md §2.9, §4.27-§4.29, ronda 23). `data.stall` es opcional (mismo
// patrón que data.streak/data.traps/data.tools): sin él, la captura nunca se activa (ver
// applyContainerResult) y estos getters no deben llamarse (asumen `data.stall` presente).
// ---------------------------------------------------------------------------

/**
 * §4.27 — capacidad del inventario del Puesto. 0 sin puesto comprado (stallLevel 0).
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {number}
 */
export function getStallCapacity(state, data) {
  if (state.stallLevel < 1) return 0;
  return data.stall.stallCapacityBase + data.stall.stallCapacityPorNivel * (state.stallLevel - 1);
}

/**
 * §4.27 — costo para alcanzar `targetLevel` (default: el siguiente al actual).
 * costo(nivel) = stallCost × 4^(nivel-1). Comprar el puesto en sí es alcanzar el nivel 1: mismo
 * costo `stallCost` (4^0 = 1), sin necesitar una fórmula separada para la compra inicial.
 * @param {GameState} state
 * @param {EngineData} data
 * @param {number} [targetLevel]
 * @returns {number}
 */
export function getStallUpgradeCost(state, data, targetLevel = state.stallLevel + 1) {
  return Math.ceil(data.stall.stallCost * Math.pow(4, targetLevel - 1));
}

/**
 * §4.27 — precio de venta literal de un ítem del inventario del Puesto.
 * precioPuesto = baseValue × fluctuacionMercado × (stallMultBase + stallMultPorNivel × (stallLevel - 1))
 * @param {{ baseValue: number, fluctuacionMercado: number, stallLevel: number, stallMultBase: number, stallMultPorNivel: number }} params
 * @returns {number}
 */
export function stallSalePrice({ baseValue, fluctuacionMercado, stallLevel, stallMultBase, stallMultPorNivel }) {
  return baseValue * fluctuacionMercado * (stallMultBase + stallMultPorNivel * (stallLevel - 1));
}

/**
 * Getter de conveniencia sobre `stallSalePrice`, tomando las constantes de `data.stall` y el
 * nivel del puesto de `state`. La fluctuación es un parámetro explícito (no siempre
 * `state.marketFluctuation`: la venta offline usa fluctuación fija 1, PLAN.md §4.29).
 * @param {GameState} state
 * @param {{ baseValue: number }} item
 * @param {EngineData} data
 * @param {number} [fluctuacionMercado]
 * @returns {number}
 */
export function getStallSalePrice(state, item, data, fluctuacionMercado = state.marketFluctuation) {
  return stallSalePrice({
    baseValue: item.baseValue,
    fluctuacionMercado,
    stallLevel: state.stallLevel,
    stallMultBase: data.stall.stallMultBase,
    stallMultPorNivel: data.stall.stallMultPorNivel,
  });
}

/**
 * ¿El jugador posee alguna automatización que habilite el robot vendedor del Puesto (PLAN.md
 * §4.29, ronda 23)? Vive acá (no en systems/automation.js, donde vive `hasAutoDig`) para que
 * `systems/stall.js` pueda consultarlo sin crear un ciclo de imports con automation.js (que sí
 * llama a `stallVendorTick` de stall.js dentro de `automationTick`).
 * @param {GameState} state
 * @param {EngineData} data
 * @returns {boolean}
 */
export function hasStallVendor(state, data) {
  return automationEffectsOfType(data, 'enablesStallVendor').some(
    ({ automationId }) => state.automationOwned[automationId]
  );
}

/**
 * Percentil (interpolación lineal) de un array YA ordenado ascendente.
 * @param {Array<number>} sortedValues
 * @param {number} p - 0..1
 * @returns {number}
 */
function percentile(sortedValues, p) {
  if (sortedValues.length === 1) return sortedValues[0];
  const idx = p * (sortedValues.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (idx - lower);
}

/**
 * §4.30 (ronda 23.C) — 3 presets de umbral de captura ("guardá lo que valga $X o más"),
 * percentiles 25/50/75 del valor de venta ESTIMADO (sin variance de RNG, fluctuación fija 1) de
 * cada ítem del pool del contenedor más avanzado que el jugador posee (mayor `costoInicial`).
 * Sin ningún contenedor poseído, no hay base para estimar nada: devuelve [].
 * @param {GameState} state
 * @param {Array<Object>} allContainers
 * @param {{ containers: Object<string, Array<Object>>, rarities: Array<Object> }} itemsData
 * @param {EngineData} data
 * @returns {Array<number>}
 */
export function getStallThresholdPresets(state, allContainers, itemsData, data) {
  const owned = allContainers.filter((c) => (state.ownedContainers[c.id] || 0) >= 1);
  if (!owned.length) return [];
  const best = owned.reduce((a, b) => (b.costoInicial > a.costoInicial ? b : a));
  const pool = itemsData.containers[best.id] || [];
  if (!pool.length) return [];
  const luck = getLuck(state, data);
  const depthValueMult = getDepthValueMult(state, data);
  const itemMultipliers = getLevelValueMult(state, best) * getMechanicValueMult(best) * getSetBonus(state, best, itemsData, data);
  const values = pool
    .map((item) => {
      const rarity = itemsData.rarities.find((r) => r.id === item.categoria);
      return (
        itemSaleValue({
          valorBaseObjeto: item.valorBase,
          multiplicadorRareza: rarity ? rarity.mult : 1,
          suerte: luck,
          fluctuacionMercado: 1,
          sellMult: getSellMult(state, item.categoria, data),
          depthValueMult,
        }) * itemMultipliers
      );
    })
    .sort((a, b) => a - b);
  return [0.25, 0.5, 0.75].map((p) => percentile(values, p));
}
