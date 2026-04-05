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
- **Models**: `gpt-4o-mini-transcribe` for speech-to-text, `gpt-audio-mini` for voice chat and TTS. GPT-4o for Business/Pro users, GPT-4o-mini for others and background tasks.
- **Features**: Email reply drafting, inbox sorting, translation, summarization, chatbot, Read Aloud (AI TTS via `gpt-audio-mini` with customizable voice — 10 voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer; default: nova; voice preference stored in `aiPreferences.readAloudVoice`), writing style learning (Pro+), grammar & style check in composer, **background auto-sort** (every 5min for Pro+ users with AI-described custom folders — in-memory dedup, batched 50/call, max 100/cycle, stale user cleanup).
- **Cost Optimizations**: Deterministic language detection (`franc` — zero AI cost), email noise stripping (`server/email-utils.ts` — strips quoted replies, signatures, disclaimers before AI calls), persisted email summaries (DB-backed `message_summary_cache` table with upsert — summaries survive restarts), TTS audio caching (in-memory, 2hr TTL, max 30 entries, keyed by userId-emailId when available).
- **Global Inbox**: Supports multilingual features with region, preferred language, and formality level settings. Provides culturally-aware translation and etiquette suggestions.

### Application Structure
- `client/`: React frontend (components, pages, hooks, lib).
- `server/`: Express backend (routes, storage, index, replit_integrations).
- `shared/`: Shared types and schemas.

### Key Data Models
- **Users**: Authentication, plan selection, AI preferences.
- **Emails**: Inbox messages, content, status, folders.
- **Drafts**: AI-generated replies.
- **NylasGrants**: OAuth tokens (legacy).
- **Conversations/Messages**: Chat history.
- **Email Accounts**: Stores provider, tokens, expiry for connected email accounts.

### Authentication & User Flow
- **Authentication**: Session-based auth with `express-session`, scrypt hashing for passwords.
- **OAuth**: Secure state tokens for Google/Microsoft.
- **Password Reset**: Token-based flow via `password_reset_tokens` table. User enters email on `/forgot-password`, server sends reset link (1hr expiry) via Resend if account exists (always returns same response for security). Reset page at `/reset-password?token=...` validates token and allows new password. Routes: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/validate-reset-token`.
- **Free Trial**: 14-day no-credit-card trial for Pro/Business plans. DB fields: `trial_ends_at`, `has_used_trial` on users table. Trial starts during onboarding when user picks Pro/Business. One trial per account lifetime (prevents re-trial even after cancellation). When trial expires: app gates access via `/trial-expired` page, user must choose Free (no card), Pro, or Business (Stripe checkout, no Stripe trial). Trial expiry email sent automatically via hourly check. Sidebar shows "Pro · Xd left" during active trial.
- **User Flow**: Login/Register → AI Preferences → Plan Selection (Free or Trial) → Email Connection → Inbox. If trial expires: → `/trial-expired` gate → must choose plan.
- **Security**: `requireAuth` middleware for protected routes.

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
- **Scopes**: Read-only + send (no modify). Gmail: `gmail.readonly`, `gmail.send`. Microsoft: `Mail.Read`, `Mail.Send`.
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
- `openai`: OpenAI API client.
- `wouter`: Client-side routing.
- Radix UI primitives: Accessible UI components.