---
name: Synthex Pro
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#c4c7cc'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#8d9196'
  outline-variant: '#43474c'
  surface-tint: '#b6c8de'
  primary: '#b6c8de'
  on-primary: '#203242'
  primary-container: '#4a5c6e'
  on-primary-container: '#c1d4e9'
  inverse-primary: '#4e6072'
  secondary: '#c1c7d0'
  on-secondary: '#2a3138'
  secondary-container: '#434a51'
  on-secondary-container: '#b2b9c2'
  tertiary: '#e6bfa0'
  on-tertiary: '#432b15'
  tertiary-container: '#71543b'
  on-tertiary-container: '#f2caab'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d1e5fa'
  primary-fixed-dim: '#b6c8de'
  on-primary-fixed: '#091d2d'
  on-primary-fixed-variant: '#37495a'
  secondary-fixed: '#dde3ec'
  secondary-fixed-dim: '#c1c7d0'
  on-secondary-fixed: '#161c23'
  on-secondary-fixed-variant: '#41474f'
  tertiary-fixed: '#ffdcc1'
  tertiary-fixed-dim: '#e6bfa0'
  on-tertiary-fixed: '#2b1704'
  on-tertiary-fixed-variant: '#5c412a'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
  surface-base: '#0B0B0C'
  surface-raised: '#1A1A1C'
  surface-border: '#2A2A2D'
  text-muted: '#6B6B70'
  text-default: '#F7F7F6'
  text-bright: '#C9C9CC'
  status-success: '#4C7A5E'
  status-error: '#8C4A45'
  status-warning: '#8C6E3E'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  mono-value:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

Synthex Pro is engineered as a professional, studio-grade AI video generation workspace. The design narrative rejects consumer-facing novelty in favor of authoritative precision, drawing direct inspiration from industry-standard creative software like DaVinci Resolve, Figma, and Linear. 

- **Target Audience:** Solo creators, enterprise marketing teams, and professional production studios requiring rigorous control, consistency, and auditable pipelines.
- **Emotional Response:** Trust, calm focus, technical reliability, and absolute creative control. The interface serves as a quiet canvas that lets media assets command total attention.
- **Visual Style:** A disciplined, dark-mode-first aesthetic utilizing heavy structural grays, a single restrained blue-gray accent, and zero decorative elements. Emojis are strictly banned across all surfaces, copy, and notifications.

## Colors

The color system is strictly neutral and disciplined, avoiding all bright or saturated hues. 

- **Primary Accent (`#4A5C6E`):** A single restrained, desaturated blue-gray reserved exclusively for primary actions, active states, and critical focus indicators.
- **Surfaces:** Built on a foundation of near-black (`#0B0B0C`) for the base canvas, stepped upward through structural grays (`#1A1A1C`, `#2A2A2D`) to define panels, rails, and floating elements.
- **Typography & Borders:** High-legibility near-white (`#F7F7F6`) and bright grays (`#C9C9CC`) for primary text, paired with deep muted grays (`#6B6B70`) for secondary metadata.
- **Status Colors:** Muted and desaturated (`#4C7A5E` for success, `#8C4A45` for error, `#8C6E3E` for warning) to maintain visual calm during system alerts.

## Typography

Typography balances clean grotesque sans-serif legibility for interface controls with precise monospace styling for technical telemetry.

- **UI Font:** Inter is utilized across all headings, body copy, and UI controls for a neutral, highly scannable hierarchy.
- **Technical Font:** JetBrains Mono is strictly enforced for seed numbers, resolution tiers, timestamps, model IDs, and code parameters.
- **Scale:** Type scales are tightly constrained to maintain dense, studio-grade information architecture without unnecessary vertical sprawl.

## Layout & Spacing

The layout adopts a professional creative-tool paradigm optimized for complex, multi-pane workflows.

- **Layout Model:** Fixed multi-panel workstation grid featuring a persistent left navigation rail, a dominant center canvas for video/image preview, a collapsible right inspector panel for cinematic parameters, and a bottom timeline/storyboard strip.
- **Spacing Rhythm:** Built on a predictable 4px/8px baseline grid using tight component padding (`space-xs` to `space-md`) to maximize viewport allocation for media assets.
- **Responsive Behavior:** Designed desktop-first. Panel widths scale fluidly, with collapsible side drawers maintaining workspace utility on constrained displays.

## Elevation & Depth

Visual hierarchy relies on structural containment rather than heavy drop shadows or skeuomorphic embellishments.

- **Surface Tiers:** Depth is communicated strictly through tonal layering. The base canvas (`#0B0B0C`) rests below raised panel surfaces (`#1A1A1C`) and floating popovers/modals (`#2A2A2D`).
- **Low-Contrast Outlines:** Panels and interactive containers are separated by crisp, low-contrast ghost borders (`#2A2A2D`) rather than shadows. 
- **Focus States:** Active elements utilize sharp 1px rings in the muted blue-gray accent (`#4A5C6E`) to clearly denote interactive focus without visual noise.

## Shapes

The shape language reflects industrial software precision.

- **Corner Radii:** Soft architectural geometry (`roundedness` level 1). Base elements, cards, and inputs utilize crisp 0.25rem corner radii (`4px`), scaling up to 0.5rem (`8px`) for major panels and containers.
- **Pills & Badges:** Strictly reserved for status tags, version chips, and credit counters. Fully rounded pill shapes are avoided for structural buttons to maintain a sharp, utilitarian aesthetic.

## Components

Components are engineered for density, speed, and absolute clarity.

- **Buttons:** Available in primary (accent fill `#4A5C6E` with high-contrast text), secondary (raised surface with subtle border), and ghost variants. Hover states feature immediate 150ms tonal shifts without bounce or scale effects. Zero icons with embedded emojis.
- **Input Fields:** Built with dark neutral backgrounds (`#1A1A1C`), subtle structural borders, and monospaced variants when capturing technical parameters (seeds, prompts, dimensions).
- **Chips & Badges:** Used for model identifiers, tags, and status indicators, rendered in muted colorways with JetBrains Mono text.
- **Checkboxes & Radios:** Minimalist square and circular indicators utilizing the accent color exclusively for selected states.
- **Cards & Asset Containers:** Enclose generated video/image previews with integrated metadata footers, hover action overlays, and explicit version numbering badges.
- **Timeline & Storyboard Strips:** Bespoke horizontal shot cards featuring keyframe thumbnail previews, duration indicators, and drag handles styled with single-weight line icons.