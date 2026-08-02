# DB-029
# Equipment Schema

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status

Locked

---

# Purpose

Equipment records construction plant and machinery utilised during daily site operations.

Equipment supports productivity analysis, reporting and future cost integration.

Equipment records actual operational usage only.

---

# Table Name

equipment

---

# Primary Key

equipment_id

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

# Equipment Information

equipment_name

VARCHAR(150)

Required.

---

equipment_type

VARCHAR(100)

Examples

Excavator

Backhoe

Roller

Crane

Concrete Pump

Generator

Compressor

Truck

---

registration_no

VARCHAR(50)

Nullable.

---

owner_type

ENUM

Contractor

Subcontractor

Employer

Rental

---

quantity

DECIMAL(10,2)

Default 1

---

working_hours

DECIMAL(10,2)

Nullable.

---

status

ENUM

Working

Idle

Breakdown

Maintenance

Standby

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

1 → Many Equipment

Site Diary

1 → Many Equipment

---

# Business Rules

Equipment records actual utilisation only.

One equipment item may appear multiple times across different Site Diaries.

Equipment status represents daily operational condition.

Equipment does not affect planning baseline.

---

# Constraints

activity_id NOT NULL

site_diary_id NOT NULL

equipment_name NOT NULL

status NOT NULL

---

# Indexes

activity_id

site_diary_id

equipment_type

status

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

Fuel Consumption

Equipment Cost

GPS Tracking

Telematics

Preventive Maintenance

Operator Assignment

Equipment Productivity

---

# Related Documents

DB-015 Site Diary Schema

DB-014 Activity Schema

DB-031 AI Metadata Schema
