# Laboratory Equipment Booking System
## Phased Implementation Plan

## 1. Purpose and planning basis

This plan breaks the approved [Implementation Specification](../specs/laboratory-equipment-booking-system-implementation-specification.md) into junior-friendly phases. The specification is the primary implementation guide. The [UML diagrams and ADRs](../modell/) are the behavior-alignment references; the [research report](../research/laboratory-equipment-booking-system-exploration.md) supports their interpretation.

This document plans the work only. It does not authorize extra product behavior, settle open technical choices, or implement the application.

## 2. Delivery principles

- **Approved Phase 0 choices:** plain HTML, CSS, and JavaScript; sequential IDs (`E1`, `E2`, ... and `B1`, `B2`, ...); a single page with Student and Administrator sections; native date/time inputs; and static GitHub Pages publishing.
- **Approved test approach:** dependency-free browser test page under `tests/`; no application build step or package dependencies are required.
- Complete a phase's exit checks and human checkpoint before relying on its result in the next phase.
- Keep business rules in a small domain layer separate from browser presentation.
- Keep data in memory for the running session; restart returns to the fixed sample data.
- Test both successful and rejected outcomes. In particular, verify that a rejected operation leaves state unchanged.
- Maintain a trace from each implemented behavior and test to the specification section and relevant UML/ADR.
- Do not add login, registration, server persistence, booking-overlap rules, duration limits, operating hours, or other unspecified features.

## 3. Phased plan

### Phase 0 — Resolve implementation choices and establish the baseline

**Work**

- Reconfirm that the approved specification and current UML/ADRs are the intended baseline.
- Record the approved plain HTML/CSS/JavaScript stack and dependency-free browser test approach.
- Record the approved sequential Equipment and Booking ID formats.
- Record the approved single-page Student/Administrator layout and native date/time inputs.
- Record static GitHub Pages as the publishing target.

**Deliverables**

- Phase 0 choices listed under [Delivery principles](#2-delivery-principles).

**Exit checks and human checkpoint**

- Confirm the static files and browser test page load in a browser.
- No package dependencies or compile/build step are needed for the approved stack.

**Checkpoint:** choices were approved by the human before implementation began.

### Phase 1 — Create the application skeleton

**Work**

- Create the root `index.html`, CSS, and JavaScript entry points using the approved static stack.
- Add the dependency-free browser test page.
- Document how to open the app and test page locally.
- Keep the root static files ready for GitHub Pages; no compiler or bundler is used.

**Deliverables**

- A clean static application shell.
- A browser-runnable test page.
- Directly publishable static files.

**Exit checks and human checkpoint**

- Open the static application and test page in a browser and verify that both load without errors.
- Review the initial structure before implementing domain behavior.

### Phase 2 — Implement and unit-test the domain model

**Work**

- Define `Student`, `Booking`, `Equipment`, and `Administrator` domain types and their fields and associations from the Class Diagram.
- Define Equipment states `Available`, `Booked`, and `Unavailable`, and Booking statuses `Active` and `Cancelled`.
- Implement `checkAvailability()` and Boolean status operations:
  - `markBooked()` accepts only `Available` and changes it to `Booked`.
  - `markUnavailable()` accepts only `Available` and changes it to `Unavailable`.
  - Booking cancellation may call `markAvailable()` from `Booked` to `Available`.
  - An Administrator may call `markAvailable()` only from `Unavailable`; guard the Administrator request separately so Booked-to-Available remains rejected for that use case.
  - Rejected state changes return false and leave status unchanged.
- Implement booking validation and creation: use the browser/device local calendar date, require a future date and start-before-end, require Equipment to be Available, initialize a successful booking as Active, and retain no booking if `markBooked()` fails.
- Implement cancellation of Active bookings at any time; retain the booking as Cancelled and change its Equipment from Booked to Available. Reject cancellation of an already Cancelled booking without changing either.
- Implement `addEquipment(navn : String) : Equipment` with initial Available status.
- Use the approved ID-generation decision without imposing new validation rules.

**Deliverables**

- Domain code independent of UI.
- Unit tests for state transitions, booking creation, cancellation, and equipment creation.

**Minimum verification**

- Test all accepted and rejected Equipment transitions and check both return value and final state.
- Test today/past versus future local dates and valid/invalid time ordering.
- Test unavailable Equipment and failed `markBooked()` produce no retained Booking.
- Test successful creation produces Active Booking and Booked Equipment.
- Test Active cancellation retains a Cancelled Booking and makes Equipment Available; retry cancellation is rejected with no state change.
- Test added Equipment has the supplied name and Available status.

**Exit checks and human checkpoint**

- Unit tests pass and map to the model/ADR rules.
- Review the domain model and test cases against the Class Diagram, State Machine Diagram, ADR-001, ADR-002, and ADR-003 before building UI flows.

### Phase 3 — Add session-only data and initial sample data

**Work**

- Create an in-memory store for Equipment and Bookings for the lifetime of the running session.
- Seed a fixed set of Equipment, all Available, and one fixed/sample Student.
- Ensure application restart restores the initial sample data and does not imply persistence.
- Provide a way for workflows to access the Student's bookings and associated Equipment without duplicating business rules in the UI.

**Deliverables**

- Session-only repository/store and fixed sample data.
- Tests for initial state and reset-on-restart behavior.

**Exit checks and human checkpoint**

- Verify seeded Equipment is Available, initial Bookings are absent unless the approved sample data explicitly includes them, and in-memory changes do not survive a restart.
- Review the sample data and reset behavior before wiring the UI.

### Phase 4 — Implement Student workflows

**Work**

- Build the Student view for checking Equipment availability.
- Build the booking form using the approved presentation conventions. Collect selected Equipment, date, start time, and end time.
- Show clear booking outcomes for unavailable Equipment, invalid date, invalid time order, and failed booking/Equipment status transition.
- Display the Student's bookings and allow selection of a Booking to cancel.
- Make cancellation available for Active bookings regardless of date/time; reject already Cancelled bookings and keep their status unchanged.

**Deliverables**

- Student availability, booking, and cancellation UI flows.
- Integration or UI tests for successful and rejected cases.

**Minimum verification**

- Trace each Student flow to the Use Case, Activity, Sequence, and relevant State Machine/ADR requirements.
- Confirm the UI does not add date/time overlap, duration, operating-hour, or cancellation-window rules.
- Confirm Bookings are retained as Cancelled and are not deleted.

**Exit checks and human checkpoint**

- Student workflow tests pass.
- Review the UI behavior and failure messaging against the specification before implementing Administrator flows.

### Phase 5 — Implement Administrator workflows

**Work**

- Build the add-equipment form for the equipment name; show the returned Equipment as Available.
- Build the status actions for marking Equipment Available or Unavailable.
- Display whether each transition succeeded; on rejection, preserve and show the existing status.
- Do not allow Administrator actions to bypass the domain state-transition rules.

**Deliverables**

- Administrator add-equipment and status-management UI flows.
- Integration or UI tests for accepted and rejected state changes.

**Minimum verification**

- Add equipment and verify name and Available status.
- Exercise both accepted transitions and all rejected source-state requests, including repeated requests and Booked-to-Available.
- Verify each rejected request leaves the state unchanged and communicates the result.

**Exit checks and human checkpoint**

- Administrator tests pass and match the Class Diagram, Activity Diagram, Sequence Diagram, State Machine Diagram, and ADR-002.
- Review the complete Student and Administrator mock-up before final verification.

### Phase 6 — Full model traceability, documentation, and regression verification

**Work**

- Run the dependency-free domain tests and repeat the integration/UI smoke checks.
- Verify that all local links and static assets resolve from the repository root.
- Review a requirement-to-test traceability table covering all six use cases, domain operations, success cases, and rejection cases.
- Check that UI code delegates state and validation rules to the domain layer.
- Document how to open the app and tests locally, and how the static files will be published.
- Review changes against [`AGENTS.md`](../AGENTS.md), this plan, the specification, and UML/ADRs.

**Deliverables**

- Passing domain/UI verification and clean static-file checks.
- Updated developer instructions and requirement/test traceability.

**Exit checks and human checkpoint**

- Human reviewer confirms that all required model behaviors are implemented and no unapproved behavior was added.
- Approve the release candidate before publishing to GitHub Pages.

### Phase 7 — GitHub Pages release and final verification

**Work**

- Publish the approved production build using the Phase 0 deployment choice.
- Verify the published URL loads over HTTPS and that built assets resolve from the actual GitHub Pages project path.
- Smoke-test all six use cases on the published site, including representative rejected booking and status-transition cases.
- Check browser console/network failures and confirm that session data resets when the page is reloaded or the application is restarted as specified.
- Record the published URL, build/test result, and any release issue in project documentation.

**Deliverables**

- Published static mock-up.
- Human-reviewed release verification record.

**Final human checkpoint**

- Confirm the live site, primary flows, rejection paths, and build/test results before calling the implementation complete.

## 4. Cross-phase model alignment checklist

- **Use Case Diagram:** deliver all six Student and Administrator use cases.
- **Class Diagram:** implement specified domain fields, operations, and associations; do not infer extra signatures or fields.
- **Sequence Diagram:** preserve availability gating, booking validation and `markBooked()` outcomes, cancellation behavior, and Administrator outcomes.
- **Activity Diagram:** preserve every successful and rejected workflow, including local future-date validation and cancellation of Active bookings only.
- **State Machine Diagram:** allow only the modeled Equipment state transitions; rejected requests leave Equipment in its current state.
- **ADR-001:** check availability before creating a booking; non-Available Equipment yields no booking.
- **ADR-002:** new Booking is Active; cancellation retains it as Cancelled and returns Equipment to Available; Administrator status changes obey the recorded transition rules.
- **ADR-003:** date is later than the browser/device local calendar date and start time is before end time; either failure prevents booking creation.
- **Implementation Specification:** session-only data, fixed/sample Student, initially Available Equipment, GitHub Pages delivery, clear outcomes, testability, and no features outside scope.

When a model, ADR, specification, or code appears to conflict, stop the affected work and ask for a human decision. Do not silently resolve a business-rule conflict in code.

## 5. Remaining decision discipline

The stack, identifier format, page layout, input controls, test approach, and hosting target have been approved. If implementation reveals another decision that affects required behavior, stop the affected work and ask for a human decision; do not add business rules.
