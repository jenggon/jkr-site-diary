# API-026
# Notification API

Status

Approved

---

# Purpose

Defines REST endpoints for system notifications.

---

# Resource

/notifications

---

# Endpoints

GET /notifications

GET /notifications/{notificationId}

PATCH /notifications/{notificationId}

DELETE /notifications/{notificationId}

POST /notifications/mark-all-read

---

# Relationships

User

Programme

Approval

AI Metadata

---

# Business Rules

Notifications belong to one user.

Archived notifications remain searchable.

Mark Read shall not modify notification content.

---

# Validation

User authenticated.

Notification belongs to current user.

---

# Permissions

Read

Mark Read

Archive

---

# Audit

Read

Archive

---

# Related Documents

DB-025 Notification Schema

DB-022 User Schema