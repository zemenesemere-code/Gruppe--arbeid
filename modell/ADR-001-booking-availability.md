# ADR-001: Booking Requires Available Equipment

## Status
Accepted

## Context
A student can book laboratory equipment.
The system must prevent a booking from being created when the equipment is not available.

## Decision
Before a booking is created, the system must check whether the equipment is available.

A booking can only be created if the equipment is available.

## Consequences
- A student cannot book equipment that is unavailable.
- The availability of the equipment must be checked before creating a booking.
- If the equipment is unavailable, no booking is created.
