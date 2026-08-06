# HQ ENGINEERING SPECIFICATION
## DEV-012G — Security Architecture Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-001 through DEV-012F  

---

# 1. Purpose & Objectives

- **Business Objective:** Protect government infrastructure construction data, legal approvals, and financial progress records from unauthorized access, tampering, or exfiltration.
- **Operational Objective:** Enforce identity verification, multi-factor authentication, and role-based authorization across all contractor site teams and JKR Superintending Officers (SOs).
- **System Objective:** Establish a vendor-neutral, technology-agnostic Security Architecture governing API ingress, service execution, data storage, and audit logging per **ARCH-000** and **ADR-010**.

---

# 2. Security Philosophy

- **Defense in Depth:** Layered security controls across Network, API Gateway, Application Service, Database, and Storage layers.
- **Least Privilege:** Users and service identities receive minimum permissions strictly required for their role.
- **Zero Trust:** Every request MUST be explicitly authenticated, authorized, and validated regardless of network location.
- **Secure by Default:** All security settings default to the most restrictive state (e.g. `DENY` all access unless explicitly allowed).
- **Fail Secure:** System failures or runtime exceptions MUST default to a locked, secure state without leaking sensitive diagnostics.
- **Separation of Duties:** Submitter roles (Contractors) CANNOT self-approve submissions; approval power is restricted exclusively to SO / AE roles.

---

# 3. Identity & Access Management (IAM)

- **User Accounts:** Uniquely identified individuals assigned to system roles and project memberships.
- **Roles & Permissions:** Explicit permission sets mapped to user roles per **DEV-012C**.
- **Project Membership:** User authorizations are bound strictly to assigned Programme project contexts.
- **Delegation Rules:** Temporary authority delegation (e.g., SO delegating approval rights during leave) MUST capture delegating actor ID, acting actor ID, start timestamp, and expiration timestamp in the audit trail.

---

# 4. Authentication Standards

- **Identity Provider (IdP) & SSO:** Support federated authentication using OpenID Connect (OIDC) / SAML 2.0.
- **Multi-Factor Authentication (MFA):** Mandatory MFA (TOTP / Hardware Tokens) for Superintending Officer (SO), Project Director, and System Administrator roles.
- **Password Policy:** Minimum 12 characters, complexity requirements (uppercase, lowercase, numbers, special characters), 90-day rotation, and prevention of last 5 passwords reuse.
- **Session & Token Lifecycle:** Short-lived access tokens (maximum 15 minutes duration); refresh tokens stored securely with 8-hour maximum session lifetimes.
- **Refresh Strategy:** Token refresh requires cryptographically signed refresh tokens with automatic reuse detection and revocation.

---

# 5. Authorization Standards

- **Role-Based Access Control (RBAC):** Ingress endpoints verify caller role permissions against the Entity Permission Matrix (DEV-012C).
- **Resource-Level Authorization:** Service layer verifies that caller `user_id` has explicit membership in the target `programme_id`.
- **Revision Scope Isolation:** Write operations are strictly restricted to the published baseline revision (`is_active = true`).

---

# 6. API Security Standards

- **Authentication & Authorization:** Every incoming API request MUST present a valid JWT Bearer token validated against IdP public keys.
- **Rate Limiting:** Enforce maximum 100 requests per minute per IP / token. Excessive requests return HTTP 429.
- **Replay Protection:** Mutating requests support idempotency keys (`X-Idempotency-Key`) verified to prevent replay attacks.
- **Input Sanitization & Output Encoding:** Ingress text fields sanitized against XSS / SQL Injection; egress payloads enforce JSON Content-Type headers.
- **File Upload Validation:** Attachment uploads (MSP schedules, site photos) validated against strict MIME types, maximum file size limits (10 MB), and anti-virus binary scanning.

---

# 7. Data Protection Standards

- **Encryption in Transit:** TLS 1.3 enforced for all HTTP API calls and internal inter-service communications (HTTPS / gRPC TLS).
- **Encryption at Rest:** AES-256 encryption enforced for all relational database tables, index files, and file storage volumes.
- **Key Management Principles:** Cryptographic keys managed in dedicated Key Management Systems (KMS) with annual key rotation.
- **Sensitive Data & PII Handling:** Personally Identifiable Information (PII) masked (`***MASKED***`) in application logs and non-production environments.
- **Secrets Management:** Passwords, API keys, and certificates injected via secure environment vaults; zero hardcoded secrets allowed.

---

# 8. Audit & Accountability Standards

Per **ADR-010**, synchronous audit logs MUST capture:
- **Authentication Events:** Login success, login failure, MFA challenges, session terminations.
- **Authorization Failures:** HTTP 403 Forbidden attempts, unauthorized project access attempts.
- **Privilege Changes:** Role assignments, user creation, project membership updates.
- **Administrative Actions:** Baseline revision publication, project archiving, emergency overrides.

---

# 9. Operational Security & Monitoring

- **Account Lockout Policy:** 5 consecutive failed login attempts lock the user account for 30 minutes.
- **Security Event Monitoring:** Real-time ingestion of security audit logs with automated alerts for brute-force attacks or privilege escalation anomalies.
- **Incident Response Protocol:** Locked protocols for revoking compromised user tokens, isolating project contexts, and generating forensic security reports.

---

# 10. Backup & Recovery Security

- **Backup Encryption:** All database and storage backups encrypted at rest using AES-256 before storage.
- **Recovery Authorization:** Restoring database backups requires dual-authorization from System Administrator and Project Director roles.
- **Integrity Verification:** Automated weekly backup restoration testing with cryptographic SHA-256 checksum verification.

---

# 11. Compliance & Security Governance

- **Data Minimization:** System collects ONLY data strictly required for construction site diary operations.
- **Non-Repudiation:** Approved Site Diaries and Baseline Revisions generate immutable audit records capturing timestamp, actor ID, and IP address.
- **Data Retention:** Historical project logs retained for a minimum of 7 years post-contract completion per public sector archive regulations.

---

# 12. Future Security Recommendations

- **FIDO2 / Passkeys Support:** Integrate passwordless authentication using FIDO2 WebAuthn / Hardware Keys for site engineers and SOs.
- **Risk-Based Adaptive Authentication:** Dynamically challenge users for MFA based on IP geolocation or device fingerprint anomalies.

---

**Task DEV-012G Complete.** Stopped after DEV-012G.
