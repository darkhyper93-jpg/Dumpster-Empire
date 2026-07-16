/**
 * Vista de Prestigio: preview de llaves a ganar, botón de prestigiar y árbol real de
 * nodos conectados (PLAN.md §11.7, mockup Stitch `expanded_prestige_tree`).
 *
 * El Agente 6 agregó dependencias reales (`requires`) a `prestigeTree.json` y las gatea en el
 * engine (`isPrestigeNodeUnlocked`/`buyPrestigeNode`). Esta vista deriva el layout del grafo
 * (rama/profundidad) directamente de `requires` — no hay una tabla estática de posiciones: si
 * el árbol de datos cambia de forma, el dibujo se recalcula solo.
 */

import {
  formatMoney,
  formatNumber,
  canPrestige,
  prestigeKeysPreview,
  nextPrestigeNodeCost,
  isPrestigeNodeUnlocked,
  PRESTIGE_MONEY_THRESHOLD,
} from '@dumpster/engine';
import { iconMarkup } from '../icons/icons.js';
import { t } from '../i18n/i18n.js';

// Ronda 25 (PLAN.md §4.31/§4.32): la elección de especialización/desafío para la PRÓXIMA run es
// puro estado de UI (todavía no se despachó al engine) — módulo-level, mismo patrón que
// `selectedContainerId` de CollectionView. Se resetea al confirmar/cancelar.
let choiceOpen = false;
/** @type {{ type: 'specialization'|'challenge', id: string } | null} */
let selectedChoice = null;

/**
 * Texto legible del objetivo de un desafío (PLAN.md §4.32): los dos goal types de esta ronda son
 * "ganar $X en la run" (`totalMoneyEarnedAtLeast`) y "llegar a prestigiar" (`always`).
 * @param {Object} challenge
 * @returns {string}
 */
function formatChallengeGoal(challenge) {
  if (challenge.goal.type === 'totalMoneyEarnedAtLeast') {
    return t('prestige.challengeGoalMoney', { amount: formatMoney(challenge.goal.value, 0) });
  }
  return t('prestige.challengeGoalPrestige');
}

/**
 * Texto legible de la recompensa permanente de un desafío (PLAN.md §4.32) — un tipo por
 * desafío hoy, pero el switch cubre los 4 `reward.type` reales de `data/challenges.json`.
 * @param {Object} challenge
 * @returns {string}
 */
function formatChallengeReward(challenge) {
  const { reward } = challenge;
  if (reward.type === 'sellPercentGlobal') return t('prestige.rewardSellPercent', { pct: Math.round(reward.percent * 100) });
  if (reward.type === 'luckFlat') return t('prestige.rewardLuckFlat', { amount: reward.flat });
  if (reward.type === 'digPowerPercent') return t('prestige.rewardDigPowerPercent', { pct: Math.round(reward.percent * 100) });
  if (reward.type === 'marketFluctuationMinFlat') return t('prestige.rewardMarketFluctuationMinFlat', { amount: reward.flat });
  return '';
}

/**
 * Deriva { branch, depth, parent } por nodo a partir de `requires` (cada nodo tiene 0 o 1
 * prerrequisito directo en la data actual). La raíz reparte una rama por hijo directo; cada
 * rama hereda la de su hijo-raíz para que las cadenas largas queden en una sola columna.
 * @param {Array<Object>} nodes
 * @returns {Object<string, { branch: number, depth: number, parent: string|null }>}
 */
function buildTreeLayout(nodes) {
  const root = nodes.find((n) => !n.requires.length);
  if (!root) return {};

  const childrenOf = new Map();
  for (const n of nodes) {
    const parent = n.requires[0] || null;
    if (parent) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(n.id);
    }
  }

  const rootChildren = childrenOf.get(root.id) || [];
  // DECISIÓN: redondeo — `grid-column: calc(var(--branch) + 1)` exige un entero; con cantidad
  // par de hijos la mitad exacta daría x.5 (declaración inválida, el nodo caería a colocación
  // automática), así que la raíz se apoya en la columna central más cercana.
  const branchOf = new Map([[root.id, Math.round(Math.max(0, (rootChildren.length - 1) / 2))]]);
  const assignBranch = (id, branch) => {
    branchOf.set(id, branch);
    for (const childId of childrenOf.get(id) || []) assignBranch(childId, branch);
  };
  rootChildren.forEach((childId, i) => assignBranch(childId, i));

  const depthOf = new Map([[root.id, 0]]);
  const assignDepth = (id, depth) => {
    depthOf.set(id, depth);
    for (const childId of childrenOf.get(id) || []) assignDepth(childId, depth + 1);
  };
  assignDepth(root.id, 0);

  const layout = {};
  for (const n of nodes) {
    layout[n.id] = { branch: branchOf.get(n.id) ?? 0, depth: depthOf.get(n.id) ?? 0, parent: n.requires[0] || null };
  }
  return layout;
}

export const PrestigeView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    // AJUSTE (ronda 6): marca propia (ver CollectionView) — la marca genérica compartida en
    // #tab-content dejaba sin listener a las vistas visitadas después de la primera.
    if (!container.dataset.boundClickPrestige) {
      container.dataset.boundClickPrestige = 'true';
      container.addEventListener('click', (evt) => {
        const nodeBtn = evt.target.closest('[data-action="buy-node"]');
        if (nodeBtn && !nodeBtn.disabled) {
          store.actions.buyPrestigeNode(nodeBtn.dataset.id);
          return;
        }
        // Ronda 25 (PLAN.md §4.31/§4.32): "Hacer Prestigio" ya no prestigia directo — abre el
        // panel de elección de especialización/desafío para la PRÓXIMA run (R25.3: mutuamente
        // excluyentes, la UI lo deja claro con un solo grupo de tarjetas seleccionables).
        const prestigeBtn = evt.target.closest('[data-action="do-prestige"]');
        if (prestigeBtn && !prestigeBtn.disabled) {
          choiceOpen = true;
          selectedChoice = null;
          this.render(container, store.getState(), store);
          return;
        }
        const choiceBtn = evt.target.closest('[data-action="select-choice"]');
        if (choiceBtn) {
          selectedChoice =
            choiceBtn.dataset.choiceType === 'none' ? null : { type: choiceBtn.dataset.choiceType, id: choiceBtn.dataset.choiceId };
          this.render(container, store.getState(), store);
          return;
        }
        const cancelBtn = evt.target.closest('[data-action="cancel-prestige"]');
        if (cancelBtn) {
          choiceOpen = false;
          selectedChoice = null;
          this.render(container, store.getState(), store);
          return;
        }
        const confirmBtn = evt.target.closest('[data-action="confirm-prestige"]');
        if (confirmBtn) {
          const choice = selectedChoice;
          // AJUSTE: resetear el estado local del panel ANTES de despachar la acción — doPrestige
          // notifica al store SINCRÓNICAMENTE (persist()+notify() dentro de la misma llamada), lo
          // que re-renderiza esta vista DURANTE store.actions.doPrestige(...). Si el reset corría
          // después, ese re-render intermedio todavía veía `choiceOpen=true` y el panel quedaba
          // abierto en pantalla con el estado YA posterior al prestigio (bug real, atrapado en
          // verificación manual con captura de pantalla).
          choiceOpen = false;
          selectedChoice = null;
          store.actions.doPrestige(choice);
        }
      });
    }

    const { data, itemsData } = store.ctx;
    if (!data.prestigeTree.length) {
      container.innerHTML = `<p class="empty-state">${t('prestige.empty')}</p>`;
      return;
    }

    const eligible = canPrestige(state);
    const preview = prestigeKeysPreview(state);
    const treeLayout = buildTreeLayout(data.prestigeTree);
    const nodeById = new Map(data.prestigeTree.map((n) => [n.id, n]));

    const nodes = data.prestigeTree
      .map((node) => {
        const level = Number(state.prestigeTreeLevels[node.id]) || 0;
        const maxed = level >= node.nivelMaximo;
        const cost = maxed ? 0 : nextPrestigeNodeCost(state, node);
        const canAfford = state.prestigeKeys >= cost;
        const unlocked = isPrestigeNodeUnlocked(state, node);
        const layout = treeLayout[node.id] || { branch: 0, depth: 0, parent: null };
        let action;
        if (!unlocked) {
          const parentName = layout.parent ? nodeById.get(layout.parent)?.name || layout.parent : '';
          action = `<span class="badge badge--locked">${t('prestige.requires', { name: parentName })}</span>`;
        } else if (maxed) {
          action = `<span class="badge">${t('prestige.maxed')}</span>`;
        } else {
          action = `<button type="button" data-action="buy-node" data-id="${node.id}" ${canAfford ? '' : 'disabled'} title="${
            canAfford ? '' : t('common.missingKeys', { amount: formatNumber(cost - state.prestigeKeys) })
          }">${t('prestige.upgradeFor', { amount: formatNumber(cost) })}</button>`;
        }
        const stateClass = !unlocked
          ? 'prestige-node--locked'
          : maxed
          ? 'prestige-node--maxed'
          : level > 0
          ? 'prestige-node--active'
          : '';
        return (
          `<article class="prestige-node ${stateClass}" ` +
          `style="--branch:${layout.branch};--depth:${layout.depth}" data-parent="${layout.parent || ''}">` +
          `<span class="prestige-node-icon">${iconMarkup(unlocked ? node.icon : 'locked', { size: 26 })}</span>` +
          // PLAN.md §4.33 (ronda 25): `nivelMaximo` es opcional — un nodo infinito lo muestra
          // como "Nivel N (sin máximo)" en vez de "N/undefined".
          `<h3>${node.name} (${
            node.nivelMaximo === undefined ? t('prestige.infinite', { level }) : `${level}/${node.nivelMaximo}`
          })</h3>` +
          `<p>${node.desc}</p>` +
          action +
          `</article>`
        );
      })
      .join('');

    // PLAN.md §4.31/§4.32 (ronda 25): badge de la especialización/desafío activo de la run EN
    // CURSO (state.specialization/activeChallenge — no la elección todavía sin confirmar del
    // panel). Excluyentes por diseño: nunca los dos a la vez (R25.3).
    let activeBadge = '';
    if (state.specialization) {
      const spec = (data.specializations || []).find((s) => s.id === state.specialization);
      if (spec) activeBadge = `<p class="prestige-active-badge">${t('prestige.activeSpecialization', { name: spec.name })}</p>`;
    } else if (state.activeChallenge) {
      const challenge = (data.challenges || []).find((c) => c.id === state.activeChallenge);
      if (challenge) {
        const completed = state.challengesCompleted.includes(challenge.id);
        activeBadge =
          `<p class="prestige-active-badge">${t('prestige.activeChallenge', { name: challenge.name })}` +
          (completed ? ` <span class="badge">${t('prestige.challengeCompleted')}</span>` : '') +
          `</p>`;
      }
    }

    const choicePanel = choiceOpen ? this.renderChoicePanel(state, data, itemsData) : '';

    container.innerHTML =
      `<section class="prestige-summary">` +
      `<span class="prestige-summary-icon">${iconMarkup('key', { size: 22 })}</span>` +
      `<p>${t('prestige.keysLabel', { amount: formatNumber(state.prestigeKeys) })}</p>` +
      `<p>${t('prestige.completedCount', { count: Number(state.prestigeCount) || 0 })}</p>` +
      `<p>${t('prestige.previewGain', { amount: formatNumber(preview) })}</p>` +
      activeBadge +
      // AJUSTE (auditoría post-ronda 14): el umbral sale del engine (PRESTIGE_MONEY_THRESHOLD),
      // no de un "$1.000.000.000" hardcodeado en el diccionario que mentiría si el balance cambia.
      (choiceOpen
        ? ''
        : `<button type="button" class="prestige-btn-main" data-action="do-prestige" ${eligible ? '' : 'disabled'} title="${
            eligible ? '' : t('prestige.needMoney', { amount: formatMoney(PRESTIGE_MONEY_THRESHOLD, 0) })
          }">${t('prestige.doButton')}</button>`) +
      `</section>` +
      choicePanel +
      `<div class="prestige-tree">${nodes}</div>`;
  },

  /**
   * Panel de elección de especialización/desafío para la PRÓXIMA run (PLAN.md §4.31/§4.32,
   * ronda 25), abierto al clickear "Hacer Prestigio". `selectedChoice` es puro estado de UI
   * (módulo-level) hasta que "Confirmar Prestigio" lo despacha al engine.
   * @param {import('@dumpster/engine').GameState} state
   * @param {Object} data
   * @param {{ rarities: Array<{id:string,name:string}> }} itemsData
   * @returns {string}
   */
  renderChoicePanel(state, data, itemsData) {
    const categoryName = (id) => itemsData.rarities.find((r) => r.id === id)?.name || id;
    const isSelected = (type, id) => selectedChoice?.type === type && selectedChoice?.id === id;

    const noneCard =
      `<article class="prestige-choice-card ${selectedChoice === null ? 'is-selected' : ''}">` +
      `<h4>${t('prestige.noneOption')}</h4><p>${t('prestige.noneOptionDesc')}</p>` +
      `<button type="button" data-action="select-choice" data-choice-type="none">${
        selectedChoice === null ? t('prestige.selected') : t('prestige.noneOption')
      }</button>` +
      `</article>`;

    const specializationCards = (data.specializations || [])
      .map((spec) => {
        const selected = isSelected('specialization', spec.id);
        return (
          `<article class="prestige-choice-card ${selected ? 'is-selected' : ''}">` +
          `<span class="prestige-choice-icon">${iconMarkup(spec.icon, { size: 24 })}</span>` +
          `<h4>${spec.name}</h4>` +
          `<p>${t('prestige.specializationBonus', { categories: spec.categoriasBonus.map(categoryName).join(', ') })}</p>` +
          `<p>${t('prestige.specializationPenalty')}</p>` +
          `<button type="button" data-action="select-choice" data-choice-type="specialization" data-choice-id="${spec.id}">${
            selected ? t('prestige.selected') : spec.name
          }</button>` +
          `</article>`
        );
      })
      .join('');

    const challengeCards = (data.challenges || [])
      .map((challenge) => {
        const selected = isSelected('challenge', challenge.id);
        const completed = state.challengesCompleted.includes(challenge.id);
        return (
          `<article class="prestige-choice-card ${selected ? 'is-selected' : ''}">` +
          `<span class="prestige-choice-icon">${iconMarkup(challenge.icon, { size: 24 })}</span>` +
          `<h4>${challenge.name}${completed ? ` <span class="badge">${t('prestige.challengeCompleted')}</span>` : ''}</h4>` +
          `<p>${challenge.desc}</p>` +
          `<p>${t('prestige.challengeGoal', { goal: formatChallengeGoal(challenge) })}</p>` +
          `<p>${t('prestige.challengeReward', { reward: formatChallengeReward(challenge) })}</p>` +
          `<button type="button" data-action="select-choice" data-choice-type="challenge" data-choice-id="${challenge.id}">${
            selected ? t('prestige.selected') : challenge.name
          }</button>` +
          `</article>`
        );
      })
      .join('');

    return (
      `<section class="prestige-choice-panel">` +
      `<h3>${t('prestige.chooseTitle')}</h3>` +
      `<h4>${t('prestige.specializationsHeading')}</h4>` +
      `<div class="prestige-choice-grid">${noneCard}${specializationCards}</div>` +
      `<h4>${t('prestige.challengesHeading')}</h4>` +
      `<div class="prestige-choice-grid">${challengeCards}</div>` +
      `<div class="prestige-choice-actions">` +
      `<button type="button" class="prestige-btn-main" data-action="confirm-prestige">${t('prestige.confirmButton')}</button>` +
      `<button type="button" data-action="cancel-prestige">${t('prestige.cancelButton')}</button>` +
      `</div>` +
      `</section>`
    );
  },
};
