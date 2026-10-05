# Laboratory Equipment Booking System: Final Model Exploration

## Purpose and scope

This report records a cross-model review of every file in [`modell/`](../modell/). It checks the six use cases, their UML representations, and both accepted ADRs against the clarifications and decisions recorded below. No application code, UML diagram, or ADR was changed during this review. The mock-up has not been implemented.

## Input set reviewed

| Source | Current content |
|---|---|
| [`Use-case-diagram.drawio`](../modell/Use-case-diagram.drawio) | Student: check availability, book equipment, cancel booking. Administrator: add equipment, mark equipment unavailable, mark equipment available. Booking includes checking availability. |
| [`Class-diagram.drawio`](../modell/Class-diagram.drawio) | `Student` has `navn` and `medlemsnummer`. `Booking` has `bookingId`, `dato`, `starttid`, `sluttid`, an untyped `status`, `createBooking(): Boolean`, and `cancelBooking()`. `Equipment` has `equipmentId`, `navn`, `status: String`, `checkAvailability(): Boolean`, `markUnavailable()`, and `markAvailable()`. `Administrator` has `addEquipment()` with no parameters or return type. One Student has zero or more Bookings; each Booking has one Equipment; an Equipment may be associated with zero or more Bookings. |
| [`Sequence-diagram.drawio`](../modell/Sequence-diagram.drawio) | Shows availability checking, an `alt` for booking permitted/not created, cancellation with a retained Cancelled booking and `markAvailable()`, and Administrator actions. The `markUnavailable()` alternative accepts equipment that is “not Booked” and rejects it when Booked; the Administrator `markAvailable()` call has no condition. The successful booking path does not update Equipment to Booked. |
| [`Activitiy-diagram.drawio`](../modell/Activitiy-diagram.drawio) | The visible graph has separate flows for checking availability, booking, cancellation, adding equipment, marking it Available, and marking it Unavailable. Booking branches on availability; cancellation retains the booking as Cancelled and returns equipment to Available; adding equipment starts it Available; marking equipment Unavailable rejects a Booked item. The embedded PlantUML source instead represents the workflows as branches of a single “Select use case?” flow. |
| [`State-Machine-diagram.drawio`](../modell/State-Machine-diagram.drawio) | Equipment states: Available, Booked, Unavailable. Transitions: initial to Available; Available to Booked on booking; Booked to Available on cancellation; Available to Unavailable and Unavailable to Available on Administrator actions; Booked self-transition when an Administrator’s unavailable request is rejected. |
| [`ADR-001-booking-availability.md`](../modell/ADR-001-booking-availability.md) | Requires checking availability before creating a booking; booking is permitted only when the equipment is Available. |
| [`ADR-002-equipment-status-and-cancellation.md`](../modell/ADR-002-equipment-status-and-cancellation.md) | Retains a cancelled booking as Cancelled and returns its equipment from Booked to Available; allows Available-to-Unavailable and Unavailable-to-Available Administrator changes; rejects marking Booked equipment Unavailable. |

## Decisions and clarifications confirmed

These are decisions supplied by the user, not assumptions inferred from the diagrams:

- All six use cases in the use-case diagram are in scope.
- Availability is based on Equipment status; booking date/time overlap is not part of the availability rule.
- A student supplies equipment, date, start time, and end time for a booking. Require a future date and a start time before the end time; no duration or operating-hours limit was set.
- Use a fixed/sample Student profile. Login and registration are not in scope.
- Start with a fixed set of Available equipment. Adding equipment requires a name and the new equipment starts Available.
- A successful booking has status `Active`; cancellation is allowed at any time, retains the booking with status `Cancelled`, and changes the Equipment from Booked to Available.
- Booking status is represented as `String`, matching `Equipment.status`.
- If the Student has multiple bookings, show the Student’s bookings and let them choose which one to cancel.
- Equipment must be explicitly marked Booked through an Equipment operation named `markBooked()`. After `Booking.createBooking()` succeeds, Booking calls `Equipment.markBooked()`.
- If `markBooked()` fails, do not create or keep the booking.
- `markBooked()`, `markAvailable()`, and `markUnavailable()` return a Boolean success/failure result.
- Administrator status requests are accepted only for the state transitions shown in the state machine: Available to Unavailable, and Unavailable to Available. Requests outside those transitions are rejected, including repeated requests to mark equipment with its existing status and a request to mark Booked equipment Available.
- `Administrator.addEquipment()` should accept the equipment name and return the created Equipment: `addEquipment(navn: String): Equipment`.
- Equipment and bookings are stored in memory for the running session and reset on restart.
- Follow the repository’s existing stack and UI conventions.

## Cross-model findings

### Consistent or aligned behavior

1. **Use-case scope:** The Use Case Diagram lists all six in-scope use cases. The Activity and Sequence Diagrams cover them, and the Class Diagram has corresponding Booking, Equipment, and Administrator classes and operations.
2. **Unavailable booking:** ADR-001, the booking branch in the Activity Diagram, and the false branch in the Sequence Diagram agree that an unavailable item must not result in a booking.
3. **Cancellation outcome:** ADR-002, the cancellation flows, and the state machine agree that cancellation retains the booking as Cancelled and moves its Equipment from Booked to Available. The state machine has no time guard, consistent with cancellation being permitted at any time.
4. **Core Equipment states:** The State Machine Diagram uses the agreed Available, Booked, and Unavailable states and shows the principal booking, cancellation, and Administrator transitions.

### Inconsistencies or missing model details

1. **Successful booking does not mark Equipment Booked in the workflow diagrams.** The State Machine Diagram requires Available to become Booked when a booking is created, and ADR-002’s context says booking changes equipment to Booked. However, the Class Diagram lacks the now-decided `Equipment.markBooked()` operation, and the Activity and Sequence Diagrams do not show this update. Align the Class Diagram with `markBooked()` and show Booking calling it after `createBooking()` succeeds. The Activity Diagram should also represent the equipment becoming Booked on the successful path. Record the no-booking outcome if `markBooked()` fails, consistent with the confirmed decision.
2. **New Booking status is underspecified in the models and ADR.** The Class Diagram’s `Booking.status` has no type. It does not specify the newly confirmed `Active` value. The creation flow in the Activity and Sequence Diagrams also does not show an Active booking. Update the class member to a String status and align the successful creation flow; consider recording the Active status in ADR-002.
3. **Administrator guards do not match the accepted transitions.** The State Machine Diagram permits marking Unavailable only from Available and marking Available only from Unavailable. The Sequence Diagram currently accepts `markUnavailable()` whenever Equipment is “not Booked,” which includes already-Unavailable Equipment; its `markAvailable()` call is unconditional. The Activity Diagram checks only whether Equipment is Booked before marking it Unavailable, so it also accepts already-Unavailable Equipment, and it has no guard for marking Available. Align the Activity and Sequence Diagrams so only the two declared source-state transitions succeed and all other requests are rejected. The State Machine Diagram currently shows the Booked self-transition for rejecting markUnavailable(), but does not depict the other now-confirmed rejections: Available receiving markAvailable(), Unavailable receiving markUnavailable(), and Booked receiving markAvailable().
4. **Add-equipment signature does not describe the agreed input/output.** The Class Diagram currently has `Administrator.addEquipment()` with no parameters or return type, and the Sequence Diagram also shows a parameterless call. The confirmed signature is `addEquipment(navn: String): Equipment`; align the Class and Sequence Diagrams with it. The Activity Diagram already states that new equipment starts Available.
5. **Booking inputs and time validation are not represented in the flow models.** The Class Diagram has date and time fields, but `createBooking()` has no parameters, and the Sequence Diagram passes no equipment/date/time values. The Activity Diagram does not show the agreed future-date and start-before-end validation. Update the creation operation/sequence to carry the selected equipment, date, start time, and end time, and represent the agreed time validation in the workflow.
6. **Activity Diagram source and visible graph differ structurally.** Its embedded PlantUML source presents a single use-case selection decision with branched flows; the visible graph presents separate framed workflows, each with its own start and end. They express the same broad scope, but editing or regenerating from the embedded source may not preserve the visible organization. Reconcile the two representations when the diagram is next edited.
7. **ADR traceability is incomplete for some confirmed decisions.** ADR-001 records the availability gate but not the associated Equipment transition to Booked or the Active booking status. ADR-002 covers cancellation and the two valid Administrator transitions, but not the rejected out-of-source-state Administrator requests or the initial Active booking status. The UML can be aligned with the decisions without requiring an ADR change, but the ADRs would not then record every confirmed rule.
8. **Equipment status operations do not expose their results in the Class Diagram or workflows.** The class methods currently have no return types, and the Activity and Sequence Diagrams do not show the accepted/rejected result. The now-confirmed Boolean result for `markBooked()`, `markAvailable()`, and `markUnavailable()` allows the flows to represent those outcomes; update the method signatures and diagrams accordingly.

## Questions and decisions

All questions raised during this review have been answered. In particular, a failed `markBooked()` call means no booking is created or kept, and Equipment status-changing operations return Boolean success/failure results. The remaining items in the findings are consistency updates based on these confirmed decisions; they do not require further behavior to be invented.

## Implementation alignment checklist

- Check Equipment status before booking; do not create a booking if unavailable.
- Validate a future date and start time before end time; do not add duration or operating-hours rules.
- On successful creation, create an Active Booking and have Booking call `Equipment.markBooked()`. If that operation returns false, no booking is created or retained.
- Do not use other bookings’ date/time ranges as part of availability.
- Use a fixed sample Student and initially Available equipment; add named equipment as Available.
- Allow cancellation at any time; retain it as Cancelled and return its Equipment to Available.
- Allow Administrator status changes only from Available to Unavailable or Unavailable to Available; reject other source states, including repeated status requests and Booked-to-Available through the Administrator action.
- Keep data session-only and follow repository stack/UI conventions.

## Review status

The complete `/modell` folder was reviewed against the decisions above. This report contains the cross-model inconsistencies and the decisions needed to reconcile them. No UML diagram, ADR, or application code was changed.
