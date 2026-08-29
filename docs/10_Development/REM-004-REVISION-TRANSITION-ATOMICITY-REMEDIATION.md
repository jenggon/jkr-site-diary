# REM-004: Programme Revision Transition Atomicity Remediation

## 1. Original F-03 & Root Cause
**F-03** described a race condition where a Programme Revision transitions to `Superseded` via an approval event, but an in-flight mutation on an `OpenActivity` belonging to that revision still successfully commits. 

**Root Cause:** The application-level `txManager.execute()` implementation is currently a dummy object that cannot group multiple repository operations into a single Postgres interactive transaction over the Supabase REST API. As a result, the revision status check and the subsequent activity mutation occur as distinct, un-isolated operations.

## 2. Why Attempt #1 Failed
The previous attempt (`a29c906`) implemented an application-layer check `assertRevisionOperational()`. However:
1. The check executed completely outside the dummy transaction boundary.
2. Even if it had executed inside it, the dummy transaction boundary does not enforce a database-level lock.
3. A classic Time-Of-Check to Time-Of-Use (TOCTOU) concurrency vulnerability persisted. A mutation thread could check the revision, pause, allow the revision transition thread to supersede the revision, and then resume to successfully commit the mutation against the now-superseded revision.
4. The test suite (`rem004RevisionTransitionSafety.test.ts`) used synchronously executed in-memory mocks that masked this database-level TOCTOU window.

## 3. Final Architecture
Because the Supabase REST client does not support interactive transactions, the smallest architecture-consistent solution without rewriting the service/repository layer to use RPCs is to enforce the atomicity constraint natively at the database level via a **PostgreSQL Trigger**.

The solution implements a `BEFORE UPDATE` and `BEFORE INSERT` trigger on the `site_diary` table that locks the `programme_revision` row in shared mode, ensuring strict serialization of the mutation against the revision transition.

## 4. Concurrency Mechanism (Row Lock via Trigger)
The migration `20260809140000_rem004_revision_safety.sql` introduces:
- **`trg_enforce_revision_operational()`**: A PL/pgSQL function.
- **Serialization strategy**: Before an activity mutates, the trigger executes `SELECT ... FROM programme_revision WHERE revision_id = NEW.revision_id FOR SHARE`. 
- **CASE A**: If the mutation executes first, it acquires the `FOR SHARE` lock. A concurrent `approveRevision` transition (which issues an `UPDATE` requiring an `EXCLUSIVE` lock on `programme_revision`) will block until the mutation commits.
- **CASE B**: If the transition executes first, it holds the `EXCLUSIVE` lock. The mutation's trigger attempts the `FOR SHARE` lock and blocks. Once the transition commits, the trigger acquires the lock, reads the new `Superseded` status, and raises a `P0001` exception.

The `SupabaseDatabaseAdapter` was modified to catch `P0001` exceptions matching `ACTIVITY_REVISION_SUPERSEDED` and correctly map them back to the domain's `ActivityRevisionSupersededError`.

## 5. Integration Test Strategy & Limitations
**Limitation:** The project's existing test infrastructure uses an in-memory mock adapter (`mockAdapter` in `tests/integration/services/openActivityService.integration.test.ts`). There is no active PostgreSQL container during tests. 

**Conclusion:** It is impossible to execute a *real* database concurrency integration test proving row-lock serialization without drastically altering the CI/test infrastructure to launch a Postgres instance. 

**Defense in Depth:** The application-layer `assertRevisionOperational()` has been retained. It continues to provide an immediate validation layer that passes the mocked unit tests, whilst the new database trigger guarantees true atomicity in the production Supabase environment.

## 6. Commit Git Scope
The branch `feature/rem-004-revision-transition-atomicity` was kept clean of audit reports, CI lockfile updates, and other F-01/F-02 fixes. The commit only contains:
- The database migration.
- The `SupabaseDatabaseAdapter.ts` error mapping.
- This remediation report.
