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
  // Ronda 23.C: tarjeta de compra del Puesto de Chatarra (PLAN.md §2.9/§4.27) en la Tienda.
  'shop.stallCard': 'Puesto de Chatarra',
  'shop.stallDesc': 'Guardá los objetos que valgan la pena y vendéselos a Doña Rita cuando la cotización esté alta.',
  'shop.stallBuyFor': 'Comprar por {amount}',
  'shop.stallOwned': 'Ya lo tenés — andá a la pestaña Puesto.',

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

  // Ronda 23 — Agente B (data): diálogos de NPCs (apps/game/src/data/npcs.json) y viñetas de
  // historia liviana (apps/game/src/data/story.json, PLAN.md §2.9, roadmap §3.1/§3.2).
  'npc.rita.storyIntro': 'Doña Rita: "Ah, ¿así que ahora tenés puesto propio? Traeme cosas lindas y te pago bien, m\'hijo."',
  'npc.rita.sale.junk': 'Doña Rita: "Esto es cachivache, pero un fierro es un fierro. Te lo pago igual."',
  'npc.rita.sale.tech': 'Doña Rita: "Con la tecnología yo no me meto, pero sé reconocer cuando algo vale."',
  'npc.rita.sale.classy': 'Doña Rita: "Esto sí que tiene clase. Me acuerda a la casa de mi abuela."',
  'npc.rita.sale.premium': 'Doña Rita: "¡Pero mirá esta maravilla! Esto no se encuentra todos los días."',
  'npc.salomon.storyFirstOrder': 'El Turco Salomón: "¡Al fin alguien que cumple un pedido como la gente! Así se trabaja, campeón."',
};
