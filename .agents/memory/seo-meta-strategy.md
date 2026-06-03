---
name: SEO meta strategy
description: How SEO meta tags and structured data are split between static index.html and the runtime Seo component in this SPA.
---

# SEO meta strategy (MyDraft SPA)

This is a React + Vite SPA. SEO uses two layers:

1. **Static `client/index.html`** — default title/description, full Open Graph + Twitter Card tags, and a JSON-LD `@graph` (Organization, WebSite, SoftwareApplication). These must live in the static HTML because **social/link scrapers (Facebook, LinkedIn, Slack, iMessage, X) do NOT execute JS** — they only read the initial HTML.
2. **Runtime `client/src/components/seo.tsx`** — a dependency-free `<Seo>` component that imperatively upserts title/description/canonical/robots/OG/Twitter and injects per-page JSON-LD in `useEffect` (with cleanup of the injected script). Used for unique per-page titles/descriptions and page-specific JSON-LD (BreadcrumbList, FAQPage, Product/Offer). Google renders JS so it picks these up.

**Why no react-helmet:** editing `package.json` is forbidden by the fullstack-js skill; the imperative component avoids a new dependency.

**How to apply / gotchas:**
- Keep the `robots` directive identical in both layers. The static HTML uses `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`; the `<Seo>` component must emit the same string for indexable pages or it silently downgrades the defaults on every page that renders it.
- When adding `<Seo>` to a page, remember the **import** — the dev server (Vite/esbuild) does not type-check, so a missing `import { Seo }` surfaces only at runtime. Run `npx tsc --noEmit` to catch it before relying on the running app.
- FAQPage JSON-LD on `/help` is built from the in-scope `articles` array (question + content.intro). Belongs on the page where the FAQ is actually visible.
- OG image is `client/public/og-image.png` (1200x630 referenced). Do not exclude marketing/public routes from the sitemap; do exclude auth/utility routes (login, reset, onboarding) — robots.txt already disallows the app routes.
