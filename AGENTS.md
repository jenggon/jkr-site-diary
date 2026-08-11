<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ==========================================
# JKR SITE DIARY ARCHITECTURE (LOCKED)
# ==========================================

The Site Diary module has entered Architecture Lock.

The following architecture must not be changed without explicit approval.

## Current State

*Authority: REM-007 — Architecture Supersession & Migration Specification*
*Reason: Canonical normalization of Activity / Site Diary ownership.*

1. `activity` is the canonical persistence owner of operational Activity state (DB-014).
2. `site_diary` is the canonical persistence owner of daily execution records (DB-015).
3. Open Activity is an operational Activity state/concept and is not a separate persistence owner.
4. Site Diary records reference Activity through `activity_id`.
5. Activity owns operational state.
6. Site Diary does not own operational Activity state.
7. A Site Diary record represents ONE Activity and ONE operational date.
8. Operational model follows the latest authorised CPM Revision only. No cross-revision Activity migration, continuation, or operational use of superseded CPM revisions is permitted.

---

## Audit Trail

Table:

site_diary_logs

Purpose:

Append-only event history.

Every NEW creates:

NEW event.

Every EDIT creates:

UPDATE event.

Never modify historical log rows.

---

## LHI Engine

Log Hari Ini

Displays ONLY current activities from activity.

Never display historical UPDATE rows.

History belongs inside site_diary_logs only.

---

## TRE Engine

Priority order:

1. MSP Resource
2. Knowledge Engine
3. Trade Library

Never bypass this priority.

---

## Knowledge Engine

Trade recommendation scoring uses:

- AHI
- Subtask
- Frequency
- Recency

Top 3 trades are returned.

---

## Edit Engine

editingReportId

always equals

site_diary_id

Never use site_diary_logs.id
for editing.

---

## Open Activities

Current activities are loaded from:

activity

History is loaded from:

site_diary_logs

Never reverse this relationship.

Architecture is LOCKED (Subordinate to REM-007 and DB-014/DB-015 Specifications).
