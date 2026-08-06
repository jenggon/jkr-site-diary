# HQ ENGINEERING IMPLEMENTATION SPECIFICATION
## DEV-021B — Backend Bootstrap & Repository Structure

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-001 through ADR-010, DEV-001 through DEV-021A  
**Document Location:** `docs/01_Implementation/DEV-021B-Backend-Bootstrap-Repository-Structure.md`

---

# 1. Purpose & Objectives

- **Business Objective:** Establish a production-ready backend foundation supporting long-term maintainability and nationwide deployment.
- **Operational Objective:** Ensure every engineer begins from an identical repository structure, tooling configuration, and coding baseline.
- **Implementation Objective:** Bootstrap the complete backend workspace before implementing any domain engine.

---

# 2. Bootstrap Philosophy

- Repository structure is immutable.
- Folder ownership follows ARCH-000.
- Zero experimental folders.
- Zero business logic before database implementation.
- Every artifact committed to Git.

---

# 3. Technology Stack

## Runtime

- Node.js LTS
- TypeScript (Strict)
- Next.js App Router
- PostgreSQL
- Supabase
- pnpm (preferred)

---

## Development

- ESLint
- Prettier
- Husky
- lint-staged
- Vitest
- Playwright
- OpenAPI Generator

---

## DevOps

- GitHub Actions
- Docker
- Docker Compose

---

# 4. Repository Layout

```text
src/
    app/
    services/
    repositories/
    types/
    middleware/
    utils/
    lib/

supabase/
    migrations/
    seed.sql
    verify.sql

tests/
    unit/
    integration/
    contract/

docs/

scripts/

public/
```

---

# 5. Root Configuration Files

Mandatory:

- package.json
- tsconfig.json
- next.config.ts
- eslint.config.js
- prettier.config.js
- vitest.config.ts
- playwright.config.ts
- docker-compose.yml
- .env.example
- .gitignore
- README.md

---

# 6. TypeScript Configuration

Mandatory:

- strict
- noImplicitAny
- strictNullChecks
- exactOptionalPropertyTypes
- noUncheckedIndexedAccess

Forbidden:

- any
- allowJs
- skipLibCheck = false

---

# 7. Path Aliases

```
@/types/*
@/services/*
@/repositories/*
@/middleware/*
@/utils/*
@/lib/*
```

---

# 8. Package Standards

Mandatory dependencies:

- next
- react
- typescript
- @supabase/supabase-js
- zod
- uuid

Development:

- vitest
- playwright
- eslint
- prettier
- husky
- lint-staged

---

# 9. Git Standards

Protected branches

main
develop

Feature branches

feature/*

Release

release/*

Hotfix

hotfix/*

---

# 10. CI Requirements

Every Push executes

1. Install packages
2. Type Check
3. Lint
4. Unit Test
5. Build
6. Artifact Upload

Pipeline must fail if any step fails.

---

# 11. Acceptance Criteria

Repository bootstrap considered complete when:

- [ ] Folder structure created
- [ ] TypeScript strict mode enabled
- [ ] ESLint operational
- [ ] Prettier operational
- [ ] Husky operational
- [ ] GitHub Actions operational
- [ ] Docker Compose operational
- [ ] Empty application builds successfully
- [ ] CI passes

---

# 12. Deliverables

Artifacts created:

- Repository folder structure
- Configuration files
- Development tooling
- CI pipeline
- Docker environment
- Bootstrap README

---

**BACKEND BOOTSTRAP AUTHORIZED**

---

**END OF SPECIFICATION — DEV-021B**
