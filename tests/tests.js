"use strict";

const { BookingDomain } = globalThis;
const results = document.querySelector("#results");
const summary = document.querySelector("#summary");
let passed = 0;
let failed = 0;

function test(name, run) {
  const item = document.createElement("li");
  try {
    run();
    item.textContent = `PASS: ${name}`;
    passed += 1;
  } catch (error) {
    item.textContent = `FAIL: ${name} — ${error.message}`;
    failed += 1;
  }
  results.append(item);
}

function assertEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return BookingDomain.localCalendarDate(date);
}

function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return BookingDomain.localCalendarDate(date);
}

test("equipment starts Available and reports availability", () => {
  const equipment = new BookingDomain.Equipment("E1", "Microscope");
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
  assertEqual(equipment.checkAvailability(), true);
  equipment.markBooked();
  assertEqual(equipment.checkAvailability(), false);
});

test("markBooked accepts Available and rejects a second request", () => {
  const equipment = new BookingDomain.Equipment("E1", "Microscope");
  assertEqual(equipment.markBooked(), true);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.BOOKED);
  assertEqual(equipment.markBooked(), false);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.BOOKED);
});

test("markUnavailable accepts Available only", () => {
  const equipment = new BookingDomain.Equipment("E1", "Microscope");
  assertEqual(equipment.markUnavailable(), true);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.UNAVAILABLE);
  assertEqual(equipment.markUnavailable(), false);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.UNAVAILABLE);
});

test("markAvailable accepts Unavailable and rejects Available", () => {
  const equipment = new BookingDomain.Equipment("E1", "Microscope");
  assertEqual(equipment.markAvailable(), false);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
  assertEqual(equipment.markUnavailable(), true);
  assertEqual(equipment.markAvailable(), true);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
});

test("Administrator may mark only Unavailable equipment Available", () => {
  const system = new BookingDomain.BookingSystem();
  const equipment = system.equipment[0];
  assertEqual(system.markEquipmentAvailableAsAdministrator(equipment), false);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
  equipment.markUnavailable();
  assertEqual(system.markEquipmentAvailableAsAdministrator(equipment), true);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
});

test("future date and increasing times create an Active booking", () => {
  const system = new BookingDomain.BookingSystem();
  const result = system.createBooking("E1", tomorrow(), "09:00", "10:00");
  assertEqual(result.error, null);
  assertEqual(result.booking.bookingId, "B1");
  assertEqual(result.booking.status, BookingDomain.BookingStatus.ACTIVE);
  assertEqual(result.booking.equipment.status, BookingDomain.EquipmentStatus.BOOKED);
});

test("unavailable equipment creates no booking", () => {
  const system = new BookingDomain.BookingSystem();
  system.equipment[0].markUnavailable();
  const result = system.createBooking("E1", tomorrow(), "09:00", "10:00");
  assertEqual(result.error, "unavailable");
  assertEqual(system.bookings.length, 0);
  assertEqual(system.equipment[0].status, BookingDomain.EquipmentStatus.UNAVAILABLE);
});

test("today and past dates create no booking", () => {
  const system = new BookingDomain.BookingSystem();
  const today = BookingDomain.localCalendarDate();
  const past = yesterday();
  assertEqual(
    system.createBooking("E1", today, "09:00", "10:00").error,
    "date",
  );
  assertEqual(
    system.createBooking("E1", past, "09:00", "10:00").error,
    "date",
  );
  assertEqual(system.bookings.length, 0);
});

test("a rejected booking does not consume a sequential booking ID", () => {
  const system = new BookingDomain.BookingSystem();
  system.createBooking("E1", BookingDomain.localCalendarDate(), "09:00", "10:00");
  const result = system.createBooking("E1", tomorrow(), "09:00", "10:00");
  assertEqual(result.booking.bookingId, "B1");
});

test("successful bookings receive sequential IDs", () => {
  const system = new BookingDomain.BookingSystem();
  const first = system.createBooking("E1", tomorrow(), "09:00", "10:00");
  const second = system.createBooking("E2", tomorrow(), "09:00", "10:00");
  assertEqual(first.booking.bookingId, "B1");
  assertEqual(second.booking.bookingId, "B2");
});

test("start time must be before end time", () => {
  const system = new BookingDomain.BookingSystem();
  assertEqual(
    system.createBooking("E1", tomorrow(), "10:00", "10:00").error,
    "time",
  );
  assertEqual(
    system.createBooking("E1", tomorrow(), "11:00", "10:00").error,
    "time",
  );
  assertEqual(system.bookings.length, 0);
  assertEqual(system.equipment[0].status, BookingDomain.EquipmentStatus.AVAILABLE);
});

test("failed markBooked retains no booking", () => {
  const system = new BookingDomain.BookingSystem();
  system.equipment[0].markBooked = () => false;
  const result = system.createBooking("E1", tomorrow(), "09:00", "10:00");
  assertEqual(result.error, "equipment-status");
  assertEqual(system.bookings.length, 0);
  assertEqual(system.equipment[0].status, BookingDomain.EquipmentStatus.AVAILABLE);
});

test("cancellation retains the booking and returns Booked equipment to Available", () => {
  const system = new BookingDomain.BookingSystem();
  const { booking } = system.createBooking("E1", tomorrow(), "09:00", "10:00");
  assertEqual(booking.cancelBooking(), true);
  assertEqual(booking.status, BookingDomain.BookingStatus.CANCELLED);
  assertEqual(system.bookings.length, 1);
  assertEqual(booking.equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
});

test("repeated cancellation is rejected without changing state", () => {
  const system = new BookingDomain.BookingSystem();
  const { booking } = system.createBooking("E1", tomorrow(), "09:00", "10:00");
  booking.cancelBooking();
  assertEqual(booking.cancelBooking(), false);
  assertEqual(booking.status, BookingDomain.BookingStatus.CANCELLED);
  assertEqual(booking.equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
});

test("equipment IDs are sequential and added equipment starts Available", () => {
  const system = new BookingDomain.BookingSystem();
  const equipment = system.administrator.addEquipment("Balance");
  assertEqual(equipment.equipmentId, "E3");
  assertEqual(equipment.navn, "Balance");
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.AVAILABLE);
});

test("Administrator cannot mark Booked equipment Available", () => {
  const system = new BookingDomain.BookingSystem();
  const equipment = system.equipment[0];
  equipment.markBooked();
  assertEqual(system.markEquipmentAvailableAsAdministrator(equipment), false);
  assertEqual(equipment.status, BookingDomain.EquipmentStatus.BOOKED);
});

summary.textContent = `${passed} passed, ${failed} failed.`;
