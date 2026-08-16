# F1 — Golden Path Product Proof

## Status
IN EXECUTION

## Authority
F1 starts from the sealed F0 `develop` baseline and must not reopen A01–A27 architecture decisions or alter established business semantics.

## Product Purpose Guardrail
The application remains a digital JKR Site Diary system. Supporting engines exist to capture, validate, preserve and reproduce the approved Site Diary record. The final printable contract remains the established Site Diary first-page layout with extension page(s) only when required by the locked specification.

F1 MUST NOT redesign the official printable output, invent an alternative report as the product endpoint, or expand scope merely to improve architecture.

## Objective
Prove that the existing governed implementation supports the real operational golden path end-to-end, identify only genuine implementation gaps, repair those gaps without changing locked semantics, and leave `develop` green.

## Golden Path

```text
Programme
  -> authorised Programme/MSP Revision
  -> imported Task/WBS context
  -> Activity selection/creation under the active revision
  -> daily Site Diary record
  -> Workforce capture
  -> Progress capture
  -> Approval lifecycle
  -> Open Activity / continue-yesterday behaviour where applicable
  -> retrieve/edit within allowed state
  -> printable Site Diary output / extension page when required
  -> downstream MSP/validation projection where already specified
```

## Mandatory Scenario Families
F1 shall prove, at minimum:

1. Programme and active revision context is established correctly.
2. Task selection remains bound to the active MSP revision and correct Task identity.
3. A new Activity can start and remain traceable to Programme, Revision and Task.
4. Same-day start-and-finish behaviour is supported where allowed by the locked Activity rules.
5. Multi-day work remains open and can continue on the next Site Diary date without duplicate operational records.
6. Workforce is captured against the correct Site Diary/Activity context.
7. Progress is captured against the correct Site Diary/Activity context.
8. Approval state changes preserve ownership, history and mutation boundaries.
9. Authorising a new Programme Revision resets operational Site Diary behaviour according to the sealed revision-cycle rules; historical records remain historical and are not silently continued into the new cycle.
10. VO/non-MSP work follows the already-approved VO treatment and is not silently converted into an MSP Task.
11. Read/retrieve/edit behaviour respects immutable/history rules and does not duplicate daily records.
12. Printable output preserves the locked Site Diary Page 1 contract and uses continuation/extension pages only as specified when content exceeds available space.

## Execution Method
For each scenario family:

1. Trace current implementation from API/service/repository/schema/UI/output path.
2. Reuse existing automated tests where they already prove the behaviour.
3. Add focused tests when proof is missing.
4. If implementation contradicts a locked requirement, treat it as an F1 defect and repair only the minimum necessary path.
5. Do not change architecture or business semantics to make a test pass.
6. Run `pnpm run verify` before any implementation is considered push/PR ready.
7. GitHub CI must be green before merge.

## Stop / Escalation Conditions
HQ must stop and report a wall before changing code if:

- two locked specifications materially contradict each other and precedence cannot be established from repository governance;
- satisfying F1 requires a new business rule or Product Owner decision;
- a required test depends on unavailable external credentials/infrastructure that cannot be safely simulated or inspected;
- completing the proof would require redesigning the locked Site Diary printable output;
- repository/tool capability prevents reliable implementation or verification.

## Non-Goals
F1 is not:

- a new architecture audit series;
- a UI redesign programme;
- a dashboard expansion phase;
- a speculative refactor;
- a security hardening phase beyond defects directly blocking the golden path;
- F2 feature development.

## CI-HARDEN-001 Gate
Every implementation change remains governed by CI-HARDEN-001:

```text
implement
  -> pnpm run verify
  -> PASS
  -> commit/push
  -> PR CI
  -> GREEN
  -> HQ review
  -> merge to develop
  -> post-merge CI GREEN
```

No red implementation is accepted as complete.

## F1 Exit Gate
F1 can be closed only when:

- all mandatory scenario families have evidence;
- genuine F1 defects found during proof are resolved or explicitly blocked by a reported wall;
- no locked architecture/business/output semantics were changed without Product Owner authorization;
- unified verification passes;
- PR CI is green;
- merged `develop` CI is green;
- an F1 closure report records the proven paths, repairs, remaining intentional deferrals, and UAT items that require human judgement.
