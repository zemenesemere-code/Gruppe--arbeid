# ADR-002: Equipment Status and Cancellation

## Status
Accepted

## Context
A booking changes equipment status to Booked. Students can cancel bookings, and administrators can manage equipment availability. The booking and equipment status must remain consistent when a booking is cancelled or an administrator changes equipment availability.

## Decision
- A newly created booking has status Active.
- A cancelled booking is retained with status Cancelled; it is not deleted.
- When a booking is cancelled, its status changes from Active to Cancelled.
- When a booking is cancelled, its equipment changes from Booked to Available.
- An Administrator can mark Available equipment as Unavailable.
- An Administrator can mark Unavailable equipment as Available.
- If equipment is Booked, an Administrator cannot mark it Unavailable. The request is rejected, and the equipment remains Booked.

## Consequences
- New bookings begin with status Active; cancelled bookings remain in the system with status Cancelled.
- Cancelling a booking changes its status from Active to Cancelled.
- Cancelling a booking makes its equipment Available.
- Administrators can change equipment status between Available and Unavailable.
- A request to mark Booked equipment Unavailable does not change its status; it remains Booked.
