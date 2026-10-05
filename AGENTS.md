# Project guidance

## Model and specification alignment

- Use [`specs/laboratory-equipment-booking-system-implementation-specification.md`](specs/laboratory-equipment-booking-system-implementation-specification.md) as the primary implementation guide.
- The UML diagrams and accepted ADRs in [`modell/`](modell/) define the authoritative behavior. Use [`research/laboratory-equipment-booking-system-exploration.md`](research/laboratory-equipment-booking-system-exploration.md) only as supporting interpretation.
- Preserve all six use cases and the documented Student and Administrator behavior, including rejection paths and unchanged-state outcomes.
- Do not invent features or validation rules. Login, registration, server persistence, booking-overlap checks, duration limits, and operating-hours restrictions are out of scope.
- Keep data in memory for the running session, use the fixed/sample Student, and initialize seeded and added Equipment as Available.
- Use plain HTML, CSS, and JavaScript with no application package dependencies. Use the dependency-free browser test page under `tests/`.
- Generate Equipment and Booking identifiers sequentially as `E1`, `E2`, ... and `B1`, `B2`, ... respectively.
- Keep the single-page Student/Administrator layout and native HTML date/time inputs; publish the static site with GitHub Pages.
- In cancellation, Booking may change its Booked Equipment to Available through `markAvailable()`. Guard Administrator requests separately; its `markAvailable()` request is accepted only from Unavailable.
- Validate changes and tests against the specification, UML diagrams, and ADRs. If they appear to conflict, stop and ask for a human decision rather than silently changing behavior.
- Consult [`plans/laboratory-equipment-booking-system-implementation-plan.md`](plans/laboratory-equipment-booking-system-implementation-plan.md) for phase gates and required human reviews.

## Change discipline

- Keep business logic separate from presentation and write focused tests for successful and rejected domain operations.
- Document the selected toolchain and commands once a human approves the open implementation choices.
- Do not modify UML diagrams or ADRs as part of application implementation without explicit human direction.
