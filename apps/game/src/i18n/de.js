/**
 * Diccionario alemán (ronda 33 — traducción real, mismas claves que es.js/en.js; la paridad se
 * testea dinámicamente en apps/game/tests/ronda16-i18n.test.js derivando SUPPORTED_LANGUAGES).
 * Glosario fijo: City Keys → Stadtschlüssel; Dig → Wühlen; Dig Power → Grabkraft; Search Area →
 * Suchfläche; Luck → Glück; Container → Container; Trap → Falle; Prestige → Prestige; Upgrade →
 * Verbesserung; Common Junk → Gewöhnlicher Müll; Deeds → Urkunden; Junk Stall → Schrottstand.
 *
 * NOTA de plural: el `{plural}` de la UI es el sufijo "" | "s" del inglés. En alemán
 * "Stadtschlüssel", "Roboter" y "Arme" no pluralizan con -s, así que esas claves OMITEN el param
 * a propósito (el test lo permite solo para `plural`, ver ronda16-i18n.test.js).
 */

export default {
  // Topbar.js
  'topbar.settings': 'Einstellungen',
  'topbar.stats': 'Statistik',

  // tabs (index.html / UIManager.injectTabIcons — data-tab)
  'tabs.escarbar': 'Wühlen',
  'tabs.tienda': 'Container',
  'tabs.automatizacion': 'Automatisierung',
  'tabs.logros': 'Erfolge',
  'tabs.prestigio': 'Prestige',
  'tabs.index': 'Index',
  'tabs.puesto': 'Stand',

  // Compartidos entre vistas
  'common.free': 'Gratis',
  'common.missingMoney': 'Dir fehlen noch {amount}',
  'common.missingKeys': 'Dir fehlen noch {amount} Schlüssel',
  'common.missingDeeds': 'Dir fehlen noch {amount} Urkunden',
  'common.effectFlat': '+{amount} {label} pro Stufe',
  'common.effectPercent': '+{pct} % {label} pro Stufe',
  'common.emptyContainers': 'Keine Container eingerichtet.',

  // QuickUpgrades.js
  'quickUpgrades.empty': 'Keine Verbesserungen eingerichtet.',
  'quickUpgrades.levelLabel': '{label} · ST. {level}',

  // DigContainerPicker.js
  'digPicker.empty': 'Noch keine Container verfügbar.',
  'digPicker.prompt': 'Wähle einen Container zum Wühlen.',
  'digPicker.level': 'St. {level}',

  // dig (DigCanvas.js + UIManager render de dig-area)
  'dig.idlePrompt': 'Zum Wühlen ziehen',
  'dig.abandon': 'Aufgeben',
  'dig.trapEntryName': 'Falle!',
  'dig.trapRiskLine': 'Fallenrisiko: {pct} %{hint}',
  'dig.rateHint': ' · Grabtempo: {pct} % (erhöhe die Grabkraft)',
  // Round 19 (PLAN.md §4.20): manual no-trap dig streak, visible from streak >= 2.
  'dig.streak': 'Serie: {count}',

  // Round 20 (PLAN.md §4.24): Vault Against the Clock (hard timer) and Dark Basement (mask).
  'dig.timedRemaining': 'Restzeit: {seconds} s',
  'dig.timedExpired': 'Zeit abgelaufen: „{name}“ ist weg, aber ohne Geldstrafe.',
  'dig.darkHint': 'Du siehst nur rund um deinen Finger.',

  // AchievementsView.js
  'achievements.empty': 'Keine Erfolge eingerichtet.',
  'achievements.rewardKeys': '{amount} Stadtschlüssel',
  'achievements.claimed': 'Abgeholt',
  'achievements.pending': 'Offen',

  // AutomationView.js
  'automation.empty': 'Keine Automatisierung eingerichtet.',
  // Ronda 15: toast al descartar un contenedor trampeado (nodo Escáner de Trampas).
  'automation.trapDiscarded': 'Der Roboter hat einen Container mit Falle aussortiert.',
  'automation.explainer':
    'Der Roboter kauft mit deinem Geld Container, stellt sie in die Warteschlange und arbeitet sie ab (höheres Fallenrisiko als von Hand). Wähle unten, welchen er kauft, oder lass es auf „Auto“. Die anderen Maschinen vergrößern die Warteschlange oder liefern weitere Roboter.',
  'automation.hint': 'Grauer Knopf = du kannst es dir noch nicht leisten; im Tooltip steht, wie viel fehlt.',
  // {name} = la máquina con efecto enablesAutoDig, resuelta desde automations.json (AutomationView).
  'automation.calloutInactive': 'Für die Warteschlange brauchst du den <strong>{name}</strong>.',
  'automation.queue': 'Warteschlange: {count} / {max}',
  'automation.slots': 'Gleichzeitige Plätze: {count}',
  'automation.processingLabel': 'In Bearbeitung:',
  'automation.nothingInProgress': 'Nichts in Arbeit.',
  'automation.processingItem': '{name}: {pct} %',
  'automation.unknownContainer': 'Unbekannter Container',
  'automation.targetLabel': 'Ziel des Roboters',
  'automation.targetAuto': 'Auto (das Teuerste, was du dir leisten kannst)',
  'automation.waiting': 'Der Roboter spart {amount} für {name}.',
  'automation.active': 'Aktiv',
  'automation.buyFor': 'Kaufen für {amount}',
  'automation.expandCapacity': 'Kapazität erweitern (Stufe {level}) für {amount}',
  // Ronda 25 (PLAN.md §4.32): desafío `manosVacias` activo bloquea toda compra de máquinas.
  'automation.blockedByChallenge': 'Die aktive Herausforderung erlaubt keinen Maschinenkauf.',
  // Ronda 27 (PLAN.md §4.38/§4.39): flota de robots + filtros por robot.
  'automation.fleetTitle': 'Roboterflotte',
  'automation.fleetSize': 'Flotte: {count} Roboter',
  'automation.robotTitle': 'Roboter {num}',
  'automation.robotArms': '{count} Arme',
  'automation.robotIdle': 'Gerade nichts im Greifer.',
  'automation.filtersSummary': 'Roboterfilter',
  'automation.filterThresholdLabel': 'Funde wegwerfen, die weniger wert sind als',
  'automation.filterDiscardEstimate': 'Schätzung: wirft ~{pct} % der Funde weg.',
  'automation.filterReserveLabel': 'Für den Stand zurücklegen (ignoriert die Verkaufsgrenze):',
  'automation.filterReserveLocked': 'Kaufe den Schrottstand im Laden, um Kategorien zurückzulegen.',
  'npc.chispa.fleetFlavor': 'Chispa: „Ich halte sie geölt. Du sagst mir nur, was jeder von ihnen jagen soll.“',

  // CelebrationModal.js
  'celebration.close': 'Schließen',
  'celebration.achievementTitle': 'Erfolg freigeschaltet!',
  'celebration.rewardLine': 'Belohnung: {reward}',
  'celebration.rewardKeys': '{amount} Stadtschlüssel',
  'celebration.containerTitle': 'Neuer Container!',
  'celebration.containerReady': 'Ab jetzt kannst du darin wühlen.',
  'celebration.firstFindTitle': 'Neuer Fund!',
  // Round 22 (PLAN.md §4.26): special celebration when finding a legendary.
  'celebration.legendaryTitle': 'Legendäres Stück gefunden!',

  // CollectionView.js
  'collection.emptyPool': 'Für diesen Container sind keine Funde eingerichtet.',
  'collection.hiddenName': '???',
  'collection.notFound': 'Diesen Gegenstand hast du noch nicht gefunden.',
  'collection.probability': 'Wahrscheinlichkeit: {pct} %',
  'collection.baseValue': 'Grundwert: {amount}',
  'collection.foundCount': 'Gefunden: {count}',
  // Round 22 (PLAN.md §4.25/§4.26): complete-set badge + Showcase section.
  'collection.setCompleteBadge': 'SET KOMPLETT +{pct} %',
  'collection.showcaseTitle': 'Vitrine der Legenden',
  'collection.showcaseCount': 'Vitrine: {count}/{total}',
  'collection.showcaseHiddenName': '???',
  'collection.showcaseNotFound': 'Dieses legendäre Stück hast du noch nicht gefunden.',
  // Round 19: completion % (PLAN.md §5.4), derived — never a new persisted counter.
  'collection.completionGlobal': 'Gesamtfortschritt: {pct} %',

  // OfflineModal.js
  'offline.title': 'Während du weg warst...',
  'offline.summary': 'Deine Roboter haben {minutes} Min. gearbeitet und gefunden:',
  'offline.close': 'Super',
  // Ronda 27 (§27.5.3): desglose de lo que facturó el robot vendedor en el Puesto.
  'offline.stallEarnings': 'Der Verkaufsroboter hat {amount} am Stand eingenommen.',

  // PrestigeView.js
  'prestige.empty': 'Kein Prestigebaum eingerichtet.',
  'prestige.requires': 'Voraussetzung: {name}',
  'prestige.maxed': 'Maximal',
  'prestige.upgradeFor': 'Verbessern für {amount} Schlüssel',
  'prestige.keysLabel': 'Stadtschlüssel: {amount}',
  'prestige.completedCount': 'Abgeschlossene Prestige: {count}',
  'prestige.previewGain': 'Wenn du jetzt prestigierst, bekommst du: {amount} Schlüssel.',
  'prestige.doButton': 'Prestige',
  // {amount} = PRESTIGE_MONEY_THRESHOLD del engine formateado (PrestigeView), nunca un número fijo acá.
  'prestige.needMoney': 'Für Prestige brauchst du {amount} an Gesamteinnahmen.',
  'prestige.infinite': 'Stufe {level} (ohne Grenze)',
  'prestige.chooseTitle': 'Wähle für deinen nächsten Durchgang',
  'prestige.specializationsHeading': 'Spezialisierungen',
  'prestige.challengesHeading': 'Herausforderungen',
  'prestige.noneOption': 'Keine Spezialisierung',
  'prestige.noneOptionDesc': 'Kein Verkaufsbonus und kein Malus nach Kategorie.',
  'prestige.specializationBonus': '+50 % auf {categories}',
  'prestige.specializationPenalty': '-15 % auf den Rest',
  'prestige.challengeGoal': 'Ziel: {goal}',
  'prestige.challengeGoalMoney': 'in diesem Durchgang {amount} verdienen',
  'prestige.challengeGoalPrestige': 'Prestige erreichen',
  'prestige.challengeReward': 'Dauerhafte Belohnung: {reward}',
  'prestige.challengeCompleted': 'Abgeschlossen',
  'prestige.confirmButton': 'Prestige bestätigen',
  'prestige.cancelButton': 'Abbrechen',
  'prestige.activeSpecialization': 'Aktive Spezialisierung: {name}',
  'prestige.activeChallenge': 'Aktive Herausforderung: {name}',
  'prestige.selected': 'Ausgewählt',
  'prestige.rewardSellPercent': '+{pct} % globaler Verkaufswert',
  'prestige.rewardLuckFlat': '+{amount} Glück',
  'prestige.rewardDigPowerPercent': '+{pct} % Grabkraft',
  'prestige.rewardMarketFluctuationMinFlat': '+{amount} auf die Untergrenze des Marktkurses',

  // Round 26.C (PLAN.md §2.10/§4.34-§4.36): Galaxy Move and the Deeds tree.
  'prestige.galaxyMoveHeading': 'Galaxienumzug',
  'prestige.galaxyMoveLocked': 'Wird bei {count} Prestige freigeschaltet.',
  'prestige.galaxyMoveDesc':
    'Setze deinen Prestigefortschritt zurück (Schlüssel, Baum und Zähler) und fang in einer anderen Galaxie neu an — im Tausch gegen dauerhafte Urkunden.',
  'prestige.galaxyMoveCount': 'Umzüge: {count}',
  'prestige.deedsLabel': 'Urkunden: {amount}',
  'prestige.galaxyMoveButton': 'In eine andere Galaxie umziehen',
  'prestige.galaxyMovePreview': 'Wenn du jetzt umziehst, bekommst du: {amount} Urkunden.',
  'prestige.galaxyMoveConfirmTitle': 'Galaxienumzug bestätigen?',
  'prestige.galaxyMoveKeeps':
    'Du behältst: Erfolge, Sammlung, Vitrine, Sets, abgeschlossene Herausforderungen, Werkzeuge, den Stand samt Stufe, die Urkunden samt Baum, deine beste Serie und die historischen Zähler.',
  'prestige.galaxyMoveLoses':
    'Du verlierst: Stadtschlüssel, Prestigebaum, aktive Spezialisierung/Herausforderung und das Lager des Standes (wird zum Sofortpreis verkauft).',
  'prestige.galaxyMoveConfirmButton': 'Umzug bestätigen',
  'prestige.deedsTreeHeading': 'Urkundenbaum',
  'prestige.deedsUpgradeFor': 'Verbessern für {amount} Urkunden',

  // SettingsView.js
  'settings.on': 'An',
  'settings.off': 'Aus',
  'settings.sound': 'Ton: {state}',
  'settings.volume': 'Lautstärke: {pct} %',
  'settings.sensitivity': 'Grabempfindlichkeit: {pct} %',
  'settings.language': 'Sprache',
  'settings.resetConfirm': 'Sicher? Zum Bestätigen noch einmal tippen',
  'settings.resetButton': 'Spiel zurücksetzen',
  // Round 19: haptic vibration toggle, same pattern as settings.sound.
  'settings.vibration': 'Vibration: {state}',

  // Round 20 (PLAN.md §4.23): dig tool selector, same pattern as AutomationView.
  'tools.title': 'Grabwerkzeuge',
  'tools.buyFor': 'Kaufen für {amount}',
  'tools.equip': 'Ausrüsten',
  'tools.equipped': 'Ausgerüstet',
  'tools.manos': 'Bloße Hände',
  'tools.palaAncha': 'Breite Schaufel',
  'tools.pincelFino': 'Archäologenpinsel',
  'tools.guanteHidraulico': 'Hydraulikhandschuh',

  // Statistics (round 19, PLAN.md §5.4) — Settings subview, no new engine logic.
  'stats.title': 'Statistik',
  'stats.itemsFound': 'Gefundene Gegenstände: {count}',
  'stats.trapsHit': 'Ausgelöste Fallen: {count}',
  'stats.totalMoneyEarned': 'Insgesamt verdientes Geld: {amount}',
  'stats.autoProcessed': 'Von Robotern bearbeitet: {count}',
  'stats.bestStreak': 'Beste Serie: {count}',
  'stats.completion': 'Sammlung abgeschlossen: {pct} %',
  'stats.maxLevelContainers': 'Container auf Maximalstufe: {count}/{total}',

  // ShopView.js
  'shop.unlocksAtPrestige': 'Wird bei Prestige {count} freigeschaltet.',
  'shop.lockedDefault': 'Gesperrt. Kaufe zuerst den vorherigen Container.',
  'shop.cost': 'Kosten: {label}',
  'shop.categories': 'Kategorien: {list}',
  'shop.trapRisk': 'Fallenrisiko: {pct} %',
  'shop.owned': 'Im Besitz: {count}',
  'shop.levelLine': 'Stufe {level}/{max} (+{pct} % Wert) — {progress}',
  'shop.maxLevel': 'Maximalstufe',
  'shop.levelProgress': '{cur}/{needed} Wühlgänge bis Stufe {next}',
  'shop.reached': '(erreicht)',
  'shop.haveLuck': '(du hast {cur})',
  'shop.haveMult': '(du hast ×{cur})',
  'shop.luckLine': 'Empfohlenes Glück: {rec} {status}',
  'shop.digPowerLine': 'Empfohlene Grabkraft: ×{rec} {status}',
  'shop.areaLine': 'Empfohlene Suchfläche: ×{rec} {status}',
  // Round 31 (PLAN.md §4.42): CURRENT pace/brush against this container's real resistance/area.
  'shop.rateLine': 'Tempo: {pct} %',
  // AJUSTE: "Pinsel" y no "Pinselbreite" — en la tarjeta de contenedor a 375px el compuesto
  // largo rompía la línea en tres (verificación manual de la ronda 33).
  'shop.areaRateLine': 'Pinsel: {pct} %',
  // Ronda 23.C: Junk Stall purchase card (PLAN.md §2.9/§4.27) in the Shop tab.
  'shop.stallCard': 'Schrottstand',
  'shop.stallDesc': 'Heb die guten Stücke auf und verkauf sie an Doña Rita, wenn der Preis hoch steht.',
  'shop.stallBuyFor': 'Kaufen für {amount}',
  'shop.stallOwned': 'Hast du schon — schau im Reiter Stand nach.',

  // Post-Big Bang procedural tiers (PLAN.md §4.37, round 26.B): name suffix, {n} = tier.
  'shop.proceduralSuffix': ' (Echo {n})',
  'shop.proceduralAllOwned': 'Du besitzt bereits alle verfügbaren prozeduralen Stufen.',

  // StallView.js (PLAN.md §2.9/§4.27-§4.30, ronda 23.C)
  'stall.lockedTeaser': 'Wird durch den Kauf des Schrottstands im Laden freigeschaltet.',
  'stall.quote': 'Tagespreis: {arrow} {pct} %',
  'stall.thresholdLabel': 'Gegenstände ab einem Wert von $X aufheben',
  'stall.thresholdActive': 'Es werden Gegenstände ab {amount} aufgehoben.',
  'stall.thresholdPaused': 'Stand pausiert: erhöhe die Grenze, damit wieder aufgehoben wird.',
  'stall.levelLine': 'Stufe {level}/{max} · Kapazität: {capacity}',
  'stall.levelMaxed': 'Maximalstufe',
  'stall.upgradeFor': 'Verbessern für {amount}',
  'stall.inventoryTitle': 'Lager',
  'stall.inventoryEmpty': 'Der Stand ist leer — erhöhe die Grenze oder grab etwas Gutes aus.',
  'stall.sell': 'Verkaufen',
  'stall.ordersTitle': 'Bestellungen von {name}',
  'stall.orderCategory': 'Bestellung: {categoria}',
  'stall.orderProgress': 'Fortschritt: {progress}/{cantidad}',
  'stall.orderReward': 'Zahlt +{pct} % über dem Standpreis',
  'stall.orderTime': 'Wechselt in {minutes} Min.',
  // Ronda 27 (PLAN.md §4.39): toggle "mantener stock para pedidos" del robot vendedor.
  'stall.keepStockToggle': 'Ware für Salomóns Bestellungen zurücklegen',
  'stall.keepStockHint': 'Der Verkäufer rührt nicht an, was eine aktive Bestellung noch braucht.',

  // TitleScreen.js
  'titleScreen.play': 'Spielen',
  'titleScreen.settings': 'Einstellungen',

  // Tutorial.js
  'tutorial.step0': 'Wühl zum Start in der Straßentonne (gratis) — zieh dafür über den Container.',
  'tutorial.step1': 'Kauf im Schnellverbesserungs-Panel deine erste Verbesserung für Glück, Grabkraft oder Suchfläche.',
  'tutorial.step2': 'Wühl in deinem ersten gekauften Container: wähl ihn im Wühlen-Bildschirm aus.',
  'tutorial.skip': 'Tutorial überspringen',

  // UIManager.js
  'uiManager.levelUp': '{name} steigt auf Stufe {level}: +{pct} % Wert',
  'uiManager.unknownView': 'Unbekannter Bildschirm.',

  // main.js
  'boot.loadFailed': '{path} konnte nicht geladen werden (HTTP {status}).',
  'boot.fatalError': 'Dumpster Empire konnte nicht starten: {message}',
  // §27.5.6 (ronda 27): mensaje genérico en pantalla; el detalle va a console.error.
  'boot.fatalErrorGeneric': 'Dumpster Empire konnte nicht starten. Lade die Seite neu; die technischen Details stehen in der Konsole.',

  // Ronda 23 — Agente B (data): NPC dialogue and light story beats.
  'npc.rita.storyIntro': 'Doña Rita: „Ach, du hast jetzt deinen eigenen Stand? Bring mir schöne Sachen, dann zahl ich dir gut, mein Lieber.“',
  'npc.rita.sale.junk': 'Doña Rita: „Das ist Ramsch, aber Schrott bleibt Schrott. Ich zahl trotzdem dafür.“',
  'npc.rita.sale.tech': 'Doña Rita: „Von Technik versteh ich nichts, aber Wert erkenne ich sofort.“',
  'npc.rita.sale.classy': 'Doña Rita: „Das hat Klasse. Erinnert mich an das Haus meiner Großmutter.“',
  'npc.rita.sale.premium': 'Doña Rita: „Sieh dir dieses Prachtstück an! So was findet man nicht alle Tage.“',
  'npc.salomon.storyFirstOrder': 'Salomón der Türke: „Endlich jemand, der eine Bestellung ordentlich erfüllt! So macht man Geschäfte, Meister.“',

  // Ronda 24 — daily missions, container events and day/night cycle (PLAN.md §4.30-§4.33).
  'npc.chispa.storyFirstMission': 'Chispa: „Da haben wir’s! Erste Mission geschafft. Ich werf dir ab jetzt jeden Tag eine neue Aufgabe hin, abgemacht?“',
  'npc.zoraida.storyFirstEvent': 'Madame Zoraida: „Ich hab es in den Karten gesehen... ein besonderer Container, und da warst du und hast zugegriffen. So gefällt mir das.“',
  'npc.intendente.storyGalaxyMove': 'Der Bürgermeister: „Du ziehst also in eine andere Galaxie? Ich auch, stell dir vor — dort ernennen sie mich zum Galaktischen Bürgermeister. Nimm deine Urkunden mit, in der neuen Stadt sind sie genauso viel wert.“',

  // MissionsSection.js
  'missions.title': 'Chispas Missionen',
  'missions.intro': 'Chispa: „He, du! Ich hab 3 Aufgaben für heute. Schaff sie und es gibt eine ordentliche Belohnung.“',
  'missions.empty': 'Chispa hat noch keine Aufgaben für dich — kauf deinen ersten Container.',
  'missions.claim': 'Abholen',
  'missions.claimed': 'Abgeholt',
  'missions.progress': '{progress}/{target}',
  'missions.rewardMoney': 'Belohnung: {amount}',
  'missions.rewardKeys': 'Belohnung: {amount} Stadtschlüssel',
  'missions.difficulty.easy': 'Leicht',
  'missions.difficulty.medium': 'Mittel',
  'missions.difficulty.hard': 'Schwer',
  'missions.desc.findCategoryCount': 'Finde {n} Gegenstände aus {categoria}',
  'missions.desc.digContainerCount': 'Wühl {n}-mal in {contenedor}',
  'missions.desc.streakReach': 'Erreiche eine Serie von {n}',
  'missions.desc.sellAtStallCount': 'Verkauf {n} Gegenstände am Stand',
  'missions.desc.fulfillOrders': 'Erfülle {n} Bestellungen',
  'missions.desc.moneyEarnedToday': 'Verdiene heute {monto}',

  // Container events (systems/events.js, banner over the container card).
  'event.goldenBanner': 'Golden! Wert ×{mult}',
  'event.fireBanner': 'In Flammen! Wert ×{mult}, +{pct} % Fallenrisiko',
  'event.timeLeft': '{seconds} s',

  // Day/night cycle (Topbar.js, Zoraida's tooltip).
  'dayNight.dayTooltip': 'Madame Zoraida: „Tagsüber ist alles ruhig, mein Lieber.“',
  'dayNight.nightTooltip': 'Madame Zoraida: „Nachts dreht sich das Glück: +{luck} Glück, aber +{pct} % Fallenrisiko.“',
  // Round 30 (§4.41): names of the 5 time bands shown in the topbar clock.
  'dayNight.band.madrugada': 'Frühe Stunden',
  'dayNight.band.manana': 'Morgen',
  'dayNight.band.tarde': 'Nachmittag',
  'dayNight.band.atardecer': 'Abenddämmerung',
  'dayNight.band.noche': 'Nacht',
};
