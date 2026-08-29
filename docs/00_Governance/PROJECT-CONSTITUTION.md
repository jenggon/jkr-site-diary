# PROJECT CONSTITUTION

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Authority:** Enterprise Architecture

---

# 1. Purpose

This Constitution defines the fundamental architectural principles governing the JKR Site Diary Platform.

It serves as the highest authority within the Developer Architecture Repository (DAR).

All implementations, documentation and future architectural decisions shall comply with this Constitution.

---

# 2. Project Vision

The JKR Site Diary Platform is an operational project management platform.

It is not merely a digital Site Diary application.

The platform manages project execution through structured operational workflows driven by an authorised Programme Kerja.

---

# 3. Architectural Principles

The platform shall be governed by the following principles.

1. Separation of concerns.
2. Domain Driven Design.
3. Single Source of Truth.
4. Explicit Business Rules.
5. Immutable Historical Records.
6. Controlled Architectural Changes.

---

# 4. Bounded Contexts

The platform consists of two primary bounded contexts.

- Zon Penjadualan
- Zon Operasi

Each context owns its own responsibilities.

Direct coupling between contexts is prohibited.

---

# 5. Official Boundary

Program Kerja is the only official boundary between:

- Zon Penjadualan
- Zon Operasi

No operational engine shall consume scheduling data directly.

---

# 6. Single Source of Truth

Only an authorised Program Kerja may be used by operational engines.

Scheduling files shall never become operational data sources.

---

# 7. Programme Lifecycle

Every Program Kerja shall exist in one of the following states.

- Draft
- Approved
- Archived

No additional lifecycle state may be introduced without an Architecture Decision Record (ADR).

---

# 8. Baseline Philosophy

Every approved Programme baseline starts a new operational cycle.

Historical operational records remain immutable.

---

# 9. Migration Policy

Migration between Programme baselines is prohibited.

Operational history shall never be migrated into a new baseline.

---

# 10. Merge Policy

Programme baselines shall never be merged.

Conflict resolution between baselines is outside the architecture scope.

---

# 11. Historical Integrity

Historical records represent factual events.

Historical information shall never be rewritten.

---

# 12. Architecture Governance

All architectural changes require:

- Architecture Review
- ADR
- Documentation Update

Implementation shall never precede architectural approval.

---

# 13. Business Rule Governance

Business Rules define system behaviour.

Source Code implements Business Rules.

Source Code shall never define Business Rules.

---

# 14. Documentation Hierarchy

Architecture documents shall follow this priority.

1. PROJECT-CONSTITUTION.md
2. ADR
3. Business Rules
4. Domain Documentation
5. API Specification
6. Database Specification
7. UI Behaviour
8. Source Code

---

# 15. AI Development Policy

AI-generated code shall comply with:

- Constitution
- ADR
- Business Rules

AI shall not introduce new architecture without formal approval.

---

# 16. HQ Governance

Official HQ architectural decisions shall be recorded separately under the HQ documentation.

Implementation shall comply with approved HQ decisions.

---

# 17. Blueprint Status

Current Blueprint Version

v1.0

Blueprint Status

Frozen

Development Status

Implementation Phase

---

# 18. Ratification

This Constitution becomes effective immediately upon approval by the Project Owner.

Subsequent architecture documents shall comply with this Constitution.

LOCKED