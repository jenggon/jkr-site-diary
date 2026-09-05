# PROVEN PROMOTION PROTOCOL

**Status:** Mandatory development doctrine for AI-assisted implementation and remediation work unless explicitly superseded by Product Owner / Chief Architect authority.

## Canonical doctrine

> **LOCK → ISOLATE → PROVE → FREEZE SHA → PROMOTE EXACT SHA → REPROVE → PHYSICAL ACCEPT → SEAL**

This protocol exists to keep accepted product requirements durable while reducing avoidable red runs on authoritative branches.

The authoritative branch is not a debugger. Experimental correction loops belong in an isolated proving branch. Only a proven exact commit SHA may be promoted to the authoritative candidate branch.

## Agentic support model

Agentic assistance is a support capability around `LOCK → ISOLATE → PROVE`; it is not an additional authority stage and does not change the canonical doctrine.

The Chief Architect owns architecture, implementation, remediation and outcome. Codex and Antigravity form an interchangeable **agentic engineering pool** that the Chief Architect may use singly or together according to task risk, repo complexity, available quota and expected value.

Default operating rule:

- use one agent first when agentic help is warranted;
- Codex and Antigravity are interchangeable for reconnaissance, implementation pre-flight review and red-run forensics;
- use a second agent only when risk, uncertainty or first-agent findings justify the extra cost;
- do not require a ceremonial post-green agent audit when encoded evidence and task risk do not justify one;
- agent findings are evidence and engineering input, never automatic implementation authority;
- final technical adjudication remains with the Chief Architect.

### Agentic checkpoint A — recon before implementation

For non-trivial work, reconnaissance should happen after requirements are locked and before or at the start of isolation. Its purpose is to shift discovery left so CI is not used to discover known repo terrain.

A useful recon dossier should identify, as applicable:

1. exact baseline branch, HEAD, lockset version/hash/count;
2. architecture, state and ownership map;
3. locked-requirement impact matrix candidates;
4. protected boundaries and forbidden areas;
5. current root causes;
6. unit, integration, browser and CI tripwires;
7. legacy CSS/state/ownership conflicts and specificity hazards;
8. implementation options and trade-offs;
9. responsive/runtime-only unknowns.

### Agentic checkpoint B — pre-flight review before first PROVE

After the Chief Architect implements the isolated candidate, an available agent may review the exact diff before first CI when the task is multi-file, responsive, stateful, legacy-heavy or otherwise likely to hide cross-cutting defects.

The review should actively hunt for:

- stale selectors or historical authority leaking into the new implementation;
- tests that are genuinely superseded versus tests that still protect a locked requirement;
- CSS specificity/ordering conflicts;
- mobile/half/wide contradictions;
- state lifecycle and persistence mistakes;
- protected-boundary drift;
- likely clean-Ubuntu/build/browser failures.

The objective is to reduce proving-ground correction passes. The target is **implement informed, then prove**, not **implement, then use CI as the primary debugger**.

### Agentic checkpoint C — forensic help after RED

If PROVE or REPROVE is red, the Chief Architect may use any available agent to investigate the failure. The agent's objective is diagnosis, not "make CI green".

The Chief Architect remains responsible for classification and repair.

## Stage 1 — LOCK

Before implementation begins:

- accepted Product Owner decisions must be captured in the active lockset where applicable;
- exact authoritative branch and HEAD must be known;
- lockset version, semantic hash and locked requirement count must be verified;
- affected and protected requirement IDs must be identified;
- no-change boundaries must be explicit.

If a requested implementation requires changing a LOCKED requirement or protected boundary, stop and escalate before implementation.

## Stage 2 — ISOLATE

Create or use a dedicated implementation/proving branch from the exact locked baseline.

Rules:

- do not use the authoritative candidate branch as the experimentation/debugging surface;
- do not disturb unrelated user-local evidence or untracked files;
- keep implementation scope bounded to the approved requirement impact;
- preserve all no-change boundaries.

## Stage 3 — PROVE

The isolated candidate must satisfy the repository's executable contracts before promotion.

At minimum where applicable:

- `pnpm run lockset:verify`;
- typecheck;
- API-inclusive typecheck;
- lint;
- full automated tests;
- production build;
- dedicated real-browser/runtime gate;
- zero retries where required by the active lockset or workflow.

For UI/runtime-sensitive work, **PROVE should mirror the material runtime/browser evidence expected during REPROVE**. A static-only proving pass is insufficient when the authoritative gate will later judge real browser geometry, responsive behaviour or interaction semantics.

A red proving run is acceptable only as evidence that the proving ground rejected an unproven candidate. It must be triaged, not bypassed. The engineering target remains to minimize proving passes through front-loaded repo intelligence and pre-flight review.

### Mandatory red classification

Every proving failure must be classified as one of:

- `PRODUCT_DEFECT` — implementation violates intended behaviour or a locked requirement;
- `SUPERSEDED_TEST` — an old test asserts an implementation detail or behaviour explicitly superseded by a newer lock;
- `HARNESS_DEFECT` — the test/fixture/selector/environment harness is wrong while the requirement remains unchanged;
- `ENVIRONMENT_DEFECT` — clean-runner/platform behaviour differs and requires a bounded compatibility repair.

Repairs must preserve or strengthen evidence. The no-green-by-bypass rule remains absolute.

## Stage 4 — FREEZE SHA

Once the isolated candidate is fully proven, record the exact commit SHA as the immutable candidate artifact.

The frozen SHA must be the same artifact that passed the required proving gates.

Do not claim a candidate is frozen while known red, unverified or mutable work remains.

## Stage 5 — PROMOTE EXACT SHA

Promote the exact frozen SHA to the authoritative candidate branch.

Preferred method: fast-forward the authoritative candidate branch to the exact proven SHA where repository history permits.

The objective is:

> `tested artifact = promoted artifact`

Avoid introducing a new merge-generated implementation SHA between proof and promotion unless repository history requires it. If promotion necessarily creates a different SHA, that new SHA is unproven and must be treated accordingly.

## Stage 6 — REPROVE

The authoritative candidate branch must run its own required CI/runtime gates after promotion.

Target outcome:

- first authoritative remediation run green;
- exact promoted SHA verified;
- zero retries where required;
- no weakening of assertions or product requirements.

If authoritative reproof fails, classify the failure and return to an isolated repair path. Do not normalize repeated red runs on the authoritative candidate branch.

## Stage 7 — PHYSICAL ACCEPT

Where the active lockset requires physical acceptance, the Product Owner inspects the actual product behaviour and presentation.

CI green is necessary but cannot substitute for physical acceptance.

Physical acceptance must be against the exact candidate being considered for seal. If product behaviour changes after acceptance, physical acceptance must be repeated unless the Product Owner / Chief Architect explicitly classifies the change as non-product and outside the acceptance surface.

## Stage 8 — SEAL

Only the Chief Architect may declare the implementation `SEALED`, and only after all required gates for the exact candidate are satisfied.

Typical seal evidence includes:

- lockset PASS;
- exact candidate SHA;
- full verification PASS;
- required real-browser/runtime gate PASS;
- authoritative branch CI PASS;
- required physical Product Owner acceptance PASS;
- protected boundaries intact;
- no outstanding remediation.

`CI GREEN` alone is never `SEALED`.

## Roles

- **Product Owner:** requirement and physical acceptance authority.
- **Chief Architect / HQ:** architecture, implementation, technical adjudication, remediation ownership, promotion and final seal reconciliation.
- **Codex / Antigravity:** interchangeable agentic engineering helpers used at Chief Architect discretion for recon, pre-flight review, forensics or risk-based independent challenge; not implementation authority unless explicitly delegated.
- **GitHub Actions / CI:** executable mechanical judge of encoded contracts.

## Compliance rule

Implementation/remediation work that bypasses this sequence without explicit Product Owner / Chief Architect approval is non-compliant evidence.

Any exception must be documented with:

- reason;
- affected stage(s);
- exact authority approving the exception;
- evidence showing locked requirements were not weakened.
