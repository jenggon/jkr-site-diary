# UI-304 - Input States

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-304 |
|-------------|---------|
| Title | Input States |
| Version | 1.0.0 |
| Status | LOCKED |

---

# 1. Purpose

Defines the standard interaction states shared across all input components.

---

# 2. Supported States

- Default
- Hover
- Focus
- Active
- Filled
- Disabled
- Read Only
- Loading
- Success
- Warning
- Error

---

# 3. State Transition

```
Default

↓

Focus

↓

Editing

↓

Validation

↓

Valid

or

Invalid

↓

Submitted
```

---

# 4. Visual Consistency

State appearance shall remain identical across all input components.

---

# 5. Accessibility

State changes shall never rely solely on colour.

---

# Related Documents

UI-300

UI-303

---

Version 1.0.0
