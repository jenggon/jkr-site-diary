# HQ ENGINEERING SPECIFICATION
## DEV-012I — Performance & Scalability Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-001 through DEV-012H  

---

# 1. Purpose & Objectives

- **Business Objective:** Support nationwide Malaysian public infrastructure site logging across thousands of concurrent active construction sites with zero degradation during peak shift-end submission hours (17:00 - 19:00).
- **Operational Objective:** Ensure instant response times for mobile field engineers submitting daily logs and Superintending Officers (SOs) reviewing progress reports.
- **System Objective:** Establish a vendor-neutral, technology-agnostic Performance & Scalability Architecture governing resource budgeting, caching, batch execution, database tuning, and horizontal expansion per **ARCH-000**.

---

# 2. Performance Philosophy

- **Predictable Performance:** System response times MUST remain consistent regardless of dataset growth over multi-year contract lifecycles.
- **Scalability First:** All services designed as stateless, horizontally scalable execution units.
- **Performance Budgets:** Strict latency, memory, and CPU limits assigned to every API endpoint and service method.
- **Performance by Design:** High-performance database query access patterns, composite indexing, and caching designed into the schema upfront (**DB-021**).
- **Capacity Planning:** System capacity modeled against projected nationwide expansion up to 10,000 active projects over 5 years.

---

# 3. Performance Targets & Budgets

- **API Ingress Response Latency (p95):**
  - Read Queries (`GET`): <= 100ms.
  - Mutating Requests (`POST`, `PATCH`): <= 250ms.
- **Database Query Latency (p95):** Single-row lookup <= 5ms; Complex multi-join query <= 50ms.
- **Multi-Engine Transaction Duration (p95):** <= 500ms for full Site Diary submission or SO Approval sign-off.
- **Background Job Execution (Midnight Carry Forward):** <= 2.0 seconds per project (up to 1,000 active open activities).
- **Cold Process Startup Time:** <= 5.0 seconds.
- **Memory & CPU Targets:** Memory utilization <= 70% under peak load; CPU utilization <= 65% under peak load.

---

# 4. Scalability Model

- **Stateless Application Tier:** REST API and Service execution layers maintain zero local session state, allowing arbitrary horizontal scaling behind load balancers.
- **Data Partitioning Principles:** Data logically partitioned by root `programme_id`. Multi-tenant query paths strictly scoped to single project partitions.
- **Queue-Based Asynchronous Processing:** Non-critical outbox events, notification dispatches, and heavy PDF report generations offloaded to background worker queues.

---

# 5. Capacity Planning & Workload Targets

- **Concurrent Active Users:** Support 5,000 simultaneous active users during peak evening submission hours.
- **Peak Throughput:** Support 500 Requests Per Second (RPS) platform-wide.
- **Supported Active Projects:** Scalable to 10,000 active public construction contracts.
- **Supported Operational Activities:** Scalable to 5,000,000 total active site activities across active baselines.
- **Supported Site Diaries:** Scalable to 50,000,000 daily site diary log entries stored over 7-year retention periods.

---

# 6. Database Performance Principles

- **Composite Indexing Strategy:** Mandatory indexes on all foreign key lookups and composite query patterns (e.g. `INDEX(programme_id, activity_id, diary_date)`).
- **Query Optimization:** Strict avoidance of full table scans; all production queries MUST utilize index scans or index seek paths.
- **Mandatory Pagination:** All collection queries enforce cursor or offset pagination with a maximum `limit = 100`.
- **Bulk SQL Operations:** Bulk inserts and updates execute in chunks of maximum 500 rows per batch transaction.

---

# 7. Caching Strategy & Consistency

- **Reference Data Caching:** Master reference data (e.g. Trade Library `trade_library`) cached in-memory with 24-hour TTL and explicit administrative invalidation.
- **Active WBS Tree Caching:** Active Baseline WBS trees cached per project; invalidated instantly upon new baseline publication (`BaselinePublished` event).
- **Short-Lived Dashboard Caching:** Executive HQ summary metrics cached with 5-minute TTL.

---

# 8. Batch Processing Standards

- **Chunking Standard:** Midnight Carry Forward batch jobs evaluate project open activities in chunk sizes of 200 activities per sub-transaction.
- **Isolated Failure Scope:** Batch job failure on a single project CANNOT disrupt processing for remaining project queues.

---

# 9. Load Testing Requirements & Acceptance Criteria

- **Baseline Load Test:** 1,000 concurrent users executing standard site logging for 1 hour. Acceptance: p95 latency <= 150ms, 0 errors.
- **Peak Load Test:** 5,000 concurrent users submitting diaries over a 30-minute window. Acceptance: p95 latency <= 300ms, error rate < 0.01%.
- **Stress & Spike Test:** Sudden 3x spike in ingress traffic (1,500 RPS). Acceptance: Graceful rate limiting (HTTP 429), zero service crashes.
- **Soak Test:** 24-hour continuous baseline load. Acceptance: Zero memory leaks, stable CPU utilization.

---

# 10. Performance Monitoring, SLIs & SLOs

- **Service Level Indicators (SLIs):** API Latency, Transaction Duration, Database Lock Wait Times.
- **Service Level Objectives (SLOs):** 99% of API requests served in <= 250ms; 99.9% availability.
- **Regression Detection:** Automated performance test benchmarks executed on every baseline release candidate; regressions > 10% fail build pipeline.

---

# 11. Scalability Roadmap

1. **Phase 1 (Current Baseline):** Single-database instance with stateless multi-node application server tier.
2. **Phase 2 (Growth Tier):** Read-replica database scaling for read-heavy executive query endpoints.
3. **Phase 3 (Enterprise Scale):** Database sharding by `programme_id` partition for unlimited horizontal expansion.

---

# 12. Future Performance Recommendations

- **Adaptive Auto-Scaling:** Implement real-time predictive auto-scaling based on historical 17:00 peak submission traffic patterns.
- **Edge Pre-Fetching:** Pre-fetch and cache Open Activities pools on edge CDN nodes for mobile client offline synchronization.

---

**Task DEV-012I Complete.** Stopped after DEV-012I.
