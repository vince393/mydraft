# MyDraft - AI Email Inbox Management

## Overview

MyDraft is an AI-powered email inbox management application inspired by modern email clients like Hey.com and Superhuman. The application features a minimalist dark interface with AI-assisted reply drafting capabilities for business and service use. Users can view emails, read detailed content, and leverage AI to generate contextual reply drafts.

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
- **Design System**: Dark mode first with accent blue (#3B82F6), following Hey.com/Superhuman aesthetic

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
- **Provider**: OpenAI API via Replit AI Integrations
- **Features**: Email reply draft generation using GPT models
- **Utilities**: Batch processing with rate limiting, chat conversation management, image generation capabilities

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

### Security Files
- `server/rate-limiter.ts`: Rate limiting middleware
- `server/antivirus.ts`: Malware scanning and SVG sanitization
- `server/storage.ts`: Security audit log storage
- `shared/data-classification.ts`: Data classification schema and protection requirements