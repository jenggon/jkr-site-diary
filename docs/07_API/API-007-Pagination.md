# API-007
# Pagination

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Defines pagination behaviour for collection endpoints.

Pagination improves performance and reduces payload size.

---

# Principles

Consistent

Predictable

Stateless

---

# Query Parameters

page

Default

1

Minimum

1

---

page_size

Default

20

Maximum

100

---

# Response

{
    "success": true,
    "data": [],
    "pagination": {
        "page": 1,
        "pageSize": 20,
        "totalRecords": 356,
        "totalPages": 18,
        "hasNext": true,
        "hasPrevious": false
    }
}

---

# Sorting

sort

order

---

# Default Sorting

createdAt DESC

---

# Business Rules

Pagination applies only to collection endpoints.

Single resource endpoints shall not return pagination.

---

# Performance

Pagination shall be implemented at database level.

Large datasets shall never be loaded into memory.

---

# Related Documents

API-001

API-006

DB-001
