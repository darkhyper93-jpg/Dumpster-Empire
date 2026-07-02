# Agente 8 — Re-anclaje visual a "The Workshop"

## Tu identidad
Sos el **Agente 8**. Re-anclás **todo el diseño visual** al mockup canónico `clean_scavenge_area`
("The Workshop"). Reemplazás la "fusión" de la Fase 4 por este sistema único y coherente.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **§5.3** (identidad "The Workshop") y §5.1/§11.9 (layout y flujo).
2. `reference/ui/stitch_est_tica_de_vanguardia/dumpster_empire_clean_scavenge_area/code.html` — el
   mockup **canónico**. Es la fuente de verdad visual; replicá su sistema.
3. `CLAUDE.md` — tokens centralizados, cero valores sueltos, mobile-first, sin emojis, sin bundler.
4. `DESARROLLO.md` — **§7 Fase 8**, §4 (`apps/game/styles/`).
5. `agentes/HANDOFF.md` — bloques de los Agentes 4 (qué CSS existe) y 7 (vistas nuevas a estilar).

## Precondiciones
Agentes 5–7 cerrados: fixes de UX, mecánicas nuevas y sus vistas (INDEX, inicio, prestigio real) ya existen.

## Objetivo
Que todas las pantallas se vean "The Workshop": inicio, escarbado, tienda, automatización, logros,
prestigio e INDEX, coherentes con el mockup, mobile-first + Steam Deck.

## Tareas concretas
1. **`styles/tokens.css`:** reescribí los tokens según el mockup — fondo `#191208`, superficies de
   madera/banco, acentos ámbar/verde, **Plus Jakarta Sans** (400/500/700/800), radios y sombras del
   mockup. Conservá los 8 tokens de rareza `--r-*` (con su glow/bloom).
2. **`styles/components.css`:** portá los componentes del mockup — `.tactile-card`
   (`box-shadow: 0 8px 0 0 rgba(0,0,0,.4)`, se hunde 4px al `:active`), `.squishy-button`
   (`0 6px 0 0`, easing elástico), `.wood-texture`, `.scratch-surface`, `.torn-edge` (clip-path),
   gauges/barras, pastillas del topbar, bloom de rareza.
3. **`styles/layout.css`:** aplicá el layout del mockup, mobile-first; en desktop/Steam Deck
   horizontal mantené la disposición de columnas coherente con el mockup. No rompas los 375/1280×800/1440.
4. **Aplicar a cada vista** (inicio, escarbado, tienda, automatización, logros, prestigio, INDEX,
   settings, modales, toasts) para que todo sea el mismo sistema. Si hay que ajustar markup, hacelo
   sin cambiar lógica ni ids que la UI usa por `querySelector`.
5. **Fuentes/íconos:** si usás Plus Jakarta Sans y/o Material Symbols vía `<link>`, dejá anotado el
   riesgo de offline para Steam (el Agente 10 tendrá que auto-hospedarlas) y su licencia.
6. Cero valores de diseño sueltos: todo referencia a `tokens.css`.

## Lo que NO debés hacer
- No cambiar lógica de juego, engine, ni ids/estructura que rompan `querySelector` de las vistas.
- No reintroducir emojis. No agregar framework/bundler CSS. No romper mobile-first.
- No fijar balance (Agente 9).

## Definition of Done
- [ ] Todas las pantallas se ven "The Workshop" (fondo, madera, Plus Jakarta Sans, tarjetas táctiles).
- [ ] Tokens centralizados; grep de hex/colores sueltos fuera de `tokens.css` ≈ 0.
- [ ] Layout correcto en 375px, 1280×800 y 1440px, sin texto desbordado con números grandes.
- [ ] `npm test` y `npm run test:e2e` verdes (con capturas a los 3 anchos).

## Handoff
Rama `fase/8-reanclaje-visual`, PR a `main`. En `agentes/HANDOFF.md`: fuentes/íconos usados y su
licencia (para créditos de Steam del Agente 10), y confirmá al Agente 9 que la UI está lista para balance.
