---
name: Email body iframe rendering
description: The email body renders inside a sandboxed iframe; gotchas for styling, scrollbars, and the "boxed email" bug.
---

The email body in the detail view renders inside a sandboxed iframe
(`EmailIframeRenderer`), NOT in the React DOM. Two consequences bite repeatedly:

- **The app's global scrollbar CSS does NOT reach inside the iframe.** A separate
  document = default (white) scrollbar even in dark mode. Fix: inject scrollbar
  rules + `color-scheme` into the iframe's own `<style>`, themed by the `dark`
  flag. Put them on `html/body` — the dark-mode "smart invert" filter is on
  `#email-content-wrap`, so a scrollbar there would get inverted too.

- **`fillAvailable` makes the iframe a bounded inner scroll box.** It caps the
  iframe at `maxHeight` and sets `overflow:auto`, which looks like a "box" with a
  nested scrollbar — wrong, because the whole detail panel is already inside a
  Radix `<ScrollArea>`. For Gmail/Apple-Mail-style rendering, do NOT pass
  `fillAvailable` for the main body; let the iframe size to full content height
  and let the outer ScrollArea scroll. (Thread sub-emails already render without
  it, which is why only the main email looked boxed.)

**Why:** dark-mode invert is applied as one filter on the content wrap rather than
per-element recoloring, so anything that must stay un-inverted (scrollbars, the
outer chrome) has to live outside that wrap.
