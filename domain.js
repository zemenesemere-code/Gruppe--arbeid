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

  const LibraryOperation = Object.freeze({
    BORROW: "Borrow",
    RETURN: "Return",
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
      const equipmentIsBooked =
        this.equipment.status === EquipmentStatus.BOOKED ||
        this.equipment.status === "Borrowed";
      if (
        this.status !== BookingStatus.ACTIVE ||
        !equipmentIsBooked
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

  class LibraryBook {
    constructor(bookId, name) {
      this.bookId = bookId;
      this.name = name;
      this.status = "Available";
    }

    get equipmentId() {
      return this.bookId;
    }

    get navn() {
      return this.name;
    }

    checkAvailability() {
      return this.status === "Available";
    }

    markBooked() {
      if (!this.checkAvailability()) return false;
      this.status = "Borrowed";
      return true;
    }

    markUnavailable() {
      if (this.status !== "Available") return false;
      this.status = "Unavailable";
      return true;
    }

    markAvailable() {
      if (this.status !== "Borrowed" && this.status !== "Unavailable") return false;
      this.status = "Available";
      return true;
    }
  }

  class LibrarySystem {
    constructor() {
      this.books = [
        new LibraryBook("B1", "Arduino Fundamentals", null),
        new LibraryBook("B2", "Embedded Systems Lab", null),
        new LibraryBook("B3", "RFID Applications"),
      ];
      this.operations = [];
      this.bookSequence = this.books.length + 1;
    }

    findBook(bookId) {
      return this.books.find((book) => book.bookId === bookId) || null;
    }

    nextBookId() {
      const id = `B${this.bookSequence}`;
      this.bookSequence += 1;
      return id;
    }

    addBook(name) {
      const trimmedName = String(name || "").trim();
      if (!trimmedName) {
        return { book: null, error: "name" };
      }

      const book = new LibraryBook(this.nextBookId(), trimmedName, null);
      this.books.push(book);
      return { book, error: null };
    }

    editBook(bookId, name) {
      const book = this.findBook(bookId);
      const trimmedName = String(name || "").trim();
      if (!book) return { book: null, error: "book" };
      if (!trimmedName) return { book: null, error: "name" };

      book.name = trimmedName;
      return { book, error: null };
    }

    deleteBook(bookId) {
      const book = this.findBook(bookId);
      if (!book) return { success: false, error: "book" };
      if (book.status === "Borrowed") {
        return { success: false, error: "borrowed" };
      }

      this.books = this.books.filter((item) => item.bookId !== bookId);
      return { success: true };
    }

    completeOperation(bookId, operation, administrator = "Administrator", date = new Date()) {
      const book = this.findBook(bookId);
      if (!book) return { success: false, error: "book" };
      if (operation === LibraryOperation.BORROW && book.status !== "Available") {
        return { success: false, error: "already-borrowed" };
      }
      if (operation === LibraryOperation.RETURN && book.status !== "Borrowed") {
        return { success: false, error: "already-available" };
      }
      book.status = operation === LibraryOperation.BORROW ? "Borrowed" : "Available";
      const record = {
        bookId: book.bookId,
        bookName: book.name,
        operation,
        administratorUid: administrator,
        timestamp: date.toISOString(),
      };
      this.operations.push(record);
      return { success: true, record };
    }
  }

  global.BookingDomain = Object.freeze({
    Administrator,
    Booking,
    BookingStatus,
    BookingSystem,
    Equipment,
    EquipmentStatus,
    LibraryBook,
    LibraryOperation,
    LibrarySystem,
    Student,
    getBookingError,
    localCalendarDate,
  });
})(globalThis);
