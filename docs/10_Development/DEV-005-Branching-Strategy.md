# DEV-005 — Branching Strategy

## Status

Approved

---

# Purpose

Define the official Git branching strategy.

---

# Primary Branches

main

Production-ready releases.

develop

Primary development branch.

---

# Supporting Branches

feature/*

New functionality.

bugfix/*

Bug corrections.

hotfix/*

Urgent production fixes.

release/*

Release preparation.

---

# Merge Rules

Feature

↓

develop

Release

↓

main

Hotfix

↓

main

↓

develop

---

# Protection Rules

main

Protected

No direct commits.

develop

Pull Request preferred.

---

# Branch Naming

feature/activity-module

feature/dashboard

bugfix/login

hotfix/api-auth

release/v1.0.0

---

# Version Tags

v0.4-product-complete

v0.5-sprint-zero

v1.0.0

---

Version

1.0.0

LOCKED