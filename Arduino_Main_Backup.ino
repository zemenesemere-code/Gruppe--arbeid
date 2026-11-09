#define IR_USE_AVR_TIMER3
#include <IRremote.hpp>
#include <DHT.h>

// IR receiver
#define IR_RECEIVE_PIN 2

// Traffic light LEDs
#define GREEN_LED 3
#define YELLOW_LED 4
#define RED_LED 5

// HC-SR04 sensor
#define TRIG_PIN 6
#define ECHO_PIN 7

// Buzzer
#define BUZZER_PIN 8

// DHT11 sensor
#define DHTPIN 22
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// Admin status
bool previousAdminStatus = false;
bool firstReading = true;

bool lastMeasuredStatus = false;
int consecutiveReadings = 0;

// DHT11 timing
unsigned long previousDHTReading = 0;
const unsigned long DHT_INTERVAL = 30000;

// ------------------------------------------------
// Melody

#define PLAY_BUTTON 0xBC43FF00

int melody[] = {
  392, 392, 392, 311, 466,
  392, 311, 466, 392,
  587, 587, 587, 622, 466,
  370, 311, 466, 392
};

int durations[] = {
  350, 350, 350, 250, 100,
  350, 250, 100, 700,
  350, 350, 350, 250, 100,
  350, 250, 100, 700
};

const int melodyLength = sizeof(melody) / sizeof(melody[0]);

bool playing = false;
int currentNote = 0;

unsigned long noteStarted = 0;
unsigned long noteDuration = 0;

// ------------------------------------------------

void turnOffLights() {
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
}

// ------------------------------------------------

void readDHT11() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Sensor error!");
  } else {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }
}

// ------------------------------------------------
// Melody functions

void playNextNote() {

  if (currentNote >= melodyLength) {
    playing = false;
    noTone(BUZZER_PIN);
    Serial.println("Melody finished");
    return;
  }

  noteDuration = durations[currentNote];

  tone(BUZZER_PIN, melody[currentNote]);

  noteStarted = millis();
  currentNote++;
}

void startMelody() {
  playing = true;
  currentNote = 0;

  Serial.println("Melody START");

  playNextNote();
}

void stopMelody() {
  playing = false;
  noTone(BUZZER_PIN);

  Serial.println("Melody STOP");
}

void checkMelody() {

  if (playing &&
      millis() - noteStarted >= noteDuration) {

    noTone(BUZZER_PIN);
    playNextNote();
  }
}

// ------------------------------------------------

void setup() {
  Serial.begin(9600);

  // IR receiver
  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);

  // Traffic light LEDs
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);

  // HC-SR04
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);

  // DHT11
  dht.begin();

  turnOffLights();

  Serial.println("Arduino Ready!");

  // First temperature reading immediately
  readDHT11();

  // Start 30-second timer after first reading
  previousDHTReading = millis();
}

// ------------------------------------------------

void checkIRRemote() {
  if (IrReceiver.decode()) {

    unsigned long code =
      IrReceiver.decodedIRData.decodedRawData;

    bool isRepeat =
      IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT;

    // Play/Pause melody
    if (code == PLAY_BUTTON && !isRepeat) {

      if (playing) {
        stopMelody();
      } else {
        startMelody();
      }
    }

    switch (code) {

      case 0xE916FF00:
        turnOffLights();
        Serial.println("All lights OFF");
        break;

      case 0xF30CFF00:
        turnOffLights();
        digitalWrite(GREEN_LED, HIGH);
        Serial.println("GREEN ON");
        break;

      case 0xE718FF00:
        turnOffLights();
        digitalWrite(YELLOW_LED, HIGH);
        Serial.println("YELLOW ON");
        break;

      case 0xA15EFF00:
        turnOffLights();
        digitalWrite(RED_LED, HIGH);
        Serial.println("RED ON");
        break;
    }

    IrReceiver.resume();
  }
}

// ------------------------------------------------

void checkUltrasonicSensor() {

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  bool adminStatus = false;

  if (duration > 0) {
    float distance = duration * 0.0343 / 2;
    adminStatus = (distance <= 50);
  }

  // Check two consecutive readings
  if (adminStatus == lastMeasuredStatus) {
    consecutiveReadings++;
  } else {
    lastMeasuredStatus = adminStatus;
    consecutiveReadings = 1;
  }

  if (consecutiveReadings >= 2 &&
      (firstReading || adminStatus != previousAdminStatus)) {

    if (adminStatus) {
      Serial.println("Admin Online");
    } else {
      Serial.println("Admin Offline");
    }

    previousAdminStatus = adminStatus;
    firstReading = false;
  }

  delay(100);
}

// ------------------------------------------------

void checkDHT11() {

  unsigned long currentMillis = millis();

  if (currentMillis - previousDHTReading >= DHT_INTERVAL) {

    previousDHTReading = currentMillis;

    readDHT11();
  }
}

// ------------------------------------------------

void loop() {

  checkIRRemote();

  checkUltrasonicSensor();

  checkDHT11();

  checkMelody();
}
