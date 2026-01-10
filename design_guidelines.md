# Email Inbox Management Application - Design Guidelines

## Design Approach
**Reference-Based:** Inspired by Hey.com and Superhuman - modern, minimalist black interface email clients with exceptional UX and AI integration.

## Color System
- **Primary Black:** #000000 (pure black)
- **Secondary Dark:** #1A1A1A (dark grey surfaces)
- **Background:** #0D0D0D (near black base)
- **Text:** #FFFFFF (white, high contrast)
- **Accent Blue:** #3B82F6 (CTAs, highlights, AI indicators)
- **Hover State:** #262626 (lighter black)
- **Gradients:** Subtle gradients for depth and modern feel

## Typography
- **Font Families:** Inter or SF Pro Display (system fallback)
- **Hierarchy:** 
  - Email subjects: 16-18px semibold
  - Sender names: 14px medium
  - Preview text: 14px regular, 70% opacity
  - Body text: 15px regular
  - UI labels: 13px medium

## Layout System
**Spacing:** Tailwind units of 4, 5, 6, 8 (p-4, p-5, p-6, p-8) for consistent rhythm and generous whitespace

**Structure:**
- Single-column email list (primary view)
- Split-view: List (40%) + Email detail (60%) on wider screens
- Card-based email previews with subtle borders or dividers
- Spacious padding (20px+ between elements)

## Core Components

### Navigation Sidebar
- Narrow left rail (240px)
- Inbox, Drafts, Sent, AI Suggestions sections
- Minimal icons with labels
- Active state: accent blue with subtle background

### Email List View
- Card-based items with hover states (#262626)
- Each card displays: Sender (bold), Subject (semibold), Preview (muted), Timestamp
- Unread indicator: accent blue dot
- Divider lines: subtle grey (#1A1A1A)
- Selection state: blue left border accent

### Email Detail Pane
- Clean header: Sender info, timestamp, actions (reply, archive)
- Thread indicator for conversations
- White text on black background for optimal readability
- AI-drafted reply section: distinct card with blue accent border

### AI Draft Reply Component
- Prominent placement below email content
- Editable text area with syntax highlighting
- Action buttons: "Send AI Draft" (primary blue), "Edit Draft", "Regenerate"
- Confidence indicator: subtle badge showing AI certainty

### Action Buttons
- Primary: Blue (#3B82F6) background, white text, rounded corners
- Secondary: Transparent with blue border
- Ghost: White text, hover to #262626 background

## Interactions
- Smooth transitions (150-200ms) for hover states
- Keyboard shortcuts prominently displayed
- Focus states: blue outline for accessibility
- Minimal animation - prioritize speed and clarity

## Visual Treatments
- High contrast white-on-black throughout
- Subtle shadows for depth on cards (rgba(255,255,255,0.05))
- No hero image needed - utility-focused application
- Gradient accents sparingly for modern polish

## Responsive Behavior
- Mobile: Single column, stacked views with slide-in detail
- Tablet: Collapsible sidebar, adjusted split ratios
- Desktop: Full three-pane layout (sidebar + list + detail)