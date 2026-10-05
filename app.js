"use strict";

const system = new BookingDomain.BookingSystem();

const availabilityForm = document.querySelector("#availability-form");
const availabilityEquipment = document.querySelector("#availability-equipment");
const bookingForm = document.querySelector("#booking-form");
const bookingEquipment = document.querySelector("#booking-equipment");
const studentBookings = document.querySelector("#student-bookings");
const administratorEquipment = document.querySelector("#administrator-equipment");

document.querySelector("#student-profile").textContent =
  `${system.student.navn} (${system.student.medlemsnummer})`;

function createOption(equipment, selectedId) {
  const option = document.createElement("option");
  option.value = equipment.equipmentId;
  option.textContent = `${equipment.navn} (${equipment.status})`;
  option.selected = equipment.equipmentId === selectedId;
  return option;
}

function renderEquipment() {
  const availabilitySelection = availabilityEquipment.value;
  const bookingSelection = bookingEquipment.value;
  const firstEquipmentId = system.equipment[0].equipmentId;
  availabilityEquipment.replaceChildren(
    ...system.equipment.map((item) =>
      createOption(item, availabilitySelection || firstEquipmentId),
    ),
  );
  bookingEquipment.replaceChildren(
    ...system.equipment.map((item) =>
      createOption(item, bookingSelection || firstEquipmentId),
    ),
  );

  administratorEquipment.replaceChildren();
  for (const equipment of system.equipment) {
    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "record-row";

    const description = document.createElement("span");
    description.textContent =
      `${equipment.equipmentId}: ${equipment.navn} — ${equipment.status}`;

    const availableButton = document.createElement("button");
    availableButton.type = "button";
    availableButton.dataset.action = "available";
    availableButton.dataset.equipmentId = equipment.equipmentId;
    availableButton.textContent = "Mark available";

    const unavailableButton = document.createElement("button");
    unavailableButton.type = "button";
    unavailableButton.dataset.action = "unavailable";
    unavailableButton.dataset.equipmentId = equipment.equipmentId;
    unavailableButton.textContent = "Mark unavailable";

    row.append(description, availableButton, unavailableButton);
    item.append(row);
    administratorEquipment.append(item);
  }
}

function renderBookings() {
  studentBookings.replaceChildren();
  for (const booking of system.bookings) {
    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "record-row";

    const description = document.createElement("span");
    description.textContent =
      `${booking.bookingId}: ${booking.equipment.navn}, ${booking.dato}, ` +
      `${booking.starttid}–${booking.sluttid} — ${booking.status}`;

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.dataset.bookingId = booking.bookingId;
    cancelButton.textContent = "Cancel booking";

    row.append(description, cancelButton);
    item.append(row);
    studentBookings.append(item);
  }
}

availabilityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const equipment = system.equipment.find(
    (item) => item.equipmentId === availabilityEquipment.value,
  );
  const result = document.querySelector("#availability-result");
  if (!equipment) {
    result.textContent = "No equipment is available to check.";
    return;
  }

  result.textContent = equipment.checkAvailability()
    ? `${equipment.navn} is Available.`
    : `${equipment.navn} is ${equipment.status}, so it is not available.`;
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(bookingForm);
  const result = system.createBooking(
    fields.get("equipment"),
    fields.get("date"),
    fields.get("start"),
    fields.get("end"),
  );
  const messages = {
    equipment: "Select equipment before creating a booking.",
    unavailable: "This equipment is not Available; no booking was created.",
    date: "The booking date must be after today's local date; no booking was created.",
    time: "The start time must be before the end time; no booking was created.",
    "equipment-status":
      "The equipment could not be marked Booked; no booking was retained.",
  };

  document.querySelector("#booking-result").textContent = result.booking
    ? `Booking ${result.booking.bookingId} created with status Active.`
    : messages[result.error];
  renderEquipment();
  renderBookings();
});

studentBookings.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-booking-id]");
  if (!button) {
    return;
  }

  const booking = system.bookings.find(
    (item) => item.bookingId === button.dataset.bookingId,
  );
  const result = document.querySelector("#cancellation-result");
  if (booking && booking.cancelBooking()) {
    result.textContent =
      `Booking ${booking.bookingId} is retained as Cancelled; ` +
      `${booking.equipment.navn} is Available.`;
  } else {
    result.textContent =
      "Only an Active booking can be cancelled; no status was changed.";
  }

  renderEquipment();
  renderBookings();
});

document.querySelector("#add-equipment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name");
  const equipment = system.administrator.addEquipment(name);
  document.querySelector("#add-equipment-result").textContent =
    `${equipment.navn} added as ${equipment.equipmentId} with status Available.`;
  event.currentTarget.reset();
  renderEquipment();
});

administratorEquipment.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const equipment = system.equipment.find(
    (item) => item.equipmentId === button.dataset.equipmentId,
  );
  if (!equipment) {
    return;
  }

  const succeeded =
    button.dataset.action === "available"
      ? system.markEquipmentAvailableAsAdministrator(equipment)
      : equipment.markUnavailable();
  const result = document.querySelector("#administrator-result");
  result.textContent = succeeded
    ? `${equipment.navn} status changed to ${equipment.status}.`
    : `Request rejected; ${equipment.navn} remains ${equipment.status}.`;
  renderEquipment();
});

renderEquipment();
renderBookings();
