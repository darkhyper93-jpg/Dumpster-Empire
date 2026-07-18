/**
 * Sistema del Puesto de Chatarra: compra/nivel, umbral de captura, venta manual del inventario,
 * pedidos de Salomón y robot vendedor (PLAN.md §2.9, §4.27-§4.29, ronda 23).
 * Mutaciones puras: reciben el estado y lo mutan, sin tocar el DOM.
 */

import {
  addMoney,
  getStallCapacity,
  getStallUpgradeCost,
  getStallSalePrice,
  hasStallVendor,
  resolveMarketFluctuation,
} from '../economy.js';
import { clampedElapsedMs } from '../time.js';

/**
 * Compra el Puesto de Chatarra (lo lleva a nivel 1). `keepThreshold` queda en 0 (en pausa):
 * el jugador lo activa a mano desde la UI.
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyStall(state, data) {
  if (state.stallLevel >= 1) return { ok: false, error: 'Ya tenés el Puesto de Chatarra.' };
  const cost = getStallUpgradeCost(state, data, 1);
  if (state.money < cost) return { ok: false, error: 'No alcanza el dinero para el Puesto de Chatarra.' };
  state.money -= cost;
  state.stallLevel = 1;
  return { ok: true };
}

/**
 * Sube un nivel el Puesto de Chatarra (hasta `stallNivelMax`).
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function upgradeStall(state, data) {
  if (state.stallLevel < 1) return { ok: false, error: 'Comprá el Puesto de Chatarra primero.' };
  if (state.stallLevel >= data.stall.stallNivelMax) return { ok: false, error: 'El Puesto ya está en su nivel máximo.' };
  const cost = getStallUpgradeCost(state, data);
  if (state.money < cost) return { ok: false, error: 'No alcanza el dinero para mejorar el Puesto.' };
  state.money -= cost;
  state.stallLevel += 1;
  return { ok: true };
}

/**
 * Fija el umbral de captura ("guardá lo que valga $X o más"). 0 = puesto en pausa.
 * @param {import('../state.js').GameState} state
 * @param {number} threshold
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function setKeepThreshold(state, threshold) {
  if (!Number.isFinite(threshold) || threshold < 0) return { ok: false, error: 'Umbral inválido.' };
  state.keepThreshold = threshold;
  return { ok: true };
}

/**
 * Índice del primer pedido activo (progress < cantidad) que pide la categoría dada, o -1.
 * @param {import('../state.js').GameState} state
 * @param {string} categoria
 * @returns {number}
 */
function findMatchingOrderIndex(state, categoria) {
  return state.stallOrders.findIndex((o) => o.categoria === categoria && o.progress < o.cantidad);
}

/**
 * Vende un ítem del inventario a una fluctuación de mercado ya decidida (no la refresca, no la
 * lee de `state`): usado tanto por la venta manual/robot (fluctuación real, refrescada antes de
 * llamar) como por la venta offline (fluctuación fija 1, PLAN.md §4.29).
 * @param {import('../state.js').GameState} state
 * @param {number} inventoryIndex
 * @param {import('../economy.js').EngineData} data
 * @param {number} fluctuacionMercado
 * @param {boolean} [skipOrderMatch] - ronda 27 (PLAN.md §4.39): true SOLO para las ventas del
 *   robot vendedor con `mantenerStockPedidos` activo — su venta de excedente no avanza el pedido
 *   ni cobra su mult (los pedidos quedan reservados para la venta manual del jugador). Sin esto,
 *   cada venta de excedente achicaba la demanda restante y liberaba "nuevo excedente" en cascada
 *   hasta vaciar el stock que el flag prometía reservar.
 * @returns {{ ok: true, moneyDelta: number } | { ok: false, error: string }}
 */
function sellInventoryItemAt(state, inventoryIndex, data, fluctuacionMercado, skipOrderMatch = false) {
  const item = state.inventory[inventoryIndex];
  if (!item) return { ok: false, error: 'Ese objeto ya no está en el inventario.' };
  const orderIndex = skipOrderMatch ? -1 : findMatchingOrderIndex(state, item.categoria);
  const order = orderIndex >= 0 ? state.stallOrders[orderIndex] : null;
  const basePrice = getStallSalePrice(state, item, data, fluctuacionMercado);
  // §27.5.1 (Y1, ronda 27): un precio inflado por multiplicadores hostiles puede ser Infinity;
  // addMoney lo normaliza y clampea — el moneyDelta devuelto es el monto realmente acreditado.
  const price = addMoney(state, order ? basePrice * order.mult : basePrice);
  state.stallSoldCount++;
  state.inventory.splice(inventoryIndex, 1);
  if (order) {
    order.progress += 1;
    // PLAN.md §4.28: al cumplirse, el pedido se retira y se reemplaza por uno nuevo para
    // mantener 2 activos siempre (lo hace el llamador, vía rotateStallOrders/UI — acá solo se
    // retira y se cuenta, sin generar el reemplazo: no tenemos `ownedCategories` a mano).
    if (order.progress >= order.cantidad) {
      state.stallOrders.splice(orderIndex, 1);
      state.ordersFulfilledCount++;
    }
  }
  return { ok: true, moneyDelta: price };
}

/**
 * Venta manual (o del robot) de un ítem del inventario: refresca primero la fluctuación de
 * mercado (PLAN.md §4.27 — "toda acción de venta refresca primero la fluctuación") y vende a
 * ese precio.
 * @param {import('../state.js').GameState} state
 * @param {number} inventoryIndex
 * @param {import('../economy.js').EngineData} data
 * @param {number} [now]
 * @param {() => number} [random]
 * @param {boolean} [skipOrderMatch] - ver sellInventoryItemAt (solo el robot vendedor con
 *   `mantenerStockPedidos` lo pasa en true; la venta manual siempre matchea pedidos).
 * @returns {{ ok: true, moneyDelta: number } | { ok: false, error: string }}
 */
export function sellInventoryItem(state, inventoryIndex, data, now = Date.now(), random = Math.random, skipOrderMatch = false) {
  const { marketFluctuation, marketFluctuationAt } = resolveMarketFluctuation(state, data, now, random);
  state.marketFluctuation = marketFluctuation;
  state.marketFluctuationAt = marketFluctuationAt;
  return sellInventoryItemAt(state, inventoryIndex, data, state.marketFluctuation, skipOrderMatch);
}

/**
 * Índice del ítem del inventario que el robot vendedor debería vender: prioridad (1) satisface
 * un pedido activo, (2) mayor `baseValue`. -1 si el inventario está vacío.
 *
 * Ronda 27 (PLAN.md §4.39): con `keepOrderStock`, el vendedor RESERVA el stock que los pedidos
 * activos todavía demandan — no vende un ítem de una categoría demandada si el stock de esa
 * categoría es <= a la demanda restante (Σ cantidad-progress). El jugador conserva el timing de
 * mercado para cumplir el pedido a mano; el EXCEDENTE por encima de la demanda se vende normal.
 * La venta manual nunca pasa por acá (no se filtra).
 * @param {import('../state.js').GameState} state
 * @param {boolean} [keepOrderStock]
 * @returns {number}
 */
function pickVendorSaleIndex(state, keepOrderStock = false) {
  const orderCategories = new Set(state.stallOrders.filter((o) => o.progress < o.cantidad).map((o) => o.categoria));
  // Object.create(null): las categorías vienen del save (input externo) — sin prototipo, una
  // clave 'constructor'/'__proto__' es una propiedad propia más, no un bug (lección de la v7).
  const remainingDemand = Object.create(null);
  const stock = Object.create(null);
  if (keepOrderStock) {
    for (const order of state.stallOrders) {
      if (order.progress < order.cantidad) {
        remainingDemand[order.categoria] = (remainingDemand[order.categoria] || 0) + (order.cantidad - order.progress);
      }
    }
    for (const item of state.inventory) {
      stock[item.categoria] = (stock[item.categoria] || 0) + 1;
    }
  }
  let bestIdx = -1;
  let bestPriority = -1;
  let bestValue = -Infinity;
  state.inventory.forEach((item, i) => {
    if (keepOrderStock && (remainingDemand[item.categoria] || 0) > 0 && stock[item.categoria] <= remainingDemand[item.categoria]) {
      return; // stock reservado para el pedido: este ítem no se toca
    }
    const priority = orderCategories.has(item.categoria) ? 1 : 0;
    if (priority > bestPriority || (priority === bestPriority && item.baseValue > bestValue)) {
      bestPriority = priority;
      bestValue = item.baseValue;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/**
 * Enciende/apaga la reserva de stock para pedidos del robot vendedor (ronda 27, PLAN.md §4.39).
 * @param {import('../state.js').GameState} state
 * @param {boolean} value
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function setMantenerStockPedidos(state, value) {
  if (typeof value !== 'boolean') return { ok: false, error: 'Valor inválido para mantener stock de pedidos.' };
  state.mantenerStockPedidos = value;
  return { ok: true };
}

/**
 * Tick del robot vendedor (PLAN.md §4.29): cada `vendedorIntervalo` segundos (reloj clampeado
 * §3.3, mismo patrón que la fluctuación de mercado) vende 1 ítem del inventario, si hay alguno
 * y el jugador posee la automatización correspondiente (`hasStallVendor`).
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @param {number} [now]
 * @param {() => number} [random]
 * @returns {void}
 */
export function stallVendorTick(state, data, now = Date.now(), random = Math.random) {
  if (!data.stall || !hasStallVendor(state, data)) return;
  const elapsed = clampedElapsedMs(now, state.stallVendorAt);
  if (elapsed < data.stall.vendedorIntervalo * 1000) return;
  state.stallVendorAt = now;
  if (!state.inventory.length) return;
  const idx = pickVendorSaleIndex(state, state.mantenerStockPedidos);
  if (idx === -1) return;
  sellInventoryItem(state, idx, data, now, random, state.mantenerStockPedidos);
}

/**
 * Venta offline del robot vendedor (PLAN.md §4.29): vende sobre el inventario YA persistido, a
 * fluctuación fija 1 (sin timing gratis mientras el jugador estuvo ausente), hasta
 * `floor(segundosEfectivos / vendedorIntervalo)` ítems (topeado por el tamaño del inventario).
 * Se llama ANTES de sumar la ganancia instantánea del loot generado offline (R23.3).
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @param {number} segundosEfectivos
 * @returns {number} dinero ganado por estas ventas (ya sumado a state.money/totalMoneyEarned)
 */
export function applyOfflineStallSales(state, data, segundosEfectivos) {
  if (!data.stall || !hasStallVendor(state, data) || !state.inventory.length) return 0;
  const count = Math.min(state.inventory.length, Math.floor(segundosEfectivos / data.stall.vendedorIntervalo));
  let earned = 0;
  for (let i = 0; i < count; i++) {
    const idx = pickVendorSaleIndex(state, state.mantenerStockPedidos);
    if (idx === -1) break;
    const result = sellInventoryItemAt(state, idx, data, 1, state.mantenerStockPedidos);
    if (result.ok) earned += result.moneyDelta;
  }
  state.stallVendorAt = Date.now();
  return earned;
}

/**
 * Genera un pedido al azar sobre una categoría poseída.
 * @param {Array<string>} ownedCategories
 * @param {import('../economy.js').EngineData} data
 * @param {() => number} random
 * @returns {import('../state.js').StallOrder}
 */
function randomOrder(ownedCategories, data, random) {
  const categoria = ownedCategories[Math.floor(random() * ownedCategories.length)];
  const cantidad = 2 + Math.floor(random() * 3); // 2-4
  const id = `order-${categoria}-${Math.floor(random() * 1e9)}`;
  return { id, npcId: 'salomon', categoria, cantidad, mult: data.stall.orderMult, progress: 0 };
}

/**
 * Mantiene 2 pedidos activos (PLAN.md §4.28): si no hay ninguno, o pasó `orderRotationMs` desde
 * la última rotación completa (reloj clampeado §3.3: con el reloj hacia atrás, no rota), genera
 * un par nuevo; si faltan por debajo de 2 (uno se cumplió en la venta), completa el resto sin
 * reiniciar el reloj de rotación completa.
 * @param {import('../state.js').GameState} state
 * @param {import('../economy.js').EngineData} data
 * @param {Array<string>} ownedCategories - categorías de los contenedores poseídos (nunca se pide lo inalcanzable)
 * @param {number} [now]
 * @param {() => number} [random]
 * @returns {void}
 */
export function rotateStallOrders(state, data, ownedCategories, now = Date.now(), random = Math.random) {
  if (state.stallLevel < 1 || !data.stall || !ownedCategories.length) return;
  const elapsed = clampedElapsedMs(now, state.ordersRotatedAt);
  if (state.stallOrders.length === 0 || elapsed >= data.stall.orderRotationMs) {
    state.stallOrders = [randomOrder(ownedCategories, data, random), randomOrder(ownedCategories, data, random)];
    state.ordersRotatedAt = now;
    return;
  }
  while (state.stallOrders.length < 2) {
    state.stallOrders.push(randomOrder(ownedCategories, data, random));
  }
}
