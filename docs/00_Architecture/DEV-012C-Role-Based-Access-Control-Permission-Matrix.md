# HQ ENGINEERING SPECIFICATION
## DEV-012C — Role-Based Access Control (RBAC) & Permission Matrix

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A through DEV-012B  

---

# 1. Purpose & Objectives

- **Business Objective:** Safeguard public infrastructure project records by ensuring strictly authorized personnel perform operational, technical, administrative, and managerial actions.
- **Operational Objective:** Enforce clear separation of duties between contractor site execution teams (Site Engineers / Supervisors) and JKR Superintending Officers (SO / AE).
- **System Objective:** Provide a comprehensive, technology-agnostic RBAC framework governing API endpoints, service operations, state machine transitions, and database access across all 11 platform engines per **ARCH-000**.

---

# 2. RBAC Philosophy

- **Least Privilege:** Users receive minimum permissions necessary to perform their explicit job functions.
- **Need-to-Know:** Data access is restricted strictly to assigned Programme project contexts.
- **Separation of Duties:** Submitter roles (Site Engineer / Supervisor) CANNOT approve their own entries. Approval power is restricted exclusively to SO / AE roles.
- **Immutable Audit:** All authorization checks, permission failures, and privilege escalations generate synchronous audit logs (**ADR-010**).
- **Explicit Permission Assignment:** Permissions are explicitly assigned to Roles; users inherit permissions through Role assignment.
- **No Implicit Access:** Absence of an explicit `ALLOW` permission defaults strictly to `DENY`.

---

# 3. User Roles Definitions

1. **System Administrator:** Global platform management, tenant configuration, system monitoring.
2. **HQ Administrator:** JKR HQ management, multi-project reporting, high-level project configuration.
3. **Project Director:** JKR Senior Director overseeing contract baseline revisions and overall project lifecycle.
4. **Superintending Officer (SO):** Formal Level 3 Contractual Authority (Pegawai Penguasa). Full sign-off and baseline approval authority.
5. **Assistant Engineer (AE) / Resident Engineer (RE):** Level 2 Technical Verification Authority. Daily site diary verification and measurement endorsement.
6. **Site Supervisor / Site Engineer:** Contractor Level 1 Execution Role. Daily site diary entry, trade manpower logging, physical measurement capture.
7. **Quantity Surveyor (QS):** Measurement verification, physical quantity certification, valuation tracking.
8. **Planner:** Project scheduler responsible for importing and managing Microsoft Project (`.mpp`/XML) baselines.
9. **Read Only Auditor:** Internal/External JKR auditors inspecting append-only audit trails.
10. **External Viewer:** Read-only access to published executive reports and dashboards.

---

# 4. Permission Categories

- `CREATE` — Instantiate new domain entities.
- `READ` — Query or view entity data.
- `UPDATE` — Modify existing mutable fields.
- `DELETE` — Soft-delete or mark entities inactive (Physical deletion prohibited per DB-007).
- `APPROVE` — Execute formal sign-off state transitions (`Approved`).
- `PUBLISH` — Publish baseline schedule revisions (`is_active = true`).
- `ARCHIVE` — Transition projects or completed entities to read-only archive.
- `IMPORT` — Upload and parse external schedule files (`.mpp`/XML).
- `EXPORT` — Generate compliance PDF/Excel reports.
- `RESTORE` — Reopen returned items or restore archived entities.
- `MANAGE_USERS` — Assign users to projects and roles.
- `MANAGE_ROLES` — Configure role permissions.
- `MANAGE_PROJECTS` — Create and configure Programme roots.

---

# 5. Entity Permission Matrix

| Entity | Site Engineer / Supervisor | Planner | Assistant Engineer (AE) | Superintending Officer (SO) | HQ Admin / System Admin | Read-Only Auditor |
|---|---|---|---|---|---|---|
| **Programme** | READ | READ | READ | READ / UPDATE | ALL | READ |
| **Programme Revision** | READ | CREATE / IMPORT | READ | APPROVE / PUBLISH | ALL | READ |
| **Task WBS** | READ | CREATE / UPDATE | READ | READ | ALL | READ |
| **Activity** | READ / UPDATE | READ | READ / UPDATE | ALL | ALL | READ |
| **Open Activities** | READ / EXECUTE | READ | READ | READ | ALL | READ |
| **Site Diary** | CREATE / EDIT (Draft) | READ | VERIFY / RETURN | APPROVE / LOCK | ALL | READ |
| **Workforce** | CREATE / EDIT | READ | READ / VERIFY | READ / APPROVE | ALL | READ |
| **Progress** | CREATE / EDIT (Draft) | READ | VERIFY | APPROVE / CERTIFY | ALL | READ |
| **Approval** | SUBMIT (Draft) | READ | VERIFY / RETURN | APPROVE / REJECT | ALL | READ |
| **Audit** | READ (Own Ops) | READ | READ | READ | READ / EXPORT | READ (ALL) |
| **Trade Library** | READ | READ | READ | READ | CREATE / UPDATE | READ |

---

# 6. Workflow Permissions Matrix

| Workflow Action | Authorized Roles | Preconditions |
|---|---|---|
| **Create Site Diary** | Site Supervisor, Site Engineer | Active Programme, Active Baseline Revision, Date <= Today |
| **Edit Draft Diary** | Site Supervisor, Site Engineer | Diary state = `Draft` or `Returned` |
| **Submit Site Diary** | Site Supervisor, Site Engineer | Mandatory fields complete, zero validation errors |
| **Return Site Diary** | Assistant Engineer (AE), SO | Diary state = `Pending Approval`, Mandatory return comment |
| **Approve Site Diary** | Superintending Officer (SO), AE | Diary state = `Pending Approval`, Physical measurements verified |
| **Reject Site Diary** | Superintending Officer (SO) | Diary state = `Pending Approval`, Mandatory rejection comment |
| **Publish Baseline** | Superintending Officer (SO), Planner | Revision state = `Approved`, zero WBS syntax errors |
| **Archive Project** | Project Director, System Admin | All child activities `Completed`/`Cancelled`, SO sign-off complete |

---

# 7. State Transition Permissions Matrix (Ref: DEV-011)

- **Site Diary Transitions (DEV-011A):**
  - `Draft` → `Submitted`: Site Engineer / Supervisor
  - `Pending` → `Returned`: Assistant Engineer (AE), SO
  - `Pending` → `Approved`: Superintending Officer (SO), AE
  - `Approved` → `Locked`: System Engine (24h timer)
- **Activity Transitions (DEV-011B):**
  - `Not Started` → `Started`: Site Engineer / Supervisor
  - `Continue` → `Completed`: Superintending Officer (SO) [upon 100% Progress Approval]
- **Approval Transitions (DEV-011C):**
  - `Draft` → `Pending`: Site Engineer
  - `Pending` → `Approved` / `Rejected`: Superintending Officer (SO)

---

# 8. Permission Resolution & Scope Isolation Rules

1. **Deny Overrides Allow:** An explicit `DENY` permission assigned at any scope instantly overrides an `ALLOW` permission.
2. **Project Scope Isolation:** Users assigned to `Programme A` CANNOT access or mutate data in `Programme B` unless granted cross-project HQ Admin roles.
3. **Revision Context Isolation:** Operational write actions MUST evaluate permissions strictly within the context of the active baseline `revision_id` (`is_active = true`).

---

# 9. Multi-Project & Delegation Rules

- **Cross-Project Access:** HQ Administrators and System Auditors possess platform-wide read permissions across all project instances.
- **Temporary Approval Delegation:** An SO may delegate Level 2/3 approval authority to a designated AE for a fixed calendar window (e.g. during official leave). All delegated sign-offs capture both the acting AE ID and the delegating SO ID in the audit trail.

---

# 10. Audit Requirements

Per **ADR-010**, the platform MUST generate a synchronous audit log entry for:
1. **Permission Failures:** Any HTTP 403 Forbidden or unauthorized API access attempt.
2. **Workflow Approvals & Sign-offs:** Every `Approve`, `Return`, or `Reject` decision.
3. **Privilege Escalations:** Any assignment or modification of user roles and project permissions.

---

# 11. Security Recommendations

- **Identity Provider (IdP) Integration:** Support Single Sign-On (SSO) via OpenID Connect (OIDC) / SAML 2.0 integrating with MyGovIAM or Enterprise Azure AD / Entra ID.
- **Multi-Factor Authentication (MFA):** Enforce mandatory TOTP / SMS MFA for Superintending Officer (SO) and System Administrator sign-offs.

---
**END OF SPECIFICATION — DEV-012C**
