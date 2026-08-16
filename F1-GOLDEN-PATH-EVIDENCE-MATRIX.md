# F1 — Golden Path Evidence Matrix

## Status
CLOSED CANDIDATE — ALL MANDATORY SCENARIO FAMILIES PROVEN; FEATURE CI GREEN

F1 proves the governed product path from authorised Programme/MSP context through daily Site Diary operation and locked printable output. It does not reopen A01–A27 architecture. The only architecture amendment made during F1 is ADR-F1-001, explicitly authorised by the Product Owner: an Activity has exactly one immutable operational source, MSP Task XOR VO Item, while Programme and Programme Revision ownership remain mandatory.

| # | Scenario family | Closure evidence | F1 status |
|---|---|---|---|
| 1 | Programme + active revision context | Site Diary create/update/carry-forward require the current Approved revision; Programme/Revision services and tests remain authoritative. | PROVEN |
| 2 | Task identity bound to active MSP revision | MSP Activity provisioning validates Programme/Revision/Task ownership before persistence; Task Picker projections resolve from current revision. | PROVEN |
| 3 | New Activity traceability | Activity persists Programme, Revision, operational source and immutable source identity with governed history. | PROVEN |
| 4 | Same-day start and finish | Date-aware lifecycle wrappers preserve `New -> In Progress -> Completed`; Known Start Date and Actual Finish are explicit; focused API tests cover routing. | PROVEN |
| 5 | Multi-day Continue Yesterday | Completed Activities are rejected; non-current revisions are rejected; existing Activity+date Diary is returned instead of duplicated; permitted daily context is carried. | PROVEN |
| 6 | Workforce capture | Site Diary create/update use authenticated full atomic wrappers that synchronize the Diary snapshot with canonical Workforce rows per Trade while preserving row identity/history. | PROVEN |
| 7 | Progress | Existing A27 real-DB proof covers authenticated mutation, actor binding, cumulative bounds, completion derivation, rollback and audit atomicity. BR-008 keeps Progress derived rather than inventing unsupported Page 1 inputs. | PROVEN AT GOVERNED DOMAIN BOUNDARY |
| 8 | Approval lifecycle | Existing A27 real-DB proof covers authenticated Approval mutation, actor binding, lifecycle/terminal-state protection, comments and rollback. No unsupported Page 1 approval UI was added. | PROVEN AT GOVERNED DOMAIN BOUNDARY |
| 9 | New authorised revision resets operational cycle | Site Diary follows only the current Approved revision. Historical records stay readable; superseded revision writes/carry-forward are rejected; no cross-revision Open Activity migration is implemented. | PROVEN |
| 10 | VO / non-MSP work | ADR-F1-001 + DB/domain/business-rule amendment implement MSP Task XOR VO Item; authenticated VO registration and atomic Activity creation preserve Programme/Revision ownership and immutable source identity. | PROVEN |
| 11 | Retrieve/edit/history without duplicate operational rows | Site Diary GET/PATCH paths remain canonical; DB uniqueness protects Activity+date; update mutates the existing Diary; Activity and Workforce identities/history are preserved rather than duplicated. | PROVEN |
| 12 | Printable Site Diary Page 1 + extension pages | Product Owner-supplied Page 1 is the visual contract. `/site-diary/print` reproduces the JKR header/date, weather clock and rain fields, Section 1 activity/status/location/time table, Section 2 Contractor/NSC workforce table, note/footer and page marker. Overflow derives continuation pages without the Page-1-only JKR/weather block. Browser print provides A4 portrait print / Save PDF. | PROVEN |

## F1 Defects Closed

- **F1-D01 — Browser API bearer propagation:** same-origin `/api/*` browser calls use the verified Supabase bearer while server routes remain actor-authoritative.
- **F1-D02 — Manual Trade persistence:** legacy direct mutation is replaced by authenticated atomic Trade creation; table mutation grants remain revoked.
- **F1-D03 — First-entry lifecycle / Known Start Date:** first execution, Known Start Date and same-day completion obey the locked lifecycle without redesigning the Site Diary screen.
- **F1-D04 — Workforce product path:** daily Site Diary manpower now reaches canonical Workforce persistence atomically on create and edit.
- **F1-D05 — Printable operational context:** location, work start/end, weather condition, rain start/end and Contractor/NSC scope persist as governed `print_context`; carry-forward clears day-specific time/weather values while preserving permitted static context.

## Closure Proof

The F1 closure contract test protects the final cross-cutting invariants:

1. locked JKR Page 1 labels/sections and continuation derivation;
2. MSP Task XOR VO Item Activity source rule;
3. Continue Yesterday current-revision and duplicate-safe behavior;
4. full atomic Site Diary + Workforce + printable-context mutation path.

CI-HARDEN-001 final feature-head run **#130** passed at commit `da2ed1490ee79aeb2cc8b50ef16c62e37a75c4ff`.

## Revision-Cycle Rule — Sealed

- Site Diary uses only the current Approved/authorised Programme Revision.
- A newly authorised revision begins a new operational cycle.
- Historical Site Diary records remain historical/readable.
- Old Open Activities do not migrate or merge into the new revision.
- Older cross-revision continuation wording is non-authoritative.

## Remaining Human Validation

F1 establishes engineering/product-path proof. Real field judgement over usability and final print fidelity remains a later UAT responsibility; it is not permission to redesign Page 1 or change locked semantics.

## F1 Exit Assessment

All twelve mandatory scenario families are PROVEN at their required F1 boundary. No unresolved F1 Product Owner decision wall remains. The only remaining mechanical gate is merge to `develop` followed by post-merge CI GREEN.
