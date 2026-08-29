# HQ ENGINEERING SPECIFICATION
## DEV-012E — API Design Standards Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-001 through DEV-012D  

---

# 1. Purpose & Objectives

- **Business Objective:** Establish uniform RESTful API design standards across public infrastructure platform integrations, facilitating seamless interoperability between web, mobile, and government enterprise systems.
- **Operational Objective:** Eliminate inconsistency across engineering teams by standardizing URI structures, request/response formats, HTTP methods, status codes, and error payloads.
- **System Objective:** Enforce strict layer isolation (**ARCH-000**), guaranteeing API route handlers manage HTTP delivery concerns ONLY, delegating business orchestration exclusively to Service components.

---

# 2. API Philosophy

- **Resource-Oriented:** APIs expose domain resources (nouns) rather than actions or function endpoints.
- **Stateless:** Every HTTP request MUST contain all authentication, authorization, and context metadata required to process the request independently.
- **Idempotent Where Applicable:** Repeated executions of idempotent requests (GET, PUT, PATCH, DELETE) yield identical server state without unintended side-effects.
- **Predictable & Consistent:** Consistent naming conventions, response envelopes, pagination models, and error formatting across all platform endpoints.
- **Backward Compatible:** Breaking API changes are strictly forbidden within a major version.
- **Explicitly Versioned:** All public and internal APIs specify versioning indicators.

---

# 3. URI Design Standards

### Core Rules
- **Plural Resources:** URIs MUST use plural nouns to identify resource collections (e.g. `/api/activity`, `/api/site-diary`, `/api/progress`).
- **Hierarchical Sub-Resources:** Represent child relationships using path nesting (e.g. `/api/activity/task/[taskId]`, `/api/site-diary/activity/[activityId]`).
- **No Verbs in URIs:** URIs identify resources, NOT actions. Actions are represented strictly by HTTP verbs (`GET`, `POST`, `PATCH`).
- **Lowercase & Hyphenated:** All URI paths MUST use lowercase letters with hyphens separating words (`site-diary`, `trade-library`).

### Standard URI Examples
- `GET /api/programme` — List all accessible programmes.
- `POST /api/programme` — Create a new programme.
- `GET /api/site-diary/[siteDiaryId]` — Retrieve specific site diary by ID.
- `GET /api/site-diary/activity/[activityId]` — Retrieve all site diaries for an activity.
- `GET /api/trade-library/active` — Retrieve active trade reference list.

---

# 4. HTTP Method Standards

- **`GET`:** Retrieve resource representations. Safe and idempotent. Must not modify server state.
- **`POST`:** Create new sub-resources or execute complex atomic business submissions (e.g., `POST /api/site-diary`). Non-idempotent without `X-Idempotency-Key`.
- **`PUT`:** Replace an entire existing resource representation. Idempotent.
- **`PATCH`:** Apply partial updates to an existing resource (e.g., `PATCH /api/approval/[approvalId]`). Idempotent.
- **`DELETE`:** Soft-delete or archive a resource representation. Physical deletion strictly prohibited per **DB-007**. Idempotent.
- **`OPTIONS`:** Retrieve CORS capabilities and allowed HTTP methods. Safe and idempotent.
- **`HEAD`:** Retrieve response headers without response body. Safe and idempotent.

---

# 5. Request Header Standards

- **`Content-Type`:** `application/json; charset=utf-8` (for request body payloads).
- **`Accept`:** `application/json` (specifies expected response format).
- **`Authorization`:** `Bearer <JWT_TOKEN>` (RFC 6750 Bearer Authentication Token).
- **`X-Idempotency-Key`:** `<UUID>` (Optional UUID key for non-idempotent POST submissions to prevent duplicate execution).
- **`X-Correlation-ID`:** `<UUID>` (Mandatory request trace ID passed across system boundaries).
- **`X-API-Version`:** `1.0.0` (Optional explicit version specification header).

---

# 6. Response Standards & Envelopes

### Standard Success Response Envelope (HTTP 200 / 201)
```json
{
  "data": {
    "site_diary_id": "uuid-v4-identifier",
    "programme_id": "uuid-v4-programme-root",
    "diary_date": "2026-08-06",
    "created_at": "2026-08-06T22:43:30.000Z"
  },
  "meta": {
    "timestamp": "2026-08-06T22:43:30.000Z",
    "correlation_id": "corr-uuid-12345"
  }
}
```

### Standard Paginated Success Response Envelope
```json
{
  "data": [
    { "progress_id": "uuid-1", "actual_quantity": 50.0 },
    { "progress_id": "uuid-2", "actual_quantity": 25.0 }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_records": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "timestamp": "2026-08-06T22:43:30.000Z",
    "correlation_id": "corr-uuid-12345"
  }
}
```

### Standard Error Response Envelope (HTTP 4xx / 5xx)
```json
{
  "error": {
    "error_code": "ERR-PG-001",
    "error_name": "CUMULATIVE_PROGRESS_EXCEEDED",
    "http_status": 422,
    "message": "Cumulative physical progress quantity would exceed 100.00% planned target",
    "details": [
      {
        "field": "actual_quantity",
        "value": 150.0,
        "constraint": "PROGRESS_CEILING_100_PERCENT"
      }
    ],
    "correlation_id": "corr-uuid-12345",
    "timestamp": "2026-08-06T22:43:30.000Z",
    "path": "/api/progress"
  }
}
```

---

# 7. HTTP Status Code Usage Guidelines

- **`200 OK`:** Successful GET, PATCH, or DELETE operation.
- **`201 Created`:** Successful POST resource creation.
- **`202 Accepted`:** Request accepted for asynchronous background execution.
- **`204 No Content`:** Successful operation with no response body.
- **`400 Bad Request`:** Validation failure or malformed JSON payload.
- **`401 Unauthorized`:** Missing, invalid, or expired authentication token.
- **`403 Forbidden`:** Valid token, but user role lacks authorization for action/project.
- **`404 Not Found`:** Resource ID does not exist in target context.
- **`409 Conflict`:** Duplicate entity entry or state machine transition violation.
- **`412 Precondition Failed`:** Missing active baseline revision context.
- **`422 Unprocessable Entity`:** Business rule validation failure.
- **`429 Too Many Requests`:** Rate limit threshold exceeded.
- **`500 Internal Server Error`:** Unhandled server or DB exception.
- **`502 Bad Gateway`:** Upstream service or parser integration failure.
- **`503 Service Unavailable`:** System undergoing database migration.
- **`504 Gateway Timeout`:** DB transaction or service execution timeout.

---

# 8. Pagination, Filtering & Sorting Standards

- **Query Parameter Standards:**
  - `page`: Page number (1-indexed, default `1`).
  - `limit`: Records per page (default `20`, max `100`).
  - `sort`: Field name prefixed with `-` for descending (e.g. `sort=-created_at`).
  - `filter`: Field-level filtering (e.g. `measurement_status=Draft`).
  - `search`: Free-text search string (e.g. `search=Concrete`).

---

# 9. Naming & Data Formatting Standards

- **URI Paths:** Lowercase hyphenated (`/api/site-diary/site-diary-id`).
- **DTOs & Field Names:** Lowercase snake_case matching domain models 1-to-1 (`programme_id`, `actual_quantity`, `created_at`).
- **Enums:** PascalCase enum identifiers (`ProgressMeasurementType.Percentage`, `ApprovalStatus.Pending`).
- **Booleans:** Prefix with `is_` or `has_` (`is_active`, `has_next`).
- **Dates & Times:** ISO 8601 UTC string format (`YYYY-MM-DDTHH:mm:ss.sssZ`).

---

# 10. API Security & Rate Limiting Requirements

- **Authentication & RBAC:** All non-public routes require JWT Bearer authentication and RBAC permission verification (DEV-012C).
- **Ingress Rate Limiting:** Enforce maximum 100 requests per minute per IP / user token. Excess requests return HTTP 429.
- **Replay Protection:** Idempotency key headers (`X-Idempotency-Key`) verified for all mutating POST endpoints.
- **XSS & Injection Protection:** All ingress parameters sanitized; all response payloads enforce strict JSON Content-Type headers.

---

# 11. Performance Guidelines & Caching

- **Payload Size Limit:** Ingress HTTP request body payload MUST NOT exceed 10 MB.
- **GZIP / Brotli Compression:** All API response payloads > 1 KB MUST enforce GZIP / Brotli HTTP compression.
- **Conditional GET Requests:** Reference data endpoints (e.g. `/api/trade-library/active`) support ETags and `If-None-Match` headers, returning `304 Not Modified` when unchanged.

---

# 12. API Documentation Standards

- **OpenAPI 3.1 Specification:** Every platform API endpoint MUST be documented using complete OpenAPI 3.1 YAML/JSON contracts.
- **Mandatory Documentation Content:** Description, authentication security scheme, request headers, body schemas, response schemas (200, 400, 401, 403, 404, 409, 422, 500), and example payloads.

---

# 13. Future Recommendations

- **HATEOAS Hypermedia Links:** Expand success response envelopes to include `_links` navigation objects.
- **GraphQL Gateway:** Evaluate GraphQL gateway layer for mobile clients to query nested project/activity data trees in a single network request.
- **gRPC Internal Services:** Implement gRPC protocol for high-throughput inter-microservice communications if extracted from monolith.

---

**Task DEV-012E Complete.** Stopped after DEV-012E.
