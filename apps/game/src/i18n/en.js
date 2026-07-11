/**
 * Diccionario inglés (RONDA14-PLAN.md tarea D1). MISMAS claves que es.js; valores copiados del
 * español a propósito (la traducción real es otra ronda) para que la paridad de claves sea
 * testeable desde el día uno y no queden agujeros. Sin selector de idioma visible todavía.
 */

export default {
  // Topbar.js
  'topbar.settings': 'Ajustes',

  // tabs (index.html / UIManager.injectTabIcons — data-tab)
  'tabs.escarbar': 'Escarbar',
  'tabs.tienda': 'Contenedores',
  'tabs.automatizacion': 'Automatización',
  'tabs.logros': 'Logros',
  'tabs.prestigio': 'Prestigio',
  'tabs.index': 'Índice',

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

  // CollectionView.js
  'collection.emptyPool': 'Este contenedor no tiene recompensas configuradas.',
  'collection.hiddenName': '???',
  'collection.notFound': 'Todavía no encontraste este objeto.',
  'collection.probability': 'Probabilidad: {pct}%',
  'collection.baseValue': 'Valor base: {amount}',
  'collection.foundCount': 'Encontrado: {count}',

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
  'settings.resetConfirm': '¿Seguro? Tocá de nuevo para confirmar',
  'settings.resetButton': 'Reiniciar partida',

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
};
