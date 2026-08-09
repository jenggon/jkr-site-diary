# S1 — MSP FILE INGESTION & PROGRAM KERJA TASK CANONICALIZATION REPORT

**Project:** JKR Site Diary Platform  
**Sprint:** S1  
**Branch:** `feature/s1-msp-ingestion`  
**Date:** 2026-08-09  

---

## 1. Status

```
🟢 COMPLETED
```

All 16 phases of Sprint S1 have been implemented, tested, and verified.

---

## 2. Files Changed & Created

### Created (9 files)
- `src/errors/mspErrors.ts` — Application errors (`MspDuplicateImportError`, `MspXmlParseError`, `MspIngestionValidationError`)
- `src/services/MspTradeInferencer.ts` — Deterministic trade code/name inferencer
- `src/services/MspXmlParser.ts` — Secure XML parser (`processEntities: false`) using `fast-xml-parser`
- `src/services/IMspIngestionService.ts` — Service interface & DTO definitions
- `src/services/MspIngestionService.ts` — Core ingestion orchestration service
- `src/composition/mspIngestionComposition.ts` — Composition root factory
- `src/app/api/programme/[programmeId]/ingest/route.ts` — Next.js API route (`POST /api/programme/[programmeId]/ingest`)
- `tests/unit/mspIngestion.test.ts` — Unit & integration test suite (26 test cases)
- `docs/10_Development/S1-MSP-INGESTION-IMPLEMENTATION-REPORT.md` — Implementation report

### Modified (5 files)
- `package.json` — Added `fast-xml-parser: ^4.5.3` to explicit dependencies
- `src/repositories/taskRepository.ts` — Added `bulkCreateTasks` method
- `src/types/programmeRevision.ts` — Added `msp_file_name` and `msp_file_hash` fields
- `src/repositories/types/programmeRow.ts` — Updated row types with `msp_file_name` and `msp_file_hash`
- `src/repositories/mappers/ProgrammeRowMapper.ts` — Updated domain/row mapper for `msp_file_name` and `msp_file_hash`

---

## 3. Architecture Implemented

```
MSP XML File Upload (POST /api/programme/[programmeId]/ingest)
        ↓
[IngestMspXmlCommand Validation]
        ↓
[Compute SHA-256 msp_file_hash (Crypto)]
        ↓
[Duplicate Hash Check (Per Programme via revisionRepository)]
        ↓
[Parse XML via fast-xml-parser (MspXmlParser)]
        ↓
[Infer Trade Codes / Names (MspTradeInferencer)]
        ↓
[DatabaseTransactionManager.execute()]
  ├─ Create ProgrammeRevision (Draft/Approved, msp_file_name, msp_file_hash)
  └─ Chunked Bulk Insert into canonical `task` table (chunkSize = 300)
        ↓
[Canonical Tasks Available via ProgramKerjaBoundaryService for TRE / WRE / MRE]
```

---

## 4. Canonical Field Mapping

| MSP Source (XML) | Canonical Destination | Transformation |
|---|---|---|
| `Task.UID` | `task.task_uid` | `parseInt(t.UID, 10)` |
| `Task.Name` | `task.task_name` | `String(t.Name ?? '').trim()` |
| `Task.WBS` | `task.wbs` | `t.WBS ? String(t.WBS) : null` |
| `Task.OutlineNumber` | `task.outline_number` | `t.OutlineNumber ? String(t.OutlineNumber) : null` |
| `Task.OutlineLevel` | `task.outline_level` | `parseInt(t.OutlineLevel, 10)` |
| `Task.Start` | `task.planned_start` | ISO 8601 string or `null` |
| `Task.Finish` | `task.planned_finish` | ISO 8601 string or `null` |
| `Task.Duration` | `task.planned_duration_days` | ISO duration / hours converted to 8-hour days |
| `Task.Milestone` | `task.is_milestone` | `Milestone === 1` |
| `Task.Summary` | `task.is_summary` | `Summary === 1` |
| Task Name Keyword | `task.trade_code` | `MspTradeInferencer.inferTrade()` |
| Task Name Keyword | `task.trade_name` | `MspTradeInferencer.inferTrade()` |
| Ingestion Target | `task.programme_id` | `cmd.programmeId` |
| Ingestion Target | `task.revision_id` | `revisionId` (generated UUID) |
| SHA-256 Hash | `programme_revision.msp_file_hash` | Hexadecimal 64-char string |
| File Name | `programme_revision.msp_file_name` | String filename |

> **Deprecated Paths:** Legacy `msp_tasks` and `projects` tables used in prototype scripts are strictly deprecated and NOT used by production ingestion.

---

## 5. Security & Integrity Decisions

- **XXE Prevention:** `fast-xml-parser` configured with `processEntities: false` and `ignoreAttributes: false`.
- **Max File Size:** API route enforces a 120 MB maximum file upload limit, accommodating the official 95 MB `samples/fptv-upsi-rev00.xml` fixture with 25% headroom.
- **Duplicate Hash Scope:** Duplicate check is scoped per programme (`findByProgrammeId`). Importing the exact same file hash into the *same* programme returns `MspDuplicateImportError`. Importing the same file into a *different* programme is allowed.
- **Duplicate Task UID Handling:** If an MSP XML file contains duplicate `Task.UID` values within the same import, parsing fails fast with `MspXmlParseError`.

---

## 6. Transaction & Chunking Strategy

- Entire ingestion operation is wrapped inside `DatabaseTransactionManager.execute()`.
- Revision record creation and canonical task bulk insertion execute inside a single transaction.
- Task bulk insertion is chunked into batches of 300 rows (`chunkSize = 300`).
- If any chunk fails, the transaction rolls back cleanly, leaving zero orphaned records.

---

## 7. Trade Inference Rules

Deterministic keyword rules in `MspTradeInferencer.ts`:

- "konkrit" / "concrete" $\rightarrow$ `CONCRETOR` ("Concrete Specialist")
- "tetulang" / "rebar" / "steel" $\rightarrow$ `BAR_BENDER` ("Bar Bender")
- "acuan" / "formwork" / "kayu" $\rightarrow$ `CARPENTER` ("Formwork Carpenter")
- "paip" / "plumbing" $\rightarrow$ `PLUMBER` ("Plumbing Specialist")
- "cat" / "paint" $\rightarrow$ `PAINTER` ("Painting Specialist")
- No match $\rightarrow$ `trade_code = null`, `trade_name = null` (TRE falls through to Knowledge Engine / Trade Library).

---

## 8. API Endpoint Contract

- **Route:** `POST /api/programme/[programmeId]/ingest`
- **Request:** `multipart/form-data` with `file` field, or `application/json` with `xml_content`.
- **Responses:**
  - `201 Created`: `{ data: { revision: ProgrammeRevision, taskCount: number, fileHash: string } }`
  - `400 Bad Request`: Validation or XML parse error
  - `409 Conflict`: Duplicate SHA-256 file hash detected for programme (`MSP_DUPLICATE_IMPORT`)
  - `413 Payload Too Large`: Exceeds 120 MB file size limit
  - `500 Internal Server Error`: Unexpected error

---

## 9. Test Verification Results

| Suite | Result | Details |
|---|---|---|
| **`npm run typecheck`** | 🟢 **PASS** | `tsc --noEmit` exited with code 0 (0 errors) |
| **`npm test`** | 🟢 **PASS** | 43 test files passed, 196 tests passed (0 failures) |
| **`npm run lint`** | 🟢 **PASS** | `eslint .` exited with code 0 (0 errors, 0 warnings) |

---

## 10. Git Status

- **Branch:** `feature/s1-msp-ingestion`
- **Working Tree:** Uncommitted changes ready for commit.
- **Remote Push / Merge:** NOT pushed, NOT merged to develop.

---

## 11. Known Limitations

- **XML Only:** Binary `.mpp` files are not supported in MVP (XML format required).
- **Trade Keyword Coverage:** Initial rule set covers 5 major civil trades. Unrecognized task names fall back to `null` trade classification, allowing TRE Priority 2/3 fallbacks.

---

## 12. Recommended Next Audit

`AUDIT-012 — MSP Ingestion Implementation Verification`
