# Engine Registry

**Project:** JKR Site Diary Platform
**Version:** 1.0.0
**Status:** Draft
**Date:** 2026-08-02

---

# Purpose

Provide a single authoritative reference for all engines within the JKR Site Diary Platform.

---

# Registry

## Zon Penjadualan

---

### Programme Engine

| Field | Value |
|---|---|
| Engine | Programme Engine |
| Identifier | PE |
| Description | Manages Programme registration, lifecycle and metadata. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Penjadualan |
| Depends On | — |
| Provides To | MSP Engine, Programme Builder |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: PE-001, PE-002, PE-003

---

### MSP Engine

| Field | Value |
|---|---|
| Engine | MSP Engine |
| Identifier | ME |
| Description | Imports and parses Microsoft Project XML schedules. Produces Programme Revision and UID Mapping. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Penjadualan |
| Depends On | Programme Engine |
| Provides To | Programme Builder |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: ME-001, ME-002, ME-003

---

### Programme Builder

| Field | Value |
|---|---|
| Engine | Programme Builder |
| Identifier | PB |
| Description | Transforms an approved Programme Revision into an executable Program Kerja. Publication engine between planning and operations. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Penjadualan |
| Depends On | Programme Engine, MSP Engine, Task Engine |
| Provides To | Task Engine, Zon Operasi (via Program Kerja) |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: PB-001 to PB-020

---

### Task Engine

| Field | Value |
|---|---|
| Engine | Task Engine |
| Identifier | TE |
| Description | Generates executable Tasks from approved Programme Revisions. Maintains UID Mapping and WBS hierarchy. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Penjadualan |
| Depends On | Programme Builder |
| Provides To | Activity Engine (via Program Kerja) |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: TE-001, TE-002, TE-003

---

## Zon Operasi

---

### Activity Engine

| Field | Value |
|---|---|
| Engine | Activity Engine |
| Identifier | AE |
| Description | Manages operational Activities created from published Tasks. Controls Activity lifecycle. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Operasi |
| Depends On | Task Engine (via Program Kerja) |
| Provides To | Site Diary Engine, Progress Engine, Workforce Engine, Approval Engine, Audit Engine |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: AE-001 to AE-009

---

### Site Diary Engine

| Field | Value |
|---|---|
| Engine | Site Diary Engine |
| Identifier | SD |
| Description | Represents the daily operational record of an Activity. Owns Activity Date, Weather, Notes, Work Status and Manpower. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Operasi |
| Depends On | Activity Engine |
| Provides To | Progress Engine, Workforce Engine, Approval Engine, Audit Engine, Knowledge Engine |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: SD-001 to SD-006

---

### Progress Engine

| Field | Value |
|---|---|
| Engine | Progress Engine |
| Identifier | PG |
| Description | Provides operational progress information based on Site Diary records. Does not own Programme Schedule. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Operasi |
| Depends On | Activity Engine, Site Diary Engine |
| Provides To | Reporting, Executive Dashboard |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: PG-001, PG-002, PG-003

---

### Workforce Engine

| Field | Value |
|---|---|
| Engine | Workforce Engine |
| Identifier | WF |
| Description | Manages manpower information associated with Site Diary records. Handles Trade Selection and Resource Suggestion. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Operasi |
| Depends On | Activity Engine, Site Diary Engine, Knowledge Engine |
| Provides To | Reporting, Audit Engine |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: WF-001 to WF-010

---

### Knowledge Engine

| Field | Value |
|---|---|
| Engine | Knowledge Engine |
| Identifier | KE (WF-004) |
| Description | Recommends trades using historical Site Diary records. Scoring uses AHI, Subtask, Frequency and Recency. Returns top 3 suggestions. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Operasi (Workforce Engine sub-component) |
| Depends On | Site Diary Engine (historical records) |
| Provides To | Workforce Engine |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: WF-004

---

### Approval Engine

| Field | Value |
|---|---|
| Engine | Approval Engine |
| Identifier | AP |
| Description | Manages operational approval workflow including Approval Request, Decision and Status tracking. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Operasi |
| Depends On | Site Diary Engine, Activity Engine |
| Provides To | Audit Engine, Reporting |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: AP-001 to AP-010

---

### Audit Engine

| Field | Value |
|---|---|
| Engine | Audit Engine |
| Identifier | AU |
| Description | Maintains a complete operational history of Site Diary changes. Append-only event history. Supports traceability and compliance. |
| Current Status | Specified |
| Version | 1.0.0 |
| Owner | Zon Operasi |
| Depends On | Site Diary Engine, Activity Engine, Workforce Engine, Progress Engine, Approval Engine |
| Provides To | Reporting, Compliance |
| Architecture Status | Locked |
| Development Status | Not Started |

Primary Documents: AU-001 to AU-010

---

# Status Definitions

| Status | Meaning |
|---|---|
| Specified | Architecture documents are Locked. Development has not started. |
| In Development | Active implementation sprint in progress. |
| Integration Testing | Engine under integration test. |
| Deployed | Engine is deployed to production. |

---

# Architecture Status Definitions

| Status | Meaning |
|---|---|
| Locked | Architecture is frozen. No changes without ADR approval. |
| Draft | Architecture is under review. Not yet approved. |
