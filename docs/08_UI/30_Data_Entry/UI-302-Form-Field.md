# UI-302 - Form Field

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-302 |
|-------------|---------|
| Title | Form Field |
| Version | 1.0.0 |
| Status | LOCKED |

---

# 1. Purpose

The Form Field defines the standard structure surrounding every input component.

It ensures consistency regardless of the underlying input type.

---

# 2. Standard Structure

Every Form Field shall support:

- Label
- Required Indicator
- Optional Indicator
- Help Text
- Input Component
- Supporting Text
- Validation Message

---

# 3. Anatomy

```
Label

Help Text

Input

Supporting Text

Validation Message
```

---

# 4. Responsibilities

The Form Field shall:

- Display labels.
- Display help text.
- Display validation.
- Associate accessibility metadata.
- Control spacing.

---

# 5. Validation Display

Validation messages shall appear below the input.

Only one validation message shall be displayed at a time.

---

# 6. Accessibility

Each Form Field shall expose:

- Accessible Label
- Accessible Description
- Error Association
- Required State

---

# 7. Related Documents

- UI-300
- UI-301
- UI-303

---

# Version History

|Version|Description|
|-------|-----------|
|1.0.0|Initial Release|

---

LOCKED
