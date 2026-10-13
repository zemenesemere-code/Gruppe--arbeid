# ADR-003: Booking Time Validation

## Status
Accepted

## Context
A booking includes a date, start time, and end time. The booking must meet the agreed date and time validation rules before it can be created.

## Decision
- A booking date must be in the future.
- The booking start time must be before the end time.
- If either validation fails, the booking must not be created.

## Consequences
- Bookings with a date that is not in the future are not created.
- Bookings whose start time is not before the end time are not created.
