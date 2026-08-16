# BR-005 — Activity Behaviour

**Version:** 1.1.0  
**Project:** JKR Site Diary Platform

## Status

Locked — amended under ADR-F1-001.

---

# Objective

Define the operational behaviour of Activities throughout their lifecycle while preserving exactly one immutable operational source.

---

# Rules

## BR-005.1 Create

An Activity shall be created only from exactly one valid operational source within the active authorised Programme Revision:

- one MSP Task; OR
- one VO Item.

An Activity shall never reference both and shall never exist without a source.

Programme and Programme Revision ownership are mandatory for both source types.

---

## BR-005.2 Source Identity

Source identity is immutable after Activity creation.

A later Programme Revision shall not rewrite historical source identity.

A VO-sourced Activity remains VO-sourced even if the authorised scope is later incorporated into a subsequent MSP / Programme Revision.

---

## BR-005.3 Resume

Outstanding Activities may be resumed in future Site Diary entries only while their Programme Revision remains the active authorised operational revision.

---

## BR-005.4 Complete

Completed Activities shall no longer appear in Outstanding Activity queries.

---

## BR-005.5 Carry Forward

If an Activity is not completed, it remains available for continuation within the same active authorised Programme Revision.

A new authorised Programme Revision starts a new operational cycle. Prior Activities remain historical and are not silently migrated.

---

## BR-005.6 Outstanding Query

Outstanding Activities shall be determined dynamically.

Criteria:

- Status != Completed
- Activity belongs to the active authorised Programme Revision

No separate persistence entity shall be created merely to duplicate the Activity state.

---

## BR-005.7 Update

Activity information may be updated while the Activity remains Outstanding, subject to immutable Programme, Revision and source identity.

Completed Activities require formal correction workflow.

---

## Related Domain Model

DM-005

---

## Related ADR

ADR-007  
ADR-F1-001
