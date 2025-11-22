# LED Driver Firmware

ESP8266/ESP32 Firmware zur Steuerung von WS2811 LED-Streifen über Netzwerk oder Serial.

## Hardware

- **MCU**: ESP8266 (default) oder ESP32
- **LED-Typ**: WS2811, GRB Farbordnung
- **Topologie**: 6 Segmente, 714 LEDs total (22 Streben × 34 LEDs)
- **Pins**: sp1-sp6 (siehe m_handler.h für MCU-spezifisches Mapping)
- **FPS**: 60

## Konfiguration

`m_handler.h`:
- `MCU`: MCU_OPTION_ESP8266 oder MCU_OPTION_ESP32
- `CONNECTION`: UDP (default), TCP oder SERIAL

`m_secrets.h`:
```cpp
#define SECRET_SSID "..."
#define SECRET_PASS "..."
#define SECRET_OTA_PASSWORD "..."
```

## Kommunikation

### UDP (Port 4210)
- **Frame**: Raw RGB bytes (2142 bytes = 714 LEDs × 3)
- **Command**: `{commandName:parameter}`

### TCP/WebSocket
- **Binary**: Frame data
- **Text**: Command wrapped in `{}`

### Serial (115200 baud)
- **Frame**: `[...RGB bytes...]`
- **Command**: `{commandName:parameter}`

## Commands

- `setBrightness:1-255` - Globale Helligkeit (min. 1)
- `turnOff:` - Alle LEDs ausschalten
- `animation:N` - Animation Index (nicht implementiert)

## OTA

Hostname: `LED-Decke-OTA`
Port: Standard ArduinoOTA

## Dateien

- `ledDriverFirmware.ino` - Main Loop, Frame/Command Processing
- `m_handler.h` - Hardware Config, LED/WiFi/OTA Setup
- `o_udpConnection.h` - UDP Connector
- `o_tcpConnection.h` - WebSocket Connector
- `o_serialConnection.h` - Serial Connector mit Buffer
