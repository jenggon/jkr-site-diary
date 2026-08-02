# PM-104 — Site Diary

**Version:** 1.0.0
**Project:** JKR Site Diary Platform

## Status

Locked

---

# Purpose

Site Diary is the official daily operational record for construction activities.

It captures legally traceable site events while minimising administrative effort.

---

# Business Objective

Replace manual Site Diary with a secure, searchable and auditable digital record.

---

# Business Value

Reduce paperwork.

Improve traceability.

Provide legally defensible construction records.

---

# Actors

Primary

- Site Engineer

Secondary

- Resident Engineer
- SO
- HQ

---

# Business Flow

Open Day

↓

Record Activities

↓

Record Weather

↓

Upload Photos

↓

Record Workforce

↓

Submit

↓

Approval

↓

Archive

---

# Functional Scope

Included

- Daily diary
- Weather
- Workforce
- Photos
- Remarks
- Submission
- Approval status

Excluded

- Planning
- Scheduling

---

# User Stories

As a Site Engineer,

I want to complete today's Site Diary in less than five minutes,

so that I can spend more time supervising site operations.

---

# Functional Requirements

One diary per programme per day.

Automatic date.

Automatic programme context.

Autosave.

Offline ready.

Immutable after approval.

---

# Dependencies

Programme

Revision

Activity

Weather

Photo

Workforce

Approval

---

# Business Rules Reference

SD-001

SD-006

---

# Database Reference

DB-015

---

# Dependencies

API-014

---

# UI Reference

UI-104

---

# Permissions

Create

Update

Submit

Read

---

# Notifications

Submission Completed

Approval Pending

---

# Audit Requirements

Every submission audited.

Every edit before approval audited.

---

# Success Metrics

Average completion

< 5 minutes

Submission rate

>95%

---

# Risks

Duplicate diary

Offline conflict

Late submission

---

# Acceptance Criteria

Daily diary successfully submitted.

Diary linked to Activities.

Approval workflow initiated.

---

# Definition of Done

☐ BR

☐ DB

☐ API

☐ UI

☐ Test

☐ Implementation

---

Version

1.0.0

LOCKED
