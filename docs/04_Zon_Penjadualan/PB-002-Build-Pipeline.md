# PB-002 — Build Pipeline

## Status

Approved

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