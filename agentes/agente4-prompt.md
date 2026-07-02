# Agente 4 — Pulido visual (fusión ámbar + Stitch)

## Tu identidad
Sos el **Agente 4**. Le das al juego su **identidad visual final**: base cálida ámbar del prototipo +
rigor de componentes de los mockups Stitch. Trabajás sobre todo en CSS/tokens y en el markup de las vistas.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 5.3** (identidad visual: fusión ámbar+Stitch, sin emojis, tokens centralizados), **sección 5.1** (layout responsive).
2. `CLAUDE.md` — tokens centralizados, cero colores hardcodeados, mobile-first.
3. `DESARROLLO.md` — **sección 6** (mapeo visual fusión), estructura de `apps/game/styles/`.
4. `reference/ui/` — mockups Stitch y `DESIGN.md` (Industrial Scavenger, etc.) como referencia de componentes.
   **Especialmente `dumpster_empire_main_game/code.html`**: el usuario pidió explícitamente conservar
   toda esa estética (no solo el layout de columnas). `DESARROLLO.md` §6 tiene el catálogo elemento
   por elemento; los que te tocan a vos están repetidos en la tarea 6 de abajo.
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
   (Steam Deck) y 1440px (desktop). Áreas de toque grandes.
   - **Mobile (`< md`):** el tabbar inferior que dejó la Fase 2 ya cumple PLAN.md §5.1 — no hace
     falta rehacerlo, solo aplicarle el estilo de botón extruido.
   - **Desktop (`>= md`): NO es "el mismo layout centrado con ancho máximo".** Reconstruí la grilla
     a las **tres columnas** que usa la mayoría de los mockups Stitch (`the_workbench`,
     `refined_scavenge_station`, `tactile_clear`, `clean_scavenge_area`, `scritchy_shop`,
     `container_shop`, `automation_gadgets`, `expanded_prestige_tree`, todos con `reference/ui/`):
     un `<aside>` fijo a la izquierda con la navegación (Tienda/Automatización/Logros/Prestigio/
     Ajustes) que **reemplaza** al tabbar inferior en ese breakpoint, el área de escarbado
     centrada, y un panel de mejoras rápidas a un costado (`tactile_clear` lo pone a ambos lados).
     Pedido explícito del usuario — ver `DESARROLLO.md` §6 ("Layout de escritorio con sidebar") y
     §7 (Fase 4) para el detalle completo antes de tocar `layout.css`.
4. Aplicá los estilos a cada vista (topbar, escarbado, mejoras rápidas, tienda, automatización, logros,
   prestigio, settings, modales, toasts) para que todo se vea del mismo sistema.
5. Eliminá cualquier color/tipografía hardcodeado suelto: todo referencia a `tokens.css`.
6. **Elementos puntuales del mockup `main_game` que te tocan a vos** (ver DESARROLLO.md §6 para el
   detalle completo con clases/valores exactos del mockup):
   - Fondo con grilla industrial sutil en toda la pantalla (líneas del color primario al 5%, celda
     20×20px).
   - Header: dinero/llaves como pastillas redondeadas con ícono + valor (no texto plano), botón de
     ajustes circular.
   - Tarjeta de escarbado con esquinas muy redondeadas, sombra interior + gradiente sutil, y una
     etiqueta flotante tipo pestaña con el nombre del contenedor pegada al borde superior.
   - Texturas superpuestas sobre la zona de escarbado: metal cepillado sutil (7% opacidad) y una
     textura tipo fibra de carbono en la capa de suciedad, en vez de colores planos.
   - Mejoras rápidas como botones extruidos con ícono en círculo de color arriba (no texto plano).
   - Pestaña activa del tabbar con fondo de pastilla + sombra interior "hundida" (efecto presionado);
     las inactivas atenuadas con hover.

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
- [ ] Desktop (`>= md`) usa el layout de sidebar de tres columnas de los mockups Stitch, no el tabbar
      móvil escalado a un ancho mayor.
- [ ] Identidad coherente en todas las vistas.

## Handoff
En `agentes/HANDOFF.md`: capturas/notas de cómo se ve en los 3 anchos, fuentes usadas y su fuente de
licencia (para créditos de Steam), y confirmá al **Agente 5** que la UI está lista para el pase de balance.
