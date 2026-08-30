# JKR Site Diary Platform

Next.js and Supabase implementation of the JKR Site Diary Platform.

## Architecture guardrails

The repository is under architecture lock. `AGENTS.md` and the accepted REM-007 / DB-014 /
DB-015 specifications are authoritative.

- `activity` owns operational Activity state.
- `site_diary` owns one daily execution record for one Activity and one operational date.
- `site_diary_logs` is append-only Site Diary history.
- Operational work uses only the latest authorised Programme/CPM Revision. Cross-revision
  Activity continuation is prohibited.
- The official output remains JKR Site Diary Page 1 plus continuation pages only when required.
- TRE priority remains MSP Resource, then Knowledge Engine, then Trade Library.

Historical governance and closure documents are retained as evidence. They do not supersede the
current locked authorities above.

## Toolchain

- Node.js 22.x (`.nvmrc`)
- pnpm 9.15.4 (`packageManager` in `package.json`)
- Next.js App Router with standalone production output
- TypeScript, ESLint, Prettier, Vitest, and Playwright
- Supabase for database and authentication boundaries

Do not substitute npm or generate an additional dependency lockfile.

## Local setup

Copy `.env.example` to `.env.local` and replace the placeholders. Never commit `.env.local` or a
service-role key.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

Useful commands:

```bash
pnpm run typecheck
pnpm run typecheck:api
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run build
```

Before any implementation is presented as commit-, push-, or PR-ready, run the mandatory gate:

```bash
pnpm run verify
```

The local gate is intentionally non-mutating. GitHub CI owns the single frozen dependency install,
then runs the same verification command.

## Container build

The standalone image requires the public Supabase URL and anonymous key at build time because
Next.js embeds `NEXT_PUBLIC_*` values into the client bundle. The service-role key is never a build
argument; supply it only to the running server when required.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key \
  -t jkr-site-diary .

docker run --rm -p 3000:3000 --env-file .env.local jkr-site-diary
```

`docker-compose.yml` is retained as local infrastructure scaffolding, not as an approved RC
deployment topology. Deployment selection and production environment wiring belong to F5.

## Repository map

```text
src/app/          Next.js pages and route handlers
src/composition/  Composition roots
src/repositories/ Persistence adapters and read repositories
src/services/     Domain/application services
src/types/        Domain and transport types
supabase/         Migrations, seed data, and database verification
tests/            Unit, integration, contract, security, and end-to-end tests
scripts/          Optional maintenance and local proof utilities
docs/             Architecture, governance, domain, and implementation evidence
```

Start with `AGENTS.md`, `docs/10_Development/CI-HARDEN-001.md`, and
`CI-HARDEN-002-NON-MUTATING-VERIFY.md` before changing implementation or release configuration.
