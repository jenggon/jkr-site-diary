# API-008
# Filtering and Search

Status

Approved

---

# Purpose

Defines filtering and searching standards for REST API endpoints.

---

# Filtering

Query Parameters

Examples

?status=Open

?trade=Earthwork

?weather=Rain

?programmeId=UUID

---

# Date Range

startDate

endDate

Example

?startDate=2027-01-01&endDate=2027-01-31

---

# Keyword Search

keyword

Example

?keyword=bridge

---

# Sorting

sort

order

Example

?sort=activityDate

?order=asc

---

# Multiple Filters

Supported.

Example

?status=Open&trade=Concrete

---

# Business Rules

Unknown filters shall return HTTP 400.

Filtering shall occur before pagination.

Search shall be case insensitive.

---

# Performance

Indexed columns should be prioritised.

Full table scan shall be avoided.

---

# Security

Search shall never expose archived or unauthorised data.

---

# Related Documents

API-004

API-007