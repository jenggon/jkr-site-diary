# Developer Architecture Repository (DAR)

**Project:** JKR Site Diary Platform  
**Repository Version:** 1.0.0  
**Status:** Active

---

# Purpose

Developer Architecture Repository (DAR) ialah sumber rasmi (Single Source of Truth) bagi semua keputusan architecture, business rules, API contract dan dokumentasi teknikal projek JKR Site Diary.

Semua pembangunan sistem hendaklah merujuk kepada repository ini sebelum implementation dilakukan.

---

# Repository Structure

```
docs/

00_Governance/
01_ADR/
02_Business_Rules/
03_Zon_Penjadualan/
04_Zon_Operasi/
05_API/
06_Database/
07_UI/
08_UX/
09_HQ/
```

---

# Folder Description

## 00_Governance

Dokumen utama yang mengawal keseluruhan architecture projek.

Contoh:

- PROJECT-CONSTITUTION.md
- CHANGELOG.md
- README.md

---

## 01_ADR

Architecture Decision Records.

Setiap keputusan architecture mesti direkodkan di sini.

Contoh:

- ADR-001
- ADR-002
- ADR-003

---

## 02_Business_Rules

Semua Business Rule rasmi.

Kod sistem hendaklah mengikut Business Rule.

Business Rule tidak boleh diambil daripada implementation.

---

## 03_Zon_Penjadualan

Dokumentasi berkaitan:

- Import Engine
- Compatibility Check
- Operational Programme Builder
- Program Kerja
- Revision
- Lifecycle

---

## 04_Zon_Operasi

Dokumentasi operasi harian.

Contoh:

- Task Engine
- Activity Engine
- Open Activities
- Progress Engine
- Validation Engine
- Approval Engine
- Audit Engine

---

## 05_API

Kontrak API.

Merangkumi:

- Endpoint
- Request
- Response
- Error Code
- Authentication

---

## 06_Database

Dokumentasi database.

Merangkumi:

- Entity
- Relationship
- Schema
- Migration
- Index
- Constraint

---

## 07_UI

Dokumentasi tingkah laku antaramuka pengguna.

Bukan reka bentuk visual.

Fokus kepada:

- Screen Behaviour
- Navigation
- State
- Permission
- User Flow

---

## 08_UX

Prinsip pengalaman pengguna.

Contoh:

- Three Second Rule
- Progressive Disclosure
- Mobile First
- Accessibility

---

## 09_HQ

Semua semakan rasmi.

Contoh:

- HQ Review
- Architecture Compliance
- Accepted Decisions
- Outstanding Items

---

# Documentation Hierarchy

Keutamaan dokumen adalah seperti berikut:

1. PROJECT-CONSTITUTION.md
2. Architecture Decision Records (ADR)
3. Business Rules
4. Domain Documentation
5. API Specification
6. Database Specification
7. UI Behaviour
8. Source Code

Sekiranya berlaku percanggahan, dokumen yang berada lebih tinggi mempunyai keutamaan.

---

# Working Principles

1. Architecture menentukan implementation.
2. Business Rule menentukan behaviour.
3. Source Code melaksanakan Business Rule.
4. Tiada implementation tanpa dokumentasi.
5. Semua perubahan architecture mesti melalui ADR.

---

# Repository Ownership

| Role | Responsibility |
|------|----------------|
| Enterprise Architect | Architecture |
| Developer | Implementation |
| Reviewer | Validation |
| Product Owner | Business Direction |

---

# Versioning

Repository menggunakan semantic versioning.

Contoh:

- v1.0.0
- v1.1.0
- v2.0.0

---

# Status

Developer Architecture Repository telah diwujudkan sebagai dokumentasi rasmi projek.

Semua pembangunan selepas ini hendaklah merujuk kepada repository ini.