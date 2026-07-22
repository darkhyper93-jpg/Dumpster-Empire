/**
 * Diccionario inglés (ronda 16, tarea 16.C — traducción real). MISMAS claves y {params} que
 * es.js (paridad testeada dinámicamente en apps/game/tests/ronda16-i18n.test.js).
 */

export default {
  // Topbar.js
  'topbar.settings': 'Settings',
  'topbar.stats': 'Stats',

  // tabs (index.html / UIManager.injectTabIcons — data-tab)
  'tabs.escarbar': 'Dig',
  'tabs.tienda': 'Containers',
  'tabs.automatizacion': 'Automation',
  'tabs.logros': 'Achievements',
  'tabs.prestigio': 'Prestige',
  'tabs.index': 'Index',
  'tabs.puesto': 'Stall',

  // Compartidos entre vistas
  'common.free': 'Free',
  'common.missingMoney': 'You need {amount} more',
  'common.missingKeys': 'You need {amount} more keys',
  'common.missingDeeds': 'You need {amount} more Deeds',
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
  // Round 19 (PLAN.md §4.20): manual no-trap dig streak, visible from streak >= 2.
  'dig.streak': 'Streak: {count}',

  // Round 20 (PLAN.md §4.24): Vault Against the Clock (hard timer) and Dark Basement (mask).
  'dig.timedRemaining': 'Time left: {seconds}s',
  'dig.timedExpired': 'Time\'s up: you lost "{name}" with no money penalty.',
  'dig.darkHint': 'You can only see near your pointer.',

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
  // Ronda 25 (PLAN.md §4.32): desafío `manosVacias` activo bloquea toda compra de máquinas.
  'automation.blockedByChallenge': 'The active challenge does not allow buying machines.',
  // Ronda 27 (PLAN.md §4.38/§4.39): flota de robots + filtros por robot.
  'automation.fleetTitle': 'Robot fleet',
  'automation.fleetSize': 'Fleet: {count} robot{plural}',
  'automation.robotTitle': 'Robot {num}',
  'automation.robotArms': '{count} arm{plural}',
  'automation.robotIdle': 'Nothing in the claw right now.',
  'automation.filtersSummary': 'Robot filters',
  'automation.filterThresholdLabel': 'Discard finds worth less than',
  'automation.filterDiscardEstimate': 'Estimate: discards ~{pct}% of what it finds.',
  'automation.filterReserveLabel': 'Reserve for the Stall (ignores the sell threshold):',
  'automation.filterReserveLocked': 'Buy the Junk Stall in the Shop to reserve categories.',
  'npc.chispa.fleetFlavor': 'Chispa: "I keep them oiled up. You just tell me what each one should hunt for."',

  // CelebrationModal.js
  'celebration.close': 'Close',
  'celebration.achievementTitle': 'Achievement unlocked!',
  'celebration.rewardLine': 'Reward: {reward}',
  'celebration.rewardKeys': '{amount} City Keys',
  'celebration.containerTitle': 'New container!',
  'celebration.containerReady': "It's now available to dig.",
  'celebration.firstFindTitle': 'New find!',
  // Round 22 (PLAN.md §4.26): special celebration when finding a legendary.
  'celebration.legendaryTitle': 'Legendary found!',

  // CollectionView.js
  'collection.emptyPool': 'This container has no rewards configured.',
  'collection.hiddenName': '???',
  'collection.notFound': "You haven't found this item yet.",
  'collection.probability': 'Probability: {pct}%',
  'collection.baseValue': 'Base value: {amount}',
  'collection.foundCount': 'Found: {count}',
  // Round 22 (PLAN.md §4.25/§4.26): complete-set badge + Showcase section.
  'collection.setCompleteBadge': 'SET COMPLETE +{pct}%',
  'collection.showcaseTitle': 'Legendary Showcase',
  'collection.showcaseCount': 'Showcase: {count}/{total}',
  'collection.showcaseHiddenName': '???',
  'collection.showcaseNotFound': "You haven't found this legendary yet.",
  // Features round (2026-07-22): the Showcase is GLOBAL, not per selected container.
  'collection.showcaseGlobalHint': 'Legendaries span the whole game, not this container: each one drops from any container that yields its rarity.',
  'collection.showcaseFrom': 'Drops from: {categoria}',
  // Round 19: completion % (PLAN.md §5.4), derived — never a new persisted counter.
  'collection.completionGlobal': 'Global completion: {pct}%',

  // OfflineModal.js
  'offline.title': 'While you were away...',
  'offline.summary': 'Your robots worked for {minutes} min and found:',
  'offline.close': 'Great',
  // Ronda 27 (§27.5.3): desglose de lo que facturó el robot vendedor en el Puesto.
  'offline.stallEarnings': 'The vendor robot earned {amount} at the Stall.',

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
  'prestige.infinite': 'Level {level} (no cap)',
  'prestige.chooseTitle': 'Choose for your next run',
  'prestige.specializationsHeading': 'Specializations',
  'prestige.challengesHeading': 'Challenges',
  'prestige.noneOption': 'No specialization',
  'prestige.noneOptionDesc': 'No sale bonus or penalty by category.',
  'prestige.specializationBonus': '+50% on {categories}',
  'prestige.specializationPenalty': '-15% on the rest',
  'prestige.challengeGoal': 'Goal: {goal}',
  'prestige.challengeGoalMoney': 'earn {amount} this run',
  'prestige.challengeGoalPrestige': 'reach prestige',
  'prestige.challengeReward': 'Permanent reward: {reward}',
  'prestige.challengeCompleted': 'Completed',
  'prestige.confirmButton': 'Confirm Prestige',
  'prestige.cancelButton': 'Cancel',
  'prestige.activeSpecialization': 'Active specialization: {name}',
  'prestige.activeChallenge': 'Active challenge: {name}',
  'prestige.selected': 'Selected',
  'prestige.rewardSellPercent': '+{pct}% global sale value',
  'prestige.rewardLuckFlat': '+{amount} Luck',
  'prestige.rewardDigPowerPercent': '+{pct}% Dig Power',
  'prestige.rewardMarketFluctuationMinFlat': '+{amount} to the market quote floor',

  // Round 26.C (PLAN.md §2.10/§4.34-§4.36): Galaxy Move and the Deeds tree.
  'prestige.galaxyMoveHeading': 'Galaxy Move',
  'prestige.galaxyMoveLocked': 'Unlocks at {count} prestiges.',
  'prestige.galaxyMoveDesc':
    'Reset your prestige progress (Keys, tree and counter) and start over in a different galaxy, in exchange for permanent Deeds.',
  'prestige.galaxyMoveCount': 'Moves made: {count}',
  'prestige.deedsLabel': 'Deeds: {amount}',
  'prestige.galaxyMoveButton': 'Move to Another Galaxy',
  'prestige.galaxyMovePreview': "If you move now you'll gain: {amount} Deeds.",
  'prestige.galaxyMoveConfirmTitle': 'Confirm the Galaxy Move?',
  'prestige.galaxyMoveKeeps':
    'Kept: achievements, collection, showcase, sets, completed challenges, tools, the Stall and its level, Deeds and its tree, your best streak and historical counters.',
  'prestige.galaxyMoveLoses':
    'Lost: City Keys, prestige tree, active specialization/challenge, and the Stall inventory (liquidated at instant sale).',
  'prestige.galaxyMoveConfirmButton': 'Confirm Move',
  'prestige.deedsTreeHeading': 'Deeds Tree',
  'prestige.deedsUpgradeFor': 'Upgrade for {amount} Deeds',

  // SettingsView.js
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.sound': 'Sound: {state}',
  'settings.volume': 'Volume: {pct}%',
  'settings.sensitivity': 'Dig sensitivity: {pct}%',
  'settings.language': 'Language',
  'settings.resetConfirm': 'Are you sure? Tap again to confirm',
  'settings.resetButton': 'Reset game',
  // Round 19: haptic vibration toggle, same pattern as settings.sound.
  'settings.vibration': 'Vibration: {state}',
  // AJUSTE (auditoria de release): aviso de guardado ilegible. Antes, un save que no pasaba la
  // validacion se reemplazaba por una partida nueva en SILENCIO (CLAUDE.md exige un mensaje
  // claro); ahora se archiva una copia intacta y el jugador se entera de las dos cosas.
  'save.rejectedToast': 'Your saved game could not be read. An untouched copy was archived and a new game was started.',
  'save.rejectedTitle': 'Unreadable saved game',
  'save.rejectedDetail': 'The previous save failed validation and a new game was started. The original copy is archived untouched on this device: it was not overwritten.',

  // Round 20 (PLAN.md §4.23): dig tool selector, same pattern as AutomationView.
  'tools.title': 'Digging tools',
  'tools.buyFor': 'Buy for {amount}',
  'tools.equip': 'Equip',
  'tools.equipped': 'Equipped',
  'tools.manos': 'Bare hands',
  'tools.palaAncha': 'Wide Shovel',
  'tools.pincelFino': "Archaeologist's Brush",
  'tools.guanteHidraulico': 'Hydraulic Glove',
  // Ronda "features" (2026-07-22): las 4 herramientas de late-game (500M / 50B / 1T / 10T).
  'tools.exoesqueletoChatarrero': 'Scrapper Exosuit',
  'tools.taladroNucleo': 'Core Drill',
  'tools.barredoraGravitatoria': 'Gravity Sweeper',
  'tools.excavadoraSingular': 'Singularity Excavator',

  // Statistics (round 19, PLAN.md §5.4) — Settings subview, no new engine logic.
  'stats.title': 'Statistics',
  'stats.itemsFound': 'Items found: {count}',
  'stats.trapsHit': 'Traps hit: {count}',
  'stats.totalMoneyEarned': 'Total money earned: {amount}',
  'stats.autoProcessed': 'Processed by robots: {count}',
  'stats.bestStreak': 'Best streak: {count}',
  'stats.completion': 'Collection completion: {pct}%',
  'stats.maxLevelContainers': 'Containers at max level: {count}/{total}',

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
  // Round 31 (PLAN.md §4.42): CURRENT pace/brush against this container's real resistance/area —
  // unlike luckLine/digPowerLine/areaLine (fixed targets, neutral player), this shows the effect
  // already applied with the player's actual stats.
  // Features round (2026-07-22): "Pace"/"Brush" named the TOOL, not the effect (user feedback).
  'shop.rateLine': 'Speed: {pct}%',
  'shop.areaRateLine': 'Reach: {pct}%',
  'shop.rateLineTitle': "Your Strength against this container's toughness: 100% is normal speed, less is slower, more is faster.",
  'shop.areaRateLineTitle': 'Your Area against the area this container asks for: how much ground your brush sweeps when digging by hand.',
  // Ronda 23.C: Junk Stall purchase card (PLAN.md §2.9/§4.27) in the Shop tab.
  'shop.stallCard': 'Junk Stall',
  'shop.stallDesc': 'Save the objects worth keeping and sell them to Doña Rita when the price is high.',
  'shop.stallBuyFor': 'Buy for {amount}',
  'shop.stallOwned': "You already have it — check the Stall tab.",

  // Post-Big Bang procedural tiers (PLAN.md §4.37, round 26.B): name suffix, {n} = tier.
  'shop.proceduralSuffix': ' (Echo {n})',
  'shop.proceduralAllOwned': "You already own every procedural tier available.",

  // StallView.js (PLAN.md §2.9/§4.27-§4.30, ronda 23.C)
  'stall.lockedTeaser': 'Unlocked by buying the Junk Stall in the Shop.',
  'stall.quote': "Today's price: {arrow} {pct}%",
  'stall.thresholdLabel': 'Keep items worth $X or more',
  'stall.thresholdActive': 'Keeping items worth {amount} or more.',
  'stall.thresholdPaused': 'Stall paused: raise the threshold to start keeping items.',
  'stall.levelLine': 'Level {level}/{max} · Capacity: {capacity}',
  'stall.levelMaxed': 'Max level',
  'stall.upgradeFor': 'Upgrade for {amount}',
  'stall.inventoryTitle': 'Inventory',
  'stall.inventoryEmpty': 'The stall is empty — raise the threshold or dig up something good.',
  'stall.sell': 'Sell',
  // Features round (2026-07-22): sell the whole inventory in one click, alongside the per-item sale.
  'stall.sellAll': 'Sell all',
  'stall.sellAllDone': 'Sold {count} item(s) for {amount}.',
  'stall.ordersTitle': "{name}'s orders",
  'stall.orderCategory': 'Order: {categoria}',
  'stall.orderProgress': 'Progress: {progress}/{cantidad}',
  'stall.orderReward': 'Pays +{pct}% over the stall price',
  'stall.orderTime': 'Rotates in {minutes} min',
  // Ronda 27 (PLAN.md §4.39): toggle "mantener stock para pedidos" del robot vendedor.
  'stall.keepStockToggle': "Keep stock for Salomón's orders",
  'stall.keepStockHint': "The vendor won't sell what an active order still needs.",

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
  // §27.5.6 (ronda 27): mensaje genérico en pantalla; el detalle va a console.error.
  'boot.fatalErrorGeneric': 'Could not start Dumpster Empire. Try reloading; the technical details are in the console.',

  // Ronda 23 — Agente B (data): NPC dialogue and light story beats.
  'npc.rita.storyIntro': 'Doña Rita: "Oh, so you\'ve got your own stall now? Bring me nice things and I\'ll pay you well, dear."',
  'npc.rita.sale.junk': 'Doña Rita: "This is junk, but scrap is scrap. I\'ll still pay for it."',
  'npc.rita.sale.tech': 'Doña Rita: "I don\'t mess with technology, but I know worth when I see it."',
  'npc.rita.sale.classy': 'Doña Rita: "Now this has class. Reminds me of my grandmother\'s house."',
  'npc.rita.sale.premium': 'Doña Rita: "Would you look at this marvel! You don\'t find these every day."',
  'npc.salomon.storyFirstOrder': 'El Turco Salomón: "Finally, someone who fulfills an order properly! That\'s the way to do business, champ."',

  // Ronda 24 — daily missions, container events and day/night cycle (PLAN.md §4.30-§4.33).
  'npc.chispa.storyFirstMission': 'Chispa: "There it is! You cleared your first mission. I\'m gonna throw you a new challenge every day, got it?"',
  'npc.zoraida.storyFirstEvent': 'Madame Zoraida: "I saw it coming in the cards... a special container, and there you were, seizing the moment. That\'s how I like it."',
  'npc.intendente.storyGalaxyMove': 'The Mayor: "So you\'re moving to another galaxy? I\'m moving too, you know — they\'ll name me Galactic Mayor over there. Take your Deeds with you, they\'re worth the same in the new city."',

  // MissionsSection.js
  'missions.title': "Chispa's Missions",
  'missions.intro': 'Chispa: "Hey, you! I\'ve got 3 challenges for today. Clear them and I\'ll throw you a nice reward."',
  'missions.empty': "Chispa doesn't have any challenges for you yet — buy your first container.",
  'missions.claim': 'Claim',
  'missions.claimed': 'Claimed',
  'missions.progress': '{progress}/{target}',
  'missions.rewardMoney': 'Reward: {amount}',
  'missions.rewardKeys': 'Reward: {amount} City Key{plural}',
  'missions.difficulty.easy': 'Easy',
  'missions.difficulty.medium': 'Medium',
  'missions.difficulty.hard': 'Hard',
  'missions.desc.findCategoryCount': 'Find {n} {categoria} items',
  'missions.desc.digContainerCount': 'Dig {contenedor} {n} times',
  'missions.desc.streakReach': 'Reach a streak of {n}',
  'missions.desc.sellAtStallCount': 'Sell {n} items at the Stall',
  'missions.desc.fulfillOrders': 'Fulfill {n} orders',
  'missions.desc.moneyEarnedToday': 'Earn {monto} today',

  // Container events (systems/events.js, banner over the container card).
  'event.goldenBanner': 'Golden! Worth ×{mult}',
  'event.fireBanner': 'On Fire! Worth ×{mult}, +{pct}% trap chance',
  'event.timeLeft': '{seconds}s',

  // Day/night cycle (Topbar.js, Zoraida's tooltip).
  'dayNight.dayTooltip': 'Madame Zoraida: "Everything is calm by day, dear."',
  'dayNight.nightTooltip': 'Madame Zoraida: "Luck shifts at night: +{luck} Luck, but +{pct}% trap chance."',
  // Round 30 (§4.41): names of the 5 time bands shown in the topbar clock. Purely cosmetic
  // (they pick the container model); the real bonus is still the binary day/night above.
  'dayNight.band.madrugada': 'Small hours',
  'dayNight.band.manana': 'Morning',
  'dayNight.band.tarde': 'Afternoon',
  'dayNight.band.atardecer': 'Dusk',
  'dayNight.band.noche': 'Night',
};
