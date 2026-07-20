/**
 * Diccionario español (idioma por defecto, RONDA14-PLAN.md tarea D1). Mapa plano, claves con
 * namespace por vista. Los `name`/`desc` de apps/game/src/data/*.json NO se migran acá (quedan
 * en la data, ver DESARROLLO.md §10 — estrategia de overlay para una ronda futura de traducción).
 */

export default {
  // Topbar.js
  'topbar.settings': 'Ajustes',
  'topbar.stats': 'Estadísticas',

  // tabs (index.html / UIManager.injectTabIcons — data-tab)
  'tabs.escarbar': 'Escarbar',
  'tabs.tienda': 'Contenedores',
  'tabs.automatizacion': 'Automatización',
  'tabs.logros': 'Logros',
  'tabs.prestigio': 'Prestigio',
  'tabs.index': 'Índice',
  'tabs.puesto': 'Puesto',

  // Compartidos entre vistas
  'common.free': 'Gratis',
  'common.missingMoney': 'Te faltan {amount}',
  'common.missingKeys': 'Te faltan {amount} llaves',
  'common.missingDeeds': 'Te faltan {amount} Escrituras',
  'common.effectFlat': '+{amount} {label} por nivel',
  'common.effectPercent': '+{pct}% {label} por nivel',
  'common.emptyContainers': 'No hay contenedores configurados.',

  // QuickUpgrades.js
  'quickUpgrades.empty': 'No hay mejoras configuradas.',
  'quickUpgrades.levelLabel': '{label} · LV. {level}',

  // DigContainerPicker.js
  'digPicker.empty': 'No hay contenedores disponibles todavía.',
  'digPicker.prompt': 'Elegí un contenedor para escarbar.',
  'digPicker.level': 'Nv. {level}',

  // dig (DigCanvas.js + UIManager render de dig-area)
  'dig.idlePrompt': 'Arrastrá para escarbar',
  'dig.abandon': 'Abandonar',
  'dig.trapEntryName': '¡Trampa!',
  'dig.trapRiskLine': 'Riesgo de trampa: {pct}%{hint}',
  'dig.rateHint': ' · Ritmo de escarbado: {pct}% (subí Fuerza)',
  // Ronda 19 (PLAN.md §4.20): racha de escarbado manual sin trampa, visible desde racha >= 2.
  'dig.streak': 'Racha: {count}',

  // Ronda 20 (PLAN.md §4.24): Bóveda a Contrarreloj (timer duro) y Sótano Sin Luz (máscara).
  'dig.timedRemaining': 'Tiempo restante: {seconds}s',
  'dig.timedExpired': 'Se acabó el tiempo: perdiste "{name}" sin castigo de dinero.',
  'dig.darkHint': 'Solo ves lo que está cerca de tu puntero.',

  // AchievementsView.js
  'achievements.empty': 'No hay logros configurados.',
  'achievements.rewardKeys': '{amount} llave{plural} de Ciudad',
  'achievements.claimed': 'Reclamado',
  'achievements.pending': 'Pendiente',

  // AutomationView.js
  'automation.empty': 'No hay automatizaciones configuradas.',
  // Ronda 15: toast al descartar un contenedor trampeado (nodo Escáner de Trampas).
  'automation.trapDiscarded': 'El robot descartó un contenedor con trampa.',
  'automation.explainer':
    'El robot compra contenedores con tu dinero, los encola y los procesa (más riesgo de trampa que a mano). Elegí abajo cuál compra, o dejá "Auto". Las demás máquinas agrandan la cola o suman robots.',
  'automation.hint': 'Botón gris = todavía no te alcanza; el tooltip dice cuánto falta.',
  // {name} = la máquina con efecto enablesAutoDig, resuelta desde automations.json (AutomationView).
  'automation.calloutInactive': 'Necesitás el <strong>{name}</strong> para usar la cola.',
  'automation.queue': 'Cola: {count} / {max}',
  'automation.slots': 'Slots simultáneos: {count}',
  'automation.processingLabel': 'Procesando:',
  'automation.nothingInProgress': 'Nada en curso.',
  'automation.processingItem': '{name}: {pct}%',
  'automation.unknownContainer': 'Contenedor desconocido',
  'automation.targetLabel': 'Objetivo del robot',
  'automation.targetAuto': 'Auto (el más caro que puedas pagar)',
  'automation.waiting': 'El robot espera juntar {amount} para {name}.',
  'automation.active': 'Activo',
  'automation.buyFor': 'Comprar por {amount}',
  'automation.expandCapacity': 'Ampliar Capacidad (nivel {level}) por {amount}',
  // Ronda 25 (PLAN.md §4.32): desafío `manosVacias` activo bloquea toda compra de máquinas.
  'automation.blockedByChallenge': 'El desafío activo no permite comprar máquinas.',
  // Ronda 27 (PLAN.md §4.38/§4.39): flota de robots + filtros por robot.
  'automation.fleetTitle': 'Flota de robots',
  'automation.fleetSize': 'Flota: {count} robot{plural}',
  'automation.robotTitle': 'Robot {num}',
  'automation.robotArms': '{count} brazo{plural}',
  'automation.robotIdle': 'Sin nada en la garra ahora mismo.',
  'automation.filtersSummary': 'Filtros del robot',
  'automation.filterThresholdLabel': 'Descartar hallazgos que valgan menos de',
  'automation.filterDiscardEstimate': 'Estimado: descarta ~{pct}% de lo que encuentra.',
  'automation.filterReserveLabel': 'Reservar para el Puesto (ignora el umbral de venta):',
  'automation.filterReserveLocked': 'Comprá el Puesto de Chatarra en la Tienda para reservar categorías.',
  'npc.chispa.fleetFlavor': 'Chispa: "Yo los mantengo aceitados. Vos decime qué tiene que buscar cada uno."',

  // CelebrationModal.js
  'celebration.close': 'Cerrar',
  'celebration.achievementTitle': '¡Logro desbloqueado!',
  'celebration.rewardLine': 'Recompensa: {reward}',
  'celebration.rewardKeys': '{amount} Llaves de Ciudad',
  'celebration.containerTitle': '¡Contenedor nuevo!',
  'celebration.containerReady': 'Ya está disponible para escarbar.',
  'celebration.firstFindTitle': '¡Hallazgo nuevo!',
  // Ronda 22 (PLAN.md §4.26): celebración especial al hallar un legendario.
  'celebration.legendaryTitle': '¡Legendario encontrado!',

  // CollectionView.js
  'collection.emptyPool': 'Este contenedor no tiene recompensas configuradas.',
  'collection.hiddenName': '???',
  'collection.notFound': 'Todavía no encontraste este objeto.',
  'collection.probability': 'Probabilidad: {pct}%',
  'collection.baseValue': 'Valor base: {amount}',
  'collection.foundCount': 'Encontrado: {count}',
  // Ronda 19: % de completitud (PLAN.md §5.4), derivado — nunca un contador persistido nuevo.
  'collection.completionGlobal': 'Completitud global: {pct}%',
  // Ronda 22 (PLAN.md §4.25/§4.26): badge de set completo + sección Vitrina.
  'collection.setCompleteBadge': 'SET COMPLETO +{pct}%',
  'collection.showcaseTitle': 'Vitrina de Legendarios',
  'collection.showcaseCount': 'Vitrina: {count}/{total}',
  'collection.showcaseHiddenName': '???',
  'collection.showcaseNotFound': 'Todavía no encontraste este legendario.',

  // OfflineModal.js
  'offline.title': 'Mientras no estabas...',
  'offline.summary': 'Tus robots trabajaron {minutes} min y encontraron:',
  'offline.close': 'Genial',
  // Ronda 27 (§27.5.3): desglose de lo que facturó el robot vendedor en el Puesto.
  'offline.stallEarnings': 'El robot vendedor facturó {amount} en el Puesto.',

  // PrestigeView.js
  'prestige.empty': 'No hay árbol de prestigio configurado.',
  'prestige.requires': 'Requiere: {name}',
  'prestige.maxed': 'Máximo',
  'prestige.upgradeFor': 'Mejorar por {amount} llaves',
  'prestige.keysLabel': 'Llaves de Ciudad: {amount}',
  'prestige.completedCount': 'Prestigios completados: {count}',
  'prestige.previewGain': 'Si prestigiás ahora ganás: {amount} llaves.',
  'prestige.doButton': 'Hacer Prestigio',
  // {amount} = PRESTIGE_MONEY_THRESHOLD del engine formateado (PrestigeView), nunca un número fijo acá.
  'prestige.needMoney': 'Necesitás {amount} ganados en total para prestigiar.',
  'prestige.infinite': 'Nivel {level} (sin máximo)',
  // Ronda 25 (PLAN.md §4.31/§4.32): elección de especialización/desafío al prestigiar.
  'prestige.chooseTitle': 'Elegí para tu próxima run',
  'prestige.specializationsHeading': 'Especializaciones',
  'prestige.challengesHeading': 'Desafíos',
  'prestige.noneOption': 'Sin especialización',
  'prestige.noneOptionDesc': 'Sin bonus ni penalización de venta por categoría.',
  'prestige.specializationBonus': '+50% en {categories}',
  'prestige.specializationPenalty': '-15% en el resto',
  'prestige.challengeGoal': 'Objetivo: {goal}',
  'prestige.challengeGoalMoney': 'ganar {amount} en la run',
  'prestige.challengeGoalPrestige': 'llegar a prestigiar',
  'prestige.challengeReward': 'Recompensa permanente: {reward}',
  'prestige.challengeCompleted': 'Completado',
  'prestige.confirmButton': 'Confirmar Prestigio',
  'prestige.cancelButton': 'Cancelar',
  'prestige.activeSpecialization': 'Especialización activa: {name}',
  'prestige.activeChallenge': 'Desafío activo: {name}',
  'prestige.selected': 'Elegido',
  'prestige.rewardSellPercent': '+{pct}% valor de venta global',
  'prestige.rewardLuckFlat': '+{amount} Suerte',
  'prestige.rewardDigPowerPercent': '+{pct}% Fuerza de Escarbado',
  'prestige.rewardMarketFluctuationMinFlat': '+{amount} al piso de la cotización de mercado',

  // Ronda 26.C (PLAN.md §2.10/§4.34-§4.36): Mudanza de Galaxia y árbol de Escrituras.
  'prestige.galaxyMoveHeading': 'Mudanza de Galaxia',
  'prestige.galaxyMoveLocked': 'Se desbloquea al llegar a {count} prestigios.',
  'prestige.galaxyMoveDesc':
    'Reseteá tu progreso de prestigio (Llaves, árbol y contador) y empezá de nuevo en una galaxia distinta, a cambio de Escrituras permanentes.',
  'prestige.galaxyMoveCount': 'Mudanzas realizadas: {count}',
  'prestige.deedsLabel': 'Escrituras: {amount}',
  'prestige.galaxyMoveButton': 'Mudarse de Galaxia',
  'prestige.galaxyMovePreview': 'Si te mudás ahora ganás: {amount} Escrituras.',
  'prestige.galaxyMoveConfirmTitle': '¿Confirmás la Mudanza de Galaxia?',
  'prestige.galaxyMoveKeeps':
    'Se conserva: logros, colección, vitrina, sets, desafíos completados, herramientas, el Puesto y su nivel, las Escrituras y su árbol, tu mejor racha y los contadores históricos.',
  'prestige.galaxyMoveLoses':
    'Se pierde: Llaves de Ciudad, árbol de prestigio, especialización/desafío activo, y el inventario del Puesto (se liquida a venta instantánea).',
  'prestige.galaxyMoveConfirmButton': 'Confirmar Mudanza',
  'prestige.deedsTreeHeading': 'Árbol de Escrituras',
  'prestige.deedsUpgradeFor': 'Mejorar por {amount} Escrituras',

  // SettingsView.js
  'settings.on': 'Encendido',
  'settings.off': 'Apagado',
  'settings.sound': 'Sonido: {state}',
  'settings.volume': 'Volumen: {pct}%',
  'settings.sensitivity': 'Sensibilidad de escarbado: {pct}%',
  'settings.language': 'Idioma',
  'settings.resetConfirm': '¿Seguro? Tocá de nuevo para confirmar',
  'settings.resetButton': 'Reiniciar partida',
  // Ronda 19: toggle de vibración táctil, mismo patrón que settings.sound.
  'settings.vibration': 'Vibración: {state}',

  // Ronda 20 (PLAN.md §4.23): selector de herramienta de escarbado, mismo patrón que AutomationView.
  'tools.title': 'Herramientas de escarbado',
  'tools.buyFor': 'Comprar por {amount}',
  'tools.equip': 'Equipar',
  'tools.equipped': 'Equipada',
  'tools.manos': 'Manos curtidas',
  'tools.palaAncha': 'Pala Ancha',
  'tools.pincelFino': 'Pincel de Arqueólogo',
  'tools.guanteHidraulico': 'Guante Hidráulico',

  // Estadísticas (ronda 19, PLAN.md §5.4) — subvista de Ajustes, sin engine nuevo.
  'stats.title': 'Estadísticas',
  'stats.itemsFound': 'Objetos encontrados: {count}',
  'stats.trapsHit': 'Trampas caídas: {count}',
  'stats.totalMoneyEarned': 'Dinero total ganado: {amount}',
  'stats.autoProcessed': 'Procesados por robots: {count}',
  'stats.bestStreak': 'Mejor racha: {count}',
  'stats.completion': 'Completitud de colección: {pct}%',
  'stats.maxLevelContainers': 'Contenedores en nivel máximo: {count}/{total}',

  // ShopView.js
  'shop.unlocksAtPrestige': 'Se desbloquea con el Prestigio {count}.',
  'shop.lockedDefault': 'Bloqueado. Comprá el contenedor anterior primero.',
  'shop.cost': 'Costo: {label}',
  'shop.categories': 'Categorías: {list}',
  'shop.trapRisk': 'Riesgo de trampa: {pct}%',
  'shop.owned': 'Comprados: {count}',
  'shop.levelLine': 'Nivel {level}/{max} (+{pct}% valor) — {progress}',
  'shop.maxLevel': 'nivel máximo',
  'shop.levelProgress': '{cur}/{needed} escarbados para el nivel {next}',
  'shop.reached': '(alcanzada)',
  'shop.haveLuck': '(tenés {cur})',
  'shop.haveMult': '(tenés ×{cur})',
  'shop.luckLine': 'Suerte recomendada: {rec} {status}',
  'shop.digPowerLine': 'Fuerza recomendada: ×{rec} {status}',
  'shop.areaLine': 'Búsqueda recomendada: ×{rec} {status}',
  // Ronda 31 (PLAN.md §4.42): ritmo/pincel ACTUALES contra la resistencia/areaRecomendada real
  // de este contenedor — a diferencia de luckLine/digPowerLine/areaLine (metas fijas, jugador
  // neutro), esto muestra el efecto YA aplicado con las stats del jugador.
  'shop.rateLine': 'Ritmo: {pct}%',
  'shop.areaRateLine': 'Pincel: {pct}%',
  // Ronda 23.C: tarjeta de compra del Puesto de Chatarra (PLAN.md §2.9/§4.27) en la Tienda.
  'shop.stallCard': 'Puesto de Chatarra',
  'shop.stallDesc': 'Guardá los objetos que valgan la pena y vendéselos a Doña Rita cuando la cotización esté alta.',
  'shop.stallBuyFor': 'Comprar por {amount}',
  'shop.stallOwned': 'Ya lo tenés — andá a la pestaña Puesto.',

  // Tiers procedurales post-Big Bang (PLAN.md §4.37, ronda 26.B): sufijo del nombre, {n} = tier.
  'shop.proceduralSuffix': ' (Eco {n})',
  // Ronda 26.C: tarjeta informativa del próximo tier procedural en la Tienda.
  'shop.proceduralAllOwned': 'Ya tenés todos los tiers procedurales disponibles.',

  // StallView.js (PLAN.md §2.9/§4.27-§4.30, ronda 23.C)
  'stall.lockedTeaser': 'Se desbloquea comprando el Puesto de Chatarra en la Tienda.',
  'stall.quote': 'Cotización del día: {arrow} {pct}%',
  'stall.thresholdLabel': 'Guardá lo que valga $X o más',
  'stall.thresholdActive': 'Guardando objetos de {amount} o más.',
  'stall.thresholdPaused': 'Puesto en pausa: subí el umbral para empezar a guardar objetos.',
  'stall.levelLine': 'Nivel {level}/{max} · Capacidad: {capacity}',
  'stall.levelMaxed': 'Nivel máximo',
  'stall.upgradeFor': 'Mejorar por {amount}',
  'stall.inventoryTitle': 'Inventario',
  'stall.inventoryEmpty': 'El puesto está vacío — subí el umbral o escarbá algo bueno.',
  'stall.sell': 'Vender',
  'stall.ordersTitle': 'Pedidos de {name}',
  'stall.orderCategory': 'Pedido: {categoria}',
  'stall.orderProgress': 'Progreso: {progress}/{cantidad}',
  'stall.orderReward': 'Paga +{pct}% sobre el precio del puesto',
  'stall.orderTime': 'Rotan en {minutes} min',
  // Ronda 27 (PLAN.md §4.39): toggle "mantener stock para pedidos" del robot vendedor.
  'stall.keepStockToggle': 'Mantener stock para los pedidos de Salomón',
  'stall.keepStockHint': 'El vendedor no vende lo que un pedido activo todavía necesita.',

  // TitleScreen.js
  'titleScreen.play': 'Jugar',
  'titleScreen.settings': 'Configuración',

  // Tutorial.js
  'tutorial.step0': 'Escarbá el Tacho de Vereda (gratis) arrastrando sobre el contenedor para empezar.',
  'tutorial.step1': 'Comprá tu primera mejora de Suerte, Fuerza o Área en el panel de mejoras rápidas.',
  'tutorial.step2': 'Escarbá tu primer contenedor de pago eligiéndolo en la pantalla Escarbar.',
  'tutorial.skip': 'Saltar tutorial',

  // UIManager.js
  'uiManager.levelUp': '{name} subió a nivel {level}: +{pct}% de valor',
  'uiManager.unknownView': 'Vista desconocida.',

  // main.js
  'boot.loadFailed': 'No se pudo cargar {path} (HTTP {status}).',
  'boot.fatalError': 'No se pudo iniciar Dumpster Empire: {message}',
  // §27.5.6 (ronda 27): mensaje genérico en pantalla; el detalle va a console.error.
  'boot.fatalErrorGeneric': 'No se pudo iniciar Dumpster Empire. Probá recargar; el detalle técnico está en la consola.',

  // Ronda 23 — Agente B (data): diálogos de NPCs (apps/game/src/data/npcs.json) y viñetas de
  // historia liviana (apps/game/src/data/story.json, PLAN.md §2.9, roadmap §3.1/§3.2).
  'npc.rita.storyIntro': 'Doña Rita: "Ah, ¿así que ahora tenés puesto propio? Traeme cosas lindas y te pago bien, m\'hijo."',
  'npc.rita.sale.junk': 'Doña Rita: "Esto es cachivache, pero un fierro es un fierro. Te lo pago igual."',
  'npc.rita.sale.tech': 'Doña Rita: "Con la tecnología yo no me meto, pero sé reconocer cuando algo vale."',
  'npc.rita.sale.classy': 'Doña Rita: "Esto sí que tiene clase. Me acuerda a la casa de mi abuela."',
  'npc.rita.sale.premium': 'Doña Rita: "¡Pero mirá esta maravilla! Esto no se encuentra todos los días."',
  'npc.salomon.storyFirstOrder': 'El Turco Salomón: "¡Al fin alguien que cumple un pedido como la gente! Así se trabaja, campeón."',

  // Ronda 24 — misiones diarias, eventos de contenedor y ciclo día/noche (PLAN.md §4.30-§4.33).
  'npc.chispa.storyFirstMission': 'Chispa: "¡Ahí está! Cumpliste tu primera misión. Yo te voy a estar tirando desafíos todos los días, ¿eh?"',
  'npc.zoraida.storyFirstEvent': 'Madame Zoraida: "Lo vi venir en las cartas... un contenedor especial, y vos ahí, aprovechando el momento. Así me gusta."',
  'npc.intendente.storyGalaxyMove': 'El Intendente: "¿Así que te mudás de galaxia? Yo también me mudo, ¿eh? Allá me van a nombrar Intendente Galáctico. Llevate las Escrituras, que en la ciudad nueva valen lo mismo."',

  // MissionsSection.js
  'missions.title': 'Misiones de Chispa',
  'missions.intro': 'Chispa: "¡Eh, vos! Tengo 3 desafíos para hoy. Cumplilos y te tiro una buena recompensa."',
  'missions.empty': 'Chispa todavía no tiene desafíos para vos — comprá tu primer contenedor.',
  'missions.claim': 'Reclamar',
  'missions.claimed': 'Reclamada',
  'missions.progress': '{progress}/{target}',
  'missions.rewardMoney': 'Recompensa: {amount}',
  'missions.rewardKeys': 'Recompensa: {amount} llave{plural} de Ciudad',
  'missions.difficulty.easy': 'Fácil',
  'missions.difficulty.medium': 'Media',
  'missions.difficulty.hard': 'Difícil',
  'missions.desc.findCategoryCount': 'Encontrá {n} objetos de {categoria}',
  'missions.desc.digContainerCount': 'Escarbá {n} veces {contenedor}',
  'missions.desc.streakReach': 'Llegá a una racha de {n}',
  'missions.desc.sellAtStallCount': 'Vendé {n} objetos en el Puesto',
  'missions.desc.fulfillOrders': 'Cumplí {n} pedidos',
  'missions.desc.moneyEarnedToday': 'Ganá {monto} hoy',

  // Eventos de contenedor (systems/events.js, banner sobre la tarjeta del contenedor).
  'event.goldenBanner': '¡Dorado! Vale ×{mult}',
  'event.fireBanner': '¡En Llamas! Vale ×{mult}, +{pct}% trampa',
  'event.timeLeft': '{seconds}s',

  // Ciclo día/noche (Topbar.js, tooltip de Zoraida).
  'dayNight.dayTooltip': 'Zoraida: "De día todo está tranquilo, m\'hijo."',
  'dayNight.nightTooltip': 'Zoraida: "De noche la suerte cambia: +{luck} Suerte, pero +{pct}% de trampa."',
  // Ronda 30 (§4.41): nombres de las 5 franjas horarias del reloj del topbar. Son COSMÉTICAS
  // (eligen el modelo de contenedor); el bonus real sigue siendo el binario día/noche de arriba.
  'dayNight.band.madrugada': 'Madrugada',
  'dayNight.band.manana': 'Mañana',
  'dayNight.band.tarde': 'Tarde',
  'dayNight.band.atardecer': 'Atardecer',
  'dayNight.band.noche': 'Noche',
};
