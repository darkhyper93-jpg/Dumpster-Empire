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
 * @returns {number}
 */
export function getDigRate(state, container, data) {
  const digPowerMult = getDigPowerMult(state, data);
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
 * @returns {number}
 */
export function getEffectiveDigTime(state, container, data) {
  return container.digTime / getDigRate(state, container, data);
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
  const MAX_LUCK_SEARCH = 500;
  const neutral = freshState();
  for (let luck = 0; luck <= MAX_LUCK_SEARCH; luck++) {
    if (expectedNetValueAtLuck(neutral, container, itemsData, data, luck) >= 0) return luck;
  }
  return MAX_LUCK_SEARCH;
}
