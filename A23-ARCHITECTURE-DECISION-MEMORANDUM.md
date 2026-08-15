# A23 ARCHITECTURE DECISION MEMORANDUM & FINAL RESOLUTION

This memorandum outlines the architectural discrepancies identified during the A23 Daily Operations & Carry-Forward Reconnaissance and records the final HQ directive on each item.

---

## GAP 1: Missing `Continue` / `Suspended` State Model

- **Authoritative Requirement:** `DEV-010B` and `DEV-011B` mandate that the Activity Engine owns operational state transitions and transitions an unfinished Activity to `Continue` at day-end, and to `Suspended` upon inclement weather / SO halt order.
- **Current Implementation:** `ActivityStatus` (in `src/types/activity.ts`) only possesses `New`, `InProgress`, and `Completed`. The carry-forward loop simply copies the `InProgress` (or `New`) status to the next day's `SiteDiary` without altering the parent `Activity` state.
- **Affected Sealed Boundary:** A19 (Open Activities Engine) and A20 (Site Diary).
- **HQ DECISION:** **DEFER**. Do not reopen A19. Record Continue/Suspended lifecycle states as an **ARCHITECTURE GAP — DEFERRED**.

---

## GAP 2: Dedicated Carry Forward Engine 

- **Authoritative Requirement:** `DEV-010D` defines a discrete, event-driven `Carry Forward Engine` responsible for evaluating criteria and triggering `Activity Engine` state updates independently of daily diary closures.
- **Current Implementation:** A procedural looping function (`carryForwardActiveOperations`) lives directly inside `siteDiaryService.ts`. It acts merely as an automated row-cloning utility rather than an independent domain engine.
- **Affected Sealed Boundary:** A20 (Site Diary).
- **HQ DECISION:** **DEFER**. Do not reopen A20. Retain the current idempotent carry-forward implementation as an **ARCHITECTURE GAP — DEFERRED**.

---

## GAP 3: Progress Quantity Carry-Forward

- **Authoritative Requirement:** `DEV-011D` mandates: "Unfinished progress (<100%) carries forward target quantities to next daily diary."
- **Current Implementation:** `siteDiaryService.ts` copies the `manpower` JSON block but makes zero attempt to interact with `progressService` or replicate progress measurements across days. Progress logging is treated entirely separately from the carry-forward generation loop.
- **Affected Sealed Boundary:** A20 (Site Diary) and A22 (Progress Integration Integrity).
- **HQ DECISION:** **DEFER**. Do not reopen A22. Progress remains the canonical source of progress data. Do not duplicate Progress quantities into Site Diary records. This is logged as an **ARCHITECTURE GAP — DEFERRED**.

---

## FINAL HQ ARCHITECTURE DIRECTIVE

The A23 Reconnaissance generated three major architectural gaps. HQ has formally authorized the deferral of all three boundary reopenings to preserve the integrity of the sealed A17, A19, A20, A21, and A22 specifications. 

- **A17 — SEALED**
- **A19 — SEALED**
- **A20 — SEALED**
- **A21 — SEALED**
- **A22 — SEALED**

No further A23 source code implementation, refactoring, database migrations, or GitHub Web-Flow actions are required or authorized.
