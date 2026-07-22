/**
 * API pública de @dumpster/engine. La UI (apps/game) importa únicamente desde acá.
 * Cero DOM en todo lo que este módulo reexporta.
 */

export {
  SAVE_VERSION,
  DIG_SENSITIVITY_MIN,
  DIG_SENSITIVITY_MAX,
  INVENTORY_MAX_SAFETY,
  ROBOTS_MAX_SAFETY,
  defaultRobotConfig,
  freshState,
} from './state.js';
export { formatNumber, formatMoney } from './format.js';

export {
  addMoney,
  addKeys,
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
  getAreaRate,
  getQueueMax,
  getParallelAutoSlots,
  getFleetSize,
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
  getMechanicValueMult,
  isSetComplete,
  getSetBonus,
  getDigRate,
  getEffectiveDigTime,
  getAutoDigPowerMult,
  getAutoSpeedMult,
  getAutoTrapDiscardChance,
  getTrapPenalty,
  getRecommendedLuck,
  getRecommendedDigPower,
  getRecommendedArea,
  getToolRadiusMult,
  getToolRhythmMult,
  registerContainerDig,
  getStallCapacity,
  getStallUpgradeCost,
  stallSalePrice,
  getStallSalePrice,
  hasStallVendor,
  getStallThresholdPresets,
  getTotalContainerDigs,
  getMissionRewardBaseValue,
  activeChallengeModifier,
  getMarketFluctuationMinBonus,
  resolveMarketFluctuation,
  getDeedsKeysBonusFlat,
  getExtraDailyMissionSlots,
  hasProceduralContainersUnlocked,
} from './economy.js';

export { clampedElapsedMs, localDayStamp } from './time.js';

export { isNightHour, getDayNightModifiers, getTimeBand } from './dayNight.js';

export {
  rollCategory,
  rollItem,
  rollItemVariance,
  rollIsTrap,
  rollTrapGrade,
  rollLegendary,
  refreshMarketFluctuation,
  categoryWeights,
} from './rng.js';

export {
  validateSave,
  serializeState,
  deserializeState,
  exportSave,
  importSave,
  SUPPORTED_LANGUAGES,
} from './save.js';

export {
  isContainerUnlocked,
  buyContainer,
  rollContainerResult,
  applyContainerResult,
  creditDugItem,
  springTrap,
  proceduralContainer,
  resolveContainerById,
  isProceduralTierUnlocked,
  nextProceduralTier,
} from './systems/containers.js';

export {
  PROCEDURAL_CONTAINER_MAX_N,
  isProceduralContainerId,
  proceduralTierN,
  proceduralContainerId,
} from './procedural.js';

export { nextUpgradeCost, buyUpgrade } from './systems/upgrades.js';

export { buyTool, equipTool } from './systems/tools.js';

export {
  buyStall,
  upgradeStall,
  setKeepThreshold,
  setMantenerStockPedidos,
  sellInventoryItem,
  sellAllInventory,
  stallVendorTick,
  applyOfflineStallSales,
  rotateStallOrders,
} from './systems/stall.js';

export {
  buyAutomation,
  automationTick,
  hasAutoDig,
  bestAffordableUnlockedContainer,
  ensureFleet,
  setRobotTarget,
  setRobotFilters,
} from './systems/automation.js';

export {
  PRESTIGE_MONEY_THRESHOLD,
  canPrestige,
  prestigeKeysPreview,
  nextPrestigeNodeCost,
  isPrestigeNodeUnlocked,
  buyPrestigeNode,
  doPrestige,
  GALAXY_MOVE_PRESTIGE_THRESHOLD,
  canGalaxyMove,
  galaxyMoveDeedsPreview,
  doGalaxyMove,
  nextDeedsNodeCost,
  isDeedsNodeUnlocked,
  buyDeedsNode,
} from './systems/prestige.js';

export { checkAchievements } from './systems/achievements.js';

export { checkStory } from './systems/story.js';

export {
  MISSION_TYPES,
  MISSION_DIFFICULTIES,
  rollThreeMissions,
  rerollDailyMissionsIfNeeded,
  updateMissionsProgress,
  claimMission,
  ownedCategories,
} from './systems/missions.js';

export { tryTriggerContainerEvent, isEventExpired } from './systems/events.js';

export {
  expectedContainerValue,
  estimateAutomationRatePerSecond,
  estimateDiscardShare,
  applyOfflineProgress,
} from './systems/offline.js';
