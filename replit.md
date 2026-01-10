# MailFlow - AI Email Inbox Management

## Overview

MailFlow is an AI-powered email inbox management application inspired by modern email clients like Hey.com and Superhuman. The application features a minimalist dark interface with AI-assisted reply drafting capabilities for business and service use. Users can view emails, read detailed content, and leverage AI to generate contextual reply drafts.

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
    pages/        # Route pages (inbox, not-found)
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Data access layer
  replit_integrations/  # AI integration modules
shared/           # Shared types and schemas
  schema.ts       # Drizzle database schema
```

### Key Data Models
- **Users**: Authentication with username/password
- **Emails**: Inbox messages with sender, subject, body, read status, folder organization
- **Drafts**: AI-generated reply drafts linked to emails
- **Conversations/Messages**: Chat history for AI interactions

## External Dependencies

### AI Services
- **OpenAI API**: Accessed via Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- Used for generating email reply drafts and image generation

### Database
- **PostgreSQL**: Primary database configured via `DATABASE_URL` environment variable
- Migrations managed via Drizzle Kit (`drizzle-kit push`)

### Key NPM Dependencies
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `express` / `express-session`: HTTP server and session management
- `openai`: OpenAI API client
- `wouter`: Client-side routing
- Radix UI primitives: Accessible UI components