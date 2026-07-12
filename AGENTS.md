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

Table:

site_diary

Purpose:

One row represents ONE current activity.

UPDATE always updates the existing row.

Never INSERT a duplicate for the same activity during edit.

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

Displays ONLY current activities from site_diary.

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

site_diary.id

Never use site_diary_logs.id
for editing.

---

## Open Activities

Current activities are loaded from:

site_diary

History is loaded from:

site_diary_logs

Never reverse this relationship.

Architecture is LOCKED.
