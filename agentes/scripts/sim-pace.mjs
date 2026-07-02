/**
 * Simulación headless de ritmo (PLAN.md §3) — Agente 9, pase de balance.
 * Juega un jugador "activo" (revisa cada segundo, compra oportunista) usando el engine real, sin
 * DOM. Herramienta de diagnóstico manual — no corre en `npm test` ni en CI (no es parte del repo
 * de producción). Se ejecuta a mano con `node agentes/scripts/sim-pace.mjs [seed]`.
 *
 * AJUSTE: los 4 hitos tempranos de PLAN.md §3 (primera mejora, primer contenedor, primera
 * automatización, primer acceso a Electrónica) son estables entre seeds con la data actual. Los 2
 * hitos tardíos (todo desbloqueado, Prestigio disponible) son sensibles a la estrategia exacta de
 * reinversión de este bot heurístico — cerca del punto de equilibrio economía-vs-costo compuesto
 * (§4.2, 1.08^comprasDelMismoContenedor) el resultado puede oscilar mucho entre configuraciones
 * casi idénticas. Los números de `data/*.json` quedaron calibrados para que el bot converja a un
 * régimen sostenido (no "atascado"), con el Prestigio llegando algo más tarde que la ventana ideal
 * de 1.5-3h en este modelo concreto — ver `agentes/HANDOFF.md` (bloque Agente 9) para el detalle y
 * la recomendación de validar el ritmo tardío con playtest real, no solo con este script.
 */
import * as engine from '../../packages/engine/src/index.js';
import containersData from '../../apps/game/src/data/containers.json' with { type: 'json' };
import upgradesData from '../../apps/game/src/data/upgrades.json' with { type: 'json' };
import automationsData from '../../apps/game/src/data/automations.json' with { type: 'json' };
import prestigeTreeData from '../../apps/game/src/data/prestigeTree.json' with { type: 'json' };
import itemsData from '../../apps/game/src/data/items.json' with { type: 'json' };

const data = { upgrades: upgradesData, automations: automationsData, prestigeTree: prestigeTreeData };
const containers = containersData;

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AUTOMATION_ORDER = [
  'guantes',
  'carrito',
  'detectorMetales',
  'robotClasificador',
  'cintaTransportadora',
  'plantaReciclaje',
  'centroSubastas',
  'redDrones',
];

export function runSim({ seed = 1, maxSeconds = 4 * 3600 } = {}) {
  const random = mulberry32(seed);
  const state = engine.freshState();
  state.marketFluctuationAt = 0;

  const milestones = {};
  let nowMs = 0;
  let manualTarget = null;
  let manualRemaining = 0;

  function mark(key) {
    if (milestones[key] === undefined) milestones[key] = nowMs / 1000;
  }

  function upgradeDef(id) {
    return data.upgrades.find((u) => u.id === id);
  }

  for (let t = 0; t < maxSeconds; t++) {
    nowMs = (t + 1) * 1000;
    state.lastSavedAt = nowMs;

    // 1) Automatización (robot procesando + cola autocomprada) — usa Date.now() real para el
    //    mercado, no crítico para el ritmo, así que se deja tal cual usa el engine.
    engine.automationTick(state, 1, containers, itemsData, data, random);

    // 2) Automatizaciones, en el orden de progresión de PLAN.md §2.7 — prioridad alta (ANTES del
    //    reinversión en contenedores): un jugador activo prioriza destrabar el robot/la cinta por
    //    sobre seguir reinvirtiendo todo en el mejor contenedor afordable del momento.
    for (const autoId of AUTOMATION_ORDER) {
      if (state.automationOwned[autoId]) continue;
      const auto = data.automations.find((a) => a.id === autoId);
      if (state.money >= auto.cost) {
        const res = engine.buyAutomation(state, auto);
        if (res.ok) mark(`firstAuto_${autoId}`);
      }
      break; // solo intenta comprar la próxima en orden, no salta a la que sigue.
    }

    // 2b) Suerte primero (PLAN.md §11.2): un jugador informado sabe que re-comprar el MISMO
    //     contenedor infla su costo un 8% cada vez (§4.2), mientras que subir Suerte abarata el
    //     acceso a TODOS los contenedores (baja la Suerte recomendada de todos a la vez). Prioriza
    //     Suerte por sobre reinvertir en el contenedor actual mientras sea barata (<= 50% del cash).
    {
      const def = upgradeDef('luck');
      let guard = 0;
      while (guard++ < 50) {
        const cost = engine.nextUpgradeCost(state, def);
        if (state.money < cost || cost > state.money * 0.5) break;
        const before = state.upgradeLevels.luck || 0;
        const res = engine.buyUpgrade(state, def);
        if (!res.ok) break;
        if (before === 0) mark('firstUpgrade');
      }
    }

    // 3) Escarbado manual: si no hay uno en curso, comprar+arrancar un contenedor. Modela un
    //    jugador curioso pero no temerario (PLAN.md §11.2/§3): prueba el más caro afordable y
    //    desbloqueado apenas puede (motor de exploración del ritmo temprano), pero si ese
    //    throughput ($/s neto) es claramente negativo (peor que -1$/s) no insiste — cae al de
    //    mejor throughput real (nunca peor que el Tacho, que siempre es >= 0).
    if (!manualTarget) {
      const spendCap = state.money;

      let costliestAffordable = null;
      let costliestCost = -Infinity;
      let costliestRate = 0;
      let bestRate = -Infinity;
      let bestRatePick = null;
      for (const c of containers) {
        if (!engine.isContainerUnlocked(state, c, containers)) continue;
        const cost = engine.getContainerCost(state, c, data);
        if (cost > spendCap) continue;
        const gross = engine.expectedContainerValue(state, c, itemsData, data);
        const trapProb = engine.getEffectiveTrapProbability(state, c, false, data);
        const penalty = engine.getTrapPenalty(state, c, data);
        const netPerDig = gross - trapProb * penalty - cost;
        const effTime = engine.getEffectiveDigTime(state, c, data);
        const rate = netPerDig / effTime;
        if (cost > costliestCost) {
          costliestAffordable = c;
          costliestCost = cost;
          costliestRate = rate;
        }
        if (rate > bestRate) {
          bestRate = rate;
          bestRatePick = c;
        }
      }
      // Curiosidad temprana: prueba el más caro afordable salvo que sea claramente ruinoso
      // (peor que -1$/s), en cuyo caso cae al de mejor throughput real (>= Tacho, siempre >= 0).
      let pick = costliestRate >= -1 ? costliestAffordable : bestRatePick;
      if (!pick) pick = containers.find((c) => c.id === 'tachoVereda');
      if (pick) {
        const boughtBefore = state.ownedContainers[pick.id] || 0;
        const res = engine.buyContainer(state, pick, data);
        if (res.ok) {
          manualTarget = pick;
          manualRemaining = engine.getEffectiveDigTime(state, pick, data);
          if (pick.id !== 'tachoVereda' && boughtBefore === 0) mark(`firstBuy_${pick.id}`);
        }
      }
    } else {
      manualRemaining -= 1;
      if (manualRemaining <= 0) {
        const result = engine.rollContainerResult(state, manualTarget, false, itemsData, data, random);
        engine.applyContainerResult(state, manualTarget, result, false, data);
        if (!result.isTrap) {
          for (const item of result.items) {
            if (item.categoria === 'electronics') mark('firstElectronics');
          }
        }
        manualTarget = null;
      }
    }

    // 4) Compras oportunistas de mejoras (Suerte > Fuerza > Área) con lo que sobra, sin frenar
    //    el ritmo de compra de contenedores (tope: 20% del efectivo disponible).
    for (const id of ['digPower', 'area']) {
      const def = upgradeDef(id);
      const cost = engine.nextUpgradeCost(state, def);
      if (state.money >= cost && cost <= state.money * 0.35) {
        const before = state.upgradeLevels[id] || 0;
        const res = engine.buyUpgrade(state, def);
        if (res.ok && before === 0) mark('firstUpgrade');
      }
    }
    // Capacidad: prioridad más baja todavía.
    {
      const def = upgradeDef('capacity');
      const cost = engine.nextUpgradeCost(state, def);
      if (state.money >= cost * 5) engine.buyUpgrade(state, def);
    }

    // Hitos agregados
    if (state.totalMoneyEarned >= 1_000_000_000 && milestones.prestigeAvailable === undefined) {
      mark('prestigeAvailable');
    }
    // "Todo desbloqueado, falta plata" (PLAN.md §3): no es solo "tocó cada contenedor una vez" —
    // es haber comprado TODAS las automatizaciones (todo el contenido de progresión activa) y ya
    // estar parado en el contenedor tope pre-prestigio, a la espera de acumular para prestigiar.
    const allAutomationsOwned = data.automations.every((a) => state.automationOwned[a.id]);
    const topContainerOwned = (state.ownedContainers.bovedaPerdida || 0) >= 1;
    if (allAutomationsOwned && topContainerOwned && milestones.allUnlocked === undefined) mark('allUnlocked');

    if (
      milestones.firstUpgrade !== undefined &&
      milestones.firstBuy_contenedorBarrio !== undefined &&
      milestones.firstAuto_robotClasificador !== undefined &&
      milestones.firstElectronics !== undefined &&
      milestones.allUnlocked !== undefined &&
      milestones.prestigeAvailable !== undefined
    ) {
      break;
    }
  }

  return { milestones, state };
}

if (process.argv[1]?.endsWith('sim-pace.mjs')) {
  const seed = Number(process.argv[2]) || 1;
  const { milestones, state } = runSim({ seed, maxSeconds: 4 * 3600 });
  const fmt = (s) => (s === undefined ? 'NUNCA' : `${(s / 60).toFixed(2)} min (${s.toFixed(0)}s)`);
  console.log('seed', seed);
  console.log('Primera mejora            :', fmt(milestones.firstUpgrade), '  objetivo 20-30s');
  console.log('Primer contenedor de pago :', fmt(milestones.firstBuy_contenedorBarrio), '  objetivo <2min');
  console.log('Primera automatización    :', fmt(milestones.firstAuto_robotClasificador), '  objetivo 8-15min');
  console.log('Primer acceso Electrónica :', fmt(milestones.firstElectronics), '  objetivo <15min');
  console.log('Todo desbloqueado         :', fmt(milestones.allUnlocked), '  objetivo 45-60min');
  console.log('Prestigio disponible      :', fmt(milestones.prestigeAvailable), '  objetivo 1.5-3h');
  console.log('money final:', state.money.toFixed(0), 'totalEarned:', state.totalMoneyEarned.toFixed(0));
}
