# Design System — حسابداری شخصی

> Generated from ui-ux-pro-max skill (Personal Finance Tracker profile)

## Product Profile

| Field | Value |
|-------|-------|
| **Type** | Personal Finance Tracker |
| **Pattern** | Interactive Product Demo + Financial Dashboard |
| **Style** | Minimalism & Swiss Style + Flat Design (with glassmorphism accents) |
| **Audience** | Persian-speaking users managing personal finances via mobile PWA |

## Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary | `#0f766e` | `#2dd4bf` | CTAs, nav active, links |
| Income | `#16a34a` | `#4ade80` | Revenue, positive balance |
| Expense | `#dc2626` | `#f87171` | Costs, negative balance |
| Background | `#f0fdfa` | `#0c1a19` | Page background |
| Surface | `#ffffff` | `#152a28` | Cards, modals |
| Text | `#134e4a` | `#ecfdf5` | Body text |
| Text Muted | `#5f8a85` | `#7aab9f` | Secondary labels |

## Typography

- **Font**: Vazirmatn (Persian-optimized, RTL)
- **Hierarchy**: 800 weight for page titles, 700 for card titles, 600 for labels, 400 for body
- **Numbers**: `font-variant-numeric: tabular-nums` on all monetary values

## Spacing & Layout

- Max app width: 480px (mobile-first PWA)
- Card padding: 1.25rem
- Section gap: 0.75rem
- Touch target minimum: 44px (`--touch-min: 2.75rem`)

## Effects

- Border radius: 14px (cards), 10px (inputs/buttons)
- Shadows: teal-tinted, subtle depth
- Nav: backdrop-filter blur (glassmorphism)
- Animations: 150–400ms, respect `prefers-reduced-motion`

## Anti-Patterns (Avoid)

- Pure white backgrounds in dark mode
- Hardcoded hex colors instead of CSS variables
- Emoji as structural icons
- Missing focus-visible states on interactive elements
- Touch targets below 44px
- Color-only status indicators (always pair with text/icon)

## Pre-Delivery Checklist

- [x] SVG icons (AppIcon), no emoji icons
- [x] cursor-pointer on clickable elements
- [x] Focus states visible for keyboard nav
- [x] prefers-reduced-motion respected
- [x] Light/dark mode token parity
- [x] Responsive at 375px, 768px, 1024px
- [x] Text contrast ≥ 4.5:1 in light mode
