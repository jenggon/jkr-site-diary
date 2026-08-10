# HQ-DECISION-002 — SUSPEND / CANCEL DISPOSITION
**Mode:** READ-ONLY SPECIFICATION INVESTIGATION
**Date:** 2026-08-10

## 1. Executive Summary
The legacy states `Suspended` and `Cancelled` are explicitly required by current authoritative blueprint specifications (DEV-010, DEV-011, DEV-012) to support mandatory JKR business capabilities (weather delays, SO halt orders, Variation Orders). However, the locked database schemas (`DB-014`, `DB-015`) provide zero persistence mechanisms to support them. 
Because these are mandatory capabilities that lack canonical support, **OPTION C (New Canonical Mechanism)** is recommended. A new specification (DB-004) must be authored and approved before DB-003 can proceed.

## 2. Authority Classification
- `DEV-010B Open Activities Lifecycle Specification`: **LOCKED CURRENT**
- `DEV-010D Carry Forward Engine Specification`: **LOCKED CURRENT**
- `DEV-011B Activity State Machine Specification`: **LOCKED CURRENT**
- `DEV-012B Business Rules Catalogue`: **LOCKED CURRENT**
- `AE-009 Activity State Machine`: **LOCKED CURRENT**
- `DB-014 Activity Schema`: **LOCKED CURRENT**
- `DB-015 Site Diary Schema`: **LOCKED CURRENT**

*(Note: DEV-01x series and AE/DB series are in direct architectural contradiction).*

## 3. Business Capability Test

### A. Suspended
1. **Explicitly required?** YES. Required by DEV-012B (BR-ACT-005) and DEV-010D.
2. **Who initiates it?** Site Engineer / SO / Weather Events.
3. **Why does it occur?** Inclement weather, SO halt orders, material delays (DEV-011B).
4. **Does work remain physically incomplete?** YES.
5. **Can work resume?** YES.
6. **What must be recorded?** Reason for suspension (weather, SO instruction).
7. **Level:** Conceptually an Activity-level status, but triggered by daily operational (Site Diary) events.
8. **Historical evidence required?** YES.

### B. Cancelled
1. **Explicitly required?** YES. Required by DEV-012B (BR-ACT-004) and DEV-010D.
2. **Who initiates it?** Planner / Project Director (via Revision Engine).
3. **Why does it occur?** Variation Orders (VO), Arahan Pegawai Penguasa (APK), or removal of task in a new baseline revision.
4. **Disappears from work?** YES. Excluded from Carry Forward.
5. **Can it resume?** NO.
6. **What must be recorded?** Supersession/Cancellation reason.
7. **Level:** Task/Revision-level event affecting the Activity.
8. **Historical evidence required?** YES.

## 4. Canonical Mechanism Search
An investigation of the locked `06_Database` and `05_Zon_Operasi` schemas reveals:
- **Site Diary (DB-015):** Records `weather` and `notes`, but has no `is_halted`, `stoppage_reason`, or `suspension` flag.
- **Activity (DB-014):** Records `New`, `In Progress`, `Completed`. No `suspended` or `cancelled` flags.
- **Programme Revision (DB-011):** REM-004 implicitly protects Activities when a revision is superseded, but provides no semantic distinction between "Superseded because it was completed in the past" vs "Superseded because it was Cancelled/VO".
**Result:** **NOT FOUND.** No existing canonical mechanism can cleanly represent these required states without guesswork.

## 5. Legacy Requirement Test
- **DEV-012B (BR-ACT-005):** "Suspended activities carry forward to daily diaries but permit 0 progress increments." (CURRENT REQUIREMENT)
- **DEV-012B (BR-ACT-004):** "Cancelled activities are excluded from daily logging..." (CURRENT REQUIREMENT)
- **DEV-010D (Carry Forward Engine):** Specifically routes `Suspended` and excludes `Cancelled`. (CURRENT REQUIREMENT)

## 6. Decision Options
- **OPTION A — RETIRE:** Retire the concepts. (Fails because JKR contractually requires tracking VO/APK cancellations and weather suspensions).
- **OPTION B — EXISTING MECHANISM:** Use an existing DB-014/DB-015 mechanism. (Fails because none exist).
- **OPTION C — NEW CANONICAL MECHANISM:** These are mandatory capabilities requiring a new, formally specified architectural mechanism.

## 7. Recommendation
**RECOMMENDED: OPTION C**
Suspend and Cancel represent real-world JKR physical construction constraints (weather halts, Arahan Pegawai Penguasa variation orders). They cannot be retired (Option A) and cannot be mapped to existing fields (Option B). 
A new architectural specification (e.g., `DB-030-Activity-Suspension-Schema.md`) is required to design a canonical side-mechanism that preserves the integrity of `DB-014` while satisfying the `DEV-012B` business rules.

## 8. Impact on DB-003
**BLOCKED.** DB-003 cannot proceed until the new canonical mechanism (Option C) is specified, approved, and merged into the architecture.
