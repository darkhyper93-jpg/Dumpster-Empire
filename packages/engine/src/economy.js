/**
 * Economía y fórmulas de balance — PLAN.md §4, implementadas literalmente.
 * Cero DOM. Toda función es pura: recibe estado + data, devuelve un número.
 */

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
 * §4.2 — Costo de la próxima unidad de un contenedor ya comprado `cantidadYaComprada` veces.
 * costo(cantidadYaComprada) = costoInicial * (1.08 ^ cantidadYaComprada)
 * @param {number} costoInicial
 * @param {number} cantidadYaComprada
 * @returns {number}
 */
export function containerCost(costoInicial, cantidadYaComprada) {
  return Math.ceil(costoInicial * Math.pow(1.08, cantidadYaComprada));
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

/**
 * §4.6 — Probabilidad de trampa, literal. Nunca baja de 1%.
 * probTrampaEfectiva = max(0.01, probTrampaBaseDelContenedor - suerte*0.002)
 * @param {number} probTrampaBaseDelContenedor
 * @param {number} suerte
 * @returns {number}
 */
export function trapProbability(probTrampaBaseDelContenedor, suerte) {
  return Math.max(0.01, probTrampaBaseDelContenedor - suerte * 0.002);
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

// AJUSTE (PLAN.md §2.3): umbral de revelado por defecto 60% (5.1/2.2), baja con la Fuerza hasta
// un piso de 30% para que nunca se pueda completar un contenedor con un solo toque.
const REVEAL_THRESHOLD_BASE = 0.6;
const REVEAL_THRESHOLD_FLOOR = 0.3;
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
 * las reducciones de prestigio y la penalización de automatización (no puede espiar antes).
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
  return Math.max(0.01, prob);
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
