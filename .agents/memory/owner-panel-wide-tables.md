---
name: Owner panel wide tables hide right-edge actions on desktop
description: Why row actions (e.g. Manage Credits) can be invisible/unreachable on desktop in the owner panel
---

The owner panel renders data tables (Users, Feedback, Activity logs, etc.) inside
the shadcn `ScrollArea` (`client/src/components/ui/scroll-area.tsx`). That component
only renders a **vertical** `<ScrollBar />` — there is no horizontal scrollbar.

Wide tables (the Users table has ~7 columns) overflow horizontally, and because the
owner panel also has a left sidebar eating width, the rightmost **Actions** column
(which holds row actions like the Coins "Manage credits" button) gets pushed
off-screen with no visible way to scroll to it. To a user this looks like "there is
no button / no column at all" — not "cut off", because there is no scrollbar hinting
that more exists to the right.

**Fix pattern:** for any owner-panel table whose right-edge actions must stay
reachable, replace the `ScrollArea` wrapper with a native
`<div className="max-h-[...] overflow-auto ...">` (real horizontal scrollbar appears
when needed) AND pin the actions column with `sticky right-0 bg-card` + a left shadow
(`shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.3)]`) plus `z-10` on body cells / `z-20` on
the header cell so the action stays visible without scrolling.

**Why:** the action existed in code and in production the whole time; the bug was
pure horizontal-overflow visibility, not a missing feature or undeployed code.

**How to apply:** when a user says an owner-panel row action is "missing" on desktop
but present on mobile (mobile uses a separate card layout), suspect the wide-table
overflow before assuming the control is absent.
