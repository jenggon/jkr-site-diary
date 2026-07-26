# API-017
# Trade Library API

Status

Approved

---

# Purpose

Defines REST endpoints for Trade Library management.

Trade Library is reference data.

---

# Resource

/trades

---

# Endpoints

GET /trades

GET /trades/{tradeId}

POST /trades

PATCH /trades/{tradeId}

DELETE /trades/{tradeId}

---

# Business Rules

Trade Codes shall be unique.

Trades are master data.

Inactive Trades remain searchable for historical records.

---

# Validation

Trade Code unique.

Trade Name required.

---

# Permissions

Read

Create

Update

Archive

---

# Audit

Create

Update

Archive

---

# Related Documents

DB-018 Trade Library Schema