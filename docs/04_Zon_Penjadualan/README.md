# Zon Penjadualan

**Version:** 1.0.0
**Project:** JKR Site Diary Platform

## Status

Locked

---

# Purpose

Zon Penjadualan is responsible for producing and maintaining the approved operational plan used by the Site Diary Platform.

This bounded context owns all planning-related information before operational execution begins.

---

# Responsibilities

- Programme Registration
- Programme Revision Management
- MSP Import
- MSP Validation
- Programme Builder
- Task Generation

---

# Owned Engines

- Programme Engine
- MSP Engine
- Task Engine

---

# Inputs

- Approved Programme
- Approved Programme Revision
- Microsoft Project XML
- APK / Variation Order

---

# Outputs

- Program Kerja
- Task List
- UID Mapping
- Programme Metadata

---

# Does NOT Own

- Site Diary
- Activity
- Workforce
- Progress
- Approval
- Audit

These belong to Zon Operasi.

---

# Boundary

```
Programme

↓

Programme Revision

↓

MSP Import

↓

Programme Builder

↓

Program Kerja

====================

Operational Boundary
```

---

# Interface

Produces Program Kerja for Zon Operasi.

No operational data may flow back into this bounded context.

---

# Related Documents

- PE-001-Programme-Engine
- ME-001-MSP-Engine
- TE-001-Task-Engine
