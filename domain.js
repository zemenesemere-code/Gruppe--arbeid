"use strict";

(function (global) {
  const EquipmentStatus = Object.freeze({
    AVAILABLE: "Available",
    BOOKED: "Booked",
    UNAVAILABLE: "Unavailable",
  });

  const BookingStatus = Object.freeze({
    ACTIVE: "Active",
    CANCELLED: "Cancelled",
  });

  function localCalendarDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getBookingError(equipment, bookingDate, startTime, endTime) {
    if (!equipment.checkAvailability()) {
      return "unavailable";
    }

    if (!bookingDate || bookingDate <= localCalendarDate()) {
      return "date";
    }

    if (!startTime || !endTime || startTime >= endTime) {
      return "time";
    }

    return null;
  }

  class Student {
    constructor(navn, medlemsnummer) {
      this.navn = navn;
      this.medlemsnummer = medlemsnummer;
    }
  }

  class Equipment {
    constructor(equipmentId, navn) {
      this.equipmentId = equipmentId;
      this.navn = navn;
      this.status = EquipmentStatus.AVAILABLE;
    }

    checkAvailability() {
      return this.status === EquipmentStatus.AVAILABLE;
    }

    markBooked() {
      if (!this.checkAvailability()) {
        return false;
      }

      this.status = EquipmentStatus.BOOKED;
      return true;
    }

    markUnavailable() {
      if (this.status !== EquipmentStatus.AVAILABLE) {
        return false;
      }

      this.status = EquipmentStatus.UNAVAILABLE;
      return true;
    }

    markAvailable() {
      // Cancellation may release Booked equipment; the Administrator flow is guarded separately.
      if (
        this.status !== EquipmentStatus.UNAVAILABLE &&
        this.status !== EquipmentStatus.BOOKED
      ) {
        return false;
      }

      this.status = EquipmentStatus.AVAILABLE;
      return true;
    }
  }

  class Booking {
    constructor(student, equipment, dato, starttid, sluttid) {
      this.bookingId = null;
      this.student = student;
      this.equipment = equipment;
      this.dato = dato;
      this.starttid = starttid;
      this.sluttid = sluttid;
      this.status = null;
      this.creationError = null;
    }

    createBooking() {
      this.creationError = getBookingError(
        this.equipment,
        this.dato,
        this.starttid,
        this.sluttid,
      );
      if (this.creationError) {
        return false;
      }

      if (!this.equipment.markBooked()) {
        this.creationError = "equipment-status";
        return false;
      }

      this.status = BookingStatus.ACTIVE;
      return true;
    }

    cancelBooking() {
      if (
        this.status !== BookingStatus.ACTIVE ||
        this.equipment.status !== EquipmentStatus.BOOKED
      ) {
        return false;
      }

      if (!this.equipment.markAvailable()) {
        return false;
      }

      this.status = BookingStatus.CANCELLED;
      return true;
    }
  }

  class Administrator {
    constructor(store) {
      this.store = store;
    }

    addEquipment(navn) {
      const equipment = new Equipment(this.store.nextEquipmentId(), navn);
      this.store.equipment.push(equipment);
      return equipment;
    }
  }

  class BookingSystem {
    constructor() {
      this.student = new Student("Sample Student", "S1");
      this.equipment = [
        new Equipment("E1", "Microscope"),
        new Equipment("E2", "Centrifuge"),
      ];
      this.bookings = [];
      this.administrator = new Administrator(this);
      this.equipmentSequence = this.equipment.length + 1;
      this.bookingSequence = 1;
    }

    nextEquipmentId() {
      const id = `E${this.equipmentSequence}`;
      this.equipmentSequence += 1;
      return id;
    }

    createBooking(equipmentId, dato, starttid, sluttid) {
      const equipment = this.equipment.find(
        (item) => item.equipmentId === equipmentId,
      );
      if (!equipment) {
        return { booking: null, error: "equipment" };
      }

      const booking = new Booking(
        this.student,
        equipment,
        dato,
        starttid,
        sluttid,
      );
      if (!booking.createBooking()) {
        return { booking: null, error: booking.creationError };
      }

      booking.bookingId = `B${this.bookingSequence}`;
      this.bookingSequence += 1;
      this.bookings.push(booking);
      return { booking, error: null };
    }

    markEquipmentAvailableAsAdministrator(equipment) {
      if (equipment.status !== EquipmentStatus.UNAVAILABLE) {
        return false;
      }

      return equipment.markAvailable();
    }
  }

  global.BookingDomain = Object.freeze({
    Administrator,
    Booking,
    BookingStatus,
    BookingSystem,
    Equipment,
    EquipmentStatus,
    Student,
    getBookingError,
    localCalendarDate,
  });
})(globalThis);
