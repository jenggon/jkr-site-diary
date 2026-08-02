# Documentation Structure

**Project:** JKR Site Diary Platform

**Version:** 1.0.0

**Status:** Locked

---

# Purpose

This document defines the official documentation structure for the JKR Site Diary Platform.

All project documentation shall follow this structure.

No folder shall be repurposed without an approved Architecture Decision Record (ADR).

---

# Repository Structure

```
docs/
│
├──00_Governance
├──01_ADR
├──02_Business_Rules
├──03_Domain_Model
├──04_Zon_Penjadualan
├──05_Zon_Operasi
├──06_Database
├──07_API
├──08_UI
├──09_Product_Modules
├──10_Development
├──10_UX
├──11_Architecture_Diagrams
├──12_Sequence_Diagrams
├──13_State_Machines
├──14_Decision_Tables
├──15_Data_Dictionary
├──16_Test_Scenarios
├──18_Engineering
└──99_Glossary
```

---

# Folder Responsibilities

## 00_Governance

Project governance, documentation standards and repository management.

---

## 01_ADR

Architecture Decision Records documenting architectural decisions and rationale.

---

## 02_Business_Rules

Business rules defining system behaviour.

---

## 03_Domain_Model

Domain entities, ownership and relationships.

---

## 04_Zon_Penjadualan

Planning domain documentation.

Examples:

- Import Process
- Programme Builder
- Programme Revision
- MSP Processing

---

## 05_Zon_Operasi

Operational domain documentation.

Examples:

- Site Diary
- Activity Management
- Progress Recording
- Workforce

---

## 06_Database

Logical database design.

Examples:

- ERD
- Table Specifications
- Constraints
- Index Strategy

---

## 07_API

API contracts and integration specifications.

Examples:

- REST API
- Request Models
- Response Models
- Error Codes

---

## 08_UI

User Interface specifications.

Examples:

- Screen Layouts
- Components
- Navigation
- Responsive Design

---

## 09_Product_Modules

Product module documentation.

Examples:

- Core Operations
- Field Operations
- Governance
- Administration
- Executive
- AI

---

## 10_UX

User experience documentation.

Examples:

- User Journey
- Personas
- Interaction Design
- Accessibility

---

## 11_Architecture_Diagrams

High-level architecture diagrams.

Examples:

- Context Diagram
- Container Diagram
- Component Diagram

---

## 12_Sequence_Diagrams

Interaction flow between system components.

---

## 13_State_Machines

Lifecycle and state transition diagrams.

---

## 14_Decision_Tables

Business decision matrices and validation rules.

---

## 15_Data_Dictionary

Official definition of all database fields.

---

## 16_Test_Scenarios

Functional, integration and acceptance test scenarios.

---

## 18_Engineering

Engineering standards and implementation governance.

---

## 99_Glossary

Official project terminology.

---

# Documentation Hierarchy

The following hierarchy shall be observed.

Project Constitution

↓

Architecture Decision Records

↓

Glossary

↓

Domain Model

↓

Business Rules

↓

Planning / Operational Documentation

↓

Database

↓

API

↓

UI / UX

↓

Architecture Diagrams

↓

Sequence Diagrams

↓

State Machines

↓

Decision Tables

↓

Data Dictionary

↓

Test Scenarios

↓

Source Code

---

# Governance Rules

The following rules apply.

- Documentation precedes implementation.
- Lower-level documents shall not contradict higher-level documents.
- All architecture changes require an ADR.
- Business Rules shall reference the Domain Model where applicable.
- Database and API specifications shall comply with Business Rules.
- UI and UX shall comply with Business Rules and API contracts.

---

# Change Management

Changes to this repository structure require:

1. Architecture Review.
2. New ADR (if architecture is affected).
3. Approval by the Architecture Owner.

---

# Ownership

This document is maintained by the Architecture Owner.

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2026-07-22 | Initial repository structure established. |
