# DB-030
# Material Schema

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Material records construction materials consumed during daily execution.

Material supports productivity measurement, reporting and future inventory integration.

Material represents actual site consumption.

---

# Table Name

material

---

# Primary Key

material_id

UUID

---

# Parent Ownership

programme_id

UUID

FK

Required.

revision_id

UUID

FK

Nullable.

activity_id

UUID

FK

Required.

site_diary_id

UUID

FK

Required.

---

# Material Information

material_name

VARCHAR(150)

Required.

---

material_category

VARCHAR(100)

Examples

Concrete

Steel

Bitumen

Crusher Run

Sand

Cement

Pipe

Formwork

---

quantity

DECIMAL(18,4)

Required.

---

unit

VARCHAR(20)

Examples

m³

kg

ton

nos

bag

litre

m

---

supplier

VARCHAR(150)

Nullable.

---

batch_no

VARCHAR(100)

Nullable.

---

usage_status

ENUM

Planned

Used

Returned

Rejected

Disposed

---

remarks

TEXT

Nullable.

---

# Audit

recorded_by

UUID

Required.

---

recorded_at

TIMESTAMP

Required.

---

# Relationships

Activity

1 → Many Materials

Site Diary

1 → Many Materials

---

# Business Rules

Material represents actual usage.

Material does not modify planning quantities.

Returned and rejected materials remain part of historical records.

Material quantities shall not be negative.

---

# Constraints

activity_id NOT NULL

site_diary_id NOT NULL

material_name NOT NULL

quantity NOT NULL

unit NOT NULL

---

# Indexes

activity_id

site_diary_id

material_category

material_name

---

# Ownership

Owner

Operation Engine

Referenced by

Reporting Engine

Dashboard

AI Engine

---

# Security

Read

Authorised Users

Write

Operation Engine

Delete

Not Allowed

Archive only.

---

# Future Extensions

Material Cost

Inventory Integration

QR Code

RFID

Stock Balance

Waste Analysis

Carbon Footprint

BOQ Integration

---

# Related Documents

DB-015 Site Diary Schema

DB-014 Activity Schema

DB-031 AI Metadata Schema
