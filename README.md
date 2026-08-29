# JKR Site Diary Platform - Backend Infrastructure

Backend infrastructure, architecture baseline, and bootstrap setup for the JKR Site Diary Platform.

## Architecture Baseline

- **Baseline Version:** ARCH-000 through DEV-012Z (LOCKED)
- **Specifications:** DEV-020A, DEV-020B, DEV-021A, DEV-021B (LOCKED)
- **Module Architecture Lock:**
  - `site_diary`: Single row represents active activity; UPDATE updates existing row.
  - `site_diary_logs`: Append-only event history (NEW, UPDATE events).
  - **LHI Engine (Log Hari Ini):** Displays current activities only from `site_diary`.
  - **TRE Engine:** Priority order: 1. MSP Resource -> 2. Knowledge Engine -> 3. Trade Library.
  - **Knowledge Engine:** Recommendation scoring uses AHI, Subtask, Frequency, Recency.
  - **Edit Engine:** `editingReportId === site_diary.id` (Never use `site_diary_logs.id`).

## Technology Stack

- **Framework:** Next.js (App Router, Standalone build)
- **Language:** TypeScript (Strict compliance under DEV-020B)
- **Database / BaaS:** PostgreSQL / Supabase (`@supabase/supabase-js`)
- **Validation & Models:** Zod (`zod`), UUID (`uuid`)
- **Package Manager:** pnpm
- **Code Quality:** ESLint 9, Prettier, Husky, lint-staged
- **Testing:** Vitest (Unit / Integration / Contract), Playwright (E2E)
- **Containerization:** Docker & Docker Compose (Multi-stage build)
- **CI/CD:** GitHub Actions (6-step pipeline)

## Repository Structure

```
src/
├── app/          # Next.js App Router routes & pages
├── lib/          # Core client libraries (Supabase, DB helpers)
├── middleware/   # Request middleware & authentication handlers
├── repositories/ # Data access layer repositories
├── services/     # Business logic & domain services
├── types/        # TypeScript type declarations & DTO interfaces
├── utils/        # Utility helpers and functions
└── constants/    # Global configuration constants & enums

tests/
├── unit/         # Unit tests (Vitest)
├── integration/  # Integration tests (Vitest)
└── contract/     # API/Data contract tests (Vitest)

supabase/
└── migrations/   # Supabase SQL database migrations

scripts/          # Maintenance and setup scripts
public/           # Static web assets
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Production build
pnpm run build

# Start production server
pnpm run start

# Code formatting & linting
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run format:check
pnpm run typecheck
```

## Testing Commands

```bash
# Run unit & integration test suite (Vitest)
pnpm run test

# Watch mode for unit tests
pnpm run test:watch

# Specific test categories
pnpm run test:unit
pnpm run test:integration
pnpm run test:contract

# End-to-end tests (Playwright)
pnpm run test:e2e
```

## Docker Usage

Build and launch containerized services (PostgreSQL & Next.js App):

```bash
# Build & start containers in detached mode
docker-compose up -d --build

# View container logs
docker-compose logs -f

# Stop containers
docker-compose down
```

## CI Workflow

The GitHub Actions workflow (`.github/workflows/ci.yml`) executes a 6-step validation pipeline:

1. **Install:** Dependencies installation (`pnpm install`)
2. **Type Check:** Strict TypeScript validation (`pnpm run typecheck`)
3. **Lint:** ESLint rule compliance (`pnpm run lint`)
4. **Unit Test:** Automated test execution (`pnpm run test`)
5. **Build:** Next.js production build (`pnpm run build`)
6. **Upload Artifact:** Build artifact storage for release pipeline

## Reference Documents

- `AGENTS.md` - System instructions & LOCKED Architecture Rules
- `.env.example` - Environment configuration schema reference
- `docker-compose.yml` - Local development database and container topology
- `Dockerfile` - Multi-stage container image specification
