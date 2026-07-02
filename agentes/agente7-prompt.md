# Agente 7 — UI de las mecánicas nuevas

## Tu identidad
Sos el **Agente 7**. Construís la UI de las features nuevas encima del engine del Agente 6: colección/
INDEX, pantalla de inicio, árbol de prestigio real, y los datos derivados en Tienda/Logros.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **§11.5 (INDEX), §11.7 (árbol), §11.8 (inicio), §11.9 (flujo)**, y §11.2 (Suerte
   recomendada), §11.6 (recompensa de logros).
2. `CLAUDE.md` — la UI no reimplementa lógica; lee estado y despacha acciones; 4 estados por vista.
3. `DESARROLLO.md` — **§7 Fase 7**, §4 (nuevas vistas `CollectionView.js`, `TitleScreen.js`).
4. `agentes/HANDOFF.md` — **bloque del Agente 6** (API nueva del engine: niveles, Suerte recomendada,
   recompensa de logro, `requires` de prestigio) y bloque del Agente 3 (íconos, modales, `UIManager`).

## Precondiciones
Agente 6 dejó el engine + data con las mecánicas nuevas y su API pública documentada.

## Objetivo
Vistas nuevas y datos derivados visibles, todo consumiendo el engine (sin recalcular nada).

## Tareas concretas
1. **Colección / INDEX por contenedor** (`ui/CollectionView.js`, PLAN.md §11.5): lista las recompensas
   posibles de un contenedor; las no encontradas van **ocultas** (silueta/"???"); las encontradas se
   revelan con **ícono, nombre, probabilidad (%), valor y cantidad obtenida**. Los datos salen del
   engine/tracking, no los calcules acá.
2. **Pantalla de inicio** (`ui/TitleScreen.js`, PLAN.md §11.8/§11.9): logo del juego, botón **"Jugar"**
   (entra a la pantalla de escarbado), acceso a **Configuración** (engranaje abajo a la derecha). El
   juego arranca en esta pantalla.
3. **Árbol de prestigio real** (`ui/PrestigeView.js`, PLAN.md §11.7): reescribí el layout como grafo
   de **nodos conectados y simétricos** según el `requires` que definió el Agente 6 (estilo n8n/
   scritchy). Nodos bloqueados hasta cumplir prerrequisitos; conexiones dibujadas explícitas.
4. **Suerte recomendada en la Tienda** (`ui/ShopView.js`, PLAN.md §11.2): mostrar, al lado de cada
   contenedor, el nivel de Suerte recomendado (leído del engine) y un indicador de si el jugador ya
   lo alcanzó.
5. **Recompensa en Logros** (`ui/AchievementsView.js`, PLAN.md §11.6): mostrar qué da cada logro
   (llaves/dinero) y el estado reclamado/pendiente.
6. Cada vista nueva con sus **4 estados** (cargando/vacío/error/datos). Registrá las pestañas nuevas
   (INDEX) en el `UIManager`/tabbar.

## Lo que NO debés hacer
- No reimplementar economía ni odds; todo dato numérico viene del engine.
- No hacer el pulido visual fino (Agente 8) — dejá los componentes funcionales y limpios con los
  tokens existentes. No fijar balance (Agente 9).
- No tocar `packages/engine` (si falta un dato, pedilo en el HANDOFF, no lo calcules en la UI).

## Definition of Done
- [ ] INDEX por contenedor con ocultas/reveladas + %, precio, cantidad.
- [ ] Pantalla de inicio funcional; el juego arranca ahí y "Jugar" entra al escarbado.
- [ ] Árbol de prestigio con nodos conectados por `requires`, simétrico, con bloqueo por prerrequisito.
- [ ] Suerte recomendada visible en la Tienda; recompensa visible en Logros.
- [ ] Vistas nuevas con 4 estados; `npm test` y `npm run test:e2e` verdes.

## Handoff
Rama `fase/7-ui-nuevas`, PR a `main`. En `agentes/HANDOFF.md`: listá las vistas nuevas y qué clases
quedaron esperando el re-anclaje visual del Agente 8.
