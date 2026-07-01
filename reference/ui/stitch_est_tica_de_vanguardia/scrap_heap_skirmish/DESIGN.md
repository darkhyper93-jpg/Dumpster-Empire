---
name: Dumpster Empire Tactile System
colors:
  surface: '#210e0b'
  surface-dim: '#210e0b'
  surface-bright: '#4c332f'
  surface-container-lowest: '#1b0907'
  surface-container-low: '#2b1613'
  surface-container: '#2f1a17'
  surface-container-high: '#3b2421'
  surface-container-highest: '#472f2b'
  on-surface: '#ffdad4'
  on-surface-variant: '#bbcbbb'
  inverse-surface: '#ffdad4'
  inverse-on-surface: '#422a27'
  outline: '#869486'
  outline-variant: '#3d4a3e'
  surface-tint: '#4ae183'
  primary: '#54e98a'
  on-primary: '#003919'
  primary-container: '#2ecc71'
  on-primary-container: '#005026'
  inverse-primary: '#006d36'
  secondary: '#e4c45e'
  on-secondary: '#3c2f00'
  secondary-container: '#816801'
  on-secondary-container: '#ffebb5'
  tertiary: '#efbdff'
  on-tertiary: '#462056'
  tertiary-container: '#d2a2e2'
  on-tertiary-container: '#5d356d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bfe9c'
  primary-fixed-dim: '#4ae183'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#ffe084'
  secondary-fixed-dim: '#e4c45e'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#f8d8ff'
  tertiary-fixed-dim: '#e7b5f7'
  on-tertiary-fixed: '#2f0740'
  on-tertiary-fixed-variant: '#5e376e'
  background: '#210e0b'
  on-background: '#ffdad4'
  surface-variant: '#472f2b'
  hazard-stripe: '#ebbf01'
  charcoal-surface: '#1b0906'
  on-surface-muted: '#bbcbbb'
  surface-border: '#472f2b'
typography:
  display-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '900'
    lineHeight: 48px
    letterSpacing: -0.04em
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '800'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  data-mono:
    fontFamily: monospace
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  item-gap: 12px
  gutter: 24px
  container-padding: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-offset: 4px
---

## Brand & Style
The brand personality is **gritty, industrial, and hyper-tactile**. It evokes the feeling of a physical "workbench" or a high-end board game set in a dystopian, scavenger-focused world. The aesthetic combines elements of **Skeuomorphism**, **Brutalism**, and **Industrial Design**.

Key visual pillars include:
- **Physicality:** Elements have weight, height (via 4px hard shadows), and physical reactions (pressing down).
- **Industrial Grit:** Usage of "hazard" stripes, charcoal surfaces, and scratch textures that suggest a worn, working environment.
- **Controlled Chaos:** Components appear hand-placed with slight rotations and sticker-like qualities, breaking the rigid grid of traditional UI.
- **Cinematic Lighting:** Deep backgrounds with high-contrast, glowing primary actions.

## Colors
The palette is rooted in a deep "Charcoal/Mahogany" dark mode (`#210e0b`) that mimics a dark wooden or metallic workbench. 

- **Core Palette:** We use high-vibrancy "Fidelity" variants for primary (Neon Green), secondary (Amber/Gold), and tertiary (Soft Purple). These act as glowing highlights against the dark base.
- **Functional Accents:** `hazard-stripe` yellow is used strictly for operational labels and warnings.
- **Surface Strategy:** Surfaces are layered using "Container" roles, moving from the nearly black `surface-container-lowest` to a lighter `surface-bright` for interactive hover states.
- **Text:** Primary data uses high-contrast colors (Green/Gold), while labels use a muted variant to maintain hierarchy.

## Typography
The system uses a two-pronged approach: **Plus Jakarta Sans** for high-impact brand moments and **Be Vietnam Pro** for functional interface text.

- **Brand Voice:** `display-xl` uses tight tracking and heavy weights to create a "stamped" or "engraved" look. 
- **Operational Clarity:** `label-caps` is utilized for navigation and system headers, paired with `hazard-stripe` colors to mimic industrial signage.
- **Technical Feedback:** A `data-mono` font is used sparingly for coordinates, sector IDs, or secondary technical metadata to reinforce the machine aesthetic.

## Layout & Spacing
The layout follows a **Fixed Sidebar** model on desktop and a **Floating Bottom Nav** on mobile, with a central "Stage" for tactile interaction.

- **The Workbench (Stage):** The main content area acts as a physical surface. Elements are often centered or pinned to corners rather than following a strict 12-column grid.
- **Rhythm:** We use an 8px base unit. Most interactive elements have a 12px internal gap.
- **Tactile Offsets:** A critical spacing unit is the `stack-offset` (4px), used for the hard-shadow "lift" and the vertical movement when an object is pressed.

## Elevation & Depth
Elevation is expressed through **Physical Displacement** rather than soft shadows.

- **Hard Shadows:** Interactive elements use a solid 4px shadow (`rgba(0,0,0,0.4)`) with 0 blur. This suggests the element is physically raised above the workbench.
- **The "Press" Interaction:** On `:active` states, elements translate 4px downwards and the shadow is removed, simulating a physical button click.
- **Gradients (Glass Tube):** Use a linear vertical gradient (white-to-transparent-to-black) to simulate the curve of a glass tube or polished plastic on progress bars and buttons.
- **Tonal Stacking:** Sidebars and headers use `surface-container-highest` with heavy borders to define boundaries, rather than subtle blurs.

## Shapes
The shape language is primarily **Rounded Rectangular**, avoiding sharp corners to maintain a "toy-like" or "physical gadget" feel.

- **Containers:** Standard containers use `rounded-xl` (0.75rem to 1.5rem depending on scale) for a soft, friendly hand-feel.
- **Interactive Props:** Smaller buttons and chips use a standard `rounded-lg` (0.5rem).
- **Physical Imperfection:** To enhance the skeuomorphic feel, "sticker" elements should be rotated slightly (+/- 1.5 to 2 degrees) to look hand-placed rather than machine-aligned.

## Components
- **Tactile Buttons:** Must include the 4px hard shadow and `tactile-press` animation. Use high-contrast backgrounds (Primary/Secondary) with "on-color" text for heavy actions.
- **Upgrade Cards:** Should feature a "Glass Tube" progress bar. These containers use `surface-container` and `outline-variant` borders to look like modules.
- **Stickers/Tokens:** Small square components with icons, rotated slightly, representing physical items.
- **Hazard Labels:** Small caps text, high letter-spacing, colored in `hazard-stripe` yellow.
- **Currency Displays:** Pill-shaped `surface-container` elements with thick borders and high-contrast icons.
- **The Bin:** A large circular container with deep inset shadows, acting as the primary interaction focal point.