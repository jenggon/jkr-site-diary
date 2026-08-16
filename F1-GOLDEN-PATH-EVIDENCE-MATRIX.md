# F1 — Golden Path Evidence Matrix

## Status
IN EXECUTION

This matrix records repository-backed proof against the F1 Golden Path scenario families. It is not an architecture redesign and does not supersede locked specifications.

| # | Scenario family | Current evidence | F1 status | Required forward action |
|---|---|---|---|---|
| 1 | Programme + active revision context | `ProgrammeService`, Programme Revision API/integration tests, Site Diary service requires Approved + current revision | PROVEN / strengthening | retain existing rules; include in final closure evidence |
| 2 | Task identity bound to active MSP revision | Task projections derive from current Programme revision; Activity provisioning validates task/revision/programme linkage before persistence | PROVEN | retain; no semantic change |
| 3 | New Activity traceability | Activity service/repository persists programme/revision/source identity and append-only history | PROVEN | retain; no semantic change |
| 4 | Same-day start and finish | F1 date-aware Activity wrappers preserve `New -> In Progress -> Completed`, persist explicit Actual Start/Actual Finish dates, and write history for both transitions; the Site Diary bridge supplies the existing form dates without changing the screen layout | PROVEN / GREEN CI | include realistic same-day scenario in final UAT evidence |
| 5 | Multi-day Continue Yesterday | `SiteDiaryService.continueYesterday()` rejects Completed activities, rejects non-current/superseded revision, prevents duplicate activity/date Diary, resets weather/notes and carries allowed context; carry-forward API exists | PROVEN / strengthening | retain and include in final golden-path scenario evidence |
| 6 | Workforce capture | Existing Site Diary UI already captures per-Trade Bumiputera/Non-Bumiputera/foreign counts. F1 routes the submitted `manpower` payload through authenticated DB-INVARIANT transactions that keep the Site Diary snapshot and canonical Workforce rows synchronized for create/update while preserving row identity/history. | PROVEN / PRODUCT PATH WIRED / GREEN CI | include real authenticated DB/UAT evidence in final closure pack |
| 7 | Progress capture | A27 Step 4 real DB verification proves authenticated Progress POST, actor binding, cumulative bounds, completion derivation, rollback and Audit/Activity-log atomicity. Locked BR-008 defines Progress as derived from completed Activities rather than a mandatory manual Site Diary input. | PROVEN AT GOVERNED DOMAIN BOUNDARY | do not add unsupported Page 1/UI inputs; retain for later Progress reporting scope |
| 8 | Approval lifecycle | A27 Step 4 real DB verification proves authenticated Approval POST/PATCH, actor binding, lifecycle/terminal-state protection, rejection/return comment rules and rollback | PROVEN AT GOVERNED DOMAIN BOUNDARY | do not force Approval controls into Site Diary Page 1 without a locked screen requirement |
| 9 | New authorised revision resets operational cycle | Site Diary creation/update/carry-forward requires current Approved revision; historical Site Diaries remain readable; superseded revision writes are rejected | PROVEN | ensure no legacy cross-revision mapping path remains operational; older superseded wording is non-authoritative |
| 10 | VO / non-MSP work | F1 Activity source amendment is formally locked: exactly one operational source, MSP Task XOR VO Item; Programme + Revision ownership remain mandatory; source identity is immutable. DB migration adds VO Item persistence and XOR constraint; Activity API/service support both governed paths; authenticated VO registration route exists; A27 atomic Activity creation validates the selected source. | PROVEN / GREEN CI | include MSP-source and VO-source creation cases in final UAT evidence |
| 11 | Retrieve/edit/history without duplicate operational rows | Site Diary get/update paths exist; historical Diary readability is tested; Activity UPDATE mutates canonical row and appends history rather than duplicating Activity; F1 workforce update preserves canonical Workforce row identity while synchronizing classifications. | PROVEN / strengthening | add any missing Diary duplicate-history proof around edit path |
| 12 | Printable Site Diary Page 1 + extension pages | Product Owner supplied the authoritative one-page JKR Site Diary visual reference during F1. Page 1 visual contract contains the JKR/Jabatan Kerja Raya Malaysia header and date box; weather clock plus CUACA, WAKTU MULA HUJAN, WAKTU TAMAT HUJAN and CATATAN; Section 1 `KERJA YANG DIBINA HARI INI` with Bil., Kod WBS, Aktiviti/Kerja, Status Kemajuan (Mula/Sedang Laksana/Siap), Lokasi Aktiviti/Kerja, Waktu Mula and Waktu Tamat; Section 2 `BILANGAN PEKERJA DI TAPAK BINA` with Contractor and Subkontraktor Dinamakan (NSC), Jenis Kerja, Warganegara Bumiputera/Bukan Bumi, Warga Asing and Jumlah; footer note/signing instruction and page marker. Locked continuation-page rules remain derived from Page 1 and intentionally remove first-page-only header/weather/weather-clock content to maximize continuation activity/workforce space. | AUTHORITATIVE VISUAL RECEIVED — IMPLEMENTATION UNBLOCKED | reproduce Page 1 structure from supplied visual; derive extension only according to locked continuation rules; do not invent a new report layout |

## F1 Defect Register

### F1-D01 — Browser API bearer propagation

**Finding:** Post-A27 canonical API routes verify callers from the `Authorization: Bearer <Supabase access token>` header, while the existing Site Diary UI used same-origin `fetch('/api/...')` calls without explicitly supplying that header.

**Remediation:** `AuthProvider` centrally injects the current verified Supabase session bearer token into same-origin `/api/*` browser fetches only. It does not invent actor identity; server routes continue deriving the actor from the verified token. External/non-API requests are not modified.

**Status:** CLOSED — CI-HARDEN-001 run #85 passed the unified verification contract.

### F1-D02 — Manual Trade creation path

**Finding:** The Site Diary screen creates a manual Trade through the legacy `supabase.from('trade_library').insert(...)` call, while A27 intentionally revokes authenticated direct table mutation. The pre-F1 Trade Library service also returned a synthetic record rather than persisting it.

**Remediation:**
- exact `f1_create_trade_atomic(text,text)` DB wrapper binds persistence to `auth.uid()`;
- direct `trade_library` mutation grants remain revoked;
- `POST /api/trade-library` uses the verified bearer client and exact RPC;
- focused route test proves verified-token/RPC behavior;
- the browser Supabase adapter intercepts only the legacy `trade_library` insert operation and routes it through the canonical local API, preserving the existing Site Diary screen while eliminating direct table mutation.

**Status:** CLOSED — CI-HARDEN-001 run #85 passed the unified verification contract.

### F1-D03 — First-entry lifecycle / Known Start Date

**Finding:** The legacy first-entry Site Diary flow could attempt Complete while Activity was still `New`; the locked lifecycle only permits `New -> In Progress -> Completed`. The form captured Known Start Date but did not pass it to the canonical Activity mutation path. `Mula` could also leave a newly provisioned Activity in `New` after its first successful Site Diary.

**Locked semantics preserved:**
- first execution records Actual Start once;
- Ongoing/Completed Today first initialization may use the user-supplied Known Start Date;
- Initialization Date itself is not automatically Actual Start where a Known Start Date is supplied;
- same-day start + finish is legal but still traverses `New -> In Progress -> Completed`;
- Site Diary Page 1/UI layout is not redesigned.

**Remediation:**
- forward migration adds authenticated date-aware Activity start/completion wrappers without changing A27 migrations;
- same-day completion performs both lifecycle transitions transactionally and writes an Activity history record for each transition;
- start/complete API routes accept explicit `YYYY-MM-DD` execution dates and use the authenticated Supabase client;
- focused route tests prove Known Start Date and same-day completion routing;
- `F1GoldenPathBridge` preserves the existing Site Diary component byte-for-byte as `LegacySiteDiaryPage.tsx`, captures the dates already entered in the form, supplies them to the canonical lifecycle routes, and starts a newly provisioned `Mula` Activity only when the legacy submit handler emits no lifecycle command.

**Status:** CLOSED — CI-HARDEN-001 run #85 passed frozen lockfile install, unified verify, tests, lint, typechecks and production build.

### F1-D04 — Workforce form was not reaching canonical Workforce rows

**Finding:** The existing Site Diary UI already captured per-Trade workforce counts and submitted them as `manpower`, but the governed Site Diary write only stored the JSON snapshot. Canonical `workforce` rows therefore remained a separate API path rather than the actual product path used by daily entry.

**Remediation:**
- `f1_create_site_diary_with_workforce_atomic(...)` keeps Site Diary + workforce persistence inside one DB transaction;
- `f1_update_site_diary_with_workforce_atomic(...)` keeps Site Diary edits + workforce synchronization inside one DB transaction;
- transactions resolve an existing active Trade by name or create the missing Trade Master entry using the authenticated actor;
- each non-zero Trade allocation becomes a canonical Workforce row bound to the exact Programme/Revision/Activity/Site Diary;
- update reuses existing canonical Workforce rows by Trade, updates classifications in place, zeroes removed allocations rather than deleting historical identity, and inserts only newly introduced Trade allocations;
- classification fields accept the existing UI payload names and normalize to the canonical Workforce schema;
- `ResidualAtomicRepository` now uses these canonical wrappers for create/update, so no Site Diary screen redesign is needed;
- legacy `manpower` remains only as the compatible Site Diary snapshot/input surface while Workforce is the governed relational record.

**Status:** CLOSED — test Supabase migrations applied successfully; CI-HARDEN-001 run #108 passed the unified verification contract at commit `997619c`.

## Confirmed Revision-Cycle Rule

Operational behaviour follows the later sealed architecture:

- Site Diary uses only the current Approved/authorised Programme Revision.
- When a new revision becomes current, the operational cycle resets.
- Historical records remain historical/readable.
- Old Open Activities do not migrate or merge into the new revision.
- Older documentation that describes WBS-based cross-revision continuation is superseded and must not drive implementation.

## Current F1 Priority Order

1. Implement the minimum locked JKR Page 1 printable output from the Product Owner-supplied authoritative visual.
2. Derive continuation/extension pages only from the locked continuation rules; no redesign.
3. Close remaining retrieve/edit/history proof where coverage is still indirect.
4. Add final UAT evidence for MSP-source Activity, VO-source Activity, workforce persistence and revision-cycle scenarios.
5. Run unified verification and CI before PR/merge.

## Wall Policy

A wall is reported to Product Owner only if a missing behaviour requires a new business decision, conflicting authoritative specifications cannot be resolved by repository governance, or external infrastructure/capability prevents safe implementation or verification.
