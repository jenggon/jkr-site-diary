# DEV-004 — Coding Standards

## Status

Approved

---

# Purpose

Define the official coding standards for the JKR Site Diary platform.

---

# Objectives

Ensure consistency, readability, maintainability and scalability across the entire codebase.

---

# Technology Stack

Frontend

- Next.js
- React
- TypeScript

Backend

- Next.js Route Handlers
- Supabase

Database

- PostgreSQL

---

# General Principles

Readable over clever.

Explicit over implicit.

Composition over inheritance.

Single Responsibility Principle.

No duplicated business logic.

---

# Naming Convention

Folders

kebab-case

Files

PascalCase for Components

camelCase for utilities

Variables

camelCase

Types

PascalCase

Interfaces

PascalCase

Enums

PascalCase

Constants

UPPER_SNAKE_CASE

---

# Component Rules

One component.

One responsibility.

Reusable before duplicated.

Business logic separated from UI.

---

# API Rules

No direct database access from UI.

All requests pass through API layer.

Validate every request.

Return standard response format.

---

# Database Rules

Never hardcode IDs.

Never bypass migrations.

Every schema change requires migration.

---

# Documentation

Every exported function documented.

Complex logic requires explanation.

Architecture decisions belong in ADR.

---

# Review Checklist

Readable

Testable

Reusable

Typed

Documented

---

Version

1.0.0

LOCKED