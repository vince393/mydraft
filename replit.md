# MyDraft - AI Email Inbox Management

## Overview

MyDraft is an AI-powered email inbox management application inspired by modern email clients like Hey.com and Superhuman. The application features a clean white/light mode interface (hey.com-inspired) with AI-assisted reply drafting capabilities for business and service use. Users can view emails, read detailed content, and leverage AI to generate contextual reply drafts.

## Branding
- **Business Name**: MyDraft
- **Logo**: Located at `attached_assets/image_1768612031318.png`

## Pricing
- **Free**: $0 - Basic inbox management (5 emails/day limit)
- **Pro**: $10/month or $99/year - Advanced AI features, 14-day trial, unlimited emails
- **Business**: $29/month or $299/year - Enterprise features, 14-day trial, unlimited emails

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme variables and CSS custom properties
- **Design System**: Light mode first (hey.com-inspired) with warm whites, rounded pill buttons, accent blue (#3B82F6). Dark mode available via settings toggle

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api` prefix
- **Build Tool**: Vite for frontend, esbuild for server bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Storage Pattern**: Interface-based storage abstraction (`IStorage`) with in-memory implementation for development

### AI Integration
- **Primary Provider**: OpenAI (gpt-4o-mini) via Replit AI Integrations for all text tasks (chat, drafts, translations, summaries) and voice/audio features (whisper transcription, audio chat)
- **Features**: Email reply draft generation, inbox sorting, translation, summarization, chatbot assistant
- **Utilities**: Batch processing with rate limiting, chat conversation management, image generation capabilities
- **Client Setup**: Single `openai` client in `server/routes.ts` using `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Application Structure
```
client/           # React frontend
  src/
    components/   # UI components including shadcn/ui
    pages/        # Route pages (inbox, login, pricing, onboarding, connect-email)
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Express backend
  routes.ts       # API route definitions with authentication
  storage.ts      # Data access layer
  index.ts        # Express app with session middleware
  replit_integrations/  # AI integration modules
shared/           # Shared types and schemas
  schema.ts       # Drizzle database schema
```

### Key Data Models
- **Users**: Authentication with email/password, plan selection (free/pro/business), onboarding status, AI preferences (JSONB)
- **Emails**: Inbox messages with sender, subject, body, read status, folder organization
- **Drafts**: AI-generated reply drafts linked to emails
- **NylasGrants**: OAuth tokens linking users to their connected email accounts
- **Conversations/Messages**: Chat history for AI interactions

### Authentication & User Flow
- **Session-based auth**: express-session with secure cookies (httpOnly, sameSite:lax, 7-day expiry)
- **Password security**: scrypt hashing with random salt, timing-safe verification
- **OAuth security**: Cryptographically secure state tokens with 10-minute expiration
- **User flow**: Login/Register → Plan Selection → AI Preferences Onboarding → Email Connection → Inbox
- **Route protection**: requireAuth middleware on all protected API routes, frontend route guards with redirects

## External Dependencies

### Nylas Email Integration
- **Provider**: Nylas v3 API (US region, Sandbox)
- **Authentication**: OAuth 2.0 flow for Google and Microsoft accounts
- **API Key**: Requires `NYLAS_API_KEY` environment variable
- **Features**: 
  - Real email inbox access via OAuth
  - Send/receive emails through connected accounts
  - Message actions: read, star, archive, delete
- **Files**: `server/nylas.ts` (API helper), OAuth routes in `server/routes.ts`
- **Frontend**: `client/src/components/connection-banner.tsx` for account connection UI

### AI Services
- **OpenAI API**: Accessed via Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- Used for generating email reply drafts and image generation

### Database
- **PostgreSQL**: Primary database configured via `DATABASE_URL` environment variable
- Migrations managed via Drizzle Kit (`drizzle-kit push`)
- **Tables**: users, emails, drafts, nylas_grants

### Key NPM Dependencies
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `express` / `express-session`: HTTP server and session management
- `openai`: OpenAI API client
- `wouter`: Client-side routing
- Radix UI primitives: Accessible UI components

## CASA Security Compliance

### Data Classification (Q4)
All sensitive data is identified and classified into 4 protection levels:
- **RESTRICTED**: Passwords, API keys, OAuth tokens, session tokens, 2FA codes, payment info
- **CONFIDENTIAL**: Email content, user email addresses, AI drafts, writing style data, audit logs
- **INTERNAL**: User preferences, subscription status, custom folders, usage metrics
- **PUBLIC**: Application metadata, pricing information

Full classification schema: `shared/data-classification.ts`

### Protection Requirements (Q5)
Each protection level has defined requirements:

| Level | Encryption | Auth Required | MFA | Access Logged | Retention |
|-------|------------|---------------|-----|---------------|-----------|
| RESTRICTED | At-rest + Transit (scrypt/AES-256) | Yes | Yes | Yes | 365 days |
| CONFIDENTIAL | At-rest + Transit (PostgreSQL/TLS) | Yes | No | Yes | 90 days |
| INTERNAL | At-rest + Transit | Yes | No | Modifications only | 30 days |
| PUBLIC | Transit only (TLS) | No | No | No | N/A |

### Security Features Implemented
- **Rate Limiting**: Auth (10/15min), Password Reset (5/hour), 2FA (5/5min), API (100/min), AI (20/min), Email (30/min), Files (50/min)
- **Session Security**: httpOnly cookies, 7-day expiry, terminated on password change
- **XSS Prevention**: SVG sanitization on upload and download (DOMPurify)
- **Audit Logging**: Login attempts, password changes, email sends, attachment downloads
- **Malware Scanning**: File type blocking, ClamAV integration for attachments
- **Email Content Encryption**: AES-256-GCM encryption for email body and preview stored in database

### Email Content Encryption (CASA Q5 Compliance)
Email content stored in the `cached_emails` table is encrypted at rest using AES-256-GCM:
- **Algorithm**: AES-256-GCM (authenticated encryption with associated data)
- **Key Derivation**: scrypt with salt from `EMAIL_ENCRYPTION_KEY` environment variable
- **Implementation**: `server/encryption.ts` provides `encryptEmailContent()` and `decryptEmailContent()` functions
- **Storage**: Encrypted content is prefixed with `ENC:` for identification
- **Transparency**: Decryption happens automatically in storage layer - AI features receive decrypted content
- **Startup Validation**: Server validates encryption key on startup and logs status

This ensures that even database administrators cannot read user email content, meeting CASA Tier 2 data protection requirements.

### Security Files
- `server/rate-limiter.ts`: Rate limiting middleware
- `server/antivirus.ts`: Malware scanning and SVG sanitization
- `server/storage.ts`: Security audit log storage
- `server/encryption.ts`: AES-256-GCM email content encryption
- `shared/data-classification.ts`: Data classification schema and protection requirements

## Recent Changes

### February 2026
- **Global Inbox / Multilingual Features**: 
  - Region, preferred language, and formality level settings in AI Preferences (50+ countries, 30+ languages)
  - Culturally-aware translation with tone adaptation per country (formal Japanese keigo, casual Australian, indirect British, etc.)
  - Cultural etiquette suggestions banner appears when viewing emails from different regions (auto-detected from sender domain TLD)
  - Formal/casual/neutral/auto formality toggle in translation popover
  - Cultural notes displayed alongside translations explaining nuances
  - REGION_CULTURAL_CONTEXT mapping for 20+ regions with culture, formality norms, and tips
  - Landing page updated to highlight global inbox positioning
- **Contact Autocomplete**: Added email autocomplete for To, Cc, Bcc fields in compose dialog. Contacts are automatically saved when emails are sent and appear as suggestions when composing new emails. Uses `contacts` table with deduplication by (userId, email)
- **AI Subject-in-Body Bug Fix**: Fixed issue where AI regeneration would put subject line text in the email body. Added explicit instructions to AI prompts and post-processing to strip subject-like prefixes
- **Email Signature Feature**: Signature saved to user account, auto-appended when composing new/reply/forward emails, included in all AI-generated drafts. Suggestion banner appears in compose dialog if signature is missing. Signature data exposed via `/api/auth/me` endpoint.
- **Email Formatting**: Implemented `formatEmailBody()` function that converts plain text newlines to HTML breaks for proper email rendering
- **Legal Pages**: All 7 legal policy pages rewritten with professional business language, 18+ age requirement, mydraft.io domains, and 2026 copyright
- **Stripe Subscription Management**: Full subscription lifecycle with plan switching, cancellations, and upgrade/downgrade flows
  - `/api/stripe/cancel`: Cancel immediately (downgrades to free) or at period end (keeps plan until expiry)
  - `/api/stripe/change-plan`: Switch between Pro/Business plans with Stripe proration
  - `/api/stripe/confirm-subscription`: Handles both new subscriptions (14-day trial) and upgrades of existing subscriptions
  - `/api/user/plan`: Downgrade to free properly cancels Stripe subscription (fails safely if Stripe cancel fails)
  - Pricing page shows Upgrade/Downgrade/Switch labels for existing subscribers
  - Settings billing tab shows pending cancellation status with cancel date, cancel confirmation flow
  - Billing info includes `cancelAtPeriodEnd` and `cancelAt` fields from Stripe
- **Referral Program**: Users earn 1 free month of Pro for every 2 referrals who sign up and subscribe (payment must go through, trial doesn't count)
  - Database: `referral_code`, `referred_by_user_id`, `pro_credits_until` on users table; `referrals` table tracks status
  - Registration captures `?ref=CODE` from URL, links referral on verification
  - `invoice.paid` Stripe webhook marks referral as "subscribed" (only fires on real payment, not $0 trial invoices) and auto-applies Pro credit at every 2nd subscription
  - API: `/api/referrals/stats` (GET), `/api/referrals/generate-code` (POST)
  - Settings page "Referrals" tab: "Give Pro, Get Pro" messaging, copy link, progress bar (X/2), stats cards
- **Pricing Page Fix**: Grid corrected from 4 to 3 columns, centered with max-width
- **White Mode / Hey.com Design Overhaul**: 
  - Switched default theme from dark to light mode across main.tsx and settings.tsx
  - Updated CSS root variables for warm, inviting palette (warm whites, soft grays)
  - Buttons redesigned: rounded-full pill shape, font-semibold, better hover transitions
  - Landing page completely rewritten for white mode: warm amber gradients, white cards with subtle shadows, clean typography
  - Marketing nav updated: white background with blur, clean borders
  - All components updated (sidebar, email list/detail, compose, AI dialogs) removing dark-mode white-opacity patterns
  - All public pages (pricing, help, security, legal) updated for light mode consistency
  - Dark mode still available via settings toggle