/**
 * Diccionario inglés (ronda 16, tarea 16.C — traducción real). MISMAS claves y {params} que
 * es.js (paridad testeada dinámicamente en apps/game/tests/ronda16-i18n.test.js).
 */

export default {
  // Topbar.js
  'topbar.settings': 'Settings',

  // tabs (index.html / UIManager.injectTabIcons — data-tab)
  'tabs.escarbar': 'Dig',
  'tabs.tienda': 'Containers',
  'tabs.automatizacion': 'Automation',
  'tabs.logros': 'Achievements',
  'tabs.prestigio': 'Prestige',
  'tabs.index': 'Index',

  // Compartidos entre vistas
  'common.free': 'Free',
  'common.missingMoney': 'You need {amount} more',
  'common.missingKeys': 'You need {amount} more keys',
  'common.effectFlat': '+{amount} {label} per level',
  'common.effectPercent': '+{pct}% {label} per level',
  'common.emptyContainers': 'No containers configured.',

  // QuickUpgrades.js
  'quickUpgrades.empty': 'No upgrades configured.',
  'quickUpgrades.levelLabel': '{label} · LV. {level}',

  // DigContainerPicker.js
  'digPicker.empty': 'No containers available yet.',
  'digPicker.prompt': 'Choose a container to dig.',
  'digPicker.level': 'Lv. {level}',

  // dig (DigCanvas.js + UIManager render de dig-area)
  'dig.idlePrompt': 'Drag to dig',
  'dig.abandon': 'Abandon',
  'dig.trapEntryName': 'Trap!',
  'dig.trapRiskLine': 'Trap risk: {pct}%{hint}',
  'dig.rateHint': ' · Dig rate: {pct}% (raise Dig Power)',

  // AchievementsView.js
  'achievements.empty': 'No achievements configured.',
  'achievements.rewardKeys': '{amount} City Key{plural}',
  'achievements.claimed': 'Claimed',
  'achievements.pending': 'Pending',

  // AutomationView.js
  'automation.empty': 'No automations configured.',
  // Ronda 15: toast al descartar un contenedor trampeado (nodo Escáner de Trampas).
  'automation.trapDiscarded': 'The robot discarded a trapped container.',
  'automation.explainer':
    'The robot buys containers with your money, queues them, and processes them (more trap risk than digging by hand). Pick below which one it buys, or leave it on "Auto". The other machines grow the queue or add more robots.',
  'automation.hint': "Gray button = you can't afford it yet; the tooltip shows how much you need.",
  // {name} = la máquina con efecto enablesAutoDig, resuelta desde automations.json (AutomationView).
  'automation.calloutInactive': 'You need the <strong>{name}</strong> to use the queue.',
  'automation.queue': 'Queue: {count} / {max}',
  'automation.slots': 'Simultaneous slots: {count}',
  'automation.processingLabel': 'Processing:',
  'automation.nothingInProgress': 'Nothing in progress.',
  'automation.processingItem': '{name}: {pct}%',
  'automation.unknownContainer': 'Unknown container',
  'automation.targetLabel': "Robot's target",
  'automation.targetAuto': 'Auto (the priciest you can afford)',
  'automation.waiting': 'The robot is saving up {amount} for {name}.',
  'automation.active': 'Active',
  'automation.buyFor': 'Buy for {amount}',
  'automation.expandCapacity': 'Expand Capacity (level {level}) for {amount}',

  // CelebrationModal.js
  'celebration.close': 'Close',
  'celebration.achievementTitle': 'Achievement unlocked!',
  'celebration.rewardLine': 'Reward: {reward}',
  'celebration.rewardKeys': '{amount} City Keys',
  'celebration.containerTitle': 'New container!',
  'celebration.containerReady': "It's now available to dig.",
  'celebration.firstFindTitle': 'New find!',

  // CollectionView.js
  'collection.emptyPool': 'This container has no rewards configured.',
  'collection.hiddenName': '???',
  'collection.notFound': "You haven't found this item yet.",
  'collection.probability': 'Probability: {pct}%',
  'collection.baseValue': 'Base value: {amount}',
  'collection.foundCount': 'Found: {count}',

  // OfflineModal.js
  'offline.title': 'While you were away...',
  'offline.summary': 'Your robots worked for {minutes} min and found:',
  'offline.close': 'Great',

  // PrestigeView.js
  'prestige.empty': 'No prestige tree configured.',
  'prestige.requires': 'Requires: {name}',
  'prestige.maxed': 'Maxed',
  'prestige.upgradeFor': 'Upgrade for {amount} keys',
  'prestige.keysLabel': 'City Keys: {amount}',
  'prestige.completedCount': 'Prestiges completed: {count}',
  'prestige.previewGain': "If you prestige now you'll gain: {amount} keys.",
  'prestige.doButton': 'Prestige',
  // {amount} = PRESTIGE_MONEY_THRESHOLD del engine formateado (PrestigeView), nunca un número fijo acá.
  'prestige.needMoney': 'You need {amount} earned in total to prestige.',

  // SettingsView.js
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.sound': 'Sound: {state}',
  'settings.volume': 'Volume: {pct}%',
  'settings.sensitivity': 'Dig sensitivity: {pct}%',
  'settings.language': 'Language',
  'settings.resetConfirm': 'Are you sure? Tap again to confirm',
  'settings.resetButton': 'Reset game',

  // ShopView.js
  'shop.unlocksAtPrestige': 'Unlocks at Prestige {count}.',
  'shop.lockedDefault': 'Locked. Buy the previous container first.',
  'shop.cost': 'Cost: {label}',
  'shop.categories': 'Categories: {list}',
  'shop.trapRisk': 'Trap risk: {pct}%',
  'shop.owned': 'Owned: {count}',
  'shop.levelLine': 'Level {level}/{max} (+{pct}% value) — {progress}',
  'shop.maxLevel': 'max level',
  'shop.levelProgress': '{cur}/{needed} digs for level {next}',
  'shop.reached': '(reached)',
  'shop.haveLuck': '(you have {cur})',
  'shop.haveMult': '(you have ×{cur})',
  'shop.luckLine': 'Recommended Luck: {rec} {status}',
  'shop.digPowerLine': 'Recommended Dig Power: ×{rec} {status}',
  'shop.areaLine': 'Recommended Search Area: ×{rec} {status}',

  // TitleScreen.js
  'titleScreen.play': 'Play',
  'titleScreen.settings': 'Settings',

  // Tutorial.js
  'tutorial.step0': 'Dig the Street Bin (free) by dragging over the container to get started.',
  'tutorial.step1': 'Buy your first Luck, Dig Power, or Search Area upgrade in the quick upgrades panel.',
  'tutorial.step2': 'Dig your first paid container by picking it on the Dig screen.',
  'tutorial.skip': 'Skip tutorial',

  // UIManager.js
  'uiManager.levelUp': '{name} leveled up to {level}: +{pct}% value',
  'uiManager.unknownView': 'Unknown view.',

  // main.js
  'boot.loadFailed': 'Could not load {path} (HTTP {status}).',
  'boot.fatalError': 'Could not start Dumpster Empire: {message}',
};
