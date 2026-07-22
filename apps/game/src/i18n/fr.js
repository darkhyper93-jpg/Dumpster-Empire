/**
 * Diccionario francés (ronda 33 — traducción real, mismas claves y {params} que es.js/en.js;
 * la paridad se testea dinámicamente en apps/game/tests/ronda16-i18n.test.js derivando la lista
 * de SUPPORTED_LANGUAGES). Glosario fijo: City Keys → Clés de la Ville; Dig → Fouiller; Dig Power
 * → Puissance de Fouille; Search Area → Zone de Recherche; Luck → Chance; Container → Conteneur;
 * Trap → Piège; Prestige → Prestige; Upgrade → Amélioration; Common Junk → Déchets Ordinaires;
 * Deeds → Titres; Junk Stall → Stand de Ferraille.
 */

export default {
  // Topbar.js
  'topbar.settings': 'Réglages',
  'topbar.stats': 'Statistiques',

  // tabs (index.html / UIManager.injectTabIcons — data-tab)
  'tabs.escarbar': 'Fouiller',
  'tabs.tienda': 'Conteneurs',
  'tabs.automatizacion': 'Automatisation',
  'tabs.logros': 'Succès',
  'tabs.prestigio': 'Prestige',
  'tabs.index': 'Index',
  'tabs.puesto': 'Stand',

  // Compartidos entre vistas
  'common.free': 'Gratuit',
  'common.missingMoney': 'Il vous manque {amount}',
  'common.missingKeys': 'Il vous manque {amount} clés',
  'common.missingDeeds': 'Il vous manque {amount} Titres',
  'common.effectFlat': '+{amount} {label} par niveau',
  'common.effectPercent': '+{pct} % {label} par niveau',
  'common.emptyContainers': 'Aucun conteneur configuré.',

  // QuickUpgrades.js
  'quickUpgrades.empty': 'Aucune amélioration configurée.',
  'quickUpgrades.levelLabel': '{label} · NIV. {level}',

  // DigContainerPicker.js
  'digPicker.empty': 'Aucun conteneur disponible pour le moment.',
  'digPicker.prompt': 'Choisissez un conteneur à fouiller.',
  'digPicker.level': 'Niv. {level}',

  // dig (DigCanvas.js + UIManager render de dig-area)
  'dig.idlePrompt': 'Glissez pour fouiller',
  'dig.abandon': 'Abandonner',
  'dig.trapEntryName': 'Piège !',
  'dig.trapRiskLine': 'Risque de piège : {pct} %{hint}',
  'dig.rateHint': ' · Rythme de fouille : {pct} % (augmentez la Puissance de Fouille)',
  // Round 19 (PLAN.md §4.20): manual no-trap dig streak, visible from streak >= 2.
  'dig.streak': 'Série : {count}',

  // Round 20 (PLAN.md §4.24): Vault Against the Clock (hard timer) and Dark Basement (mask).
  'dig.timedRemaining': 'Temps restant : {seconds} s',
  'dig.timedExpired': 'Temps écoulé : vous avez perdu « {name} » sans pénalité d’argent.',
  'dig.darkHint': 'Vous ne voyez qu’autour de votre doigt.',

  // AchievementsView.js
  'achievements.empty': 'Aucun succès configuré.',
  'achievements.rewardKeys': '{amount} Clé{plural} de la Ville',
  'achievements.claimed': 'Récupéré',
  'achievements.pending': 'En attente',

  // AutomationView.js
  'automation.empty': 'Aucune automatisation configurée.',
  // Ronda 15: toast al descartar un contenedor trampeado (nodo Escáner de Trampas).
  'automation.trapDiscarded': 'Le robot a mis au rebut un conteneur piégé.',
  'automation.explainer':
    'Le robot achète des conteneurs avec votre argent, les met en file et les traite (plus de risque de piège qu’à la main). Choisissez ci-dessous lequel il achète, ou laissez sur « Auto ». Les autres machines agrandissent la file ou ajoutent des robots.',
  'automation.hint': 'Bouton gris = vous n’avez pas encore de quoi payer ; l’infobulle indique ce qu’il manque.',
  // {name} = la máquina con efecto enablesAutoDig, resuelta desde automations.json (AutomationView).
  'automation.calloutInactive': 'Il vous faut le <strong>{name}</strong> pour utiliser la file.',
  'automation.queue': 'File : {count} / {max}',
  'automation.slots': 'Emplacements simultanés : {count}',
  'automation.processingLabel': 'Traitement en cours :',
  'automation.nothingInProgress': 'Rien en cours.',
  'automation.processingItem': '{name} : {pct} %',
  'automation.unknownContainer': 'Conteneur inconnu',
  'automation.targetLabel': 'Cible du robot',
  'automation.targetAuto': 'Auto (le plus cher que vous pouvez payer)',
  'automation.waiting': 'Le robot met de côté {amount} pour {name}.',
  'automation.active': 'Actif',
  'automation.buyFor': 'Acheter pour {amount}',
  'automation.expandCapacity': 'Agrandir la Capacité (niveau {level}) pour {amount}',
  // Ronda 25 (PLAN.md §4.32): desafío `manosVacias` activo bloquea toda compra de máquinas.
  'automation.blockedByChallenge': 'Le défi actif interdit l’achat de machines.',
  // Ronda 27 (PLAN.md §4.38/§4.39): flota de robots + filtros por robot.
  'automation.fleetTitle': 'Flotte de robots',
  'automation.fleetSize': 'Flotte : {count} robot{plural}',
  'automation.robotTitle': 'Robot {num}',
  'automation.robotArms': '{count} bras',
  'automation.robotIdle': 'Rien dans la pince pour l’instant.',
  'automation.filtersSummary': 'Filtres du robot',
  'automation.filterThresholdLabel': 'Jeter les trouvailles valant moins de',
  'automation.filterDiscardEstimate': 'Estimation : jette ~{pct} % de ce qu’il trouve.',
  'automation.filterReserveLabel': 'Réserver pour le Stand (ignore le seuil de vente) :',
  'automation.filterReserveLocked': 'Achetez le Stand de Ferraille dans la Boutique pour réserver des catégories.',
  'npc.chispa.fleetFlavor': 'Chispa : « Je les garde bien huilés. Toi, tu me dis juste ce que chacun doit chasser. »',

  // CelebrationModal.js
  'celebration.close': 'Fermer',
  'celebration.achievementTitle': 'Succès débloqué !',
  'celebration.rewardLine': 'Récompense : {reward}',
  'celebration.rewardKeys': '{amount} Clés de la Ville',
  'celebration.containerTitle': 'Nouveau conteneur !',
  'celebration.containerReady': 'Il est maintenant disponible à la fouille.',
  'celebration.firstFindTitle': 'Nouvelle trouvaille !',
  // Round 22 (PLAN.md §4.26): special celebration when finding a legendary.
  'celebration.legendaryTitle': 'Légendaire trouvé !',

  // CollectionView.js
  'collection.emptyPool': 'Ce conteneur n’a aucune récompense configurée.',
  'collection.hiddenName': '???',
  'collection.notFound': 'Vous n’avez pas encore trouvé cet objet.',
  'collection.probability': 'Probabilité : {pct} %',
  'collection.baseValue': 'Valeur de base : {amount}',
  'collection.foundCount': 'Trouvés : {count}',
  // Round 22 (PLAN.md §4.25/§4.26): complete-set badge + Showcase section.
  'collection.setCompleteBadge': 'SÉRIE COMPLÈTE +{pct} %',
  'collection.showcaseTitle': 'Vitrine des Légendaires',
  'collection.showcaseCount': 'Vitrine : {count}/{total}',
  'collection.showcaseHiddenName': '???',
  'collection.showcaseNotFound': 'Vous n’avez pas encore trouvé ce légendaire.',
  // Round 19: completion % (PLAN.md §5.4), derived — never a new persisted counter.
  'collection.completionGlobal': 'Progression globale : {pct} %',

  // OfflineModal.js
  'offline.title': 'Pendant votre absence...',
  'offline.summary': 'Vos robots ont travaillé {minutes} min et ont trouvé :',
  'offline.close': 'Parfait',
  // Ronda 27 (§27.5.3): desglose de lo que facturó el robot vendedor en el Puesto.
  'offline.stallEarnings': 'Le robot vendeur a encaissé {amount} au Stand.',

  // PrestigeView.js
  'prestige.empty': 'Aucun arbre de prestige configuré.',
  'prestige.requires': 'Requiert : {name}',
  'prestige.maxed': 'Au maximum',
  'prestige.upgradeFor': 'Améliorer pour {amount} clés',
  'prestige.keysLabel': 'Clés de la Ville : {amount}',
  'prestige.completedCount': 'Prestiges effectués : {count}',
  'prestige.previewGain': 'Si vous prestigiez maintenant, vous gagnez : {amount} clés.',
  'prestige.doButton': 'Prestige',
  // {amount} = PRESTIGE_MONEY_THRESHOLD del engine formateado (PrestigeView), nunca un número fijo acá.
  'prestige.needMoney': 'Il vous faut {amount} gagnés au total pour prestigier.',
  'prestige.infinite': 'Niveau {level} (sans plafond)',
  'prestige.chooseTitle': 'Choisissez pour votre prochaine partie',
  'prestige.specializationsHeading': 'Spécialisations',
  'prestige.challengesHeading': 'Défis',
  'prestige.noneOption': 'Aucune spécialisation',
  'prestige.noneOptionDesc': 'Aucun bonus ni malus de vente par catégorie.',
  'prestige.specializationBonus': '+50 % sur {categories}',
  'prestige.specializationPenalty': '-15 % sur le reste',
  'prestige.challengeGoal': 'Objectif : {goal}',
  'prestige.challengeGoalMoney': 'gagner {amount} pendant cette partie',
  'prestige.challengeGoalPrestige': 'atteindre le prestige',
  'prestige.challengeReward': 'Récompense permanente : {reward}',
  'prestige.challengeCompleted': 'Terminé',
  'prestige.confirmButton': 'Confirmer le Prestige',
  'prestige.cancelButton': 'Annuler',
  'prestige.activeSpecialization': 'Spécialisation active : {name}',
  'prestige.activeChallenge': 'Défi actif : {name}',
  'prestige.selected': 'Sélectionné',
  'prestige.rewardSellPercent': '+{pct} % de valeur de vente globale',
  'prestige.rewardLuckFlat': '+{amount} de Chance',
  'prestige.rewardDigPowerPercent': '+{pct} % de Puissance de Fouille',
  'prestige.rewardMarketFluctuationMinFlat': '+{amount} au plancher de la cote du marché',

  // Round 26.C (PLAN.md §2.10/§4.34-§4.36): Galaxy Move and the Deeds tree.
  'prestige.galaxyMoveHeading': 'Déménagement Galactique',
  'prestige.galaxyMoveLocked': 'Se débloque à {count} prestiges.',
  'prestige.galaxyMoveDesc':
    'Réinitialisez votre progression de prestige (Clés, arbre et compteur) et recommencez dans une autre galaxie, en échange de Titres permanents.',
  'prestige.galaxyMoveCount': 'Déménagements effectués : {count}',
  'prestige.deedsLabel': 'Titres : {amount}',
  'prestige.galaxyMoveButton': 'Déménager dans une Autre Galaxie',
  'prestige.galaxyMovePreview': 'Si vous déménagez maintenant, vous gagnez : {amount} Titres.',
  'prestige.galaxyMoveConfirmTitle': 'Confirmer le Déménagement Galactique ?',
  'prestige.galaxyMoveKeeps':
    'Conservés : succès, collection, vitrine, séries, défis terminés, outils, le Stand et son niveau, les Titres et leur arbre, votre meilleure série et les compteurs historiques.',
  'prestige.galaxyMoveLoses':
    'Perdus : Clés de la Ville, arbre de prestige, spécialisation/défi actifs et le stock du Stand (liquidé à la vente instantanée).',
  'prestige.galaxyMoveConfirmButton': 'Confirmer le Déménagement',
  'prestige.deedsTreeHeading': 'Arbre des Titres',
  'prestige.deedsUpgradeFor': 'Améliorer pour {amount} Titres',

  // SettingsView.js
  'settings.on': 'Activé',
  'settings.off': 'Désactivé',
  'settings.sound': 'Son : {state}',
  'settings.volume': 'Volume : {pct} %',
  'settings.sensitivity': 'Sensibilité de fouille : {pct} %',
  'settings.language': 'Langue',
  'settings.resetConfirm': 'Vous êtes sûr ? Touchez encore pour confirmer',
  'settings.resetButton': 'Réinitialiser la partie',
  // Round 19: haptic vibration toggle, same pattern as settings.sound.
  'settings.vibration': 'Vibration : {state}',
  // AJUSTE (auditoria de release): aviso de guardado ilegible. Antes, un save que no pasaba la
  // validacion se reemplazaba por una partida nueva en SILENCIO (CLAUDE.md exige un mensaje
  // claro); ahora se archiva una copia intacta y el jugador se entera de las dos cosas.
  'save.rejectedToast': 'Impossible de lire ta partie sauvegardée. Une copie intacte a été archivée et une nouvelle partie a commencé.',
  'save.rejectedTitle': 'Sauvegarde illisible',
  'save.rejectedDetail': 'La sauvegarde précédente n\'a pas passé la validation et une nouvelle partie a démarré. La copie originale est archivée intacte sur cet appareil : elle n\'a pas été écrasée.',

  // Round 20 (PLAN.md §4.23): dig tool selector, same pattern as AutomationView.
  'tools.title': 'Outils de fouille',
  'tools.buyFor': 'Acheter pour {amount}',
  'tools.equip': 'Équiper',
  'tools.equipped': 'Équipé',
  'tools.manos': 'Mains nues',
  'tools.palaAncha': 'Pelle Large',
  'tools.pincelFino': 'Pinceau d’Archéologue',
  'tools.guanteHidraulico': 'Gant Hydraulique',

  // Statistics (round 19, PLAN.md §5.4) — Settings subview, no new engine logic.
  'stats.title': 'Statistiques',
  'stats.itemsFound': 'Objets trouvés : {count}',
  'stats.trapsHit': 'Pièges déclenchés : {count}',
  'stats.totalMoneyEarned': 'Argent total gagné : {amount}',
  'stats.autoProcessed': 'Traités par les robots : {count}',
  'stats.bestStreak': 'Meilleure série : {count}',
  'stats.completion': 'Collection complétée : {pct} %',
  'stats.maxLevelContainers': 'Conteneurs au niveau max : {count}/{total}',

  // ShopView.js
  'shop.unlocksAtPrestige': 'Se débloque au Prestige {count}.',
  'shop.lockedDefault': 'Verrouillé. Achetez d’abord le conteneur précédent.',
  'shop.cost': 'Coût : {label}',
  'shop.categories': 'Catégories : {list}',
  'shop.trapRisk': 'Risque de piège : {pct} %',
  'shop.owned': 'Possédés : {count}',
  'shop.levelLine': 'Niveau {level}/{max} (+{pct} % de valeur) — {progress}',
  'shop.maxLevel': 'niveau max',
  'shop.levelProgress': '{cur}/{needed} fouilles pour le niveau {next}',
  'shop.reached': '(atteint)',
  'shop.haveLuck': '(vous avez {cur})',
  'shop.haveMult': '(vous avez ×{cur})',
  'shop.luckLine': 'Chance recommandée : {rec} {status}',
  'shop.digPowerLine': 'Puissance de Fouille recommandée : ×{rec} {status}',
  'shop.areaLine': 'Zone de Recherche recommandée : ×{rec} {status}',
  // Round 31 (PLAN.md §4.42): CURRENT pace/brush against this container's real resistance/area.
  'shop.rateLine': 'Rythme : {pct} %',
  'shop.areaRateLine': 'Balayage : {pct} %',
  // Ronda 23.C: Junk Stall purchase card (PLAN.md §2.9/§4.27) in the Shop tab.
  'shop.stallCard': 'Stand de Ferraille',
  'shop.stallDesc': 'Gardez les objets qui en valent la peine et vendez-les à Doña Rita quand le prix est haut.',
  'shop.stallBuyFor': 'Acheter pour {amount}',
  'shop.stallOwned': 'Vous l’avez déjà — allez voir l’onglet Stand.',

  // Post-Big Bang procedural tiers (PLAN.md §4.37, round 26.B): name suffix, {n} = tier.
  'shop.proceduralSuffix': ' (Écho {n})',
  'shop.proceduralAllOwned': 'Vous possédez déjà tous les paliers procéduraux disponibles.',

  // StallView.js (PLAN.md §2.9/§4.27-§4.30, ronda 23.C)
  'stall.lockedTeaser': 'Se débloque en achetant le Stand de Ferraille dans la Boutique.',
  'stall.quote': 'Cours du jour : {arrow} {pct} %',
  'stall.thresholdLabel': 'Garder les objets valant $X ou plus',
  'stall.thresholdActive': 'Objets valant {amount} ou plus conservés.',
  'stall.thresholdPaused': 'Stand en pause : montez le seuil pour commencer à garder des objets.',
  'stall.levelLine': 'Niveau {level}/{max} · Capacité : {capacity}',
  'stall.levelMaxed': 'Niveau max',
  'stall.upgradeFor': 'Améliorer pour {amount}',
  'stall.inventoryTitle': 'Stock',
  'stall.inventoryEmpty': 'Le stand est vide — montez le seuil ou déterrez quelque chose de bien.',
  'stall.sell': 'Vendre',
  'stall.ordersTitle': 'Commandes de {name}',
  'stall.orderCategory': 'Commande : {categoria}',
  'stall.orderProgress': 'Progression : {progress}/{cantidad}',
  'stall.orderReward': 'Paie +{pct} % au-dessus du prix du stand',
  'stall.orderTime': 'Change dans {minutes} min',
  // Ronda 27 (PLAN.md §4.39): toggle "mantener stock para pedidos" del robot vendedor.
  'stall.keepStockToggle': 'Garder du stock pour les commandes de Salomón',
  'stall.keepStockHint': 'Le vendeur ne vendra pas ce qu’une commande active réclame encore.',

  // TitleScreen.js
  'titleScreen.play': 'Jouer',
  'titleScreen.settings': 'Réglages',

  // Tutorial.js
  'tutorial.step0': 'Fouillez la Poubelle de Trottoir (gratuite) en glissant sur le conteneur pour démarrer.',
  'tutorial.step1': 'Achetez votre première amélioration de Chance, Puissance de Fouille ou Zone de Recherche dans le panneau d’améliorations rapides.',
  'tutorial.step2': 'Fouillez votre premier conteneur payant en le choisissant sur l’écran Fouiller.',
  'tutorial.skip': 'Passer le tutoriel',

  // UIManager.js
  'uiManager.levelUp': '{name} passe au niveau {level} : +{pct} % de valeur',
  'uiManager.unknownView': 'Écran inconnu.',

  // main.js
  'boot.loadFailed': 'Impossible de charger {path} (HTTP {status}).',
  'boot.fatalError': 'Impossible de démarrer Dumpster Empire : {message}',
  // §27.5.6 (ronda 27): mensaje genérico en pantalla; el detalle va a console.error.
  'boot.fatalErrorGeneric': 'Impossible de démarrer Dumpster Empire. Essayez de recharger ; les détails techniques sont dans la console.',

  // Ronda 23 — Agente B (data): NPC dialogue and light story beats.
  'npc.rita.storyIntro': 'Doña Rita : « Tiens donc, tu as ton propre stand maintenant ? Apporte-moi de belles choses et je te paierai bien, mon petit. »',
  'npc.rita.sale.junk': 'Doña Rita : « C’est de la camelote, mais la ferraille reste de la ferraille. Je te la prends quand même. »',
  'npc.rita.sale.tech': 'Doña Rita : « Je n’y connais rien en technologie, mais je reconnais ce qui a de la valeur. »',
  'npc.rita.sale.classy': 'Doña Rita : « Ça, ça a de la classe. Ça me rappelle la maison de ma grand-mère. »',
  'npc.rita.sale.premium': 'Doña Rita : « Mais regarde-moi cette merveille ! On n’en trouve pas tous les jours. »',
  'npc.salomon.storyFirstOrder': 'Salomón le Turc : « Enfin quelqu’un qui honore une commande comme il faut ! Voilà comment on fait des affaires, champion. »',

  // Ronda 24 — daily missions, container events and day/night cycle (PLAN.md §4.30-§4.33).
  'npc.chispa.storyFirstMission': 'Chispa : « Et voilà ! Tu as bouclé ta première mission. Je te lance un nouveau défi tous les jours, d’accord ? »',
  'npc.zoraida.storyFirstEvent': 'Madame Zoraida : « Je l’avais vu dans les cartes... un conteneur spécial, et te voilà, saisissant l’instant. C’est comme ça que je t’aime. »',
  'npc.intendente.storyGalaxyMove': 'Le Maire : « Alors tu déménages dans une autre galaxie ? Moi aussi, figure-toi — là-bas on va me nommer Maire Galactique. Emporte tes Titres, ils valent autant dans la nouvelle ville. »',

  // MissionsSection.js
  'missions.title': 'Missions de Chispa',
  'missions.intro': 'Chispa : « Hé, toi ! J’ai 3 défis pour aujourd’hui. Boucle-les et je te lâche une belle récompense. »',
  'missions.empty': 'Chispa n’a pas encore de défis pour vous — achetez votre premier conteneur.',
  'missions.claim': 'Récupérer',
  'missions.claimed': 'Récupérée',
  'missions.progress': '{progress}/{target}',
  'missions.rewardMoney': 'Récompense : {amount}',
  'missions.rewardKeys': 'Récompense : {amount} Clé{plural} de la Ville',
  'missions.difficulty.easy': 'Facile',
  'missions.difficulty.medium': 'Moyenne',
  'missions.difficulty.hard': 'Difficile',
  'missions.desc.findCategoryCount': 'Trouvez {n} objets de {categoria}',
  'missions.desc.digContainerCount': 'Fouillez {contenedor} {n} fois',
  'missions.desc.streakReach': 'Atteignez une série de {n}',
  'missions.desc.sellAtStallCount': 'Vendez {n} objets au Stand',
  'missions.desc.fulfillOrders': 'Honorez {n} commandes',
  'missions.desc.moneyEarnedToday': 'Gagnez {monto} aujourd’hui',

  // Container events (systems/events.js, banner over the container card).
  'event.goldenBanner': 'Doré ! Vaut ×{mult}',
  'event.fireBanner': 'En Feu ! Vaut ×{mult}, +{pct} % de risque de piège',
  'event.timeLeft': '{seconds} s',

  // Day/night cycle (Topbar.js, Zoraida's tooltip).
  'dayNight.dayTooltip': 'Madame Zoraida : « Tout est calme le jour, mon petit. »',
  'dayNight.nightTooltip': 'Madame Zoraida : « La nuit, la chance tourne : +{luck} de Chance, mais +{pct} % de risque de piège. »',
  // Round 30 (§4.41): names of the 5 time bands shown in the topbar clock.
  'dayNight.band.madrugada': 'Petit matin',
  'dayNight.band.manana': 'Matin',
  'dayNight.band.tarde': 'Après-midi',
  'dayNight.band.atardecer': 'Crépuscule',
  'dayNight.band.noche': 'Nuit',
};
