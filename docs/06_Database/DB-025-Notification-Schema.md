# DB-025
# Notification Schema

Status

Approved

---

# Purpose

Notification stores system-generated and user-generated notifications.

Notifications inform users of operational events requiring attention.

Notifications are informational and do not replace workflow or approval processes.

---

# Table Name

notification

---

# Primary Key

notification_id

UUID

---

# Parent Ownership

programme_id

UUID

FK

Nullable.

---

user_id

UUID

FK

Required.

References

User Schema

---

# Notification Information

notification_type

ENUM

Information

Reminder

Approval Request

Approval Result

Outstanding Activity

System Alert

AI Recommendation

---

title

VARCHAR(200)

Required.

---

message

TEXT

Required.

---

priority

ENUM

Low

Normal

High

Critical

---

status

ENUM

Unread

Read

Archived

---

action_url

VARCHAR(500)

Nullable.

Deep link to related module.

---

expires_at

TIMESTAMP

Nullable.

---

# Audit

created_at

TIMESTAMP

Required.

---

read_at

TIMESTAMP

Nullable.

---

# Relationships

User

1 → Many Notifications

Programme

1 → Many Notifications

---

# Business Rules

Notifications belong to one User.

Notifications may optionally belong to one Programme.

Read notifications remain available until archived.

Archived notifications are hidden from default views.

Notifications never modify operational data.

---

# Constraints

user_id NOT NULL

title NOT NULL

message NOT NULL

status NOT NULL

priority NOT NULL

---

# Indexes

user_id

status

priority

created_at

expires_at

---

# Ownership

Owner

Notification Engine

Referenced by

Approval Engine

Reporting Engine

AI Engine

Dashboard

---

# Security

Read

Notification Owner

System Administrator

Write

Notification Engine

Delete

Not Allowed

Archive only.

---

# Future Extensions

Push Notification

Email Notification

SMS Notification

WhatsApp Notification

Microsoft Teams Integration

Slack Integration

Notification Preferences

Scheduled Notifications

---

# Related Documents

DB-020 Approval Schema

DB-022 User Schema

DB-023 Role Schema

DB-024 Permission Schema