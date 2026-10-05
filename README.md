# Laboratory Equipment Booking System

This is a static, browser-based mock-up implemented with plain HTML, CSS, and JavaScript. It has no package dependencies or compilation step.

## Run locally

Open `index.html` in a browser. The application keeps Equipment and Bookings in memory for the current page session; reloading the page restores the fixed sample Student and Available Equipment.

## Run domain tests

Open `tests/index.html` in a browser. The page runs the dependency-free domain tests and displays the individual results.

## Publish

The site is designed for static GitHub Pages hosting. Publish the repository root so that `index.html`, `styles.css`, `domain.js`, and `app.js` are served together. The `tests/` folder contains the browser test page.

## Model alignment

See the [implementation specification](specs/laboratory-equipment-booking-system-implementation-specification.md), [phased implementation plan](plans/laboratory-equipment-booking-system-implementation-plan.md), and [`modell/`](modell/) for the authoritative behavior and review requirements.
