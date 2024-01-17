// Definition von SECRET_SSID, SECRET_PASS, SECRET_OTA_PASSWORD
#include "m_secrets.h"

// Handler Funktionen der Firmware
#include "m_handler.h"

// Erwartet die LED Matrix als uint8_t Array im Format "R1G1B1R2G2B2R3G3B3..."
void processFrame(uint8_t *payload, size_t length)
{
  for (int i = 0; i < length; i += MATRIX_LED_BYTES)
  {
    MATRIX[i / MATRIX_LED_BYTES] = CRGB(payload[i], payload[i + 1], payload[i + 2]);
  }
}

// Erwartet der Command als String im Format "commandName:commandParam"
void processCommand(uint8_t *payload, size_t length)
{
  String commandString = String((char *)payload);

  int splitIndex = commandString.indexOf(':');
  String cmdName = commandString.substring(0, splitIndex);
  String cmdParameter = commandString.substring(splitIndex + 1);

  // Helligkeit der LEDs gesamtheitlich setzen
  if (cmdName == "setBrightness")
  {
    int brightness = cmdParameter.toInt();
    if (brightness >= 1 && brightness <= 255)
    {
      FastLED.setBrightness(brightness);
    }
  }
  // Alles LEDs ausschalten
  else if (cmdName == "turnOff")
  {
    FastLED.clear();
  }
  else if (cmdName == "animation")
  {
    int animationIndex = cmdParameter.toInt();
  }
}

// Setup der MCU
void setup()
{
  serialSetup();
  ledSetup();
  wifiSetup(SECRET_SSID, SECRET_PASS);
  otaSetup("LED-Decke-OTA", SECRET_OTA_PASSWORD);

  Connector.setup();
}

// Loop der MCU
void loop()
{
  otaLoop();
  ledLoop();

  Connector.handle();
}
