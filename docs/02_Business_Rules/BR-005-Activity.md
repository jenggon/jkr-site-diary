# BR-005 — Activity Behaviour

**Version:** 1.0.0
**Project:** JKR Site Diary Platform

## Status

Locked

---

# Objective

Define the operational behaviour of Activities throughout their lifecycle.

---

# Rules

## BR-005.1 Create

An Activity shall be created only from an approved Task.

---

## BR-005.2 Resume

Outstanding Activities may be resumed in future Site Diary entries.

---

## BR-005.3 Complete

Completed Activities shall no longer appear in Outstanding Activity queries.

---

## BR-005.4 Carry Forward

If an Activity is not completed, it remains available for continuation.

---

## BR-005.5 Outstanding Query

Outstanding Activities shall be determined dynamically.

Criteria:

- Status != Completed

No separate entity or engine shall exist for Outstanding Activities.

---

## BR-005.6 Update

Activity information may be updated while the Activity remains Outstanding.

Completed Activities require formal correction workflow.

---

## Related Domain Model

DM-005

---

## Related ADR

ADR-007
