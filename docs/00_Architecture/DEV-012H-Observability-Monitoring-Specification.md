# HQ ENGINEERING SPECIFICATION
## DEV-012H — Observability & Monitoring Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-001 through DEV-012G  

---

# 1. Purpose & Objectives

- **Business Objective:** Ensure 99.9% platform availability for nationwide Malaysian public infrastructure site logging, providing real-time operational visibility to HQ stakeholders.
- **Operational Objective:** Enable rapid incident response, root cause investigation, and performance tuning across daily site diary submissions and Superintending Officer (SO) approval flows.
- **System Objective:** Establish a vendor-neutral, technology-agnostic Observability Architecture governing structured logging, metrics aggregation, distributed tracing, and automated alerting per **ARCH-000**.

---

# 2. Observability Philosophy

- **Four Pillars:** Structured Logs, Aggregated Metrics, Distributed Traces, and Synchronous Domain Audit Events (**ADR-010**).
- **Correlation ID Primacy:** Every request assigns a globally unique `correlation_id` propagated across all service logs, traces, and audit logs.
- **Single Source of Truth:** Telemetry metrics and logs derive directly from operational service execution without artificial instrumentation divergence.
- **Zero Impact Telemetry:** Telemetry collection MUST NOT introduce latency bottlenecks to critical end-user API interactions.

---

# 3. Structured Logging Standards

- **JSON Format:** All application and service components log exclusively in structured JSON format.
- **Severity Levels:** `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`.
- **Required Log Fields:**
  - `timestamp`: ISO 8601 UTC timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - `level`: Log severity string.
  - `service_name`: Name of participating domain engine.
  - `correlation_id`: Root trace identifier.
  - `actor_id`: User identifier (if authenticated).
  - `programme_id`: Target project context (if applicable).
  - `message`: Human-readable log message.
  - `context`: Structured JSON key-value metadata.
- **Sensitive Data Masking:** Passwords, API tokens, PII, and financial claims MUST be masked (`***MASKED***`) before log emission.

---

# 4. Metrics Standards

- **System Metrics:** CPU usage, memory utilization, disk I/O, network throughput.
- **Application Metrics:** Active user sessions, thread pool queue depth, memory garbage collection frequency.
- **API Metrics:** Request rate (RPS), HTTP status code distribution (2xx, 4xx, 5xx), API response latency (p50, p95, p99).
- **Database Metrics:** Active connection pool count, query latency, transaction duration, lock wait time.
- **Business Metrics:** Daily Site Diary submission counts, pending SO approval queue size, Carry Forward execution duration.
- **Background Job Metrics:** Midnight cron queue latency, task execution duration, Dead Letter Queue (DLQ) retry counts.

---

# 5. Distributed Tracing Standards

- **Trace IDs & Span IDs:** W3C Trace Context standards (`traceparent` header format: `version-trace_id-parent_id-trace_flags`).
- **Request Flow Tracking:** Traces track full execution flow from client API ingress through service orchestration, database repository execution, and async outbox publishing.
- **Cross-Engine Context Propagation:** Trace context propagated synchronously across internal service invocations and asynchronously via domain events.

---

# 6. Health Monitoring & Endpoints

- **Liveness Endpoint (`/health/live`):** Verifies basic process responsiveness. Returns HTTP 200 `{"status": "UP"}`.
- **Readiness Endpoint (`/health/ready`):** Verifies service readiness to handle traffic (checks database connectivity, table schema availability).
- **Dependency Checks:** Periodically probes relational database connectivity and storage volume availability.
- **Worker Health:** Monitors background job schedulers (midnight Carry Forward job, outbox event processor).

---

# 7. Alerting Strategy & Escalations

- **Critical Alerts (Immediate Pager Alert):**
  - Database connectivity loss or transaction rollback rate > 5%.
  - Midnight Carry Forward job execution failure.
  - API HTTP 5xx error rate > 2% over a 5-minute window.
- **Warning Alerts (Slack / Email Alert):**
  - API response p95 latency > 1,000ms.
  - Un-submitted Site Diary submissions approaching shift-end deadline.
  - Database connection pool utilization > 80%.
- **Information Alerts:** Successful baseline revision publish events, automated system backup completions.
- **Escalation Rules:** Unacknowledged Critical Alerts escalate to Secondary Engineering Lead after 15 minutes.

---

# 8. Operational Dashboards Standards

1. **Executive HQ Dashboard:** High-level project progress, national site submission SLAs, active project counts.
2. **Operations Dashboard:** Real-time API throughput, system error rates, background worker queue status.
3. **Developer Dashboard:** Granular service latency breakdown, database connection pools, memory usage.
4. **Security Dashboard:** Failed login attempts, permission HTTP 403 violations, role privilege escalation events.
5. **Project Dashboard:** Specific project site diary submission rates, SO approval queue duration.

---

# 9. Operational KPIs Targets

- **API Ingress Response Latency:** p95 <= 250ms for mutating requests; p95 <= 100ms for read requests.
- **Transaction Duration Target:** Multi-engine atomic transactions <= 500ms.
- **Site Diary Submission SLA:** 99% of daily site logs submitted by 18:00 daily deadline.
- **SO Approval SLA:** 95% of pending approvals processed within 24 hours of submission.
- **System Availability SLA:** 99.9% uptime (excluding scheduled maintenance windows).

---

# 10. Failure Investigation & Root Cause Analysis

- **Timeline Reconstruction:** Incident responders query logs by `correlation_id` to reconstruct complete step-by-step request execution history.
- **Audit Event Correlation:** Cross-reference operational logs with append-only `audit` records (**ADR-010**) to detect unauthorized data mutations or configuration changes.
- **Post-Mortem Incident Reports:** Document root cause analysis, action items, and prevention rules within 48 hours of any Critical Incident resolution.

---

# 11. Data Retention Policy

- **Structured System Logs:** 90 days online retention; 1 year archived retention.
- **Aggregated Metrics:** 13 months retention (for annual project performance comparison).
- **Distributed Traces:** 30 days retention for full trace spans.
- **Audit Log Trail:** 7 years immutable retention per public infrastructure legal regulations.

---

# 12. Future Observability Recommendations

- **AIOps & Anomaly Detection:** Implement machine learning anomaly detection to flag abnormal site progress submissions or irregular manpower drop-offs.
- **Automated Self-Healing:** Implement automated container restart and DB connection pool recycling upon readiness check failure.

---

**Task DEV-012H Complete.** Stopped after DEV-012H.
