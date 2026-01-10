# MailFlow - Design Guidelines

## Design Approach
**Futuristic Minimalist:** Ultra-clean, smooth interfaces with subtle depth, refined animations, and a focus on content clarity. Inspired by modern email clients with emphasis on simplicity and elegance.

## Color System
- **Background:** #0D0D0D (near black base)
- **Surface:** Subtle elevated surfaces with rgba overlays
- **Text Primary:** #FAFAFA (high contrast white)
- **Text Secondary:** #A3A3A3 (muted grey)
- **Accent:** #3B82F6 (electric blue for highlights)
- **Borders:** Very subtle, using rgba(255,255,255, 0.08) to 0.12

## Typography
- **Font Family:** Inter with system fallbacks
- **Tracking:** Tight letter-spacing for modern feel
- **Weights:** 
  - Regular (400) for body
  - Medium (500) for emphasis
  - Semibold (600) for headers
- **Sizes:** Restrained hierarchy (13-20px range)

## Layout Principles
- **Generous Whitespace:** Ample padding and margins for breathing room
- **Rounded Corners:** Larger radii (xl: 12px) for softer, modern feel
- **Borders:** Ultra-subtle or replaced with background color shifts
- **Split View:** Email list (400px) + Detail pane (fluid)

## Core Components

### Sidebar
- Clean navigation with icon + label
- Active state: Primary color with subtle background
- Hover states: Smooth background transitions
- Compose button: Full-width, rounded, prominent

### Email List
- Card-like items with generous padding
- Selected state: Primary tint with ring outline
- Hover: Subtle background elevation
- Avatar with ring accent
- Unread indicator: Subtle blue dot

### Email Detail
- Centered content with max-width constraint
- Clean header with action buttons
- Body text with comfortable line-height (1.75)
- Action buttons grouped at bottom

## Interactions
- **Transitions:** 200ms ease-out for smoothness
- **Hover States:** Subtle background shifts
- **Focus States:** Blue ring for accessibility
- **Loading:** Skeleton states with soft animation

## Visual Treatments
- No harsh shadows
- Gradient accents for depth (from-primary to-primary/70)
- Backdrop blur for floating elements
- Ring borders instead of solid borders for selected states
