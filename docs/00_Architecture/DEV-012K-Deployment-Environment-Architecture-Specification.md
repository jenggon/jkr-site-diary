# HQ ENGINEERING SPECIFICATION
## DEV-012K — Deployment & Environment Architecture Specification

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-001 through DEV-012J  

---

# 1. Purpose & Objectives

- **Business Objective:** Ensure seamless, defect-free release management for Malaysian public infrastructure software updates, preventing operational downtime on active project sites.
- **Operational Objective:** Establish clear environment isolation, release approval workflows, and configuration management standards across development, testing, and production tiers.
- **System Objective:** Provide a vendor-neutral, technology-agnostic Deployment Architecture governing release promotion, feature flag controls, and infrastructure tiering per **ARCH-000**.

---

# 2. Deployment Philosophy

- **Immutable Deployments:** Once a application release artifact is built and verified, its binary contents CANNOT be mutated. Target environments are updated by deploying replacement immutable artifacts.
- **Repeatable Environments:** All deployment environments are provisioned declaratively using automated Infrastructure as Code (IaC) templates to eliminate environment drift.
- **Strict Environment Isolation:** Production data, user credentials, and database volumes MUST be completely isolated from pre-production testing environments.
- **Configuration Separation:** Application code artifacts MUST be strictly decoupled from environment-specific configurations and secrets.

---

# 3. Environment Catalogue & Responsibilities

1. **Local Developer Environment (`DEV`):** Local sandbox for engineering feature construction. Sanitized mock data only.
2. **Shared Integration Environment (`INT`):** Automated build and continuous integration testing environment.
3. **Testing Environment (`TEST`):** Automated quality assurance, regression testing, and performance benchmark execution.
4. **User Acceptance Testing (`UAT`):** Staging environment for Superintending Officers (SOs) and JKR stakeholders to validate release candidates using synthetic project data.
5. **Pre-Production Environment (`PREPROD`):** Production-identical environment for dry-run release validation, final database migration testing, and security scanning.
6. **Production Environment (`PROD`):** Live operational environment serving actual Malaysian construction sites.
7. **Disaster Recovery Environment (`DR`):** Secondary failover environment mirroring Production database state for business continuity (Ref: DEV-012J).

---

# 4. Environment Governance & Access Matrix

| Environment | Purpose | Authorized Users | Deployment Approval | Refresh Cadence |
|---|---|---|---|---|
| **DEV** | Feature construction | Developers | None (Local) | On-demand |
| **INT** | Automated CI builds | Engineering Team | Automated CI trigger | Daily |
| **TEST** | QA & Load Testing | QA Team / Developers | QA Lead Approval | Weekly |
| **UAT** | Stakeholder acceptance | JKR Stakeholders / SOs | Product Owner Approval | Bi-weekly |
| **PREPROD** | Release dry-run | Operations Lead | Technical Lead Approval | Prior to release |
| **PROD** | Live site operations | End Users (Contractors/SOs) | Change Advisory Board (CAB) | Scheduled Release Windows |
| **DR** | Standby failover | System Administrators | Emergency Declaration | Real-time replication |

---

# 5. Configuration & Secrets Management

- **Environment Variables:** Environment-specific settings (e.g., hostnames, port numbers, log levels) injected at runtime; zero hardcoded values in code artifacts.
- **Secrets & Certificates:** Passwords, API private keys, and TLS certificates injected via secure secrets vaults. Access restricted to deployment service accounts.
- **Configuration Versioning:** Infrastructure templates and configuration manifests stored under strict version control alongside source code repositories.

---

# 6. Release & Promotion Strategy

- **Semantic Versioning (SemVer):** Releases follow `MAJOR.MINOR.PATCH` versioning standard (e.g., `v1.2.0`).
- **Release Promotion Path:** Code MUST pass `INT` → `TEST` → `UAT` → `PREPROD` → `PROD` sequentially. Skipping environments is strictly prohibited.
- **Scheduled Deployment Windows:** Standard production releases executed during low-traffic maintenance windows (Tuesdays/Thursdays 01:00 - 03:00).
- **Rollback Strategy:** Automatic rollback to previous immutable release artifact if automated health checks fail within 15 minutes of deployment.

---

# 7. Layered Infrastructure Principles

- **Edge / API Gateway Layer:** Ingress load balancing, TLS termination, rate limiting, and global WAF inspection.
- **Stateless Application Layer:** Multi-node service instances executing application logic (**ARCH-000**); easily scaled horizontally.
- **Relational Database Layer:** High-availability primary database cluster with isolated read-replicas for heavy reporting workloads.
- **Storage Layer:** Encrypted object storage volumes for schedule binaries (`.mpp`/XML) and site attachments.

---

# 8. Deployment Validation & Quality Gates

- **Smoke Testing:** Automated basic API ping and health check verification immediately post-deployment.
- **Health Verification:** Probing readiness endpoints (`/health/ready`) before routing live user traffic to newly deployed nodes.
- **Database Schema Backward Compatibility:** All schema migrations MUST be backward-compatible with the currently running application release to allow zero-downtime deployments.

---

# 9. Operational Controls & Feature Flags

- **Maintenance Mode Gate:** Capability to toggle a read-only global maintenance banner during major database migrations.
- **Feature Flags:** New domain features wrapped in server-side feature flags to decouple code deployment from feature activation.
- **Configuration Freeze:** Code and configuration changes frozen 48 hours prior to major public sector reporting deadlines.

---

# 10. Security & Compliance Requirements

- **Administrative Isolation:** Production environment administration restricted to authorized Operations Leads using Multi-Factor Authentication (MFA).
- **Audit Logging:** Every deployment, configuration change, feature flag toggle, and environment access logged to immutable audit storage (**ADR-010**).

---

# 11. Future Recommendations

- **Blue-Green Deployments:** Zero-downtime release deployment utilizing parallel Blue/Green application clusters.
- **Canary Releases:** Progressive delivery routing 5% of project site traffic to new release candidates before full rollout.

---

**Task DEV-012K Complete.** Stopped after DEV-012K.
