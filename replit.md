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
- **Features**: Email reply drafting, inbox sorting, translation, summarization, chatbot, Read Aloud (TTS), writing style learning (Pro+).
- **Cost Optimizations**: Language detection (franc), email noise stripping, persisted email summaries, cached TTS audio.
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
- **User Flow**: Login/Register → Plan Selection → AI Preferences → Email Connection → Inbox.
- **Security**: `requireAuth` middleware for protected routes.

### CASA Security Compliance (Approved by Google)
- **Data Classification**: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC levels with defined protection requirements (encryption, auth, MFA, logging, retention).
- **Security Features**: Rate limiting, httpOnly cookies, XSS prevention (SVG sanitization), audit logging, malware scanning, AES-256-GCM email content encryption at rest.

## External Dependencies

### Email Provider Integration
- **Providers**: Google Gmail API and Microsoft Graph API.
- **Authentication**: OAuth 2.0 with automatic token refresh.
- **Features**: Real email inbox access, send/receive, message actions (read, star, archive, trash, delete, attachments).
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