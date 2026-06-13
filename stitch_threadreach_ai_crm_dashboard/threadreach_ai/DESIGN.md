---
name: ThreadReach AI
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The brand personality is professional, precise, and AI-native, specifically tailored for the fast-paced D2C fashion industry. It balances the technical sophistication of a modern CRM with the aesthetic sensibilities of a high-end fashion house.

The design style is **Minimalist and Systematic**, heavily influenced by modern developer-centric tools. It prioritizes clarity and density through a "UI-as-a-Utility" approach. Key visual characteristics include:
- **Precision Engineering:** Every element sits on a strict grid with 1px hairline borders.
- **Monochrome Foundation:** A dominant grayscale palette allows fashion product imagery and data visualizations to take center stage.
- **Subtle Motion:** Micro-interactions and hover states are snappy (150ms) to reinforce a sense of performance and reliability.

## Colors
The color strategy employs a "Low Ink" philosophy to minimize visual noise. 

- **Canvas:** The primary background is #FFFFFF for clarity, with #FAFAFA used for structural offsets like sidebars or secondary containers.
- **Accents:** Slate (#0F172A) serves as the primary action color for high-contrast elements. Indigo (#6366F1) is used sparingly as a functional accent for AI-driven insights, active states, or primary notifications.
- **Borders:** A consistent #E5E7EB border is used for all structural partitioning, ensuring a crisp, "technical" feel without the weight of shadows.

## Typography
This design system utilizes **Inter** exclusively to maintain a utilitarian and systematic appearance. 

- **Headlines:** Use tighter letter-spacing and heavier weights (600-700) to create a "compact" and authoritative look. 
- **Body:** Standardized at 14px for most CRM data views to maximize information density without sacrificing legibility.
- **Labels:** Small, uppercase labels are used for metadata and category headers to provide clear hierarchy in dense data tables.

## Layout & Spacing
The layout follows a **Fluid-Fixed Hybrid** model. The main navigation and side panels are fixed-width, while the central workspace expands to accommodate data tables and dashboards.

- **Grid:** A 12-column grid is used for dashboard layouts. In detailed CRM views, a modular "panel" system is used where content is grouped into logical 1px-bordered containers.
- **Rhythm:** An 8px base unit drives all padding and margins. 
- **Responsive:** On mobile, sidebars collapse into a bottom navigation or drawer, and 12-column layouts reflow into a single column with 16px horizontal margins.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Low-Contrast Outlines** rather than traditional shadows.

- **Levels:** Level 0 is the white background. Level 1 is a #FAFAFA container. Level 2 is a card with a 1px #E5E7EB border.
- **Shadows:** When necessary (e.g., dropdowns or modals), use a singular, ultra-light "Ambient Shadow": `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`.
- **Hover:** Interactive elements should not lift; instead, they should shift background color slightly (e.g., white to #F9FAFB) or darken the border color.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a subtle "modern-tech" feel while remaining sharp enough to feel professional and architectural.

- **Small Components:** Checkboxes and small tags use the base 4px radius.
- **Large Components:** Cards and modals use `rounded-lg` (8px) to create a distinct container identity.
- **Pills:** Status indicators and specific AI-feature chips use a fully rounded (9999px) "pill" shape to contrast against the otherwise rectangular UI.

## Components
- **Buttons:** Primary buttons are solid Slate (#0F172A) with white text. Secondary buttons are white with a 1px #E5E7EB border and Slate text.
- **Input Fields:** Use 1px #E5E7EB borders, 14px text, and a 4px border-radius. On focus, the border shifts to Indigo (#6366F1) with a subtle 2px glow.
- **Cards:** White backgrounds, 1px border, 8px radius. No shadow by default. Header sections within cards are separated by a 1px horizontal rule.
- **Status Pills:** Small, 11px semi-bold text inside a pill shape. Use low-saturation background tints (e.g., Emerald-50 for "Active", Amber-50 for "Pending").
- **AI Insights:** Components driven by AI should be subtly differentiated with a 1px Indigo border or a very faint Indigo-50 top-to-bottom linear gradient.
- **Data Tables:** Borderless rows with 1px bottom dividers. Use a "Zebra" hover state where the row background changes to #F9FAFB.