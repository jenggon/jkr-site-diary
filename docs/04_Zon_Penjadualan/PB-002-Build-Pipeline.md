# PB-002 — Build Pipeline

**Version:** 1.0.0
**Project:** JKR Site Diary Platform

## Status

Locked

---

# Pipeline

```
Programme
        │
        ▼
Programme Revision
        │
        ▼
MSP Validation
        │
        ▼
Programme Builder
        │
        ├── Build Program Kerja
        ├── Generate Tasks
        ├── Generate UID Mapping
        └── Publish
        │
        ▼
Operational Package
```

---

# Principle

Publishing is atomic.

Partial publishing is prohibited.
