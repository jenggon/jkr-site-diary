# AD-007: Data Flow

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status: Locked

## Purpose

Illustrate how data flows throughout the platform.

## Data Flow Diagram

```mermaid
flowchart LR

MSP[Microsoft Project]

-->

REV[Programme Revision]

-->

PK[Program Kerja]

-->

TASK[Task]

-->

ACT[Activity]

-->

SD[Site Diary]

-->

PROG[Progress]

-->

REPORT[Reports]
```

## Notes

- Every operational record originates from an approved Programme Revision.
