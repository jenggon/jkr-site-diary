# API-021
# Weather API

Status

Approved

---

# Purpose

Defines REST endpoints for Site Diary weather observations.

---

# Resource

/weather

---

# Endpoints

GET /weather

GET /weather/{weatherId}

POST /weather

PATCH /weather/{weatherId}

---

# Relationships

Site Diary

---

# Business Rules

One Site Diary shall have one Weather record.

Weather may be entered manually or imported.

Historical weather observations remain unchanged.

---

# Validation

Site Diary exists.

Weather condition valid.

Observation date required.

---

# Permissions

Read

Create

Update

---

# Audit

Create

Update

---

# Related Documents

DB-028 Weather Schema

DB-015 Site Diary Schema