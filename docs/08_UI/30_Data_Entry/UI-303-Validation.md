# UI-303 - Validation

| Document ID | UI-303 |
|-------------|---------|
| Title | Validation |
| Version | 1.0.0 |
| Status | LOCKED |

---

# 1. Purpose

Defines the validation framework shared by every Data Entry component.

---

# 2. Validation Types

- Required
- Length
- Pattern
- Range
- Business Rule
- Cross-field
- Server-side

---

# 3. Validation Timing

Supported timing:

- Immediate
- On Blur
- On Submit
- Server Response

---

# 4. Validation Priority

```
Server

↓

Business Rule

↓

Cross Field

↓

Input Rule

↓

Required
```

---

# 5. Error Messaging

Messages shall:

- Explain the issue.
- Explain corrective action.
- Avoid technical language.

---

# 6. Accessibility

Validation shall be announced through assistive technology.

---

# Related Documents

UI-300

UI-302

---

Version 1.0.0