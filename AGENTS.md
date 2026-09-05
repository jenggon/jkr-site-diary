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

---

# LOCKSET-001 — MANDATORY PRODUCT DECISION HANDSHAKE

`docs/00_Governance/ACTIVE_LOCKSET.json` is the durable active register of accepted Product Owner decisions for the current product surface.

`docs/00_Governance/AGENT_LOCKSET_PROTOCOL.md` defines the mandatory agent protocol.

If `ACTIVE_LOCKSET.json` contains `activeProgramme.roadmap`, that roadmap is mandatory preflight authority for the active programme. Every agent MUST read it after the active lockset and before recon, audit, implementation, remediation, test repair, CI repair, promotion or acceptance work. The roadmap may narrow execution order and integration gates but never overrides the Constitution, ADRs, Business Rules or locked requirements.

Before any recon, audit, implementation, remediation, test repair, or CI repair, every agent MUST:

1. read this `AGENTS.md`;
2. read `docs/00_Governance/AI_CONSTITUTION.md`;
3. read `docs/00_Governance/PROJECT-CONSTITUTION.md`;
4. read `docs/00_Governance/ACTIVE_LOCKSET.json`;
5. read `activeProgramme.roadmap` when present;
6. run `pnpm run lockset:verify`;
7. output a `LOCKSET COMPLIANCE ACK` containing branch, HEAD, LOCKSET_VERSION, LOCKSET_HASH, role, affected requirement IDs, protected requirement IDs, no-change boundaries, and active programme/stage when present.

If the ACK cannot be established, STOP. Work without the ACK is invalid evidence.

Recon and audit are read-only unless a later explicit implementation instruction is issued.

Implementation agents must produce a LOCKED REQUIREMENT IMPACT MATRIX before editing. If a requested implementation requires changing a LOCKED requirement or a no-change boundary, STOP and escalate before editing.

Accepted requirements must never be silently deleted or weakened. A changed accepted requirement is handled only through explicit Product Owner / Chief Architect authority using SUPERSEDED -> replacement requirement lineage in the active lockset.

CI must never be made green by weakening evidence. Forbidden green-by-bypass tactics include force-clicking required interactions, skipping/deleting locked assertions, relaxing locked geometry/overflow/identity/authority thresholds, hiding an interfering overlay instead of testing the intended runtime, arbitrary timeout inflation, added retries to mask deterministic failure, internal-state navigation that avoids a required user action, or replacing real-browser evidence with source-string checks.

A faulty harness may be repaired only while preserving or strengthening the original evidence.

`CI GREEN` is necessary but is not equivalent to `SEALED`. Where the active lockset requires physical acceptance, physical acceptance remains mandatory.

---

# CI-HARDEN-001 — MANDATORY ENGINEERING GATE

The repository uses a mandatory preflight contract for implementation agents.

Before any implementation change is considered commit-ready, push-ready, PR-ready, or merge-ready, run:

```bash
pnpm run verify
```

`pnpm run verify` must pass completely. A failing preflight means the implementation is NOT complete and must not be pushed or presented as ready for merge.

The verification contract includes:

1. active lockset validation;
2. frozen lockfile consistency;
3. standard TypeScript validation;
4. API-inclusive TypeScript validation;
5. lint;
6. full automated test suite;
7. production build.

If `package.json` dependencies or devDependencies change, `pnpm-lock.yaml` must be regenerated/synchronised and committed in the same change. Never bypass this rule with `--no-frozen-lockfile` in CI.

Implementation work must use a feature/fix/chore branch and a Pull Request into `develop`. Required CI checks must be green before merge. Direct implementation pushes to `develop` are prohibited for agents.

`develop` is the always-green forward-development baseline. `main` receives only accepted green release states.

This CI governance rule does not authorise architecture, business-rule, Site Diary output, or domain-semantics changes.
