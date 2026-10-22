// This Arduino code has been written by Univeristy Of Cincinnati Student Hamza Al Halabi [Alhalaha] for use in Circuits BME2081C for Summer of 2026
// This code runs in parallel with Processing to create visual outputs including audio, light, and graphic representation
// Enjoy!

// FILENAME: Alhalaha_ECG_Monitor.ino
// Based on EXAMPLE02_Sample.ino (Orlando S. Hoilett, Ph.D.)
// Reads ECG analog input from Ninetales board and transmits values over Serial to Processing for real-time visualization & beat detection.


// ECG Channel Pin (A2 is default for EXG/ECG on Ninetales, A1 can also be used)
const int ECG_PIN = A1;

void setup() {
  // Initialize serial communication at 9600 baud for smooth plotting
  Serial.begin(9600);
}

void loop() {
  // Read the analog signal from Ninetales (0 to 1023)
  int ecgSignal = analogRead(ECG_PIN);

  // Send raw value over Serial
  Serial.println(ecgSignal);

  // 10ms delay gives ~100 Hz sampling rate, ideal for ECG capture
  delay(10);
}
