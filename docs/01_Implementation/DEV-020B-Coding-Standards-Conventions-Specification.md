# HQ ENGINEERING IMPLEMENTATION SPECIFICATION
## DEV-020B — Coding Standards & Conventions Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-001 through ADR-010, DEV-001 through DEV-020A  

---

# 1. Purpose & Objectives

- **Business Objective:** Ensure the physical codebase of the JKR Site Diary Platform is maintainable, secure, high-performing, and compliant with Malaysian government IT software engineering standards.
- **Operational Objective:** Eliminate code ambiguity, technical debt, and architectural drift across all engineering contributors.
- **Implementation Objective:** Provide explicit, mandatory coding conventions governing TypeScript typings, layer boundaries, error handling, naming standards, and code review criteria per **ARCH-000**.

---

# 2. Coding Philosophy

- **Readability First:** Code is read 10x more often than it is written. Clear, self-documenting code takes precedence over clever tricks.
- **Explicit over Implicit:** Explicit typing, explicit error throwing, and explicit layer boundaries. No silent side-effects or implicit type coercion.
- **Single Responsibility Principle (SRP):** Every module, class, service, and function MUST have a single, well-defined purpose.
- **Don't Repeat Yourself (DRY) & KISS:** Reuse core utilities and domain models while keeping implementations simple and readable.
- **Composition over Inheritance:** Prefer functional composition and object interface contracts over deep class inheritance hierarchies.
- **Zero Business Logic in Controllers / API Routes:** Route handlers manage HTTP concerns ONLY (parsing, status codes, response envelopes). Business orchestration belongs exclusively in Services.
- **Strict Architecture Compliance:** Code MUST strictly reflect the 11 domain engines, locked state machines, and ADR standards (**ADR-001** through **ADR-010**).

---

# 3. Project Structure & File Size Standards

### Folder Structure Convention
```
src/
├── app/              # Next.js App Router API Route Handlers
│   └── api/
│       ├── programme/
│       ├── site-diary/
│       └── progress/
├── types/            # Pure TypeScript Domain Models & Enums (DM-001 - DM-010)
├── repositories/     # Pure Persistence Access Layers (Supabase / Postgres)
├── services/         # Business Logic Orchestration & Audit Ownership
├── utils/            # Stateless Helper Utilities & Formatters
└── middleware/       # Ingress Auth, RBAC, & Validation Rules
```

### File & Function Size Limits
- **Maximum File Length:** Maximum 300 lines of code per file (excluding comments/imports). Files exceeding 300 lines MUST be refactored into smaller sub-modules.
- **Maximum Function Length:** Maximum 35 lines of code per function.
- **Maximum Parameter Count:** Maximum 3 positional parameters per function. Use typed Options Objects DTOs for 4+ parameters.

---

# 4. Naming Standards

| Code Element | Case Convention | Example |
|---|---|---|
| **Variables / Properties** | camelCase | `actualQuantity`, `siteDiaryId` |
| **Functions / Methods** | camelCase (verb prefix) | `getAuditById()`, `calculateProgress()` |
| **Classes / Interfaces** | PascalCase | `SiteDiaryService`, `AuditRepository`, `SiteDiary` |
| **Enums & Members** | PascalCase | `ApprovalStatus.Pending`, `ActivityStatus.Started` |
| **Constants** | UPPER_SNAKE_CASE | `DEFAULT_PAGINATION_LIMIT`, `MAX_FILE_SIZE` |
| **Database Entities / Columns** | snake_case | `site_diary`, `actual_quantity`, `created_at` |
| **API DTOs** | PascalCase DTO suffix | `CreateSiteDiaryDTO`, `UpdateProgressDTO` |
| **Repository Modules** | camelCase Repository suffix | `siteDiaryRepository`, `auditRepository` |
| **Service Modules** | camelCase Service suffix | `siteDiaryService`, `auditService` |
| **API Route Paths** | lowercase-hyphenated | `/api/site-diary`, `/api/trade-library` |

---

# 5. Code Style & Formatting Standards

- **Formatter & Linter:** Prettier and ESLint enforced via pre-commit Git hooks.
- **Indentation:** 2 spaces (no tabs).
- **Semicolons:** Mandatory semicolons at end of statements.
- **Quotes:** Single quotes (`'`) for string literals; backticks (`` ` ``) for template strings.
- **Import Ordering:**
  1. External third-party modules.
  2. Absolute internal domain types (`src/types/*`).
  3. Internal repositories & services (`src/repositories/*`, `src/services/*`).
  4. Relative utilities & helpers (`./utils`).

---

# 6. TypeScript Standards

- **Strict Mode Enforced:** `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`.
- **Zero `any` Policy:** Use of `any` is STRICTLY FORBIDDEN. Use explicit interfaces, generics, or `unknown` with type guards.
- **Nullable Handling:** Explicit type unions for optional/nullable values (`string | null`).
- **`readonly` Immutability:** Use `readonly` for array parameters and DTO interfaces to prevent accidental state mutation.
- **Async/Await Rules:** Always return explicit `Promise<T>`. Never use raw `.then()` / `.catch()` chains.

---

# 7. Layer Responsibilities Matrix

| Layer | ALLOWED | NOT ALLOWED |
|---|---|---|
| **Types (`src/types`)** | Interfaces, Enums, DTO types | Zero executable logic, zero functions, zero database queries |
| **Repositories (`src/repositories`)** | Supabase SELECT/INSERT/UPDATE queries, DTO mapping | Zero business rules, zero audit field generation, zero HTTP logic |
| **Services (`src/services`)** | Business orchestration, audit field population (`created_at`), state machine rules, repository calls | Zero direct Supabase client calls, zero HTTP status codes |
| **API Handlers (`src/app/api`)** | Parameter parsing, validation calls, service invocation, REST envelope formatting | Zero repository imports, zero Supabase imports, zero business logic |

---

# 8. Testing & Code Review Standards

- **Unit Test Coverage:** Minimum **85%** code coverage required for all Service logic and Validation rules (`src/services/*`, `src/middleware/*`).
- **Mocking Standard:** Repositories and external integration clients MUST be mocked during Service unit tests.
- **Code Review Checklist:**
  - [ ] Architecture compliance verified (**ARCH-000**).
  - [ ] Layer isolation enforced (No Supabase client inside API routes or Services).
  - [ ] Every mutating Service call writes a synchronous Audit record (**ADR-010**).
  - [ ] Zero `any` types or unhandled promises.
  - [ ] Unit tests pass with >= 85% coverage.

---

**CODING STANDARDS BASELINE COMPLETE**

---
**END OF SPECIFICATION — DEV-020B**
