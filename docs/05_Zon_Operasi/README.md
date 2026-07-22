# Zon Operasi

## Status

Approved

---

# Purpose

Zon Operasi is responsible for executing, recording, validating and auditing daily construction activities based on the published Program Kerja.

This bounded context owns all operational data generated during project execution.

---

# Responsibilities

- Activity Management
- Progress Recording
- Workforce Recording
- Approval Workflow
- Audit Logging

---

# Owned Engines

- Activity Engine
- Progress Engine
- Workforce Engine
- Approval Engine
- Audit Engine

---

# Inputs

- Published Program Kerja
- Task
- UID Mapping

---

# Outputs

- Site Diary
- Progress
- Workforce Records
- Approval Records
- Audit Records

---

# Does NOT Own

- Programme
- Programme Revision
- MSP
- Task Generation

These belong to Zon Penjadualan.

---

# Aggregate Root

Activity is the Aggregate Root for Zon Operasi.

All operational information is attached to an Activity.

---

# Related Documents

- AE-001
- PG-001
- WF-001
- AP-001
- AU-001