---
name: Industrial Scavenger
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
  on-surface-variant: '#c2c9b4'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3133'
  outline: '#8c9380'
  outline-variant: '#424939'
  surface-tint: '#9ed75b'
  primary: '#a5df63'
  on-primary: '#1e3700'
  primary-container: '#8bc34a'
  on-primary-container: '#2d4e00'
  inverse-primary: '#3e6a00'
  secondary: '#ffd799'
  on-secondary: '#432c00'
  secondary-container: '#feb300'
  on-secondary-container: '#6a4800'
  tertiary: '#ffbae6'
  on-tertiary: '#5f0050'
  tertiary-container: '#ff8bde'
  on-tertiary-container: '#7c1968'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b9f474'
  primary-fixed-dim: '#9ed75b'
  on-primary-fixed: '#0f2000'
  on-primary-fixed-variant: '#2e4f00'
  secondary-fixed: '#ffdeac'
  secondary-fixed-dim: '#ffba38'
  on-secondary-fixed: '#281900'
  on-secondary-fixed-variant: '#604100'
  tertiary-fixed: '#ffd7ee'
  tertiary-fixed-dim: '#ffade4'
  on-tertiary-fixed: '#3a0030'
  on-tertiary-fixed-variant: '#7e1b6a'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
  charcoal-surface: '#2A2D31'
  electric-blue: '#00E5FF'
  rarity-purple: '#D066FF'
  hazard-stripe: '#FFD600'
  scrap-gray: '#969696'
typography:
  display-xl:
    fontFamily: Rubik
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Rubik
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Rubik
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
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
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1200px
---

## Brand & Style

The design system is built on a narrative of "Industrial Chic." It transforms the grit of a recycling yard into a high-end, professional enterprise interface. The target audience is players of idle and incremental games who appreciate mechanical precision and satisfying tactile feedback. 

The aesthetic is a hybrid of **Minimalism** and **Tactile/Skeuomorphic** elements. While the layouts remain clean and structured to handle complex data, the UI components themselves feature depth, simulated metallic textures, and "squishy" physical properties. The goal is to evoke a sense of efficient productivity—making the act of virtual scavenging feel like operating a billion-dollar green-energy plant. Visuals should be high-contrast, professional, and mechanically responsive.

## Colors

The palette is anchored by a deep **Dark Slate (#1A1C1E)** background to emphasize the industrial setting. The **Primary Industrial Green (#8BC34A)** is used for success states, active machinery, and growth, while **Industrial Amber (#FFB300)** acts as a secondary color for warnings, upgrades, and high-value currency.

Accent colors are reserved strictly for rarity and high-tier highlights. **Electric Blue** represents common tech scrap, **Purple** denotes rare recyclables, and **Gold** is reserved for legendary artifacts. To maintain the professional recycling plant aesthetic, use "Hazard Stripe" yellows sparingly for critical calls to action. The neutral palette relies on varying shades of charcoal and metallic grays to create depth without clutter.

## Typography

Typography balances the friendly, rounded nature of casual games with the technical precision of industrial equipment. 

- **Rubik** is used for large numbers and primary headers. Its soft corners provide the "modern rounded" feel requested, ensuring even massive currency counts (e.g., "1.42B") feel approachable and readable.
- **Hanken Grotesk** serves as the primary body font, offering a clean, professional Swiss-style legibility for descriptions and stats.
- **JetBrains Mono** is utilized for technical readouts, quantities, and "machine-code" labels, reinforcing the mechanical, automated vibe of the recycling plant.

All large display text should utilize tight letter-spacing to feel impactful and "heavy," like stamped metal.

## Layout & Spacing

The layout follows a **Fixed Grid** model within a flexible container. A 12-column system is used for desktop, collapsing to 4 columns on mobile. The spacing rhythm is strictly based on a **4px base unit**, ensuring that all elements align with mechanical precision.

Layout components should feel like "modules" or "control panels." Use wider gutters (24px) between major functional areas (e.g., between the Scrapyard view and the Upgrade sidebar) to simulate physical distance between different plant sectors. Margins are generous to prevent the UI from feeling cluttered despite the gritty subject matter. On mobile, the UI shifts to a bottom-heavy "thumb-friendly" layout where the most frequent interactions are placed within easy reach.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. Surfaces are not just flat colors; they are stacked tiers of charcoal. 

- **Base Level:** The background is the darkest slate.
- **Mid Level (Containers):** Cards and panels use a slightly lighter charcoal with a subtle inner-glow on the top edge to simulate a "beveled metal" look.
- **Top Level (Buttons/Modals):** These use high-contrast shadows. Buttons should have a 3D "extruded" effect using a darker bottom border (2-4px) rather than a soft shadow, making them look like physical industrial switches.

Rare items and "glowing" icons use backdrop blurs and colored outer-glows (bloom) that correspond to their rarity color, making them pop against the dark, matte surfaces.

## Shapes

The shape language is "Rounded-Industrial." While sharp corners feel too aggressive, a medium-radius (**roundedness: 2**) provides a professional, manufactured feel—reminiscent of molded plastic or machined metal parts. 

Progress bars and status indicators should use the **Pill-shaped (3)** setting for a "liquid or gas gauge" appearance. Interactive containers and scrap cards use the standard **0.5rem** radius, but with high-contrast borders (1px) in a slightly lighter gray to define their edges against the dark background.

## Components

### Buttons
Buttons must feel tactile. Use a "pressable" state where the element physically shifts 2px downward on click. The primary button uses the **Industrial Green** with a black label for maximum contrast. Secondary buttons are outlined with a thick 2px stroke.

### Industrial Gauges (Progress Bars)
Instead of standard flat bars, gauges should have a "recessed" track (inner shadow). The fill should have a subtle diagonal stripe pattern (hazard stripes) and a glow at the leading edge to simulate a glowing LED or pressurized fluid.

### Scrap Cards
Cards representing scavenged items should feature a subtle "worn metal" texture overlay at 5-10% opacity. Headers on cards should use the **JetBrains Mono** font to look like serial numbers or technical specs.

### Input Fields & Checkboxes
Input fields are "inset" into the UI. Checkboxes are designed as "toggle switches" or "heavy-duty rockers." When active, they emit a small green glow as if a pilot light has been engaged.

### Rare Icons
Any icon for a high-rarity item must have a "Bloom" effect. This is achieved by a layered shadow: one tight, high-opacity shadow of the rarity color, and one broad, low-opacity shadow to create a soft environmental glow.