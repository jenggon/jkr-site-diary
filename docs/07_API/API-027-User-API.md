# API-027
# User API

Status

Approved

---

# Purpose

Defines REST endpoints for User management.

---

# Resource

/users

---

# Endpoints

GET /users

GET /users/{userId}

POST /users

PATCH /users/{userId}

DELETE /users/{userId}

---

# Relationships

Role

Programme

Permission

---

# Business Rules

User authentication is managed by Supabase Auth.

Profile information is managed by User API.

Archived users remain referenced historically.

---

# Validation

Email unique.

Staff Number unique.

Role exists.

Programme exists.

---

# Permissions

Read User

Create User

Update User

Archive User

---

# Audit

Create

Update

Archive

---

# Related Documents

DB-022 User Schema

API-003