# Decision Register

**Project:** JKR Site Diary Platform
**Version:** 1.0.0
**Status:** Draft
**Date:** 2026-08-02

---

# Purpose

Record all formally approved architectural and governance decisions for the JKR Site Diary Platform.

This register is extracted from approved source documents.

No decisions are invented here.

---

# Architecture Decisions

---

## Separate Bounded Contexts

**Source:** ADR-001  
**Date:** 2026-07-22  
**Status:** Locked  

The platform shall be separated into two bounded contexts: Zon Penjadualan and Zon Operasi.

Each bounded context owns its own data, services, responsibilities and lifecycle.

Communication between both contexts shall only occur through an authorised Program Kerja.

---

## Program Kerja as the Official Boundary

**Source:** ADR-002  
**Date:** 2026-07-22  
**Status:** Locked  

Program Kerja is established as the only official boundary between Zon Penjadualan and Zon Operasi.

Only an authorised Program Kerja may be consumed by operational engines.

Scheduling files shall never be accessed directly by operational components.

---

## No Migration Between Programme Revisions

**Source:** ADR-003  
**Date:** 2026-07-22  
**Status:** Locked  

Operational records shall never be migrated from one Programme Revision to another.

Each approved Programme Revision starts a new operational context.

Historical operational records remain permanently associated with their original Programme Revision.

---

## Programme Revision Lifecycle

**Source:** ADR-004  
**Date:** 2026-07-22  
**Status:** Locked  

Every Programme Revision shall follow a controlled lifecycle: Draft → Approved → Archived.

Only one Programme Revision may hold the Approved status at any point in time.

Approving a new Programme Revision automatically archives the previously approved revision.

---

## HQ Compliance Requirements

**Source:** ADR-005  
**Date:** 2026-07-22  
**Status:** Locked  

All approved HQ architectural decisions become mandatory implementation requirements.

Mandatory requirements include: UID Mapping, Revision Mapping, Programme Lifecycle Metadata, No Revision Migration, No Revision Merge, Immutable Historical Records.

---

## Program Kerja as Single Source of Truth

**Source:** ADR-006  
**Date:** 2026-07-22  
**Status:** Locked  

Program Kerja is established as the Single Source of Truth for all operational activities.

All operational engines shall obtain planning information exclusively from the currently Approved Program Kerja.

---

## Immutable Historical Records

**Source:** ADR-007  
**Date:** 2026-07-22  
**Status:** Locked  

Historical operational records shall be immutable.

Once an operational record has entered historical status, it shall never be modified, overwritten or deleted.

Corrections shall always be recorded as new records that reference the original historical record.

---

## Architecture Governance via ADR

**Source:** ADR-008  
**Date:** 2026-07-22  
**Status:** Locked  

All architectural changes shall be governed through Architecture Decision Records.

No architectural decision shall be considered official unless documented, reviewed and accepted.

Every implementation must conform to the latest accepted architecture.

---

## Programme First Principle

**Source:** ADR-009  
**Date:** 2026-07-26  
**Status:** Locked  

Programme is the root aggregate of the entire platform.

Every operational entity shall belong to exactly one Programme.

No operational entity may exist independently from a Programme.

---

# Constitutional Decisions

---

## Architectural Principles

**Source:** PROJECT-CONSTITUTION.md Section 3  
**Status:** Locked  

The platform is governed by: Separation of Concerns, Domain Driven Design, Single Source of Truth, Explicit Business Rules, Immutable Historical Records, Controlled Architectural Changes.

---

## Technology Stack

**Source:** DEV-004 Coding Standards  
**Status:** Locked  

Technology stack is fixed as: Next.js, React, TypeScript (Frontend); Next.js Route Handlers, Supabase (Backend); PostgreSQL (Database).

---

## Development Philosophy

**Source:** DEV-000 Project Operating System  
**Status:** Locked  

Development philosophy: Specification First, Architecture Driven, Database Before API, API Before UI, UI Before Integration, Review Before Merge, Automation Before Repetition, Documentation Before Assumption.

---

## Documentation Hierarchy

**Source:** PROJECT-CONSTITUTION.md Section 14  
**Status:** Locked  

Architecture document priority: PROJECT-CONSTITUTION.md > ADR > Business Rules > Domain Documentation > API Specification > Database Specification > UI Behaviour > Source Code.

---

## AI Development Policy

**Source:** PROJECT-CONSTITUTION.md Section 15  
**Status:** Locked  

AI-generated code shall comply with Constitution, ADR and Business Rules.

AI shall not introduce new architecture without formal approval.

---

## Blueprint v1.0 Freeze

**Source:** BLUEPRINT-FREEZE-v1.0.md  
**Date:** 2026-08-02  
**Status:** Locked  

Blueprint v1.0 is declared frozen.

All blueprint modules pass audit with zero failures.

The repository has entered the Implementation Phase.

---

# Governance Decisions

---

## Business Rule Governance

**Source:** PROJECT-CONSTITUTION.md Section 13  
**Status:** Locked  

Business Rules define system behaviour.

Source Code implements Business Rules.

Source Code shall never define Business Rules.

---

## Branching Strategy

**Source:** DEV-005 Branching Strategy  
**Status:** Locked  

Primary branches are `main` (production) and `develop` (development).

`main` is protected. No direct commits.

All features merge into `develop` via Pull Request.

---

## Programme Lifecycle States

**Source:** PROJECT-CONSTITUTION.md Section 7  
**Status:** Locked  

Every Program Kerja exists in one of: Draft, Approved, Archived.

No additional lifecycle state may be introduced without an ADR.
