"use strict";

const system = new BookingDomain.BookingSystem();

const availabilityForm = document.querySelector("#availability-form");
const availabilityEquipment = document.querySelector("#availability-equipment");
const bookingForm = document.querySelector("#booking-form");
const bookingEquipment = document.querySelector("#booking-equipment");
const studentBookings = document.querySelector("#student-bookings");
const administratorEquipment = document.querySelector("#administrator-equipment");
const library = new BookingDomain.LibrarySystem();
const addBookForm = document.querySelector("#add-book-form");
const hardwareEvents = document.querySelector("#hardware-events");
const serialState = {
  port: null,
  reader: null,
  writer: null,
  disconnecting: false,
  buffer: "",
  adminOnline: null,
  temperature: null,
  humidity: null,
  irStatusTimer: null,
  led: { red: false, yellow: false, green: false },
};

const libraryStorage = {
  key: "laboratory-library-books",
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify({
        books: library.books.map((book) => ({
          bookId: book.bookId,
          name: book.name,
          status: book.status,
        })),
        nextBookId: library.bookSequence,
      }));
    } catch (error) {
      document.querySelector("#book-management-result").textContent =
        `Book storage unavailable: ${error.message}`;
    }
  },
  load() {
    try {
      const saved = localStorage.getItem(this.key);
      if (!saved) return;
      const data = JSON.parse(saved);
      const books = Array.isArray(data) ? data : data.books;
      if (!Array.isArray(books)) return;

      library.books = books
        .filter((book) => book && typeof book.bookId === "string" && typeof book.name === "string")
        .filter((book, index, records) =>
          records.findIndex((record) => record.bookId === book.bookId) === index,
        )
        .map((book) => {
          const restored = new BookingDomain.LibraryBook(
            book.bookId,
            book.name,
          );
          restored.status = book.status === "Borrowed" ? "Borrowed" : "Available";
          return restored;
        });
      const highestBookId = library.books.reduce((highest, book) => {
        const match = book.bookId.match(/^B(\d+)$/);
        return match ? Math.max(highest, Number(match[1]) + 1) : highest;
      }, 1);
      library.bookSequence = Number.isInteger(data.nextBookId)
        ? Math.max(data.nextBookId, highestBookId)
        : highestBookId;
      syncLibraryBooksToEquipment();
    } catch (error) {
      document.querySelector("#book-management-result").textContent =
        `Book storage could not be loaded: ${error.message}`;
    }
  },
};

function syncLibraryBooksToEquipment() {
  const booksById = new Map(library.books.map((book) => [book.bookId, book]));
  system.equipment = system.equipment.filter(
    (equipment) => !/^B\d+$/.test(equipment.equipmentId),
  );
  system.equipment.push(...library.books);
  for (const booking of system.bookings) {
    const book = booksById.get(booking.equipment.equipmentId);
    if (book) booking.equipment = book;
  }
}

const eventLogStorage = {
  key: "arduino-event-log",
  events: [],
  load() {
    try {
      const saved = localStorage.getItem(this.key);
      const events = saved ? JSON.parse(saved) : [];
      this.events = Array.isArray(events)
        ? events.filter((event) =>
          event &&
          typeof event.message === "string" &&
          typeof event.timestamp === "string" &&
          typeof event.type === "string",
        )
        : [];
    } catch {
      this.events = [];
    }
  },
  save() {
    localStorage.setItem(this.key, JSON.stringify(this.events));
  },
};

eventLogStorage.load();

const trafficLightOrder = [
  { colour: "red", label: "Red", elementId: "virtual-red-light" },
  { colour: "yellow", label: "Yellow", elementId: "virtual-yellow-light" },
  { colour: "green", label: "Green", elementId: "virtual-green-light" },
];

const irButtonLedStates = {
  "0XE916FF00": { red: false, yellow: false, green: false },
  "0XF30CFF00": { red: true, yellow: false, green: false },
  "0XE718FF00": { red: false, yellow: true, green: false },
  "0XA15EFF00": { red: false, yellow: false, green: true },
};

const storage = {
  database: null,
  async open() {
    if (!("indexedDB" in globalThis)) return;
    this.database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("library-hardware", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("operations", { autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise((resolve, reject) => {
      const request = this.database.transaction("operations").objectStore("operations").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    for (const record of records) {
      if (!library.operations.some((operation) => operation.timestamp === record.timestamp)) {
        library.operations.push(record);
        const book = library.findBook(record.bookId);
        if (book) book.status = record.operation === "Borrow" ? "Borrowed" : "Available";
      }
    }

    renderLibrary();
  },
  saveOperation(record) {
    if (this.database) {
      this.database.transaction("operations", "readwrite").objectStore("operations").add(record);
    }
  },
};

const bookingStorage = {
  key: "laboratory-booking-system",
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify({
        equipment: system.equipment.map((equipment) => ({
          equipmentId: equipment.equipmentId,
          navn: equipment.navn,
          status: equipment.status,
        })),
        bookings: system.bookings.map((booking) => ({
          bookingId: booking.bookingId,
          equipmentId: booking.equipment.equipmentId,
          dato: booking.dato,
          starttid: booking.starttid,
          sluttid: booking.sluttid,
          status: booking.status,
        })),
      }));
    } catch (error) {
      addHardwareEvent(`Booking storage unavailable: ${error.message}`);
    }
  },
  load() {
    try {
      const saved = localStorage.getItem(this.key);
      if (!saved) return;

      const data = JSON.parse(saved);
      if (!Array.isArray(data.equipment) || !Array.isArray(data.bookings)) return;

      const equipmentById = new Map();
      system.equipment = data.equipment
        .filter((item) => item && typeof item.equipmentId === "string")
        .filter((item, index, equipment) =>
          equipment.findIndex((entry) => entry.equipmentId === item.equipmentId) === index,
        )
        .map((item) => {
          const equipment = new BookingDomain.Equipment(item.equipmentId, item.navn);
          if (Object.values(BookingDomain.EquipmentStatus).includes(item.status)) {
            equipment.status = item.status;
          }
          equipmentById.set(equipment.equipmentId, equipment);
          return equipment;
        });

      system.bookings = data.bookings
        .filter((item) => item && typeof item.bookingId === "string")
        .filter((item, index, bookings) =>
          bookings.findIndex((booking) => booking.bookingId === item.bookingId) === index,
        )
        .map((item) => {
          const equipment = equipmentById.get(item.equipmentId);
          if (!equipment || !Object.values(BookingDomain.BookingStatus).includes(item.status)) {
            return null;
          }
          const booking = new BookingDomain.Booking(
            system.student,
            equipment,
            item.dato,
            item.starttid,
            item.sluttid,
          );
          booking.bookingId = item.bookingId;
          booking.status = item.status;
          return booking;
        })
        .filter(Boolean);

      system.equipmentSequence = nextSequence(system.equipment, "E");
      system.bookingSequence = nextSequence(system.bookings, "B");
      system.administrator.store = system;
    } catch (error) {
      addHardwareEvent(`Booking storage could not be loaded: ${error.message}`);
    }
  },
};

function nextSequence(records, prefix) {
  return records.reduce((next, record) => {
    const match = String(record.equipmentId || record.bookingId).match(
      new RegExp(`^${prefix}(\\d+)$`),
    );
    return match ? Math.max(next, Number(match[1]) + 1) : next;
  }, 1);
}

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
  const firstEquipmentId = system.equipment[0]?.equipmentId || "";
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

function eventTypeFor(message) {
    if (/^(GREEN|YELLOW|RED) ON$|^All lights OFF$/.test(message)) return "traffic-light";
    if (/^Admin (Online|Offline)$/.test(message)) return "presence";
    if (/^Temperature:/.test(message) || /^Humidity:/.test(message)) return "weather";
    if (/^IR signal received:/.test(message)) return "infrared";
    return "system";
  }

function addHardwareEvent(message, type = eventTypeFor(message)) {
    const event = {
      message,
      timestamp: new Date().toISOString(),
      type,
    };
    eventLogStorage.events.push(event);
    eventLogStorage.save();
    renderHardwareEvents();
  }

function renderHardwareEvents() {
    hardwareEvents.replaceChildren();
    for (const event of eventLogStorage.events.slice(-20).reverse()) {
      const item = document.createElement("li");
      item.textContent = `${new Date(event.timestamp).toLocaleTimeString()} — ${event.message}`;
      hardwareEvents.append(item);
    }
  }

function renderHardware() {
    const list = document.querySelector("#traffic-light-status");
    list.replaceChildren();
    for (const { colour, label, elementId } of trafficLightOrder) {
      const item = document.createElement("li");
      item.textContent = `${label} LED: ${serialState.led[colour] ? "ON" : "OFF"}`;
      list.append(item);
      document.querySelector(`#${elementId}`).classList.toggle(
        "active",
        serialState.led[colour],
      );
    }
  }

function updateAdminStatus(online) {
    serialState.adminOnline = online;
    document.querySelector("#presence-indicator").classList.toggle("online", online);
    document.querySelector("#presence-status").textContent = online
      ? "Admin Online — object detected within 50 cm."
      : "Admin Offline — no object within 50 cm.";
  }

function updateWeatherStatus(type, value) {
    serialState[type] = value;
    const element = document.querySelector(`#${type}-status`);
    element.textContent = type === "temperature"
      ? `Temperature: ${value} °C`
      : `Humidity: ${value} %`;
  }

function setWeatherDisconnected() {
    document.querySelector("#temperature-status").textContent = "Temperature: Disconnected";
    document.querySelector("#humidity-status").textContent = "Humidity: Disconnected";
}

function updateIrStatus(message) {
  const status = document.querySelector("#ir-status");
  if (serialState.irStatusTimer) {
    clearTimeout(serialState.irStatusTimer);
  }
  status.textContent = `IR signal received: ${message} — ${new Date().toLocaleTimeString()}`;
  serialState.irStatusTimer = setTimeout(() => {
    status.textContent = "No IR signal received.";
    serialState.irStatusTimer = null;
  }, 10000);
}

function updateIrResponseTime(startTime) {
  document.querySelector("#ir-response-time").textContent =
    `Response Time: ${(performance.now() - startTime).toFixed(2)} ms`;
}

function updateBuzzIndicator(active) {
  const indicator = document.querySelector("#buzz-indicator");
  indicator.classList.toggle("active", active);
  indicator.setAttribute("aria-label", active ? "Buzz active" : "Buzz inactive");
}

function handleHardwareMessage(message) {
    if (message.type === "distance" && Number.isFinite(Number(message.cm))) {
      const distance = Number(message.cm);
      document.querySelector("#distance-status").textContent =
        `Distance: ${distance} cm — ${distance <= 50 ? "measurement within threshold." : "no object within 50 cm."}`;
      updateAdminStatus(distance <= 50);
      addHardwareEvent(`Distance measured: ${distance} cm`);
    } else if (message.type === "led" && ["red", "yellow", "green"].includes(message.color)) {
      serialState.led[message.color] = Boolean(message.on);
      renderHardware();
      addHardwareEvent(`${message.color} LED ${message.on ? "ON" : "OFF"}`);
    } else if (message.type === "ir") {
      const ledState = irButtonLedStates[String(message.hex || "").toUpperCase()];
      if (ledState) {
        serialState.led = ledState;
        renderHardware();
      }
      document.querySelector("#ir-status").textContent =
        `HEX: ${message.hex || "unknown"} — Button: ${message.button || "unrecognised"}${message.action ? ` — Action: ${message.action}` : ""}`;
      updateIrStatus(`HEX ${message.hex || "unknown"}`);
      addHardwareEvent(`IR signal received: ${message.hex || "unknown"}`);
    }
  }

  function handleSerialLine(line) {
    const message = line.trim();
    if (!message) {
      return;
    }
    const serialReceivedAt = performance.now();

    if (message === "Melody START") {
      updateBuzzIndicator(true);
      return;
    }

    if (message === "Melody STOP" || message === "Melody finished") {
      updateBuzzIndicator(false);
      return;
    }

    if (message === "Admin Online" || message === "Admin Offline") {
      const online = message === "Admin Online";
      if (serialState.adminOnline !== online) {
        updateAdminStatus(online);
        addHardwareEvent(message);
      }
      return;
    }

    if (message === "HC-SR04 Sensor Ready!") {
      return;
    }

    if (message === "Arduino Ready!" || message === "Sensor error!") {
      return;
    }

    const temperature = message.match(/^Temperature:\s*(-?\d+(?:\.\d+)?)\s+C$/);
    if (temperature) {
      updateWeatherStatus("temperature", temperature[1]);
      addHardwareEvent(`Temperature: ${temperature[1]} C`);
      return;
    }

    const humidity = message.match(/^Humidity:\s*(\d+(?:\.\d+)?)\s+%$/);
    if (humidity) {
      updateWeatherStatus("humidity", humidity[1]);
      addHardwareEvent(`Humidity: ${humidity[1]} %`);
      return;
    }

    const ledState = {
      "All lights OFF": { red: false, yellow: false, green: false },
      "GREEN ON": { red: true, yellow: false, green: false },
      "YELLOW ON": { red: false, yellow: true, green: false },
      "RED ON": { red: false, yellow: false, green: true },
    }[message];

    if (ledState) {
      serialState.led = ledState;
      renderHardware();
      const eventLabel = ledState.red
        ? "RED ON"
        : ledState.yellow
          ? "YELLOW ON"
          : ledState.green
            ? "GREEN ON"
            : "All lights OFF";
      updateIrStatus(eventLabel);
      addHardwareEvent(eventLabel);
      updateIrResponseTime(serialReceivedAt);
      return;
    }

    try {
      handleHardwareMessage(JSON.parse(message));
    } catch {
      addHardwareEvent(`Ignored unrecognised Arduino message: ${message}`);
    }
  }

async function connectArduino() {
    if (!("serial" in navigator)) {
      document.querySelector("#arduino-connection").textContent =
        "Arduino Mega: Web Serial API is unavailable in this browser.";
      return;
    }
    serialState.port = await navigator.serial.requestPort();
    await serialState.port.open({ baudRate: 9600 });
    serialState.temperature = null;
    serialState.humidity = null;
    document.querySelector("#temperature-status").textContent = "Waiting for sensor data...";
    document.querySelector("#humidity-status").textContent = "Waiting for sensor data...";
    updateSerialControls(true);
    document.querySelector("#arduino-connection").textContent = "Arduino Mega: Connected";
    addHardwareEvent("Arduino connected");
    serialState.reader = serialState.port.readable.getReader();
    readSerial();
  }

  function updateSerialControls(connected) {
    document.querySelector("#connect-arduino").disabled = connected;
    document.querySelector("#disconnect-arduino").disabled = !connected;
  }

  async function disconnectArduino() {
    const { reader, writer, port } = serialState;
    serialState.disconnecting = true;
    serialState.reader = null;
    serialState.writer = null;
    serialState.buffer = "";

    try {
      if (reader) {
        try {
          await reader.cancel();
        } finally {
          reader.releaseLock();
        }
    }
      if (writer) {
        try {
          await writer.close();
        } finally {
          writer.releaseLock();
        }
      }
      if (port) {
        await port.close();
      }
    } finally {
      serialState.port = null;
      serialState.disconnecting = false;
      updateSerialControls(false);
        setWeatherDisconnected();
    }

    document.querySelector("#arduino-connection").textContent = "Arduino Mega: Disconnected";
    addHardwareEvent("Arduino disconnected");
  }

  async function readSerial() {
    try {
      while (serialState.reader) {
        const { value, done } = await serialState.reader.read();
        if (done) break;
        serialState.buffer += new TextDecoder().decode(value);
        const lines = serialState.buffer.split("\n");
        serialState.buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          handleSerialLine(line);
        }
      }
    } catch (error) {
      if (serialState.port && !serialState.disconnecting) {
        document.querySelector("#arduino-connection").textContent = "Arduino Mega: Disconnected";
        updateSerialControls(false);
        setWeatherDisconnected();
        addHardwareEvent(`Arduino disconnected: ${error.message}`);
      }
    } finally {
      if (serialState.reader) {
        serialState.reader.releaseLock();
        serialState.reader = null;
      }
    }
  }

  function handleSerialDisconnect() {
    serialState.reader = null;
    serialState.writer = null;
    serialState.port = null;
    updateSerialControls(false);
    document.querySelector("#arduino-connection").textContent = "Arduino Mega: Disconnected";
    setWeatherDisconnected();
    addHardwareEvent("Arduino disconnected");
  }

function renderLibrary() {
    const books = document.querySelector("#book-list");
    const selection = document.querySelector("#book-selection");
    books.replaceChildren();
    selection.replaceChildren();
    for (const book of library.books) {
      const item = document.createElement("li");
      const row = document.createElement("div");
      row.className = "record-row";
      const description = document.createElement("span");
      description.textContent = `${book.bookId}: ${book.name} — ${book.status}`;
      row.append(description);

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.action = "edit-book";
      editButton.dataset.bookId = book.bookId;
      editButton.textContent = "Edit";
      row.append(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete-book";
      deleteButton.dataset.bookId = book.bookId;
      deleteButton.textContent = "Delete";
      deleteButton.disabled = book.status === "Borrowed";
      row.append(deleteButton);
      item.append(row);
      books.append(item);
      const option = document.createElement("option");
      option.value = book.bookId;
      option.textContent = `${book.bookId}: ${book.name} (${book.status})`;
      selection.append(option);
    }
    const history = document.querySelector("#operation-history");
    history.replaceChildren();
    for (const operation of [...library.operations].reverse()) {
      const item = document.createElement("li");
      item.textContent = `${operation.bookId}: ${operation.operation} — ${new Date(operation.timestamp).toLocaleString()} — Admin ${operation.administratorUid}`;
      history.append(item);
  }
}

addBookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = library.addBook(new FormData(addBookForm).get("name"));
  const output = document.querySelector("#book-management-result");
  if (!result.book) {
    output.textContent = "Enter a book name before adding a book.";
    return;
  }
  output.textContent = `${result.book.name} added as ${result.book.bookId} with status Available.`;
  syncLibraryBooksToEquipment();
  libraryStorage.save();
  addBookForm.reset();
  renderLibrary();
});

document.querySelector("#book-list").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const book = library.findBook(button.dataset.bookId);
  const output = document.querySelector("#book-management-result");
  if (!book) return;

  if (button.dataset.action === "edit-book") {
    const name = window.prompt("Enter the new book name:", book.name);
    if (name === null) return;
    const result = library.editBook(book.bookId, name);
    output.textContent = result.book
      ? `${result.book.bookId} updated to ${result.book.name}.`
      : "Enter a book name before saving.";
    if (result.book) {
      syncLibraryBooksToEquipment();
      libraryStorage.save();
      renderLibrary();
    }
    return;
  }

  if (!window.confirm(`Delete ${book.name}?`)) return;
  const result = library.deleteBook(book.bookId);
  output.textContent = result.success
    ? `${book.bookId} deleted.`
    : "Borrowed books cannot be deleted.";
  if (result.success) {
    syncLibraryBooksToEquipment();
    libraryStorage.save();
    renderLibrary();
  }
});

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
  if (result.booking) {
    bookingStorage.save();
  }
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
    bookingStorage.save();
  } else {
    result.textContent =
      "Only an Active booking can be cancelled; no status was changed.";
  }

  renderEquipment();
  renderBookings();
});

document.querySelector("#clear-bookings").addEventListener("click", () => {
  if (!window.confirm("Do you really want to clear all bookings?")) {
    return;
  }

  system.bookings = [];
  bookingStorage.save();
  document.querySelector("#cancellation-result").textContent = "All bookings cleared.";
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
  bookingStorage.save();
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
  if (succeeded) {
    bookingStorage.save();
  }
  renderEquipment();
});

document.querySelector("#connect-arduino").addEventListener("click", () => {
  connectArduino().catch((error) => {
    document.querySelector("#arduino-connection").textContent = `Arduino Mega: Connection failed (${error.message})`;
    updateSerialControls(false);
  });
});

document.querySelector("#disconnect-arduino").addEventListener("click", () => {
  disconnectArduino().catch((error) => {
    document.querySelector("#arduino-connection").textContent =
      `Arduino Mega: Disconnect failed (${error.message})`;
  });
});

if ("serial" in navigator) {
  navigator.serial.addEventListener("disconnect", handleSerialDisconnect);
}

document.querySelector("#library-operation-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const bookId = fields.get("book");
  const operation = fields.get("operation");
  const book = library.findBook(bookId);
  const result = document.querySelector("#library-operation-result");
  if (!book) {
    result.textContent = "Select a book before completing an operation.";
    return;
  }
  if ((operation === "Borrow" && book.status !== "Available") ||
      (operation === "Return" && book.status !== "Borrowed")) {
    result.textContent = operation === "Borrow"
      ? "This book is already Borrowed; no change was made."
      : "This book is already Available; no change was made.";
    return;
  }
  const operationResult = library.completeOperation(bookId, operation, "Administrator");
  if (!operationResult.success) {
    result.textContent = operationResult.error === "already-borrowed"
      ? "This book is already Borrowed; no change was made."
      : "This book is already Available; no change was made.";
    return;
  }
  result.textContent = `${operationResult.record.operation} completed for ${operationResult.record.bookName}.`;
  storage.saveOperation(operationResult.record);
  libraryStorage.save();
  bookingStorage.save();
  addHardwareEvent(`${operationResult.record.operation} completed for ${operationResult.record.bookId}`);
  renderEquipment();
  renderLibrary();
});

function runUnitTests() {
  const testCases = [
    {
      name: "Adding a book",
      run() {
        const testLibrary = new BookingDomain.LibrarySystem();
        const result = testLibrary.addBook("Temporary Test Book");
        if (!result.book || result.book.status !== "Available") {
          throw new Error("book was not added as Available");
        }
      },
    },
    {
      name: "Editing a book name",
      run() {
        const testLibrary = new BookingDomain.LibrarySystem();
        const result = testLibrary.editBook("B1", "Renamed Test Book");
        if (!result.book || result.book.name !== "Renamed Test Book") {
          throw new Error("book name was not updated");
        }
      },
    },
    {
      name: "Deleting a book",
      run() {
        const testLibrary = new BookingDomain.LibrarySystem();
        const result = testLibrary.deleteBook("B1");
        if (!result.success || testLibrary.findBook("B1")) {
          throw new Error("available book was not deleted");
        }
      },
    },
    {
      name: "Borrowing an available book",
      run() {
        const testLibrary = new BookingDomain.LibrarySystem();
        const result = testLibrary.completeOperation("B1", "Borrow");
        if (!result.success || testLibrary.findBook("B1").status !== "Borrowed") {
          throw new Error("available book was not borrowed");
        }
      },
    },
    {
      name: "Preventing borrowing an already borrowed book",
      run() {
        const testLibrary = new BookingDomain.LibrarySystem();
        testLibrary.completeOperation("B1", "Borrow");
        const result = testLibrary.completeOperation("B1", "Borrow");
        if (result.success || result.error !== "already-borrowed") {
          throw new Error("second borrow was not rejected");
        }
      },
    },
    {
      name: "Returning a borrowed book",
      run() {
        const testLibrary = new BookingDomain.LibrarySystem();
        testLibrary.completeOperation("B1", "Borrow");
        const result = testLibrary.completeOperation("B1", "Return");
        if (!result.success || testLibrary.findBook("B1").status !== "Available") {
          throw new Error("borrowed book was not returned");
        }
      },
    },
    {
      name: "Updating book availability",
      run() {
        const testLibrary = new BookingDomain.LibrarySystem();
        const book = testLibrary.findBook("B1");
        if (!book.checkAvailability()) throw new Error("book should start Available");
        book.markBooked();
        if (book.checkAvailability()) throw new Error("borrowed book reports Available");
        book.markAvailable();
        if (!book.checkAvailability()) throw new Error("returned book is not Available");
      },
    },
  ];

  const results = document.querySelector("#test-results");
  const summary = document.querySelector("#test-summary");
  let passed = 0;
  let failed = 0;
  results.replaceChildren();

  for (const testCase of testCases) {
    const item = document.createElement("li");
    try {
      testCase.run();
      passed += 1;
      item.textContent = `PASS: ${testCase.name}`;
    } catch (error) {
      failed += 1;
      item.textContent = `FAIL: ${testCase.name} — ${error.message}`;
    }
    results.append(item);
  }

  summary.textContent = `${passed} passed, ${failed} failed.`;
}

document.querySelector("#run-tests").addEventListener("click", runUnitTests);

bookingStorage.load();
libraryStorage.load();
syncLibraryBooksToEquipment();
renderEquipment();
renderBookings();
renderHardware();
renderLibrary();
renderHardwareEvents();
updateSerialControls(false);
storage.open().catch((error) => addHardwareEvent(`Database unavailable: ${error.message}`));
