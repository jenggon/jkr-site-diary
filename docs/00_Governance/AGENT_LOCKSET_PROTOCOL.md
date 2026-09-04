# AGENT LOCKSET PROTOCOL

**Status:** Mandatory for all AI recon, audit, implementation and remediation work.

## Purpose

The active product lockset is the durable record of accepted Product Owner decisions that must survive across chats, agents, refactors and CI changes.

Canonical file:

`docs/00_Governance/ACTIVE_LOCKSET.json`

The lockset supplements, and never overrides, the Project Constitution, ADRs, Business Rules, Domain Documentation or AGENTS.md.

## Mandatory preflight

Before an agent performs recon, audit, implementation, remediation, test repair or CI repair, it MUST:

1. Read `AGENTS.md`.
2. Read `docs/00_Governance/AI_CONSTITUTION.md`.
3. Read `docs/00_Governance/PROJECT-CONSTITUTION.md`.
4. Read `docs/00_Governance/ACTIVE_LOCKSET.json`.
5. Run `pnpm run lockset:verify` and capture both `LOCKSET_VERSION` and `LOCKSET_HASH`.
6. Identify the requirement IDs affected by the requested work.
7. Identify all requirement IDs and no-change boundaries that must remain untouched.

The first section of every agent report MUST be:

```text
LOCKSET COMPLIANCE ACK
BRANCH=<branch>
HEAD=<sha>
LOCKSET_VERSION=<version>
LOCKSET_HASH=<sha256>
ROLE=<RECON|AUDIT|IMPLEMENTATION|REMEDIATION>
AFFECTED_IDS=<comma-separated IDs or NONE>
PROTECTED_IDS=<comma-separated IDs>
NO_CHANGE_BOUNDARIES=<summary>
```

If the agent cannot establish this ACK, it MUST STOP. Work without this ACK is invalid evidence.

## Product decision capture

Explicit Product Owner decisions that lock, accept, change, supersede, freeze, keep or forbid behaviour must be captured in `ACTIVE_LOCKSET.json` before the next implementation is considered complete.

Accepted requirements are never silently deleted. If an accepted requirement changes:

1. mark the old entry `SUPERSEDED`;
2. set `supersededBy` to the replacement requirement ID;
3. add the replacement requirement as `LOCKED`;
4. increment `locksetVersion`;
5. run `pnpm run lockset:verify`;
6. update tests/evidence where the accepted behaviour changed.

Only Product Owner / Chief Architect authority may approve a requirement change. An agent may report that a lock conflicts with implementation, but may not rewrite the lock to fit code.

## Recon and audit rules

Recon and audit are read-only unless a later explicit implementation instruction is issued.

Reports MUST evaluate implementation against the lockset, not the reverse. Findings must name the affected requirement IDs.

A stale test, selector or implementation detail that conflicts with a current LOCKED requirement is subordinate to the lock and must not be treated as authority merely because it existed earlier.

## Implementation rules

Before editing, implementation agents MUST produce a `LOCKED REQUIREMENT IMPACT MATRIX` containing:

- affected requirement IDs;
- protected requirement IDs;
- files expected to change;
- files/domains forbidden to change;
- verification evidence required after the change.

If implementation requires changing a LOCKED requirement or no-change boundary, STOP and escalate before editing.

## No green-by-bypass rule

CI green is valid only when the evidence remains equal or stronger.

The following are forbidden as a means of making CI green unless the Product Owner / Chief Architect explicitly approves a justified replacement with equal-or-stronger evidence:

- `force: true` to bypass user actionability;
- skipped or deleted assertions protecting a LOCKED requirement;
- relaxed geometry, overflow, identity, authority or state thresholds;
- hiding or moving an interfering overlay instead of testing the intended runtime;
- arbitrary timeout inflation;
- adding retries to mask deterministic failure;
- opening internal state or URLs to avoid a required user interaction;
- replacing real-browser evidence with source-string presence checks;
- changing production behaviour solely to satisfy a faulty harness.

When a harness is wrong, repair the harness while preserving or strengthening the original requirement evidence.

## Required completion report

An implementation or remediation report is not complete without:

1. exact branch and HEAD;
2. `LOCKSET_VERSION` and `LOCKSET_HASH`;
3. affected requirement IDs;
4. explicit statement that protected IDs and no-change boundaries remained intact;
5. targeted test results;
6. full `pnpm run verify` result;
7. real-browser gate result where required;
8. physical acceptance status where required;
9. explicit disclosure of any remaining red or unverified gate.

`CI GREEN` alone is never equivalent to `SEALED`.
