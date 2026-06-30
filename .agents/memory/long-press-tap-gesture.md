---
name: Long-press vs tap gesture
description: Pitfalls when one element serves both a quick tap and a press-and-hold.
---

When a single element distinguishes a quick tap from a press-and-hold (e.g. compose button: tap=compose, hold=campaign wizard in `client/src/hooks/use-long-press.ts`):

- Clearing the long-press timer on move/cancel is NOT enough. The browser still
  dispatches a trailing `click` after pointerup, which fires the tap action and
  causes an accidental compose/navigation.
- **Rule:** track a `cancelledRef` (and a `triggeredRef` for the fired long-press).
  Set the cancel flag on move-beyond-tolerance AND on `pointercancel`. In the
  click handler, if either flag is set, `preventDefault/stopPropagation`, reset,
  and return without invoking the tap callback.

**Why:** if move-cancel only clears the timer but leaves the click live, dragging
on the button still fires the tap action (e.g. opens normal compose) — a real
functional bug, not cosmetic.

**How to apply:** any "tap vs hold on the same element" gesture — gate the trailing
click on both triggered AND cancelled state. Also guard pointerdown to primary
button only so right/middle click keeps native context-menu behavior.
