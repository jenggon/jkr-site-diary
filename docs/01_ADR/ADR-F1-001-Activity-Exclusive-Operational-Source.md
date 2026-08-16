# ADR-F1-001 — Activity Exclusive Operational Source

**Status:** LOCKED  
**Date:** 2026-08-16  
**Phase:** F1 — Golden Path Product Proof

## Decision

Activity has exactly one operational source. It shall reference either one MSP Task or one VO Item, never both.

Programme and Programme Revision ownership remain mandatory regardless of source.

Historical source identity is immutable.

## Context

The legacy Activity domain and DB-014 assumed every Activity originated from an MSP Task and therefore required `task_id` for every record. The frozen Site Diary product specification also contains a VO Register / VO Task Link concept and requires legitimate work outside the current MSP to be recordable without fabricating planning data.

The old assumption made the two requirements incompatible during F1 end-to-end proof.

## Consequences

1. `activity.source_type` is required and is either `MSP` or `VO`.
2. `task_id` becomes nullable globally and is required only for `MSP` source.
3. `vo_item_id` is nullable globally and is required only for `VO` source.
4. The database enforces exclusive source ownership:

```text
(task_id IS NOT NULL) XOR (vo_item_id IS NOT NULL)
```

5. An Activity source cannot be changed after creation.
6. An Activity keeps its original source identity permanently in history.
7. If a VO is later authorised and incorporated into a later MSP / Programme Revision, historical VO Activities are not rewritten as MSP Activities.
8. Authorisation of a new Programme Revision continues to start a new operational Site Diary cycle; historical records remain preserved under their original revision.
9. No fake MSP Task shall be created solely to host a VO Site Diary Activity.

## Non-Decision

This ADR does not change:

- Activity lifecycle states;
- Programme Revision lifecycle;
- the rule that only the active authorised Programme Revision drives operational Site Diary entry;
- historical immutability;
- Page 1 / continuation-page printable output requirements.

## Superseded Wording

Any legacy statement saying `Every Activity belongs to exactly one Task` or `An Activity cannot exist without a Task` is superseded by this ADR and the amended DB-014 / DM-005.

## Authority

Explicitly authorised and locked by the Product Owner during F1 execution on 2026-08-16.
