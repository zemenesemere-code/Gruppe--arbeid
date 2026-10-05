# Laboratory Equipment Booking System
## Implementation Specification

## 1. Purpose and authority

This specification defines the behavior to implement for the Laboratory Equipment Booking System. The UML models and accepted ADRs in [`../modell/`](../modell/) are authoritative. The final exploration report, [`../research/laboratory-equipment-booking-system-exploration.md`](../research/laboratory-equipment-booking-system-exploration.md), records confirmed user decisions and supports interpretation of the models.

Do not add behavior that is not specified here or in those sources. Where technical details are not defined, see [Open implementation details](#10-open-implementation-details); do not silently turn those details into new business rules.

## 2. Product scope

The application is a browser-based mock-up intended to be published as a GitHub Page. It implements all six use cases:

| Actor | Use case | Expected capability |
|---|---|---|
| Student | Check availability | Check an Equipment item's availability. |
| Student | Book equipment | Create a booking only when Equipment is Available and the booking date/time checks pass. |
| Student | Cancel booking | Cancel an Active booking at any time. |
| Administrator | Add equipment | Add named Equipment, initially Available. |
| Administrator | Mark equipment unavailable | Change Available Equipment to Unavailable. |
| Administrator | Mark equipment available | Change Unavailable Equipment to Available. |

Login and registration are out of scope. Use the fixed/sample Student profile described in the research report. No authentication or authorization mechanism is defined by the ground truth.

## 3. Domain model

Implement the following model and relationships from the Class Diagram:

- **Student**
  - `navn : String`
  - `medlemsnummer : String`
  - One Student is associated with zero or more Bookings.
- **Booking**
  - `bookingId : String`
  - `dato : Date`
  - `starttid : Time`
  - `sluttid : Time`
  - `status : String`; new bookings use `Active`, and cancelled bookings use `Cancelled`.
  - `createBooking() : Boolean`
  - `cancelBooking()`
  - Each Booking is associated with one Equipment item; an Equipment item may be associated with zero or more Bookings.
- **Equipment**
  - `equipmentId : String`
  - `navn : String`
  - `status : String`, initially `Available` for seeded and newly added equipment.
  - `checkAvailability() : Boolean`
  - `markBooked() : Boolean`
  - `markUnavailable() : Boolean`
  - `markAvailable() : Boolean`
- **Administrator**
  - `addEquipment(navn : String) : Equipment`

The Equipment state machine has exactly these states: `Available`, `Booked`, and `Unavailable`.

## 4. Student workflows

### 4.1 Check availability

1. The Student selects Equipment to check.
2. Availability is determined by Equipment status: `checkAvailability()` returns true when the status is `Available` and false otherwise.
3. Booking date/time overlap is not part of this availability rule.

### 4.2 Book equipment

The Student supplies the selected Equipment, a booking date, a start time, and an end time.

1. Check Equipment availability before creating a Booking.
2. Validate both time rules:
   - The booking date must be later than the browser/device's local calendar date.
   - The start time must be before the end time.
3. If Equipment is not Available, do not create a Booking.
4. If either time rule fails, do not create a Booking.
5. On the successful path, create the Booking with status `Active` and have Booking call `Equipment.markBooked()`.
6. A successful `markBooked()` changes Equipment from `Available` to `Booked`. Keep the Active Booking only if the operation succeeds.
7. If `markBooked()` returns false, do not create or retain the Booking.

No duration, operating-hours, or overlapping-booking rules are specified. Do not add them.

### 4.3 Cancel booking

1. Cancellation is allowed at any time for a Booking whose status is `Active`; there is no date/time window.
2. If a Student has multiple Bookings, present those Bookings and let the Student choose which one to cancel.
3. On cancellation, retain the Booking and change its status from `Active` to `Cancelled`.
4. Have Booking call `Equipment.markAvailable()`. Equipment changes from `Booked` to `Available`.
5. A Booking already in `Cancelled` status cannot be cancelled again. Reject that request without changing the Booking or Equipment.
6. Do not delete cancelled Bookings.

## 5. Administrator workflows

### 5.1 Add equipment

- Call `addEquipment(navn : String)` with the name provided by the Administrator.
- Create and return a new Equipment object with status `Available`.

### 5.2 Change equipment status

Only the transitions shown in the State Machine Diagram are accepted:

This table describes Administrator requests. Booking cancellation has its separately specified `Booked`-to-`Available` transition and may call `Equipment.markAvailable()` for that cancellation. The Administrator flow must guard its request separately and reject `markAvailable()` when the current status is `Booked`.

| Requested operation | Current status | Result |
|---|---|---|
| `markUnavailable()` | `Available` | Return true; change status to `Unavailable`. |
| `markUnavailable()` | `Booked` | Return false; reject the request; remain `Booked`. |
| `markUnavailable()` | `Unavailable` | Return false; reject the request; remain `Unavailable`. |
| `markAvailable()` | `Unavailable` | Return true; change status to `Available`. |
| `markAvailable()` | `Available` | Return false; reject the request; remain `Available`. |
| `markAvailable()` | `Booked` | Return false; reject the request; remain `Booked`. |

Rejected requests must not change Equipment status. The Boolean result indicates success or failure.

## 6. Data lifetime and initial data

The research report records these confirmed implementation constraints:

- Start with a fixed set of Equipment items whose status is `Available`.
- Use a fixed/sample Student profile.
- Keep Equipment and Booking data in memory for the running session; reset it when the application restarts.

No server-side storage or persistence across application restarts is required.

## 7. Hosting and technical constraints

- The application must be publishable as a GitHub Page.
- It must operate as a browser-hosted application without requiring a server-side application service; the confirmed session-only data model is compatible with this constraint.
- Keep domain behavior separate from presentation so that Booking and Equipment rules can be tested without UI interaction.
- Keep the implementation readable, documented, and organized around the repository's chosen stack. The current repository contains no application source, dependency manifest, build configuration, or test suite from which to infer a framework.
- Do not introduce login, registration, backend persistence, or other features not in scope.

## 8. Validation, rejection, and user-visible outcomes

The interface must make the specified success and failure outcomes clear:

- Availability check: indicate whether the selected Equipment is Available.
- Booking: identify the applicable reason when no booking is created (unavailable Equipment, non-future date, start time not before end time, or failed `markBooked()`).
- Cancellation: show the Active-to-Cancelled outcome and that the Booking is retained; reject a request to cancel a Cancelled Booking.
- Administrator status operations: show whether the transition succeeded; on rejection, leave the status unchanged.

Do not invent additional validation constraints such as a non-empty equipment name, booking-duration limit, opening hours, or time-overlap rejection. The source models do not define them.

## 9. Verification against the UML and ADRs

Verification must use behavior-level tests and a traceability review:

| Requirement area | Ground-truth reference | Minimum verification |
|---|---|---|
| All actors/use cases | [`Use-case-diagram.drawio`](../modell/Use-case-diagram.drawio) | Confirm each of the six use cases is reachable through the corresponding Student or Administrator flow. |
| Domain fields, operations, and relationships | [`Class-diagram.drawio`](../modell/Class-diagram.drawio) | Check required fields, method signatures, status types, and associations against the implemented domain types. |
| Availability before booking | [`ADR-001-booking-availability.md`](../modell/ADR-001-booking-availability.md), [`Sequence-diagram.drawio`](../modell/Sequence-diagram.drawio), [`Activitiy-diagram.drawio`](../modell/Activitiy-diagram.drawio) | Verify Available permits progression and non-Available Equipment results in no Booking. |
| Booking date/time rules and status | [`ADR-003-booking-time-validation.md`](../modell/ADR-003-booking-time-validation.md), [`ADR-002-equipment-status-and-cancellation.md`](../modell/ADR-002-equipment-status-and-cancellation.md), workflow diagrams | Test a future local date, today/past dates, start-before-end, invalid ordering, Active status on success, and no retained Booking on validation or `markBooked()` failure. |
| Equipment state transitions | [`State-Machine-diagram.drawio`](../modell/State-Machine-diagram.drawio), [`ADR-002-equipment-status-and-cancellation.md`](../modell/ADR-002-equipment-status-and-cancellation.md) | Test each accepted transition and each rejected transition in Section 5.2, checking both Boolean result and unchanged/changed status. |
| Cancellation | [`ADR-002-equipment-status-and-cancellation.md`](../modell/ADR-002-equipment-status-and-cancellation.md), [`Sequence-diagram.drawio`](../modell/Sequence-diagram.drawio), [`Activitiy-diagram.drawio`](../modell/Activitiy-diagram.drawio) | Verify Active becomes retained Cancelled, Equipment becomes Available, and retry cancellation is rejected without state change. |
| Equipment creation | Class and Activity/Sequence Diagrams | Verify `addEquipment(navn : String)` returns an Equipment object with the supplied name and `Available` status. |
| GitHub Pages delivery | This specification | Build and publish the static application, then smoke-test its availability and primary Student/Administrator flows at the published URL. |

The test suite should include focused unit tests for domain rules and integration/UI tests for the six workflows. The complete suite and production build must pass before publication. Review the traceability table during changes to ensure no implementation behavior drifts from its referenced source.

## 10. Open implementation details

These details are not prescribed by the UML diagrams or ADRs and must not be treated as additional business requirements:

- Select a static-site-compatible language/framework, build tool, and test runner. None is present in the current repository.
- Choose how to generate unique `bookingId` and `equipmentId` values; the models define their fields but not the identifier format or generation method.
- Choose the visual layout and exact date/time input/display formats while preserving the specified workflows. No visual design or locale format is modeled.
- The date validation reference is the browser/device local calendar date, as confirmed for the ADR. The time input/display convention beyond the `Time` type is not further specified.
- Authentication and role-based access are not defined. Do not add them without a separate decision.

No application behavior beyond the listed model and ADR decisions is assumed by this specification.
