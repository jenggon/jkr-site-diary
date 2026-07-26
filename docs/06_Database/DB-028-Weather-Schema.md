# DB-028
# Weather Schema

Status

Approved

---

# Purpose

Weather stores environmental conditions affecting daily construction activities.

Weather records support Site Diary documentation, reporting and productivity analysis.

---

# Table Name

weather

---

# Primary Key

weather_id

UUID

---

# Parent Ownership

programme_id

UUID

FK

Required.

site_diary_id

UUID

FK

Required.

---

# Observation

observation_date

DATE

Required.

observation_time

TIME

Nullable.

---

# Weather Information

weather_condition

ENUM

Sunny

Cloudy

Rain

Heavy Rain

Thunderstorm

Fog

Windy

---

temperature_celsius

DECIMAL(5,2)

Nullable.

humidity_percentage

DECIMAL(5,2)

Nullable.

rainfall_mm

DECIMAL(6,2)

Nullable.

wind_speed_kmh

DECIMAL(6,2)

Nullable.

---

# Source

weather_source

VARCHAR(100)

Examples

Manual Entry

MetMalaysia

Weather API

---

# Audit

recorded_by

UUID

Required.

recorded_at

TIMESTAMP

Required.

---

# Relationships

Site Diary

1 → 1 Weather

---

# Business Rules

One Site Diary shall have one Weather record.

Weather may be entered manually or imported.

Weather records never modify operational data.

Historical observations remain unchanged.

---

# Constraints

site_diary_id UNIQUE

weather_condition NOT NULL

observation_date NOT NULL

---

# Indexes

site_diary_id

observation_date

weather_condition

---

# Ownership

Owner

Weather Engine

Referenced by

Site Diary

Reporting

AI Engine

Dashboard

---

# Security

Read

Authorised Users

Write

Weather Engine

Delete

Not Allowed

Archive Only

---

# Future Extensions

Automatic API Synchronisation

Hourly Weather

Rain Alert

Heat Index

Lightning Warning

Weather Forecast

---

# Related Documents

DB-015 Site Diary Schema

DB-031 AI Metadata Schema

AE-001 Activity Engine