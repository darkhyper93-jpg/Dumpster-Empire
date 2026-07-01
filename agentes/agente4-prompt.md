# Agente 4 — Pulido visual (fusión ámbar + Stitch)

## Tu identidad
Sos el **Agente 4**. Le das al juego su **identidad visual final**: base cálida ámbar del prototipo +
rigor de componentes de los mockups Stitch. Trabajás sobre todo en CSS/tokens y en el markup de las vistas.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 5.3** (identidad visual: fusión ámbar+Stitch, sin emojis, tokens centralizados), **sección 5.1** (layout responsive).
2. `CLAUDE.md` — tokens centralizados, cero colores hardcodeados, mobile-first.
3. `DESARROLLO.md` — **sección 6** (mapeo visual fusión), estructura de `apps/game/styles/`.
4. `reference/ui/` — mockups Stitch y `DESIGN.md` (Industrial Scavenger, etc.) como referencia de componentes.
5. `agentes/HANDOFF.md`.

## Precondiciones
El Agente 3 dejó todas las vistas completas con íconos SVG, sonido, partículas y tween funcionando.

## Objetivo de la fase
Identidad visual coherente y pulida, **mobile-first / Steam Deck**, sin ningún valor de diseño suelto.

## Tareas concretas
1. **`styles/tokens.css`**: centralizá TODOS los tokens.
   - Base cálida del prototipo: `--amber #ffb627`, oliva `#86a14a`, fondos `--bg-0..3` cálidos.
   - Colores de rareza (`--r-common` … `--r-future`) con su glow/bloom.
   - Tipografía: **Fredoka** (números/titulares), **Nunito/Hanken Grotesk** (cuerpo), **JetBrains Mono**
     (readouts técnicos/labels). Radios, sombras, espaciado en base 4px.
2. **`styles/components.css`**: componentes Stitch aplicados sobre la base cálida:
   - Botones táctiles **"extruidos"** (borde inferior 2–4px, se hunden 2px al presionar).
   - Gauges/barras **recesados** (inner shadow) con relleno de rayas hazard y glow en el borde de avance.
   - Tarjetas con textura sutil de metal gastado (5–10% opacidad).
   - **Bloom** en íconos de rareza alta (doble sombra de color).
3. **`styles/layout.css`**: grilla responsive **mobile-first**. Verificá 375px (móvil), 1280×800
   (Steam Deck) y 1440px (desktop). Áreas de toque grandes; en desktop el layout se centra con ancho máximo.
4. Aplicá los estilos a cada vista (topbar, escarbado, mejoras rápidas, tienda, automatización, logros,
   prestigio, settings, modales, toasts) para que todo se vea del mismo sistema.
5. Eliminá cualquier color/tipografía hardcodeado suelto: todo referencia a `tokens.css`.

## Lo que NO debés hacer
- No cambiar lógica de juego ni engine.
- No romper mobile-first (no diseñes pensando en desktop primero).
- No reintroducir emojis.
- No agregar frameworks CSS ni un bundler (CSS vanilla).

## Definition of Done
- [ ] Todos los tokens en `tokens.css`; grep de colores/hex sueltos fuera de tokens ≈ 0.
- [ ] Botones extruidos, gauges recesados y bloom de rareza aplicados según §5.3.
- [ ] Tipografía Fredoka/Nunito(Hanken)/JetBrains Mono en su rol correcto.
- [ ] Layout correcto en 375px, 1280×800 (Steam Deck) y 1440px, sin texto desbordado con números grandes.
- [ ] Identidad coherente en todas las vistas.

## Handoff
En `agentes/HANDOFF.md`: capturas/notas de cómo se ve en los 3 anchos, fuentes usadas y su fuente de
licencia (para créditos de Steam), y confirmá al **Agente 5** que la UI está lista para el pase de balance.
