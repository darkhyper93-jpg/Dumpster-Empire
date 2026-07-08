/**
 * API pública de @dumpster/engine. La UI (apps/game) importa únicamente desde acá.
 * Cero DOM en todo lo que este módulo reexporta.
 */

export { SAVE_VERSION, freshState } from './state.js';
export { formatNumber, formatMoney } from './format.js';

export {
  upgradeCost,
  containerCost,
  prestigeKeysEarned,
  itemSaleValue,
  offlineEarnings,
  trapProbability,
  getLuck,
  getDigPowerMult,
  getRevealThreshold,
  getDepthValueMult,
  getAreaMult,
  getQueueMax,
  getParallelAutoSlots,
  getSellMult,
  getOfflineFactor,
  getOfflineCapSeconds,
  getContainerCost,
  getEffectiveTrapProbability,
  getFragmentMult,
  getPrestigeStartMoney,
  CONTAINER_LEVEL_MAX,
  getContainerLevel,
  digsNeededForNextLevel,
  getLevelRarityShift,
  getLevelValueMult,
  getDigRate,
  getEffectiveDigTime,
  getTrapPenalty,
  getRecommendedLuck,
  getRecommendedDigPower,
  getRecommendedArea,
} from './economy.js';

export { rollCategory, rollItem, rollItemVariance, rollIsTrap, refreshMarketFluctuation, categoryWeights } from './rng.js';

export { validateSave, serializeState, deserializeState, exportSave, importSave } from './save.js';

export { isContainerUnlocked, buyContainer, rollContainerResult, applyContainerResult } from './systems/containers.js';

export { nextUpgradeCost, buyUpgrade } from './systems/upgrades.js';

export {
  buyAutomation,
  automationTick,
  hasAutoDig,
  bestAffordableUnlockedContainer,
} from './systems/automation.js';

export {
  canPrestige,
  prestigeKeysPreview,
  nextPrestigeNodeCost,
  isPrestigeNodeUnlocked,
  buyPrestigeNode,
  doPrestige,
} from './systems/prestige.js';

export { checkAchievements } from './systems/achievements.js';

export {
  expectedContainerValue,
  estimateAutomationRatePerSecond,
  applyOfflineProgress,
} from './systems/offline.js';
