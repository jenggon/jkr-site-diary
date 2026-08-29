# HQ ENGINEERING SPECIFICATION
## DEV-012L — Integration Architecture Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-001 through DEV-012K  

---

# 1. Purpose & Objectives

- **Business Objective:** Standardize external and internal system integration boundaries across Malaysian public infrastructure systems, enabling seamless data exchange between contractors, JKR HQ, and government enterprise platforms.
- **Operational Objective:** Ensure failure-isolated, reliable interfaces for identity authentication, Microsoft Project (`.mpp`/XML) schedule imports, SMS/Email notification delivery, and PDF/Excel compliance reporting.
- **System Objective:** Establish a vendor-neutral, technology-agnostic Integration Architecture governing synchronous REST contracts, asynchronous domain events (Ref: DEV-011Y), outbox patterns, and integration failure handling per **ARCH-000**.

---

# 2. Integration Philosophy

- **Loose Coupling:** Participating systems interact strictly through explicit, stable contracts without exposing internal domain logic or database schemas (**ARCH-000**).
- **Explicit Contracts:** All interfaces MUST enforce strongly typed request/response schemas (OpenAPI 3.1 / JSON Schema).
- **Versioned Interfaces:** API interfaces and event payloads enforce Semantic Versioning (`v1.0.0`). Breaking schema changes require major version increments.
- **Idempotent Communication:** All mutating integration calls MUST support idempotency keys to tolerate network retries without side-effects.
- **Failure Isolation:** Upstream external service failures (e.g., SMS gateway down) MUST NOT crash core operational site logging.

---

# 3. Integration Categories

1. **Internal Engine Integration:** Cross-engine service calls between all 11 platform engines (Ref: DEV-011Z).
2. **External Government Systems:** Integrations with MyGovIAM, government GIS mapping, and central public procurement databases.
3. **Identity Provider (IdP):** OpenID Connect / SAML 2.0 Single Sign-On (SSO) authentication services.
4. **Scheduling Systems:** Ingestion of Microsoft Project (`.mpp`/XML) and Primavera P6 baseline XML files.
5. **Notification Services:** Outbound dispatches via SMS, Email, and Push Notification gateways.
6. **Reporting Systems:** Exporting PDF compliance site diaries and Excel progress valuations.
7. **Analytics Systems:** Streaming operational site progress metrics to JKR HQ executive dashboards.
8. **File Exchange:** Object storage integration for site photo attachments and contractual documents.

---

# 4. Integration Communication Patterns

- **Synchronous Request-Reply (HTTP REST):** Used for real-time user-driven validation, query fetching, and daily site diary submissions.
- **Asynchronous Event-Driven Messaging:** Used for domain event notification broadcasts (`BaselinePublished`, `ApprovalApproved`) via Transactional Outbox patterns (**ADR-010**).
- **Bulk Data Exchange:** Batch processing for schedule imports and nightly analytics data pipeline syncs.

---

# 5. Integration Contracts & Schema Standards

- **Standard Integration Header Rules:**
  - `X-Correlation-ID`: Mandatory UUID passed across system boundaries for distributed tracing.
  - `X-Idempotency-Key`: Mandatory UUID header for mutating integration operations (`POST`/`PATCH`).
  - `X-API-Version`: Version indicator (e.g., `1.0.0`).
- **Producer / Consumer Contract Guarantee:** Producers guarantee backward-compatible payload fields; consumers ignore unrecognized non-breaking schema additions.

---

# 6. External Integration Catalogue

| Interface Name | External Target | Pattern | Description | Failure Policy |
|---|---|---|---|---|
| **Identity SSO** | Government IdP / Azure AD | Sync REST (OIDC) | User identity authentication & MFA verification | Block access (HTTP 401) |
| **Schedule Ingest** | MSP / Primavera Files | Async Batch | Parsing binary `.mpp`/XML schedule baseline files | Reject file with error report |
| **SMS Gateway** | Telecommunication Provider | Async Event | SMS notifications to SOs for pending approvals | DLQ retry after 3 attempts |
| **Email Service** | SMTP / Mail Gateway | Async Event | Email notification for returned site diaries | DLQ retry after 3 attempts |
| **Push Alerts** | Mobile Push Service | Async Event | Push alerts to mobile site engineer devices | Fire-and-forget |
| **PDF Generator** | Document Export Service | Async Batch | Generating official JKR hardcopy compliance PDFs | Queue retry |

---

# 7. Integration Failure Handling & Resiliency

- **Exponential Backoff Retry:** Failed network integration calls retry up to 3 times with exponential backoff (1s, 2s, 4s).
- **Circuit Breaker Policy:** If an external integration fails > 50% of requests over 1 minute, the circuit breaker opens for 30 seconds, returning instant fallback responses.
- **Dead Letter Queue (DLQ):** Unhandled asynchronous integration event messages route to a Dead Letter Queue for operator inspection.

---

# 8. Security & Encryption Standards

- **Transport Security:** All integration interfaces MUST enforce TLS 1.3 encryption in transit.
- **Payload Integrity:** Digital HMAC signatures embedded in integration request headers to verify sender authenticity and payload integrity.
- **Audit Logging:** Every external integration call, request/response metadata, and failure event logged synchronously per **ADR-010**.

---

# 9. Integration Health Monitoring & Metrics

- **Delivery SLA:** 99.9% success rate for internal synchronous cross-engine calls; 99.0% success rate for external notifications.
- **Integration Latency Targets:** Synchronous REST integration calls p95 <= 200ms.
- **Real-Time Alerting:** Operator alert triggered if external integration error rate exceeds 5% over 5 minutes.

---

# 10. Future Recommendations

- **Centralized API Gateway:** Implement an enterprise API Gateway for rate-limiting, WAF inspection, and routing all external government API traffic.
- **Digital Twin & GIS Integration:** Integrate construction site diaries with JKR BIM / Digital Twin GIS mapping platforms for 3D visual progress rendering.

---

**Task DEV-012L Complete.** Stopped after DEV-012L.
