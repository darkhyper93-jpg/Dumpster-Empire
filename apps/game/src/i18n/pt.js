/**
 * Diccionario portugués (ronda 33 — traducción real, mismas claves y {params} que es.js/en.js;
 * la paridad se testea dinámicamente en apps/game/tests/ronda16-i18n.test.js derivando la lista
 * de SUPPORTED_LANGUAGES). Portugués neutro con inclinación a pt-BR (el mercado más grande de
 * Steam para el idioma). Glosario fijo: City Keys → Chaves da Cidade; Dig → Escavar; Dig Power →
 * Força de Escavação; Search Area → Área de Busca; Luck → Sorte; Container → Contêiner; Trap →
 * Armadilha; Prestige → Prestígio; Upgrade → Melhoria; Common Junk → Lixo Comum; Deeds →
 * Escrituras; Junk Stall → Banca de Ferro-Velho.
 */

export default {
  // Topbar.js
  'topbar.settings': 'Ajustes',
  'topbar.stats': 'Estatísticas',

  // tabs (index.html / UIManager.injectTabIcons — data-tab)
  'tabs.escarbar': 'Escavar',
  'tabs.tienda': 'Contêineres',
  'tabs.automatizacion': 'Automação',
  'tabs.logros': 'Conquistas',
  'tabs.prestigio': 'Prestígio',
  'tabs.index': 'Índice',
  'tabs.puesto': 'Banca',

  // Compartidos entre vistas
  'common.free': 'Grátis',
  'common.missingMoney': 'Faltam {amount}',
  'common.missingKeys': 'Faltam {amount} chaves',
  'common.missingDeeds': 'Faltam {amount} Escrituras',
  'common.effectFlat': '+{amount} {label} por nível',
  'common.effectPercent': '+{pct}% {label} por nível',
  'common.emptyContainers': 'Nenhum contêiner configurado.',

  // QuickUpgrades.js
  'quickUpgrades.empty': 'Nenhuma melhoria configurada.',
  'quickUpgrades.levelLabel': '{label} · NV. {level}',

  // DigContainerPicker.js
  'digPicker.empty': 'Ainda não há contêineres disponíveis.',
  'digPicker.prompt': 'Escolha um contêiner para escavar.',
  'digPicker.level': 'Nv. {level}',

  // dig (DigCanvas.js + UIManager render de dig-area)
  'dig.idlePrompt': 'Arraste para escavar',
  'dig.abandon': 'Abandonar',
  'dig.trapEntryName': 'Armadilha!',
  'dig.trapRiskLine': 'Risco de armadilha: {pct}%{hint}',
  'dig.rateHint': ' · Ritmo de escavação: {pct}% (aumente a Força de Escavação)',
  // Round 19 (PLAN.md §4.20): manual no-trap dig streak, visible from streak >= 2.
  'dig.streak': 'Sequência: {count}',

  // Round 20 (PLAN.md §4.24): Vault Against the Clock (hard timer) and Dark Basement (mask).
  'dig.timedRemaining': 'Tempo restante: {seconds}s',
  'dig.timedExpired': 'Acabou o tempo: você perdeu "{name}" sem penalidade em dinheiro.',
  'dig.darkHint': 'Você só enxerga perto do seu dedo.',

  // AchievementsView.js
  'achievements.empty': 'Nenhuma conquista configurada.',
  'achievements.rewardKeys': '{amount} Chave{plural} da Cidade',
  'achievements.claimed': 'Resgatada',
  'achievements.pending': 'Pendente',

  // AutomationView.js
  'automation.empty': 'Nenhuma automação configurada.',
  // Ronda 15: toast al descartar un contenedor trampeado (nodo Escáner de Trampas).
  'automation.trapDiscarded': 'O robô descartou um contêiner com armadilha.',
  'automation.explainer':
    'O robô compra contêineres com o seu dinheiro, coloca na fila e processa (mais risco de armadilha do que escavar na mão). Escolha abaixo qual ele compra, ou deixe em "Automático". As outras máquinas aumentam a fila ou somam mais robôs.',
  'automation.hint': 'Botão cinza = você ainda não tem dinheiro; a dica mostra quanto falta.',
  // {name} = la máquina con efecto enablesAutoDig, resuelta desde automations.json (AutomationView).
  'automation.calloutInactive': 'Você precisa do <strong>{name}</strong> para usar a fila.',
  'automation.queue': 'Fila: {count} / {max}',
  'automation.slots': 'Vagas simultâneas: {count}',
  'automation.processingLabel': 'Processando:',
  'automation.nothingInProgress': 'Nada em andamento.',
  'automation.processingItem': '{name}: {pct}%',
  'automation.unknownContainer': 'Contêiner desconhecido',
  'automation.targetLabel': 'Alvo do robô',
  'automation.targetAuto': 'Automático (o mais caro que der para pagar)',
  'automation.waiting': 'O robô está juntando {amount} para {name}.',
  'automation.active': 'Ativo',
  'automation.buyFor': 'Comprar por {amount}',
  'automation.expandCapacity': 'Ampliar Capacidade (nível {level}) por {amount}',
  // Ronda 25 (PLAN.md §4.32): desafío `manosVacias` activo bloquea toda compra de máquinas.
  'automation.blockedByChallenge': 'O desafio ativo não permite comprar máquinas.',
  // Ronda 27 (PLAN.md §4.38/§4.39): flota de robots + filtros por robot.
  'automation.fleetTitle': 'Frota de robôs',
  'automation.fleetSize': 'Frota: {count} robô{plural}',
  'automation.robotTitle': 'Robô {num}',
  'automation.robotArms': '{count} braço{plural}',
  'automation.robotIdle': 'Nada na garra no momento.',
  'automation.filtersSummary': 'Filtros do robô',
  'automation.filterThresholdLabel': 'Descartar achados que valham menos de',
  'automation.filterDiscardEstimate': 'Estimativa: descarta ~{pct}% do que encontra.',
  'automation.filterReserveLabel': 'Guardar para a Banca (ignora o limite de venda):',
  'automation.filterReserveLocked': 'Compre a Banca de Ferro-Velho na Loja para guardar categorias.',
  'npc.chispa.fleetFlavor': 'Chispa: "Deixo todos lubrificados. Você só me diz o que cada um tem que caçar."',

  // CelebrationModal.js
  'celebration.close': 'Fechar',
  'celebration.achievementTitle': 'Conquista desbloqueada!',
  'celebration.rewardLine': 'Recompensa: {reward}',
  'celebration.rewardKeys': '{amount} Chaves da Cidade',
  'celebration.containerTitle': 'Novo contêiner!',
  'celebration.containerReady': 'Já está disponível para escavar.',
  'celebration.firstFindTitle': 'Achado novo!',
  // Round 22 (PLAN.md §4.26): special celebration when finding a legendary.
  'celebration.legendaryTitle': 'Lendário encontrado!',

  // CollectionView.js
  'collection.emptyPool': 'Este contêiner não tem recompensas configuradas.',
  'collection.hiddenName': '???',
  'collection.notFound': 'Você ainda não encontrou este objeto.',
  'collection.probability': 'Probabilidade: {pct}%',
  'collection.baseValue': 'Valor base: {amount}',
  'collection.foundCount': 'Encontrados: {count}',
  // Round 22 (PLAN.md §4.25/§4.26): complete-set badge + Showcase section.
  'collection.setCompleteBadge': 'COLEÇÃO COMPLETA +{pct}%',
  'collection.showcaseTitle': 'Vitrine de Lendários',
  'collection.showcaseCount': 'Vitrine: {count}/{total}',
  'collection.showcaseHiddenName': '???',
  'collection.showcaseNotFound': 'Você ainda não encontrou este lendário.',
  // Round 19: completion % (PLAN.md §5.4), derived — never a new persisted counter.
  'collection.completionGlobal': 'Progresso global: {pct}%',

  // OfflineModal.js
  'offline.title': 'Enquanto você esteve fora...',
  'offline.summary': 'Seus robôs trabalharam por {minutes} min e encontraram:',
  'offline.close': 'Ótimo',
  // Ronda 27 (§27.5.3): desglose de lo que facturó el robot vendedor en el Puesto.
  'offline.stallEarnings': 'O robô vendedor faturou {amount} na Banca.',

  // PrestigeView.js
  'prestige.empty': 'Nenhuma árvore de prestígio configurada.',
  'prestige.requires': 'Requer: {name}',
  'prestige.maxed': 'No máximo',
  'prestige.upgradeFor': 'Melhorar por {amount} chaves',
  'prestige.keysLabel': 'Chaves da Cidade: {amount}',
  'prestige.completedCount': 'Prestígios concluídos: {count}',
  'prestige.previewGain': 'Se prestigiar agora você ganha: {amount} chaves.',
  'prestige.doButton': 'Prestigiar',
  // {amount} = PRESTIGE_MONEY_THRESHOLD del engine formateado (PrestigeView), nunca un número fijo acá.
  'prestige.needMoney': 'Você precisa de {amount} ganhos no total para prestigiar.',
  'prestige.infinite': 'Nível {level} (sem limite)',
  'prestige.chooseTitle': 'Escolha para a sua próxima jornada',
  'prestige.specializationsHeading': 'Especializações',
  'prestige.challengesHeading': 'Desafios',
  'prestige.noneOption': 'Sem especialização',
  'prestige.noneOptionDesc': 'Sem bônus nem penalidade de venda por categoria.',
  'prestige.specializationBonus': '+50% em {categories}',
  'prestige.specializationPenalty': '-15% no resto',
  'prestige.challengeGoal': 'Objetivo: {goal}',
  'prestige.challengeGoalMoney': 'ganhar {amount} nesta jornada',
  'prestige.challengeGoalPrestige': 'chegar ao prestígio',
  'prestige.challengeReward': 'Recompensa permanente: {reward}',
  'prestige.challengeCompleted': 'Concluído',
  'prestige.confirmButton': 'Confirmar Prestígio',
  'prestige.cancelButton': 'Cancelar',
  'prestige.activeSpecialization': 'Especialização ativa: {name}',
  'prestige.activeChallenge': 'Desafio ativo: {name}',
  'prestige.selected': 'Selecionado',
  'prestige.rewardSellPercent': '+{pct}% de valor de venda global',
  'prestige.rewardLuckFlat': '+{amount} de Sorte',
  'prestige.rewardDigPowerPercent': '+{pct}% de Força de Escavação',
  'prestige.rewardMarketFluctuationMinFlat': '+{amount} no piso da cotação do mercado',

  // Round 26.C (PLAN.md §2.10/§4.34-§4.36): Galaxy Move and the Deeds tree.
  'prestige.galaxyMoveHeading': 'Mudança de Galáxia',
  'prestige.galaxyMoveLocked': 'Libera com {count} prestígios.',
  'prestige.galaxyMoveDesc':
    'Zere o seu progresso de prestígio (Chaves, árvore e contador) e recomece em outra galáxia, em troca de Escrituras permanentes.',
  'prestige.galaxyMoveCount': 'Mudanças feitas: {count}',
  'prestige.deedsLabel': 'Escrituras: {amount}',
  'prestige.galaxyMoveButton': 'Mudar para Outra Galáxia',
  'prestige.galaxyMovePreview': 'Se mudar agora você ganha: {amount} Escrituras.',
  'prestige.galaxyMoveConfirmTitle': 'Confirmar a Mudança de Galáxia?',
  'prestige.galaxyMoveKeeps':
    'Você mantém: conquistas, coleção, vitrine, coleções completas, desafios concluídos, ferramentas, a Banca e o nível dela, as Escrituras e a árvore delas, a sua melhor sequência e os contadores históricos.',
  'prestige.galaxyMoveLoses':
    'Você perde: Chaves da Cidade, árvore de prestígio, especialização/desafio ativos e o estoque da Banca (liquidado por venda instantânea).',
  'prestige.galaxyMoveConfirmButton': 'Confirmar Mudança',
  'prestige.deedsTreeHeading': 'Árvore de Escrituras',
  'prestige.deedsUpgradeFor': 'Melhorar por {amount} Escrituras',

  // SettingsView.js
  'settings.on': 'Ligado',
  'settings.off': 'Desligado',
  'settings.sound': 'Som: {state}',
  'settings.volume': 'Volume: {pct}%',
  'settings.sensitivity': 'Sensibilidade de escavação: {pct}%',
  'settings.language': 'Idioma',
  'settings.resetConfirm': 'Tem certeza? Toque de novo para confirmar',
  'settings.resetButton': 'Zerar o jogo',
  // Round 19: haptic vibration toggle, same pattern as settings.sound.
  'settings.vibration': 'Vibração: {state}',
  // AJUSTE (auditoria de release): aviso de guardado ilegible. Antes, un save que no pasaba la
  // validacion se reemplazaba por una partida nueva en SILENCIO (CLAUDE.md exige un mensaje
  // claro); ahora se archiva una copia intacta y el jugador se entera de las dos cosas.
  'save.rejectedToast': 'Não foi possível ler o teu jogo salvo. Uma cópia intacta foi arquivada e um novo jogo começou.',
  'save.rejectedTitle': 'Jogo salvo ilegível',
  'save.rejectedDetail': 'O save anterior não passou na validação e um novo jogo foi iniciado. A cópia original ficou arquivada intacta neste dispositivo: não foi sobrescrita.',

  // Round 20 (PLAN.md §4.23): dig tool selector, same pattern as AutomationView.
  'tools.title': 'Ferramentas de escavação',
  'tools.buyFor': 'Comprar por {amount}',
  'tools.equip': 'Equipar',
  'tools.equipped': 'Equipada',
  'tools.manos': 'Mãos nuas',
  'tools.palaAncha': 'Pá Larga',
  'tools.pincelFino': 'Pincel de Arqueólogo',
  'tools.guanteHidraulico': 'Luva Hidráulica',

  // Statistics (round 19, PLAN.md §5.4) — Settings subview, no new engine logic.
  'stats.title': 'Estatísticas',
  'stats.itemsFound': 'Objetos encontrados: {count}',
  'stats.trapsHit': 'Armadilhas ativadas: {count}',
  'stats.totalMoneyEarned': 'Dinheiro total ganho: {amount}',
  'stats.autoProcessed': 'Processados por robôs: {count}',
  'stats.bestStreak': 'Melhor sequência: {count}',
  'stats.completion': 'Coleção concluída: {pct}%',
  'stats.maxLevelContainers': 'Contêineres no nível máximo: {count}/{total}',

  // ShopView.js
  'shop.unlocksAtPrestige': 'Libera no Prestígio {count}.',
  'shop.lockedDefault': 'Bloqueado. Compre o contêiner anterior primeiro.',
  'shop.cost': 'Custo: {label}',
  'shop.categories': 'Categorias: {list}',
  'shop.trapRisk': 'Risco de armadilha: {pct}%',
  'shop.owned': 'Comprados: {count}',
  'shop.levelLine': 'Nível {level}/{max} (+{pct}% de valor) — {progress}',
  'shop.maxLevel': 'nível máximo',
  'shop.levelProgress': '{cur}/{needed} escavações para o nível {next}',
  'shop.reached': '(alcançado)',
  'shop.haveLuck': '(você tem {cur})',
  'shop.haveMult': '(você tem ×{cur})',
  'shop.luckLine': 'Sorte recomendada: {rec} {status}',
  'shop.digPowerLine': 'Força de Escavação recomendada: ×{rec} {status}',
  'shop.areaLine': 'Área de Busca recomendada: ×{rec} {status}',
  // Round 31 (PLAN.md §4.42): CURRENT pace/brush against this container's real resistance/area.
  'shop.rateLine': 'Ritmo: {pct}%',
  'shop.areaRateLine': 'Pincelada: {pct}%',
  // Ronda 23.C: Junk Stall purchase card (PLAN.md §2.9/§4.27) in the Shop tab.
  'shop.stallCard': 'Banca de Ferro-Velho',
  'shop.stallDesc': 'Guarde os objetos que valem a pena e venda para a Dona Rita quando o preço estiver alto.',
  'shop.stallBuyFor': 'Comprar por {amount}',
  'shop.stallOwned': 'Você já tem — dê uma olhada na aba Banca.',

  // Post-Big Bang procedural tiers (PLAN.md §4.37, round 26.B): name suffix, {n} = tier.
  'shop.proceduralSuffix': ' (Eco {n})',
  'shop.proceduralAllOwned': 'Você já tem todos os níveis procedurais disponíveis.',

  // StallView.js (PLAN.md §2.9/§4.27-§4.30, ronda 23.C)
  'stall.lockedTeaser': 'Libera comprando a Banca de Ferro-Velho na Loja.',
  'stall.quote': 'Preço de hoje: {arrow} {pct}%',
  'stall.thresholdLabel': 'Guardar objetos que valham $X ou mais',
  'stall.thresholdActive': 'Guardando objetos que valham {amount} ou mais.',
  'stall.thresholdPaused': 'Banca pausada: aumente o limite para começar a guardar objetos.',
  'stall.levelLine': 'Nível {level}/{max} · Capacidade: {capacity}',
  'stall.levelMaxed': 'Nível máximo',
  'stall.upgradeFor': 'Melhorar por {amount}',
  'stall.inventoryTitle': 'Estoque',
  'stall.inventoryEmpty': 'A banca está vazia — aumente o limite ou escave algo bom.',
  'stall.sell': 'Vender',
  'stall.ordersTitle': 'Encomendas do {name}',
  'stall.orderCategory': 'Encomenda: {categoria}',
  'stall.orderProgress': 'Progresso: {progress}/{cantidad}',
  'stall.orderReward': 'Paga +{pct}% sobre o preço da banca',
  'stall.orderTime': 'Troca em {minutes} min',
  // Ronda 27 (PLAN.md §4.39): toggle "mantener stock para pedidos" del robot vendedor.
  'stall.keepStockToggle': 'Guardar estoque para as encomendas do Salomón',
  'stall.keepStockHint': 'O vendedor não vende o que uma encomenda ativa ainda precisa.',

  // TitleScreen.js
  'titleScreen.play': 'Jogar',
  'titleScreen.settings': 'Ajustes',

  // Tutorial.js
  'tutorial.step0': 'Escave a Lixeira de Calçada (grátis) arrastando sobre o contêiner para começar.',
  'tutorial.step1': 'Compre a sua primeira melhoria de Sorte, Força de Escavação ou Área de Busca no painel de melhorias rápidas.',
  'tutorial.step2': 'Escave o seu primeiro contêiner pago escolhendo ele na tela de Escavar.',
  'tutorial.skip': 'Pular tutorial',

  // UIManager.js
  'uiManager.levelUp': '{name} subiu para o nível {level}: +{pct}% de valor',
  'uiManager.unknownView': 'Tela desconhecida.',

  // main.js
  'boot.loadFailed': 'Não foi possível carregar {path} (HTTP {status}).',
  'boot.fatalError': 'Não foi possível iniciar o Dumpster Empire: {message}',
  // §27.5.6 (ronda 27): mensaje genérico en pantalla; el detalle va a console.error.
  'boot.fatalErrorGeneric': 'Não foi possível iniciar o Dumpster Empire. Tente recarregar; os detalhes técnicos estão no console.',

  // Ronda 23 — Agente B (data): NPC dialogue and light story beats.
  'npc.rita.storyIntro': 'Dona Rita: "Ah, então agora você tem a sua própria banca? Me traga coisas boas que eu pago bem, meu bem."',
  'npc.rita.sale.junk': 'Dona Rita: "Isso é bugiganga, mas ferro é ferro. Pago assim mesmo."',
  'npc.rita.sale.tech': 'Dona Rita: "Não entendo nada de tecnologia, mas reconheço uma coisa que vale."',
  'npc.rita.sale.classy': 'Dona Rita: "Isso sim tem classe. Me lembra a casa da minha avó."',
  'npc.rita.sale.premium': 'Dona Rita: "Olha só que maravilha! Não se acha uma dessas todo dia."',
  'npc.salomon.storyFirstOrder': 'Salomón, o Turco: "Finalmente alguém que cumpre uma encomenda direito! É assim que se faz negócio, campeão."',

  // Ronda 24 — daily missions, container events and day/night cycle (PLAN.md §4.30-§4.33).
  'npc.chispa.storyFirstMission': 'Chispa: "É isso aí! Você fechou a sua primeira missão. Vou te jogar um desafio novo todo dia, combinado?"',
  'npc.zoraida.storyFirstEvent': 'Madame Zoraida: "Eu vi nas cartas... um contêiner especial, e lá estava você, agarrando a chance. É assim que eu gosto."',
  'npc.intendente.storyGalaxyMove': 'O Prefeito: "Então você vai se mudar para outra galáxia? Eu também vou, sabia — lá vou ser nomeado Prefeito Galáctico. Leve as suas Escrituras, valem o mesmo na cidade nova."',

  // MissionsSection.js
  'missions.title': 'Missões da Chispa',
  'missions.intro': 'Chispa: "Ei, você! Tenho 3 desafios para hoje. Cumpra que eu te dou uma recompensa das boas."',
  'missions.empty': 'A Chispa ainda não tem desafios para você — compre o seu primeiro contêiner.',
  'missions.claim': 'Resgatar',
  'missions.claimed': 'Resgatada',
  'missions.progress': '{progress}/{target}',
  'missions.rewardMoney': 'Recompensa: {amount}',
  'missions.rewardKeys': 'Recompensa: {amount} Chave{plural} da Cidade',
  'missions.difficulty.easy': 'Fácil',
  'missions.difficulty.medium': 'Média',
  'missions.difficulty.hard': 'Difícil',
  'missions.desc.findCategoryCount': 'Encontre {n} objetos de {categoria}',
  'missions.desc.digContainerCount': 'Escave {contenedor} {n} vezes',
  'missions.desc.streakReach': 'Chegue a uma sequência de {n}',
  'missions.desc.sellAtStallCount': 'Venda {n} objetos na Banca',
  'missions.desc.fulfillOrders': 'Cumpra {n} encomendas',
  'missions.desc.moneyEarnedToday': 'Ganhe {monto} hoje',

  // Container events (systems/events.js, banner over the container card).
  'event.goldenBanner': 'Dourado! Vale ×{mult}',
  'event.fireBanner': 'Em Chamas! Vale ×{mult}, +{pct}% de chance de armadilha',
  'event.timeLeft': '{seconds}s',

  // Day/night cycle (Topbar.js, Zoraida's tooltip).
  'dayNight.dayTooltip': 'Madame Zoraida: "De dia está tudo calmo, meu bem."',
  'dayNight.nightTooltip': 'Madame Zoraida: "À noite a sorte muda: +{luck} de Sorte, mas +{pct}% de chance de armadilha."',
  // Round 30 (§4.41): names of the 5 time bands shown in the topbar clock.
  'dayNight.band.madrugada': 'Madrugada',
  'dayNight.band.manana': 'Manhã',
  'dayNight.band.tarde': 'Tarde',
  'dayNight.band.atardecer': 'Entardecer',
  'dayNight.band.noche': 'Noite',
};
