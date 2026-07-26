# DB-031
# AI Metadata Schema

Status

Approved

---

# Purpose

AI Metadata stores machine-generated information derived from operational records.

The table contains AI observations, predictions and recommendations without modifying operational data.

AI Metadata is a read-only intelligence layer.

---

# Table Name

ai_metadata

---

# Primary Key

ai_metadata_id

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

Nullable.

site_diary_id

UUID

FK

Nullable.

progress_id

UUID

FK

Nullable.

photo_id

UUID

FK

Nullable.

attachment_id

UUID

FK

Nullable.

---

# AI Information

ai_engine

VARCHAR(100)

Examples

OpenAI

Gemini

Claude

Custom Model

---

analysis_type

ENUM

Progress Assessment

Risk Detection

Delay Prediction

Quality Assessment

Safety Observation

Document Summary

Image Analysis

Recommendation

---

confidence_score

DECIMAL(5,2)

Range

0.00

to

100.00

---

summary

TEXT

Required.

---

recommendation

TEXT

Nullable.

---

risk_level

ENUM

Low

Medium

High

Critical

---

status

ENUM

Pending Review

Accepted

Rejected

Archived

---

# Audit

generated_at

TIMESTAMP

Required.

generated_by

VARCHAR(100)

Default

AI Engine

reviewed_by

UUID

Nullable.

reviewed_at

TIMESTAMP

Nullable.

---

# Relationships

Activity

1 → Many AI Metadata

Site Diary

1 → Many AI Metadata

Photo

1 → Many AI Metadata

Attachment

1 → Many AI Metadata

---

# Business Rules

AI Metadata shall never overwrite operational records.

AI recommendations require human review before implementation.

Confidence score represents AI certainty only.

Historical AI analyses remain immutable.

---

# Constraints

analysis_type NOT NULL

summary NOT NULL

confidence_score BETWEEN 0 AND 100

---

# Indexes

activity_id

site_diary_id

analysis_type

risk_level

generated_at

---

# Ownership

Owner

AI Engine

Referenced by

Dashboard

Reporting Engine

Decision Support

---

# Security

Read

Authorised Users

Write

AI Engine

Update

Review Status Only

Delete

Archive Only

---

# Future Extensions

Multi-model Comparison

Trend Detection

Voice Analysis

Predictive Scheduling

Automated NCR Detection

---

# Related Documents

DB-014 Activity Schema

DB-027 Photo Schema

DB-026 Attachment Schema