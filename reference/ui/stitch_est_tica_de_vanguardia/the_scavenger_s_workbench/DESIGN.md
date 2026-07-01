---
name: The Scavenger's Workbench
colors:
  surface: '#121416'
  surface-dim: '#121416'
  surface-bright: '#37393b'
  surface-container-lowest: '#0c0e10'
  surface-container-low: '#1a1c1e'
  surface-container: '#1e2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#333537'
  on-surface: '#e2e2e5'
  on-surface-variant: '#dbc2ad'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3133'
  outline: '#a38d7a'
  outline-variant: '#554434'
  surface-tint: '#ffb870'
  primary: '#ffc081'
  on-primary: '#4a2800'
  primary-container: '#ff9800'
  on-primary-container: '#653900'
  inverse-primary: '#8b5000'
  secondary: '#9ed75b'
  on-secondary: '#1e3700'
  secondary-container: '#4b7d00'
  on-secondary-container: '#dfffb6'
  tertiary: '#a9cfff'
  on-tertiary: '#003258'
  tertiary-container: '#70b5ff'
  on-tertiary-container: '#004677'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcbe'
  primary-fixed-dim: '#ffb870'
  on-primary-fixed: '#2c1600'
  on-primary-fixed-variant: '#693c00'
  secondary-fixed: '#b9f474'
  secondary-fixed-dim: '#9ed75b'
  on-secondary-fixed: '#0f2000'
  on-secondary-fixed-variant: '#2e4f00'
  tertiary-fixed: '#d1e4ff'
  tertiary-fixed-dim: '#9ecaff'
  on-tertiary-fixed: '#001d36'
  on-tertiary-fixed-variant: '#00497d'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
typography:
  display-count:
    fontFamily: Fredoka
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Fredoka
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Fredoka
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  label-bold:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.4'
  body-main:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  code-status:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  panel-padding: 24px
  stack-gap: 12px
---

## Brand & Style
The design system embodies the gritty, mechanical energy of an industrial recycling empire. It is built to feel like a physical tabletop machine—solid, heavy, and reactive. The target audience seeks a tactile "clicky" experience where digital interactions mimic the satisfying weight of physical switches and metal plates.

The design style is **Skeuomorphic Industrial**. It prioritizes high-fidelity textures, physical depth, and mechanical metaphors. Surfaces should feel like weathered HDPE plastic or cold-rolled steel, utilizing deep inner shadows to create "recessed" bays for data and extruded, high-gloss buttons for interaction. Every element must look like it was bolted onto a heavy-duty workbench.

## Colors
The palette is grounded in the dark, oily tones of a workshop floor, punctuated by high-visibility safety colors.

- **Base Surfaces:** Use `#1A1C1E` (Deep Charcoal) for the main workbench background. Apply a secondary Slate tone for raised panels to create structural hierarchy.
- **Hazard Orange (#FF9800):** Reserved for primary actions, warnings, and critical machine states. It represents heat, power, and movement.
- **Industrial Green (#8BC34A):** Used for "Operational" status, automation indicators, and "Profit" metrics. It signifies a cleared queue or a functional machine.
- **Accent Tints:** Use low-opacity versions of these colors for "internal glows" within glass tubes or LED status strips.

## Typography
Typography reflects a mix of consumer-grade durability and technical precision.

- **Numbers & Headlines:** Use **Fredoka** for all numeric values and major headings. Its rounded, chunky profile mimics molded plastic numbers found on industrial equipment.
- **UI Labels & Navigation:** Use **Hanken Grotesk** for readability. It provides a clean, modern contrast to the heavy textures of the workbench.
- **Technical Readouts:** Use **JetBrains Mono** for status codes, small labels, and automation logs to reinforce the "machine-interface" aesthetic.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy, behaving like a modular console with set bays. Elements are "slotted" into the workbench.

- **The Workbench Grid:** A 12-column grid on desktop, collapsing to a single-column vertical "stack" on mobile. 
- **The "Bay" System:** Group related controls into panels with thick (2px - 4px) borders. Use heavy gutters (16px+) to emphasize that each component is a separate piece of hardware.
- **Padding:** Maintain generous internal padding (24px) within panels to ensure the "heavy industrial" look doesn't feel cluttered or cramped.

## Elevation & Depth
Depth is the primary driver of the visual hierarchy in this design system. 

- **Recessed Areas (Inner Shadows):** All "data display" areas and input fields must appear sunken into the surface using deep, sharp inner shadows. This mimics a cutout in a metal dash.
- **Extruded Elements (Outer Shadows):** Buttons and active cards must appear "raised" off the surface. Use a dual-shadow approach: a dark, sharp shadow on the bottom-right and a subtle, light-colored "specular highlight" on the top-left edge to suggest a physical 3D form.
- **Metallic Frames:** Use a 2px solid border with a subtle linear gradient (Top-Left: #555 to Bottom-Right: #222) to create a "beveled metal" edge for cards and containers.

## Shapes
Shapes are functional and rigid. We avoid excessive roundness to maintain the "heavy machinery" feel.

- **Base Corner Radius:** Use a "Soft" (0.25rem) radius for most metal panels.
- **Circular Components:** Large circular buttons are permitted for "Emergency Stop" or "Main Action" triggers to mimic physical industrial plungers.
- **Beveling:** Instead of soft blurs, use hard 45-degree chamfers where possible in the graphic assets to reinforce the "milled metal" aesthetic.

## Components
Consistent styling for the "Workbench" interface:

- **Buttons:** Styled as plastic rocker switches or metal plungers. They should "depress" (move 2px down, lose shadow) when clicked. Hazard Orange is used for the "Press" state.
- **Cards:** Each card has a "Metallic Frame" (beveled border). The background should have a subtle "worn workshop mat" texture overlay at 5% opacity.
- **Progress Bars:** Designed as glass liquid tubes. Use a glowing gradient fill (Industrial Green) with a "specular highlight" white line running horizontally across the center to simulate glass reflection.
- **Status Lights:** Small circular LEDs. Use a "glow" (outer shadow with color) when active and a dark, "off" plastic look when inactive.
- **Input Fields:** Deeply recessed bays with a monospaced font. The cursor should be a solid block, mimicking a retro industrial computer terminal.
- **Automation Strips:** Long, thin bars that look like LED strips, flickering or pulsing when a process is running.