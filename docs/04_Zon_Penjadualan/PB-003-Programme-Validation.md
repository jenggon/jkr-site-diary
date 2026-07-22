# PB-003 — Programme Validation

## Status

Approved

---

# Validation Rules

Before publishing, Programme Builder shall verify:

- Programme exists.
- Programme Revision is Approved.
- XML successfully parsed.
- Every Task has UID.
- WBS hierarchy is valid.
- No duplicate UID.
- Task dates are valid.
- Dependencies are valid.

---

# Result

PASS

or

FAIL

Publishing shall stop immediately upon failure.