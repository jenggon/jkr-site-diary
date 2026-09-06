# N09A — PHYSICAL ACCEPTANCE ROUND 1 LOCKS

**Project:** JKR Site Diary / NGAMSOI  
**Stage:** N09A — REKOD current-state propagation and acceptance  
**Status:** PRODUCT OWNER LOCKED / REMEDIATION REQUIRED  
**Captured:** 2026-09-06  
**Authority:** Product Owner + HQ / Chief Architect  
**Authoritative pre-remediation branch head:** `7d9cf7227263c0b4eaec8ef311a700f50cf5432b`

## 1. Purpose

This record captures the Product Owner's first physical-acceptance findings after the initial N09A exact-head PROVE and authoritative REPROVE were green.

N09A is **not physically accepted** and is **not sealed**. The findings below are locked before bounded remediation so the implementation cannot drift, expand scope, or reinterpret the Product Owner's decisions.

The objective is to remediate only the accepted findings, restore a complete human acceptance path, run shift-left pre-prove review, then resume Product Owner physical acceptance.

## 2. Product Owner findings P1–P8

### P1 — User-facing `MSP` is misleading

`MSP` is an implementation/planning term and is not suitable as the normal user-facing source label.

**LOCKED presentation:**

```text
internal/sourceType = MSP
user-facing label   = Skop Kontrak
```

The internal `MSP` sourceType, persistence, task identity, revision authority, WBS/UID and API semantics remain unchanged.

### P2 — User-facing `VO/APK` is unnecessarily technical

The combined `VO/APK` label is not the accepted field language.

**LOCKED presentation:**

```text
internal/sourceType = VO
user-facing label   = Perubahan Skop (VO)
```

`VO` remains the underlying source semantic. `/APK` is not exposed as the normal source-category label. Specific VO references such as `VO-01` remain valid where they identify an actual variation item.

### P3 — Source vocabulary must be consistent across the application path

The mapping in P1/P2 must be used consistently at least in:

- CATAT source selector;
- selected-source summary/metadata where the source category is shown;
- REKOD source filter;
- REKOD record/ledger source badge or source-category presentation;
- REKOD `Lihat Butiran` header/context.

Do not change internal `MSP | VO` values merely to obtain the new copy.

### P4 — `Pelaksana` is accepted and must remain

The current user-facing executor language is accepted:

```text
PELAKSANA
- Kontraktor Utama
- NSC
```

Do not reopen this terminology during N09A remediation. Existing persistence/domain value `CONTRACTOR` remains internal.

### P5 — REKOD date controls must use the HARIAN date grammar

The REKOD date-filter controls must visually and interactionally belong to the same date-control family as the accepted CATAT `HARIAN` date control.

This is a UI grammar requirement, not a request to collapse REKOD into a single-day view. REKOD retains `Tarikh mula` and `Tarikh akhir` range semantics.

Where practical, the same product-owned date class/control grammar is reused rather than introducing another parallel date style.

### P6 — Future dates are forbidden

Operational diary-date selection must not allow a date later than the user's current local date.

**LOCKED rule:**

```text
date <= current local date
past dates = allowed
future dates = forbidden
```

This applies to the CATAT `HARIAN` diary date and to REKOD `Tarikh mula` / `Tarikh akhir` filters.

This does not change Programme dates, Actual Start authority, historical record semantics, provider evidence rules or database authority.

### P7 — Save -> Tunjuk Rekod must produce an inspectable record in interactive preview

During Product Owner acceptance at `?preview=ngamsoi`, CATAT Save succeeded and `Tunjuk Rekod` navigated to REKOD, but the preview read model returned no current record.

This blocks the normal physical-acceptance path.

**LOCKED remediation boundary:**

- the development-only NGAMSOI interactive preview may maintain in-memory acceptance state;
- a successful preview Save must become visible through the preview REKOD current-revision read path;
- the preview must expose enough canonical-shaped data for normal UI inspection;
- production API, persistence, database, RLS/RBAC, auth and domain semantics must not be changed merely to make preview work;
- no production auth bypass or test-only production route may be introduced.

The observed preview gap is not evidence that production persistence is broken.

### P8 — `Lihat Butiran` / `Edit Rekod` acceptance path must be physically reachable

Product Owner cannot be required to accept controls that the provided acceptance environment cannot reach.

The interactive preview must expose at least:

- one current Approved, editable Site Diary record;
- one historical Superseded, read-only Site Diary record;
- current record card -> `Lihat Butiran`;
- current detail -> workforce `B / BB / A / JUMLAH` readback;
- audit/history presentation;
- print handoff visibility;
- `Edit Rekod` when edit authority is valid;
- `Batal` / return path from edit mode;
- historical detail with `Sejarah / Baca Sahaja` and no edit affordance.

The preview may simulate these states only inside the existing development-only `preview=ngamsoi` boundary. It must preserve canonical IDs and the existing edit-authority checks rather than bypassing them.

## 3. Bounded remediation scope accepted by Product Owner

The implementation scope is exactly:

1. Fix source wording:
   - `MSP` -> `Skop Kontrak`
   - `VO/APK` -> `Perubahan Skop (VO)`
2. Apply the same source wording in:
   - CATAT source selector;
   - REKOD filter;
   - record card;
   - detail header.
3. Fix REKOD date grammar:
   - visually align with HARIAN date control;
   - future date forbidden;
   - past date allowed.
4. Fix the development-only interactive preview fixture:
   - Save must persist into preview REKOD state.
5. Preview must expose at least:
   - one current editable record;
   - one historical read-only record.
6. From normal UI, the Product Owner must be able to exercise:

```text
CATAT
-> Save
-> Tunjuk Rekod
-> current record card
-> Lihat Butiran
-> Edit Rekod
-> Batal
-> historical record
-> read-only detail
```

7. Only after the path above is physically reachable does Product Owner acceptance resume.

## 4. Implementation authority matrix

### Expected bounded files

Likely implementation surfaces include:

- shared source-presentation helper or equivalent bounded copy owner;
- `OperationalSourceSelector.tsx`;
- `CatatEntryForm.tsx` for future-date guard only;
- `DiaryManagementList.tsx`;
- `DiaryDetail.tsx`;
- `src/lib/ngamsoiPreview.ts`;
- N09A tests / browser evidence;
- existing N09A CSS only if required to make REKOD date controls faithfully reuse the HARIAN grammar.

### Protected / forbidden domains

Do not change for this remediation:

- NGAMSOI mark geometry;
- REKOD #7 daily aggregation / daily approval redesign;
- official Print content/aggregation semantics;
- Approval business semantics;
- Activity/Site Diary ownership;
- canonical Site Diary identity;
- Programme/Revision authority or no-cross-revision policy;
- immutable audit/history semantics;
- database schema/migrations;
- RLS/RBAC/authentication/security;
- production persistence just to satisfy interactive preview;
- official weather authority;
- MULA/LAKSANA/SIAP/MULA_DAN_SIAP lifecycle semantics;
- accepted Pelaksana semantics.

If a correction cannot be completed without one of those changes, STOP and escalate.

## 5. Required evidence after remediation

Before any new official N09A PROVE:

1. lockset verification must pass;
2. targeted unit/integration tests must protect P1–P8;
3. the existing N09A browser contract must remain equal-or-stronger;
4. a development-preview browser path must demonstrate Save -> REKOD -> Detail -> Edit/Cancel and historical read-only reachability without bypassing normal navigation;
5. wide / half / phone overflow and critical layout checks remain protected;
6. Playwright retries remain `0`;
7. one agentic pre-PROVE review (AG or Codex) independently challenges the remediation;
8. only after that review is green should HQ freeze and run exact-head PROVE.

## 6. CI / proving discipline

The assistant is used **upstream to prevent avoidable CI reds**, not to manufacture green CI.

For this remediation:

```text
LOCK P1-P8
-> KLOPP BOUNDED IMPLEMENTATION
-> AGENTIC PRE-PROVE REVIEW
-> REPAIR only valid findings if any
-> EXACT-HEAD PROVE
-> FREEZE
-> AUTHORITATIVE REPROVE
-> CONTINUE PO PHYSICAL ACCEPTANCE
```

Do not push the remediation directly to the authoritative `feature/N09A-ngamsoi-records-current-state` branch before the pre-PROVE review is complete. Work remains isolated until it is proven.

## 7. Acceptance state

```text
N09A automated proving before physical round   PASS
N09A physical acceptance                      FAIL / REMEDIATION REQUIRED
P1-P8                                          LOCKED
bounded remediation                           AUTHORISED
N09A seal                                      BLOCKED
N09B                                           BLOCKED until N09A PASS
```
