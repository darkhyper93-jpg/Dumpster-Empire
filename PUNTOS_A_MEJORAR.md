Desde un inicio tenemos que tener el menú del tacho osea de arrastrá para escarbar, también, otro detalle de lo mismo, quiero que se MANTENGA todo mi diseño que tenía en la ui de stitch, el archivo exacto es reference/ui/stitch_est_tica_de_vanguardia/dumpster_empire_clean_scavenge_area/code.html, quiero ESE diseño, es el mejor que hay, reorganiza todo en base a este. También, cada tacho debe tener al lado un nivel de suerte recomendada para comprarlo, donde ya con ese contenedor se pueda empezar a ganar plata, porque con la suerte al 11 y el segundo contenedor aumentando cada vez más y más de precio, no paro de perder plata, incluso ahora con la suerte al 22 sigo perdiendo, obvio se tiene que poder perder pero que no se pierda tanto, y que la pérdida baje según el nivel de suerte, también quisiera también diseñar 2 funciones, las trampas deben sacar más plata. Y la otra, que los tachos tengan nivel, mientras más vayas rascando de cada uno, va subiendo más de nivel hasta el 10, y, a medida que se sube de nivel, va aumentando las posibilidades de mejores items, es por eso también que hay que armar también una sección INDEX o no se si con ese nombre pero algo así, donde se muestren todas las posibles recompensas del contenedor, obviamente ocultas, y una vez que te haya salido al menos una vez, que se muestre, junto con su % (probabilidad de salir), precio, cantidad obtenida, cada contenedor DEBE obviamente tener items distintos, ninguno repetido. Además, no hay ruido mientras escarbas, y, también, se escarba muy fácil incluso al tener fuerza al 1, debe ser complicado, osea que se haga lento, y obviamente, los contenedores, a medida que son mejores, deben tener distinta resistencia, osea que necesites más fuerza mínima para poder rascarlos bien o sino que demore mucho, y el sonido que hay al reclamar los items es horrible, deben ser sonidos satisfactorios, y el de rascar también debe serlo. Y cada 2x3 da 304 y 404, y con este, obvio, al rascar se rasca de una osea de un solo click porque no está el sistema de procesamiento, osea con un solo click rasco todo menos cuando hay una trampa. El menú de "Elegí un contenedor para escarbar y el mensaje de "Escarbar el Tacho de Vereda (gratis) que tiene debajo" se mantiene en cada sección, es muy molesto, debería ser SOLO el de Elegí un contenedor para escarbar que esté, y solo en la tienda, y en el resto sacar ambos. No se si es por el 304 o 404 pero no puedo comprar NADA de la sección de automatización, y tampoco entiendo como funciona ni como automatizar items, también, hasta ahora los logros son puramente palabras, no dan ninguna recompensa, podrían dar llaves también los logros, podría ser una buena función para ellos, o dinero, si es uno complicado o un buen hito como el del primer millón o algo medio complicado, llave, y sino dinero, una cantidad buena pero sin regalar dinero a lo tonto y volver al jugador OP. Y en la sección Prestigio, que diga "Hacer Prestigio", que es eso de Prestigiar, queda horrible, y prestigiás también, cambialo, y también, las mejoras de la sección inicial (suerte, fuerza, tamaño) deben desaparecer visualmente mientras estamos en otra sección, son cosas distintas, y, visualmente también, la sección de prestigio está re mal diseñada, las ramas ni siquiera están bien conectadas, y deben ser simétricas, hay que armar un diseño en ramas visual como el que usa n8n(visualmente obvio), o como el de scritchy scratchy, si queres puedo adjuntar una foto de referencia. La sección de exportar e importar guardado es totalmente inútil, también, quisiera hacerle una pantalla de inicio al juego, bonita, la puedo hacer con Stitch, que muestre como el logo del juego y diga "Jugar", "Configuración(tuerquita abajo a la derecha de la pantalla)", y lo clásico que suelen tener. Por las dudas, aún están pendientes los agentes 5-7, agentes S, 0-4 finalizados.

Presento algunos logs:

> dumpster-empire@0.0.0 dev
> npx serve . -l 5173


   ┌─────────────────────────────────────────┐
   │                                         │
   │   Serving!                              │
   │                                         │
   │   - Local:    http://localhost:5173     │
   │   - Network:  http://192.168.1.6:5173   │
   │                                         │
   │   Copied local address to clipboard!    │
   │                                         │
   └─────────────────────────────────────────┘

 HTTP  2/7/2026 10:52:48 ::1 GET /
 HTTP  2/7/2026 10:52:48 ::1 Returned 200 in 41 ms
 HTTP  2/7/2026 10:52:48 ::1 GET /favicon.ico
 HTTP  2/7/2026 10:52:48 ::1 Returned 404 in 5 ms
 HTTP  2/7/2026 10:52:55 ::1 GET /apps/
 HTTP  2/7/2026 10:52:55 ::1 Returned 200 in 3 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/
 HTTP  2/7/2026 10:52:56 ::1 Returned 200 in 6 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/styles/tokens.css
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/styles/layout.css
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/styles/components.css
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/main.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 8 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 7 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 8 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 8 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/store.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/loop.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/UIManager.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 3 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 7 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 4 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/index.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/dig/DigCanvas.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/Topbar.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/QuickUpgrades.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/ShopView.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/AutomationView.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 13 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 11 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 10 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 9 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 8 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 8 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/AchievementsView.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 2 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/PrestigeView.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/SettingsView.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/Toast.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/Tutorial.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/OfflineModal.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/ui/CategoryUnlockModal.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 20 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 20 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 20 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/icons/icons.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 21 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 17 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/fx/audio.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/fx/particles.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/state.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/format.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/economy.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 13 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 8 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 7 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/rng.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/save.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 13 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/systems/containers.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/systems/upgrades.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/systems/automation.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/systems/prestige.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 14 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 13 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/systems/achievements.js
 HTTP  2/7/2026 10:52:56 ::1 GET /packages/engine/src/systems/offline.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 14 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/fx/tween.js
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/dig/digInput.js
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 13 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 7 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 7 ms
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/data/items.json
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/data/containers.json
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/data/upgrades.json
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/data/automations.json
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/data/prestigeTree.json
 HTTP  2/7/2026 10:52:56 ::1 GET /apps/game/src/data/achievements.json
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 15 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 12 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 9 ms
 HTTP  2/7/2026 10:52:56 ::1 Returned 304 in 11 ms
 HTTP  2/7/2026 10:53:00 ::1 GET /favicon.ico
 HTTP  2/7/2026 10:53:00 ::1 Returned 404 in 2 ms