# PROVEN PROMOTION PROTOCOL

**Status:** Mandatory development doctrine for AI-assisted implementation and remediation work unless explicitly superseded by Product Owner / Chief Architect authority.

## Canonical doctrine

> **LOCK → ISOLATE → PROVE → FREEZE SHA → PROMOTE EXACT SHA → REPROVE → PHYSICAL ACCEPT → SEAL**

This protocol exists to keep accepted product requirements durable while reducing avoidable red runs on authoritative branches.

The authoritative branch is not a debugger. Experimental correction loops belong in an isolated proving branch. Only a proven exact commit SHA may be promoted to the authoritative candidate branch.

## Recon support activity

Recon is a support activity between `LOCK` and `ISOLATE`; it is not a separate authority stage.

The Chief Architect may use Codex, Antigravity, or both for repo reconnaissance at their discretion. Recon is read-only unless later explicit implementation authority is issued.

A useful recon dossier should identify, as applicable:

1. exact baseline branch, HEAD, lockset version/hash/count;
2. architecture and ownership map;
3. locked-requirement impact matrix candidates;
4. protected boundaries and forbidden areas;
5. current root causes;
6. test and CI tripwires;
7. legacy CSS/state/ownership conflicts;
8. implementation options;
9. runtime-only unknowns.

Recon findings are evidence and engineering input, not implementation instructions. Architecture and implementation adjudication remain with the Chief Architect.

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

A red proving run is acceptable only as evidence that the proving ground rejected an unproven candidate. It must be triaged, not bypassed.

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
- **Chief Architect / HQ:** architecture, implementation adjudication, implementation ownership, promotion and final seal reconciliation.
- **Codex / Antigravity:** recon or independent audit resources at Chief Architect discretion; not implementation authority unless explicitly delegated.
- **GitHub Actions / CI:** executable mechanical judge of encoded contracts.

## Compliance rule

Implementation/remediation work that bypasses this sequence without explicit Product Owner / Chief Architect approval is non-compliant evidence.

Any exception must be documented with:

- reason;
- affected stage(s);
- exact authority approving the exception;
- evidence showing locked requirements were not weakened.
