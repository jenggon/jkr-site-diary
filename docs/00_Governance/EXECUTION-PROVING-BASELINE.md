# EXECUTION AND PROVING BASELINE

**Status:** PRODUCT OWNER LOCKED — BASELINE v1  
**Authority:** Product Owner + HQ / Chief Architect  
**Captured:** 2026-09-07  
**Applies to:** Active NGAMSOI N09+ programme and subsequent governed implementation/remediation work unless explicitly superseded.

## 1. Purpose

This document fixes the default ownership and proving mechanism used to move a governed change from implementation to physical acceptance without using the Product Owner as the shell operator, patch applier, Git operator or test runner.

The baseline is intentionally adjustable. If a real process failure, tool limitation or new project condition proves that a step must change, the workflow is readjusted through explicit Product Owner / Chief Architect governance. Existing accepted history is not silently rewritten.

This baseline does not alter product behaviour, domain ownership, Programme/Revision authority, database/security rules, approval semantics, official print semantics, REKOD #7, immutable history or any other product no-change boundary.

## 2. Role ownership

### Product Owner

The Product Owner is the product authority, not the routine engineering operator.

Normal Product Owner responsibilities are limited to:

1. approve, reject, lock or supersede product/process decisions when escalation is required;
2. authorise remote mutation/promotion where repository governance requires explicit authority, including commit/push of a proven candidate;
3. perform or direct physical product acceptance where human judgement is required.

The Product Owner is not expected to manually edit source files, run PowerShell commands, execute test suites, repair CI, manage Git branches or apply patches as part of the normal workflow.

### Klopp / HQ / Chief Architect

Klopp/HQ owns governance and engineering orchestration:

- establish the exact branch/HEAD and lockset handshake;
- identify affected and protected requirement IDs;
- produce the LOCKED REQUIREMENT IMPACT MATRIX;
- understand context and adjudicate findings;
- define the bounded execution contract;
- review executor output and diffs;
- decide whether a finding returns to implementation or may advance;
- control gate order, freeze eligibility and promotion readiness;
- escalate any required lock/no-change-boundary change to Product Owner authority.

Klopp/HQ is not the default local working-tree executor when no direct local-repository write tool is available. It must not substitute a Product Owner manual edit for a missing local execution channel.

### Codex — default local executor

Codex is the default local working-tree executor for governed implementation/remediation when attached to the repository.

Codex executes the contract issued by Klopp/HQ and may:

- edit only authorised files;
- run targeted tests;
- run the canonical/equivalent preprove contract;
- report exact diffs, results and remaining red gates.

Codex does not gain architectural or product authority by being the executor. It must not broaden scope, reinterpret locks, weaken evidence, or commit/push without the explicit authority required by repository governance.

### Agentic challenger

After a targeted green result, an agentic helper is used as a read-only challenger when the risk warrants it. Antigravity is preferred as an independent challenger when Codex performed the implementation; Codex may be used as challenger when independence is not material or AG is unavailable.

The challenger assumes the candidate may be wrong and attempts to find:

- lock/no-change-boundary leakage;
- incomplete root-cause repair;
- legacy CSS or ownership recurrence;
- state/identity/authority regression;
- browser/runtime mismatch;
- test or harness weakening.

The challenger does not self-authorise a patch. Findings return to Klopp/HQ for adjudication. If repair is required, execution returns to the bounded implementation step.

### CI

CI proves/confirms the already-preproved exact candidate. Official CI is not the preferred first environment in which deterministic candidate defects are discovered.

### Physical acceptance

Physical acceptance remains Product Owner authority. Automated green evidence is necessary where required but is not equivalent to physical acceptance or SEALED status.

## 3. Default execution pipeline

```text
GOVERNANCE PREFLIGHT
├─ exact branch / HEAD
├─ ACTIVE_LOCKSET verification
├─ active programme / stage
├─ affected requirement IDs
├─ protected IDs / no-change boundaries
└─ LOCKED REQUIREMENT IMPACT MATRIX

↓

IMPLEMENT
└─ Codex executes the bounded local working-tree contract

↓

TARGETED TEST
└─ executor runs the smallest authoritative test/browser gate that proves the intended repair

↓

AGENTIC CHALLENGE
└─ read-only challenge of the exact candidate when risk warrants it

↓

PREPROVE — EXACT CI MIRROR
├─ lockset
├─ frozen dependency/install parity
├─ typecheck
├─ typecheck:api where applicable
├─ lint
├─ Vitest / required automated suites
├─ production build
├─ Linux/path/case portability audit
├─ applicable production-runtime browser gate
├─ zero retries
├─ git diff --check
└─ bounded-scope / forbidden-file review

↓

ALL GREEN

↓

FREEZE EXACT SHA

↓

PRODUCT OWNER REMOTE-MUTATION / PROMOTION AUTHORITY

↓

ONE PROMOTION PUSH OF THE FROZEN CANDIDATE

↓

OFFICIAL CI — CONFIRMATION

↓

AUTHORITATIVE REPROVE WHERE REQUIRED

↓

PRODUCT OWNER PHYSICAL ACCEPTANCE

↓

SEAL
```

`ONE PROMOTION PUSH` means the first official-proving push of the frozen candidate should already be fully preproved. It does not mean the repository may literally never receive another push. The objective is to eliminate fix-push-red-fix-push loops from official proving.

## 4. Red-loop behaviour

### Targeted test red

A targeted red stays local.

```text
TARGETED RED
-> Klopp/HQ adjudicates
-> Codex performs bounded repair
-> rerun targeted gate
```

Do not promote a known targeted red candidate.

### Agentic finding

```text
AGENTIC FINDING
-> Klopp/HQ adjudicates
-> if valid: return to IMPLEMENT
-> if invalid/non-material: document disposition and continue
```

The challenger does not patch by default.

### Preprove red

A preprove red stays pre-official.

```text
PREPROVE RED
-> classify root cause
-> Klopp/HQ adjudicates
-> bounded repair
-> rerun affected gate
-> rerun full preprove before freeze
```

### Official CI red

Every official red must be classified at minimum as one of:

- PRODUCT_DEFECT;
- HARNESS_DEFECT;
- ENVIRONMENT_PARITY;
- GOVERNANCE_PREFLIGHT;
- INFRASTRUCTURE.

After an official candidate-caused red, another promotion attempt is not made blindly. The exact failure must be reproduced or otherwise explained, repaired before promotion, and the candidate must return to full green preprove.

Existing N09+ efficiency interpretation remains:

- 0 official reds before first green: excellent;
- 1: classify and learn;
- 2: process miss requiring workflow/recon review;
- 3+: stop repeated proving and improve the mechanism before another attempt.

## 5. Canonical preprove contract

The desired steady-state interface is one stage-aware command, for example:

```text
pnpm run preprove:<stage>
```

The local executor and GitHub official proof should invoke the same underlying proof contract wherever technically possible.

Until that canonical command is implemented for a stage, the executor must run the equivalent ordered gates explicitly. Absence of the convenience command is not permission to omit a gate.

A canonical preprove must not become a green-by-bypass wrapper. It must preserve or strengthen the applicable authoritative evidence.

## 6. Exact-candidate discipline

A candidate is eligible to freeze only when:

- targeted evidence is green;
- required agentic findings are resolved/disposed;
- complete preprove is green;
- diff/scope review confirms protected surfaces remain intact;
- no known red or unverified mandatory gate remains.

After freeze, code is not silently changed before promotion. If the candidate changes, its SHA changes and the relevant proving cycle resumes.

## 7. Execution contract minimum

Before a local executor edits, Klopp/HQ provides a bounded execution contract containing at least:

```text
ROLE=<IMPLEMENTATION|REMEDIATION>
ACTIVE_STAGE=<stage>
BASE_HEAD=<sha>
AFFECTED_IDS=<ids>
PROTECTED_IDS=<ids>
ALLOWED_FILES=<paths>
FORBIDDEN_FILES_OR_DOMAINS=<paths/domains>
CHANGE_INTENT=<bounded change>
TARGETED_EVIDENCE=<command/gate>
PREPROVE_EVIDENCE=<command/gates>
COMMIT_PUSH_AUTHORITY=NOT_GRANTED unless explicitly authorised
```

Executor rules:

- do not touch files outside `ALLOWED_FILES`;
- do not weaken tests/assertions/retries to manufacture green;
- do not stash, reset, clean or otherwise disturb protected evidence/worktree paths;
- stop and report if required repair crosses a protected requirement or no-change boundary;
- report unexpected dirty files instead of deleting or normalising them.

## 8. Current R2A application

For the current N09A Physical R2A remediation, the first product implementation under this baseline is the already-adjudicated one-file bounded CSS repair for the six workforce compatibility inputs that compute a `6px` radius inside REKOD EDIT.

The intended implementation boundary is:

```text
ALLOWED_FILES=src/app/ngamsoi-n09-r2a.css
```

The repair must not alter CATAT, global legacy ownership, workforce semantics, tests/assertions, Programme/Revision authority, canonical Site Diary identity, database/auth/security, approval semantics, REKOD #7, official print semantics or other protected product behaviour.

The product repair does not begin until this process baseline and its required lockset capture are established.

## 9. Supersession / readjustment rule

This baseline may be readjusted when actual process evidence demonstrates a better or necessary mechanism.

Any readjustment that changes an accepted locked process requirement must follow normal supersession lineage:

1. retain the old accepted requirement/history;
2. mark it superseded where represented in the active lockset;
3. create the replacement requirement;
4. record the reason/evidence;
5. obtain Product Owner / Chief Architect authority;
6. update the lockset/version and proving documentation before claiming the replacement active.

No agent may silently reconfigure this baseline because a particular gate is inconvenient.
