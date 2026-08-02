# Developer Architecture Repository (DAR)

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked

---

# Overview

Developer Architecture Repository (DAR) merupakan repositori rasmi bagi semua dokumentasi architecture projek.

Semua keputusan architecture, business rules, API contract, database design dan UI behaviour hendaklah direkodkan di dalam repository ini.

---

# Repository Navigation

```
docs/
│
├── INDEX.md
│
├── 00_Governance/
│   ├── README.md
│   ├── PROJECT-CONSTITUTION.md
│   └── CHANGELOG.md
│
├── 01_ADR/
│   ├── ADR-001-*.md
│   ├── ADR-002-*.md
│   └── ...
│
├── 02_Business_Rules/
│   ├── BR-001-*.md
│   ├── BR-002-*.md
│   └── ...
│
├── 03_Domain_Model/
│
├── 04_Zon_Penjadualan/
│
├── 05_Zon_Operasi/
│
├── 06_Database/
│
├── 07_API/
│
├── 08_UI/
│
├── 09_Product_Modules/
│
├── 10_Development/
│
├── 10_UX/
│
├── 11_Architecture_Diagrams/
│
├── 12_Sequence_Diagrams/
│
├── 13_State_Machines/
│
├── 14_Decision_Tables/
│
├── 15_Data_Dictionary/
│
├── 16_Test_Scenarios/
│
├── 18_Engineering/
│
└── 99_Glossary/
```

---

# Documentation Hierarchy

Semua dokumen hendaklah mengikut keutamaan berikut.

| Priority | Document |
|----------|----------|
| 1 | PROJECT-CONSTITUTION.md |
| 2 | Architecture Decision Records (ADR) |
| 3 | Business Rules |
| 4 | Domain Documentation |
| 5 | API Specification |
| 6 | Database Specification |
| 7 | UI Behaviour |
| 8 | Source Code |

Sekiranya terdapat percanggahan, dokumen yang mempunyai keutamaan lebih tinggi hendaklah dijadikan rujukan.

---

# Folder Guide

| Folder | Description |
|---------|-------------|
| 00_Governance | Architecture governance dan polisi projek |
| 01_ADR | Architecture Decision Records |
| 02_Business_Rules | Business Rules rasmi |
| 03_Domain_Model | Domain model documentation |
| 04_Zon_Penjadualan | Dokumentasi Zon Penjadualan |
| 05_Zon_Operasi | Dokumentasi Zon Operasi |
| 06_Database | Database Architecture |
| 07_API | API Contract |
| 08_UI | UI Behaviour |
| 09_Product_Modules | Product module documentation |
| 10_Development | Development operating system and implementation governance |
| 10_UX | UX Principles |
| 11_Architecture_Diagrams | Architecture diagrams |
| 12_Sequence_Diagrams | Sequence diagrams |
| 13_State_Machines | State machines |
| 14_Decision_Tables | Decision tables |
| 15_Data_Dictionary | Data dictionary |
| 16_Test_Scenarios | Test scenarios |
| 18_Engineering | Engineering standards |
| 99_Glossary | Project glossary |

---

# Documentation Principles

- Constitution governs Architecture.
- Architecture governs Business Rules.
- Business Rules govern Implementation.
- Source Code implements documented behaviour.
- No implementation shall contradict documented architecture.

---

# Current Repository Status

| Section | Status |
|---------|--------|
| Governance | In Progress |
| ADR | Pending |
| Business Rules | Pending |
| Zon Penjadualan | Pending |
| Zon Operasi | Pending |
| API | Pending |
| Database | Pending |
| UI | Pending |
| UX | Pending |
| HQ | Pending |

---

# Next Milestone

1. PROJECT-CONSTITUTION.md
2. ADR-001
3. ADR-002
4. BR-001
5. Zon Penjadualan Documentation

---

**This document serves as the entry point for all architecture documentation within the JKR Site Diary Platform.**
