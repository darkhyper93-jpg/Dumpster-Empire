---
name: Scritchy Empire
colors:
  surface: '#191208'
  surface-dim: '#191208'
  surface-bright: '#41382b'
  surface-container-lowest: '#130d04'
  surface-container-low: '#221a0f'
  surface-container: '#261e13'
  surface-container-high: '#31291c'
  surface-container-highest: '#3c3427'
  on-surface: '#efe0cd'
  on-surface-variant: '#d4c3b8'
  inverse-surface: '#efe0cd'
  inverse-on-surface: '#372f22'
  outline: '#9d8e84'
  outline-variant: '#50453c'
  surface-tint: '#f0bc92'
  primary: '#f0bc92'
  on-primary: '#48290a'
  primary-container: '#5d3a1a'
  on-primary-container: '#d6a47c'
  inverse-primary: '#7d5633'
  secondary: '#78dc77'
  on-secondary: '#00390a'
  secondary-container: '#00761f'
  on-secondary-container: '#95fb92'
  tertiary: '#ffb870'
  on-tertiary: '#4a2800'
  tertiary-container: '#633800'
  on-tertiary-container: '#fc9600'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc2'
  primary-fixed-dim: '#f0bc92'
  on-primary-fixed: '#2e1500'
  on-primary-fixed-variant: '#623f1e'
  secondary-fixed: '#94f990'
  secondary-fixed-dim: '#78dc77'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005313'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#ffb870'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#191208'
  on-background: '#efe0cd'
  surface-variant: '#3c3427'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  container-max: 1200px
---

## Brand & Style

This design system reimagines the "Dumpster Empire" universe through a warm, handcrafted, and tactile lens. The brand personality shifts from industrial grit to a "toy-box" aesthetic—playful, approachable, and highly physical. It targets players who enjoy the satisfying loops of management games but crave a cozy, tangible atmosphere.

The visual style is a blend of **Tactile Neomorphism** and **Playful Brutalism**. UI elements should feel like physical objects resting on a wooden surface: thick, squishy, and reactive. We replace sterile digital surfaces with rich cardstock textures, subtle wood grains, and "hand-drawn" imperfections that evoke the feeling of a tabletop game. The goal is an emotional response of comfort, curiosity, and tactile satisfaction.

## Colors

The palette is anchored by **Deep Chocolate Browns** (`#5D3A1A`) and **Rich Mahoganies**, used primarily for background layers to create a "wooden desk" environment. 

Interactive elements utilize a high-energy secondary palette:
- **Vibrant Greens:** Used for "Go," purchase, and positive growth actions.
- **Warm Oranges & Yellows:** Reserved for highlights, currency, and rare upgrades.
- **Soft Creams:** Used for text and card backgrounds to maintain readability against the dark wood tones.

Avoid pure blacks or cold grays. All neutrals should have a warm, yellow or red undertone to reinforce the "scritchy scratchy" warmth.

## Typography

We use **Plus Jakarta Sans** for its friendly, rounded terminals and exceptional legibility. The type scale is generous, prioritizing "chunkiness" over density.

- **Headlines:** Use Bold or ExtraBold weights with tight letter spacing to create a high-impact, physical feel.
- **Body:** Use Medium weights to ensure text holds up against textured backgrounds.
- **Labels:** Always use Bold or SemiBold to ensure small UI instructions feel like "printed" labels on a toy.

All text should avoid #000000; instead, use a very dark brown or the background's darkest shade to maintain the organic look.

## Layout & Spacing

The layout follows a **Fixed Grid** model that mimics a physical tabletop. Elements are treated as "objects" placed on the board rather than digital rows.

- **The Desk (Container):** The main gameplay area is centered with a fixed aspect ratio, surrounded by a "wooden" margin.
- **The Sidebar (Toolbox):** Inventories and upgrade menus slide in from the edges, styled like wooden drawers or clipboards.
- **Spacing Rhythm:** Use a base unit of 8px. Gutters between cards and buttons should be wide (minimum 16px) to allow the "depth shadows" to breathe without overlapping.

## Elevation & Depth

Hierarchy is defined through **Physical Displacement**. We move away from flat design into a world of "3D-lite" layers:

- **Deep Shadows:** Every interactive button and card features a solid, 4px to 8px "drop" shadow (the same color as the dark brown background but at a higher opacity).
- **Pressed State:** When an element is clicked, its shadow disappears and the element moves down 4px, creating a "squishy" tactile feel.
- **Cardstock Layers:** Background panels use subtle inner shadows and a "grain" texture to appear like thick cardstock or plywood.
- **Hand-Drawn Outlines:** Use thick (2px - 4px) borders with slightly irregular corners to mimic the imperfection of handcrafted items.

## Shapes

The shape language is dominated by high-radius corners and organic curves. 

- **Primary UI:** Use the `Rounded` (0.5rem) setting for standard cards and containers.
- **Interactive Elements:** Buttons and "Scratchers" use `rounded-xl` or `rounded-full` (pill-shaped) to make them look inviting and "squishy."
- **Textures:** Apply a 5-10% opacity noise or "wood grain" overlay to all large surfaces to break up digital flat colors.

## Components

### Buttons & Interactors
- **Squishy Buttons:** Large, brightly colored (Green/Orange) with a thick bottom border that serves as a 3D shadow. Use `headline-md` for button text.
- **Scratch Cards:** Rectangular containers with a distinctive "torn edge" mask and a contrasting color fill.

### Lists & Inventories
- **Upgrade Slots:** Styled like physical recessed pockets. Each item is a card that "pops out" slightly when hovered.
- **Progress Bars:** Designed to look like liquid filling a glass tube or a physical wooden slider.

### Data & Inputs
- **Value Displays:** Currencies are housed in "bubble" containers with a slight inner glow to look like gems or marbles.
- **Checkboxes:** Styled as physical toggle switches or "stamped" marks on paper.

### Cards
- **The Clipboard:** A primary container for settings or high-level stats, featuring a "metal clip" graphic at the top and a parchment-style background texture.