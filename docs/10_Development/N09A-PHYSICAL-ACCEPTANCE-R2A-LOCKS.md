# N09A — Physical Acceptance R2A Locks

**Programme:** NGAMSOI N09+ UI/UX Closure  
**Stage:** N09A — REKOD current-state propagation and acceptance  
**Round:** Physical Acceptance R2A  
**Authority:** Product Owner + HQ / Chief Architect  
**Status:** PRODUCT OWNER LOCKED  
**Captured:** 2026-09-06  
**Base authoritative HEAD:** `125948e817787296e3712ca8cb47e0dba6e143cd`

## 1. Purpose

This lock captures the bounded remediation authorised after the Product Owner physical acceptance round and the read-only Codex architecture recon. R2A repairs truthful EDIT REKOD behaviour and presentation without redesigning REKOD aggregation, official print aggregation, Activity lifecycle, Programme/Revision authority, database/security, or sealed CATAT semantics.

## 2. Locked R2A requirements

### R2A-P9 — EDIT REKOD truthfulness and preservation

EDIT REKOD must not present a field as editable when the existing canonical PATCH contract does not persist that field.

- Site Diary / Activity / source / revision identity remains read-only context.
- Diary date is read-only in EDIT unless separately authorised later.
- Actual Start is read-only Activity fact in EDIT.
- Daily work status is read-only saved daily fact in EDIT.
- Location, Pelaksana, working-time fields, supported official weather evidence, workforce and notes remain editable only within existing PATCH authority.
- Unsupported `MENDUNG` / `RIBUT` write affordances are not exposed in EDIT.
- EDIT must hydrate exact persisted values and must not fabricate defaults over persisted `null` values.
- An unrelated edit must not clear or replace untouched saved weather evidence, rain evidence/provenance, daily status metadata, workforce or other persisted print-context metadata.
- Existing canonical `site_diary_id`, Approved-current-revision authority and optimistic concurrency token remain mandatory.

### R2A-P10 — CATAT / EDIT visual parity with separate controllers

EDIT REKOD must read visually as the same NGAMSOI form family as CATAT, following the same top-to-bottom field grammar where applicable:

`SUMBER -> HARIAN -> TAPAK -> CUACA -> PEKERJA -> CATATAN -> SAVE/CANCEL`

Visual parity does **not** authorise creation semantics in EDIT.

- CATAT remains the creation/lifecycle controller.
- EDIT remains a canonical existing-Site-Diary PATCH controller.
- `CatatEntryForm` must not be used as a drop-in EDIT engine when doing so would create Activities or invoke lifecycle start/complete operations.
- Source identity in EDIT is shown as read-only context, not re-selectable ownership.
- Read-only HARIAN facts use the accepted NGAMSOI presentation without becoming editable.
- Existing workforce counts must be preserved exactly; no old nine-row default may replace an intentionally empty saved workforce.

### R2A-P11 — Shared HARIAN / REKOD date visual authority

The REKOD date-range controls must use the same user-facing date-control visual grammar as the accepted CATAT HARIAN date control.

- CATAT semantics remain unchanged.
- REKOD retains independently clearable `Tarikh mula` and `Tarikh akhir` range filters.
- REKOD retains inclusive range filtering.
- REKOD retains local-today `max` and future-date clamp.
- Past dates remain allowed; no new past-date minimum is introduced.
- One visual owner must govern the shared date-control presentation; conflicting REKOD-specific overrides must be retired or narrowed.

### R2A-P12 — Strong back signalling

Within current N09A scope, the REKOD detail/edit parent action must be visually unmistakable as navigation back to the record context, using an explicit back affordance such as a left-arrow plus clear text.

This lock covers signalling only. URL/history state, browser Back/Forward, Android edge-back, dirty-edit departure policy, scroll/focus restoration and true device gesture proof remain deferred to N09C / separately governed navigation work.

### R2A-P13 — Exact-record print handoff truthfulness

The existing individual-record print handoff remains exact-record print semantics. Its user-facing CTA must not imply a complete date-wide official Buku Harian when only one exact Site Diary is supplied.

- Exact `site_diary_id` print identity remains unchanged.
- Current exact print API/repository/DTO/pagination semantics remain unchanged.
- No `/api/reports` substitution or date-wide aggregation is authorised in R2A.
- The individual-detail CTA must use truthful exact-record wording (for example `Cetak Rekod Ini`) rather than `Cetak Buku Harian Tapak`.

## 3. Explicitly deferred / not authorised by R2A

The following physical findings are real but remain outside this bounded remediation:

- Date-grouped REKOD ledger redesign / REKOD #7 aggregation redesign.
- Date-level official `Cetak Buku Harian` action.
- True Programme + Revision + date-wide Site Diary aggregation.
- Workforce de-duplication or daily attendance aggregation rules.
- Daily weather/notes conflict-resolution rules for official output.
- Daily approval redesign.
- Browser URL/history navigation architecture and Android edge-back behaviour.
- Database/migrations, RLS/RBAC/authentication/security or new capability contracts.
- Activity date, Actual Start, source ownership or lifecycle mutation from EDIT.
- Official print content/status/weather/pagination semantic changes.

## 4. Locked requirement impact matrix

| Area | R2A action | Protected boundary |
| --- | --- | --- |
| EDIT REKOD | Repair truthfulness, exact hydration/preservation and NGAMSOI presentation | Canonical Site Diary identity, PATCH/concurrency, Activity ownership/lifecycle |
| CATAT | Reuse/share presentation only where safe | F4.5 sealed CATAT behaviour and MULA/LAKSANA/SIAP semantics |
| REKOD date filters | Share visual authority and keep range/max-today semantics | No daily grouping/aggregation redesign |
| Detail back action | Strengthen signalling | No browser-history architecture in R2A |
| Detail print action | Rename to truthful exact-record copy | No official daily-print aggregation/content change |
| Tests | Strengthen EDIT mutation/readback preservation and computed date parity | No skipped/deleted/weakened locked assertions; retries remain zero |

## 5. Mandatory evidence before R2A can return to PO physical acceptance

1. `pnpm run lockset:verify` PASS on the candidate.
2. Targeted tests for EDIT hydration/PATCH preservation and date presentation.
3. Full `pnpm run verify` PASS.
4. Production-runtime real-browser N09A gate with `--retries=0`.
5. Browser proof must exercise EDIT mutation/readback, not only enter-and-cancel.
6. Exact candidate SHA frozen and authoritative reprove green.
7. Product Owner resumes physical acceptance; R2A is not sealed by CI alone.

## 6. No-green-by-bypass

Do not make R2A green by changing product semantics to satisfy stale tests, weakening identity/concurrency assertions, skipping EDIT readback, adding retries, force-clicking, opening internal state directly to bypass normal UI, or replacing required browser evidence with source-string checks.

## 7. Completion meaning

R2A closes only the bounded truthfulness/presentation issues above. It does not close date grouping, daily official print aggregation or mobile history/gesture architecture. N09A itself remains unsealed until Product Owner physical acceptance is complete.
