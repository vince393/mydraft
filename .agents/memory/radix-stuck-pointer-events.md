---
name: Radix stuck pointer-events on body
description: Why some clicks silently fail on desktop only (mouse), and the app-wide guard that fixes it
---

Symptom: a button/control does nothing on **desktop (mouse)** but works on **mobile
web (touch)**. Classic example: owner panel "manage credits" button unresponsive on
computer after the admin used another control in the same view.

Root cause: Radix dismissable layers (Select, Dropdown, Dialog, Popover) set
`document.body.style.pointerEvents = "none"` while open and are supposed to restore it
on close. On mouse interactions a race sometimes leaves it stuck `none`, so the entire
page swallows the next click. Touch interaction patterns don't trip the race, which is
why "works on mobile, not desktop" is the tell. It is NOT a layout/z-index/clipping
issue and NOT specific to the failing button.

**Why route-change cleanup wasn't enough:** the app had a hook that reset body
pointer-events on route change, but the stuck state happens *within the same page*
(e.g. close a row's plan Select, then click credits) — no navigation occurs, so it
never fired.

Fix (app-wide, mounted once): a `MutationObserver` on `document.body` watching
`childList` (portals mount/unmount) + the `style` attribute. When body has
`pointer-events: none` AND no Radix overlay is actually open
(`[data-state='open'][role='dialog']`, `...[role='alertdialog']`,
`[data-radix-popper-content-wrapper]`), it clears the stuck style. The open-layer
check is what keeps it safe — it never re-enables background clicks while a real
modal/select/popover is up.

**How to apply:** if a new "works on touch, not mouse" dead-click bug appears, suspect
this first. If a new blocking layer type is introduced that uses a different marker,
add its selector to the open-layer check so the guard doesn't clear it prematurely.
