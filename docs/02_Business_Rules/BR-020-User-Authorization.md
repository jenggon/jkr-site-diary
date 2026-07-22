# BR-020: User Authorization

Status: Active

Priority: Critical

## Purpose

Control user permissions.

## Rule Statement

Every operation shall require an authenticated user.

Business permissions shall be enforced before execution.

## Acceptance Criteria

- User authenticated.
- Permission validated.
- Unauthorized operation rejected.

## Related Domain Model

DM-007

## Related ADR

ADR-005
ADR-008