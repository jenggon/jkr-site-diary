# REM-005 — Open Activity API & Schema Mapping Remediation

- **Source Audit:** AUDIT-014 — Open Activities Engine
- **Target Score Impact:** Bring AUDIT-014 into full compliance (Target Score ≥ 9.5)
- **Remediation Branch:** `feature/rem-005-a014-open-activity-api-schema`
- **Scope:** F-01 (P2) & F-02 (P3) ONLY

---

## 1. Source Audit
- **Audit ID:** AUDIT-014 — Open Activities Engine
- **Audit Baseline Score:** 9.00 / 10.0 (🟡 CONDITIONAL)
- **Open Findings:**
  - **F-01 (P2):** `CreateActivityRequestDto` is missing `revision_id` and `POST /api/site-diary/[diaryId]/activities` route fails to forward `revisionId` to `OpenActivityService`.
  - **F-02 (P3):** `OpenActivityRepository` mapping schema alignment concerns involving `site_diary` columns.

---

## 2. F-01 Root Cause
- `CreateActivityRequestDto` in `src/app/api/_shared/activity.dto.ts` omitted the mandatory `revision_id` field.
- The HTTP route handler `POST /api/site-diary/[diaryId]/activities/route.ts` did not extract or pass `revisionId` to `OpenActivityService.createActivity()`.
- While `OpenActivityService.createActivity` strictly required and validated `revisionId`, the API layer failed to populate it from the request body.

---

## 3. F-02 Root Cause
- `OpenActivityRepository` mapped `OpenActivityRow` to the table `'site_diary'`, but omitted the `material_snapshot` JSON column mapping required by `OpenActivity` domain model.
- Bi-directional conversion (`mapRowToDomain` and `mapDomainToRow`) omitted `material_snapshot`, preventing material recommendation persistence round-trips.

---

## 4. Canonical API Contract
### Request DTO (`CreateActivityRequestDto`)
```typescript
export interface CreateActivityRequestDto {
  readonly programme_id: string;
  readonly revision_id: string; // EXPLICIT & MANDATORY
  readonly task_id?: string | undefined;
  readonly activity_name: string;
  readonly location?: ActivityLocationDto | undefined;
  readonly trade_info?: TradeSelectionDto | undefined;
  readonly workforce_count?: number | undefined;
  readonly created_by: string;
}
```

### Response DTO (`OpenActivityResponseDto`)
```typescript
export interface OpenActivityResponseDto {
  readonly activity_id: string;
  readonly site_diary_id: string;
  readonly programme_id: string;
  readonly revision_id: string; // EXPLICIT & MANDATORY
  readonly task_id?: string | null;
  readonly activity_name: string;
  readonly location?: ActivityLocationDto | null;
  readonly trade_info?: TradeSelectionDto | null;
  readonly workforce_count?: number | null;
  readonly status: string;
  readonly is_locked: boolean;
  readonly created_at: string;
  readonly created_by: string;
  readonly updated_at?: string | null;
  readonly updated_by?: string | null;
}
```

---

## 5. Canonical Database Mapping
Table `'site_diary'` (Primary key: `id` as specified in `baseline.sql` and `AGENTS.md` locked architecture):
```typescript
export interface OpenActivityRow {
  readonly id: string;
  readonly site_diary_id: string;
  readonly programme_id: string;
  readonly revision_id?: string | null;
  readonly task_id?: string | null;
  readonly activity_name: string;
  readonly location?: Record<string, unknown> | null;
  readonly trade_info?: Record<string, unknown> | null;
  readonly workforce_count?: number | null;
  readonly material_snapshot?: Record<string, unknown> | null; // ADDED
  readonly status: ActivityStatus;
  readonly is_locked: boolean;
  readonly created_at: string;
  readonly created_by: string;
  readonly updated_at?: string | null;
  readonly updated_by?: string | null;
}
```

---

## 6. Files Changed
1. `src/app/api/_shared/activity.dto.ts` — Added `revision_id` to `CreateActivityRequestDto` and `OpenActivityResponseDto`.
2. `src/app/api/_shared/activity.mapper.ts` — Added `revision_id` mapping to `mapActivityToResponseDto`.
3. `src/app/api/site-diary/[diaryId]/activities/route.ts` — Extracted `body.revision_id` and forwarded `revisionId: body.revision_id` to `service.createActivity(...)`.
4. `src/repositories/OpenActivityRepository.ts` — Added `material_snapshot` column mapping to `OpenActivityRow`, `mapRowToDomain`, and `mapDomainToRow`.
5. `tests/unit/rem005OpenActivityApiSchema.test.ts` — Added comprehensive test suite with 12 mandatory scenarios (`TEST-REM005-01` through `TEST-REM005-12`).

---

## 7. Business Rules Preserved
- Activity MUST belong to an approved/operational revision.
- Activity revision MUST match the programme context (`programmeId`).
- Activity revision MUST match the selected task revision (`task.revision_id`).
- No cross-revision activity creation permitted.
- Task UID does NOT override revision identity (different revisions with same Task UID isolated cleanly).
- Historical revision identity remains immutable.

---

## 8. Tests Added/Updated
Unit test suite `tests/unit/rem005OpenActivityApiSchema.test.ts`:
- **TEST-REM005-01:** Valid `revision_id` + valid task revision → activity creation succeeds.
- **TEST-REM005-02:** Missing `revision_id` → request rejected.
- **TEST-REM005-03:** `revision_id` belongs to different programme → rejected (`programme/revision mismatch`).
- **TEST-REM005-04:** `revision_id` does not match task revision → rejected (`task/revision mismatch`).
- **TEST-REM005-05:** Superseded revision → rejected (`Cannot create activity under Superseded revision`).
- **TEST-REM005-06:** Same task UID exists in another revision → correct revision selected and persisted.
- **TEST-REM005-07:** R1 task + R2 revision → rejected.
- **TEST-REM005-08:** R2 task + R1 revision → rejected.
- **TEST-REM005-09:** Repository `create` mapping matches actual DDL (including `material_snapshot`).
- **TEST-REM005-10:** Repository `read` (`findById`) mapping matches actual DDL.
- **TEST-REM005-11:** Repository `update` mapping matches actual DDL.
- **TEST-REM005-12:** No undefined/non-existent column referenced by `OpenActivityRepository`.

---

## 9. Regression Verification
- `npm run typecheck` — 🟢 PASSED (0 errors)
- `npm run lint` — 🟢 PASSED (0 errors, 0 warnings)
- `npm test` — 🟢 PASSED (221 / 221 tests passing across 46 test files)

---

## 10. REM-004 Compatibility
- PostgreSQL database trigger (`trg_enforce_revision_operational`) remains intact.
- `programme_revision` row-locking (`SELECT ... FOR SHARE`) remains intact.
- Error mapping for Postgres `P0001` (`ActivityRevisionSupersededError`) in `SupabaseDatabaseAdapter` remains intact.

---

## 11. Remaining Limitations
- **CI Lockfile Issue:** `ERR_PNPM_OUTDATED_LOCKFILE` in GitHub Actions CI (out of scope for REM-005).
- **Test Infrastructure:** Automated tests use in-memory adapters; real PostgreSQL trigger concurrency tests require live DB environment.
- **UI:** Front-end components for site diary activities remain un-implemented.

---

## 12. Exact Resolution of F-01
`revision_id` is now explicitly declared in `CreateActivityRequestDto`, forwarded by `POST /api/site-diary/[diaryId]/activities/route.ts`, and verified by domain service validation (`OpenActivityService.createActivity`).

---

## 13. Exact Resolution of F-02
`OpenActivityRepository` now accurately maps all canonical `site_diary` table columns (including `material_snapshot` JSONB), ensuring full bi-directional persistence alignment with the DDL schema.
