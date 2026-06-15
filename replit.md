# MyDraft - AI Email Inbox Management

## Overview
MyDraft is an AI-powered email inbox management application inspired by modern email clients. It features a minimalist dark interface and AI-assisted reply drafting for business and service use. Users can view emails, read content, and leverage AI to generate contextual reply drafts, translate, summarize, and interact with a chatbot. The project aims to provide a sophisticated, AI-driven email experience with a focus on user efficiency and global communication.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, Wouter for routing.
- **State Management**: TanStack React Query.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with a custom dark theme, accent blue (#3B82F6), inspired by Hey.com/Superhuman.

### Backend
- **Runtime**: Node.js with Express.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful endpoints under `/api`.
- **Build Tool**: Vite for frontend, esbuild for server.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: Defined in `shared/schema.ts`.
- **Validation**: Zod schemas generated from Drizzle schemas.
- **Storage Pattern**: Interface-based storage abstraction (`IStorage`).

### AI Integration
- **Provider**: OpenAI via Replit AI Integrations.
- **Models**: `gpt-4o-mini-transcribe` for speech-to-text, `gpt-audio-mini` for voice chat (using chat completions with audio modality). GPT-4o for Business/Pro users, GPT-4o-mini for others and background tasks.
- **Email Signature**: Composer is the single source of truth. When enabled, the signature auto-appears a blank line below the user's text in compose/reply/forward and after AI generate/polish/refine, wrapped in a `<div data-signature="1">` marker; it is freely editable/deletable in the compose body. `getUserContent()` strips the signature (and quoted thread) before AI calls so the AI never echoes it. Server-side append was removed from `/api/drafts/quick-generate` to prevent double signatures. Saving the signature in settings invalidates `/api/auth/me` so the composer sees it immediately (query client uses `staleTime:Infinity`).
- **Features**: Email reply drafting, inbox sorting, translation, summarization, chatbot, writing style learning (Personal+), grammar & style check in composer, **background auto-sort** (every 5min for Pro+ users with AI-described custom folders — in-memory dedup, batched 50/call, max 100/cycle, stale user cleanup).
- **Cost Optimizations**: Deterministic language detection (`franc` — zero AI cost), email noise stripping (`server/email-utils.ts` — strips quoted replies, signatures, disclaimers before AI calls), persisted email summaries (DB-backed `message_summary_cache` table with upsert — summaries survive restarts).
- **Global Inbox**: Supports multilingual features with region, preferred language, and formality level settings. Provides culturally-aware translation and etiquette suggestions.

### Application Structure
- `client/`: React frontend (components, pages, hooks, lib).
- `server/`: Express backend (routes, storage, index, replit_integrations).
- `shared/`: Shared types and schemas.

### Plans & Pricing (credit economy)
- **Tiers** (internal name in parens): Free, Personal, Pro, Business (`premium`). Frontend sends `free`/`personal`/`pro`/`business`; backend maps `business`→`premium`. Hierarchy: `{free:0, personal:1, pro:2, premium:3}`.
- **Monthly credits**: Free 10, Personal 50, Pro 200, Business 500 (in `server/credits.ts` `PLAN_MONTHLY_CREDITS`). Credit amounts apply to ALL users.
- **Prices** (`PLAN_PRICES`, cents): Personal $2.99/mo · $28.70/yr; Pro $7.99/mo · $76.70/yr; Business $19.99/mo · $191.90/yr. Stripe has both monthly AND annual prices seeded per plan (`server/seed-stripe-products.ts`). Checkout also lazily find-or-creates a price if missing.
- **Feature ladder (cumulative)**: Free = standard; Personal = + writing-style memory, advanced inbox, email scheduling, priority support; Pro = + GPT-4o model, background auto-sort; Business = + voice assistant, custom AI training, team (5 seats), dedicated support.
- **Trial**: Pro/Business only — Personal has NO trial (charges immediately; onboarding routes Personal via `/checkout?plan=personal`).
- **Migration**: `server/migrate-existing-subscriptions.ts` is interval-aware (preserves monthly/annual), moves existing Pro/Business subs onto new prices (no grandfathering), skips Personal. Run seed first, then dry-run, then `--apply`.
- **Wallet payments (Apple Pay / Google Pay)**: `client/src/components/wallet-payment-button.tsx` (`WalletPaymentButton`) uses Stripe's Payment Request API (`PaymentRequestButtonElement`) inside the existing `<Elements>` providers on the plan checkout (`checkout.tsx`) and credit pack/add-on dialog (`credit-checkout-dialog.tsx`). It renders only when `canMakePayment()` is truthy, so it stays hidden in the dev preview and only appears for real wallet-capable visitors once published on the live domain. Wallet handlers reuse the existing `confirmCardSetup`/`confirmCardPayment` + existing confirm endpoints (`confirm-subscription`/`confirm-pack`/`confirm-addon`), including 3DS `requires_action`. The component centrally intercepts `ev.complete` so the wallet sheet always resolves. For trial plans ($0 today) the wallet total uses the recurring price with an "(after trial)" label (wallets reject $0); only a SetupIntent runs so nothing is charged today. Domain plumbing: `GET /.well-known/apple-developer-merchantid-domain-association` proxies+caches Stripe's hosted file (200, no trailing slash); `server/index.ts` registers each `REPLIT_DOMAINS` domain via `stripe.paymentMethodDomains` on startup (idempotent, re-validates).

### Key Data Models
- **Users**: Authentication, plan selection, AI preferences.
- **Emails**: Inbox messages, content, status, folders.
- **Drafts**: AI-generated replies.
- **NylasGrants**: OAuth tokens (legacy).
- **Conversations/Messages**: Chat history.
- **Email Accounts**: Stores provider (google, microsoft, imap), tokens/credentials, expiry for connected email accounts. IMAP credentials are encrypted at rest using AES-256-GCM.

### Authentication & User Flow
- **Authentication**: Dual auth system — session-based auth with `express-session` for web, JWT Bearer token auth for mobile app. Both share the same user accounts, plans, and data. `requireAuth` middleware checks for `Authorization: Bearer <token>` header first, then falls back to session cookie.
- **Mobile JWT Auth**: `server/jwt.ts` utility handles token signing/verification. Access tokens expire in 15 minutes, refresh tokens in 30 days. Refresh tokens stored in `refresh_tokens` DB table (hashed with SHA-256) for revocation support. Endpoints: `POST /api/auth/mobile/login`, `/register`, `/verify-registration`, `/verify-2fa`, `/refresh`, `/logout`. `GET /api/mobile/info` returns API version and endpoint list. OAuth login supports `platform=mobile&redirect_uri=...` query params to return JWT tokens via deep link redirect instead of setting session cookies. Env var: `JWT_SECRET`.
- **CORS**: Configured in `server/index.ts` via `cors` package. Allows requests from `.replit.app`, `.replit.dev`, localhost, and any origins listed in `MOBILE_APP_ORIGINS` env var (comma-separated).
- **OAuth**: Secure state tokens for Google/Microsoft. IMAP/SMTP uses direct credentials (app passwords).
- **Email Providers**: Gmail (Google OAuth), Outlook (Microsoft OAuth), and generic IMAP/SMTP (Yahoo, iCloud, AOL, Zoho, Fastmail, custom domains, etc.). IMAP provider auto-detects well-known servers from email domain. Custom server settings available via advanced form. SSRF protection blocks private/internal IPs. Implementation: `server/imap.ts` (ImapFlow + Nodemailer), `server/gmail.ts`, `server/microsoft.ts`. All implement `IEmailProvider` interface from `server/email-provider.ts`.
- **Password Change**: `PUT /api/settings/password` ALWAYS requires an email verification code (2FA) regardless of whether 2FA is enabled. After the current password is verified, the server sends an "action" code and returns `{requiresVerification:true}`; the settings UI shows the shared verification dialog and resubmits with the code. Min new-password length is 8 (client + server).
- **Password Reset**: Token-based flow via `password_reset_tokens` table. User enters email on `/forgot-password`, server sends reset link (1hr expiry) via Resend if account exists (always returns same response for security). Reset page at `/reset-password?token=...` validates token and allows new password. Routes: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/validate-reset-token`.
- **Free Trial**: 14-day no-credit-card trial for Pro/Business plans. DB fields: `trial_ends_at`, `has_used_trial` on users table. Trial starts during onboarding when user picks Pro/Business. One trial per account lifetime (prevents re-trial even after cancellation). When trial expires: app gates access via `/trial-expired` page, user must choose Free (no card), Pro, or Business (Stripe checkout, no Stripe trial). Trial expiry email sent automatically via hourly check. Sidebar shows "Pro · Xd left" during active trial.
- **User Flow**: Login/Register → AI Preferences → Plan Selection (Free or Trial) → Email Connection → Inbox. If trial expires: → `/trial-expired` gate → must choose plan.
- **Security**: `requireAuth` middleware for protected routes (supports both session and JWT auth).

### Analytics & Owner Dashboard
- **Visitor Tracking**: `page_views` table records session-based page visits with geo-location (country, region, city via ip-api.com).
- **Frontend Tracking**: `usePageTracking()` hook in `App.tsx` tracks each page navigation with a session ID stored in `sessionStorage`.
- **Owner Analytics Tab**: Shopify-style dashboard with time range selector (Today, 7d, 30d, 90d, 1yr), visitor chart, top countries/regions, top pages, traffic sources, revenue/costs/profit summary, and conversion rates.
- **API**: `POST /api/analytics/track` (public), `GET /api/owner/analytics?range=` (owner-only).

### CASA Security Compliance (Approved by Google)
- **Data Classification**: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC levels with defined protection requirements (encryption, auth, MFA, logging, retention).
- **Security Features**: Rate limiting, httpOnly cookies, XSS prevention (SVG sanitization), audit logging, malware scanning, AES-256-GCM email content encryption at rest.

## External Dependencies

### Email Provider Integration
- **Providers**: Google Gmail API and Microsoft Graph API.
- **Authentication**: OAuth 2.0 with automatic token refresh.
- **Scopes**: Minimal Gmail access only — `gmail.readonly` and `gmail.send`. No Drive, userinfo, or openid scopes (kept minimal to ease Google OAuth verification, since restricted scopes trigger the unverified-app warning + CASA review). The connected account's email address is read via Gmail's `users.getProfile` (no separate userinfo scope needed). Microsoft: `Mail.Read`, `Mail.Send`.
- **Local-only actions**: Read/unread, star, archive, trash, delete are stored in `local_email_states` table only — never modify the user's real mailbox in their provider.
- **Architecture**: Unified `IEmailProvider` interface with specific implementations for Google (`server/gmail.ts`) and Microsoft (`server/microsoft.ts`).

### AI Services
- **OpenAI API**: Used for all AI text and audio tasks, accessed via Replit AI Integrations environment variables.

### Database
- **PostgreSQL**: Primary database, configured via `DATABASE_URL`.
- **Migrations**: Managed by Drizzle Kit.

### Key NPM Dependencies
- `@tanstack/react-query`: Server state management.
- `drizzle-orm` / `drizzle-zod`: ORM and schema validation.
- `express` / `express-session`: HTTP server and session management.
- `jsonwebtoken`: JWT signing and verification for mobile API auth.
- `cors`: Cross-origin request handling for mobile app.
- `openai`: OpenAI API client.
- `wouter`: Client-side routing.
- Radix UI primitives: Accessible UI components.