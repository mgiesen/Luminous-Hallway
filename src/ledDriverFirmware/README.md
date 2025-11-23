# LED Driver Firmware

ESP8266/ESP32 Firmware zur Steuerung von WS2811 LED-Streifen über Netzwerk oder Serial.

## Hardware

- **MCU**: ESP8266 (default) oder ESP32
- **LED-Typ**: WS2811, GRB Farbordnung
- **Topologie**: 6 Segmente, 748 LEDs total (22 Streben × 34 LEDs)
  - Segment 1-2, 4-5: je 136 LEDs (4 Streben × 34)
  - Segment 3, 6: je 102 LEDs (3 Streben × 34)
- **Pins**: sp1-sp6 (GPIO 5, 4, 2, 13, 12, 14)
- **FPS**: 60 (konfiguriert), ~44 FPS (Hardware-Limit bei sequenzieller Ausgabe)

## Konfiguration

`m_handler.h`:
- `MCU`: MCU_OPTION_ESP8266 oder MCU_OPTION_ESP32
- `CONNECTION`: UDP (default), TCP oder SERIAL

`m_secrets.h`:
```cpp
#define SECRET_SSID "..."
#define SECRET_PASS "..."
#define SECRET_HOSTNAME "LED-Device"  // Max. 32 Zeichen
```

## Kommunikation

### UDP (Port 4210)
- **Frame**: Raw RGB bytes (2244 bytes = 748 LEDs × 3)
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

## FastLED Performance und Timing

### Ausgabe-Modi

FastLED unterstützt zwei Betriebsmodi für die LED-Ausgabe:

#### 1. Sequenzielle Ausgabe (Standard)

Bei mehreren `FastLED.addLeds<>()` Aufrufen werden die LED-Streifen nacheinander beschrieben:

```cpp
FastLED.addLeds<WS2811, PIN1>(leds1, count1);  // Wird zuerst ausgegeben
FastLED.addLeds<WS2811, PIN2>(leds2, count2);  // Dann als zweites
// ...
FastLED.show();  // Schreibt alle Streifen sequenziell
```

**Timing-Berechnung:**
- WS2811 benötigt ~30 µs pro LED bei 800 kHz
- Gesamtzeit = Summe aller LEDs × 30 µs

**Beispiel (aktuelle Konfiguration):**
- 6 Segmente: 136 + 136 + 102 + 136 + 136 + 102 = 748 LEDs
- Frame-Zeit: 748 LEDs × 30 µs = 22.44 ms
- **Maximale FPS: ~44 FPS** (1000 ms / 22.44 ms)

#### 2. Parallele Ausgabe (WS2811_PORTA)

ESP8266 unterstützt echte parallele Ausgabe auf 4 dedizierten Pins:

```cpp
#define NUM_STRIPS 4
CRGB leds[NUM_STRIPS * NUM_LEDS_PER_STRIP];

FastLED.addLeds<WS2811_PORTA, NUM_STRIPS>(leds, NUM_LEDS_PER_STRIP);
```

**Verfügbare Pins (ESP8266):**
- GPIO 12, 13, 14, 15 (D6, D7, D5, D8 auf NodeMCU/D1 Boards)

**Timing-Berechnung:**
- Alle 4 Streifen werden **gleichzeitig** beschrieben
- Gesamtzeit = Länge des längsten Streifens × 30 µs

### FPS-Limits und CPU-Last

#### Theorie: Maximale FPS

```
Max FPS = 1000 ms / Frame-Zeit
Frame-Zeit = Anzahl LEDs (gesamt bei sequenziell / längstes Segment bei parallel) × 30 µs
```

#### Praxis: CPU-Last

`FastLED.show()` blockiert die CPU während der Ausgabe:

```
CPU-Last (%) = (Frame-Zeit / Frame-Intervall) × 100
Frame-Intervall = 1000 ms / gewünschte FPS
```

**Beispiel bei 60 FPS mit sequenzieller Ausgabe:**
- Frame-Intervall: 16.67 ms
- Frame-Zeit: 22.44 ms
- CPU-Last: (22.44 / 16.67) × 100 = **134.6%** ⚠️ Unmöglich!

**Empfehlung:** FPS ≤ Max FPS × 0.9 (10% Reserve für WiFi/Processing)

### Bekannte Limitierungen

#### ESP8266-spezifisch

1. **Interrupt-Deaktivierung**
   - `FastLED.show()` deaktiviert Interrupts während der Ausgabe
   - WiFi-Stack kann keine Pakete empfangen
   - Bei langen Frame-Zeiten (>20 ms): Möglicher UDP-Paketverlust

2. **Watchdog Timer**
   - Blockierzeit sollte <100 ms bleiben
   - Bei sehr vielen LEDs: `ESP.wdtFeed()` zwischen Operationen

3. **Timing-Präzision**
   - WS2811 auf ESP8266: 55%/45% Duty Cycle (suboptimal)
   - Kann zu Flackern führen
   - Lösung: `FastLED.setMaxRefreshRate(100)` nach `addLeds()`

4. **Level-Shifting**
   - ESP8266 GPIO: 3.3V
   - WS2811 erwartet: ≥0.7×VDD (bei 5V Versorgung = 3.5V)
   - Empfohlen: 74HCT245 oder ähnlicher Level-Shifter

### Performance-Optimierung

#### Option 1: FPS reduzieren (einfach)

```cpp
#define FPS 40  // Statt 60
```

Vorteile:
- Sofort umsetzbar
- Keine Hardware-Änderungen
- Reduziert CPU-Last und WiFi-Interferenz

#### Option 2: Parallele Ausgabe (optimal)

Umstellung auf WS2811_PORTA:

**Vorher (sequenziell, 6 Pins):**
```cpp
FastLED.addLeds<WS2811, sp1>(segment1, count1);
FastLED.addLeds<WS2811, sp2>(segment2, count2);
// ... 4 weitere
// → 22.44 ms Frame-Zeit, 44 FPS max
```

**Nachher (parallel, 4 Pins):**
```cpp
#define NUM_STRIPS 4
CRGB leds[NUM_STRIPS][NUM_LEDS_PER_STRIP];

FastLED.addLeds<WS2811_PORTA, NUM_STRIPS>(leds[0], NUM_LEDS_PER_STRIP);
// → ~5.6 ms Frame-Zeit, 178 FPS max
```

**Pins:**
- D6 (GPIO12), D7 (GPIO13), D5 (GPIO14), D8 (GPIO15)

**Einschränkungen:**
- Nur 4 statt 6 Segmente
- LED-Verteilung muss angepasst werden
- Array-Layout: `leds[strip][pixel]` statt `leds[pixel]`

#### Option 3: ESP32 verwenden

Vorteile:
- Deutlich mehr CPU-Power (240 MHz Dual-Core)
- Bessere FastLED-Unterstützung
- I2S/RMT Parallel-Ausgabe auf bis zu 8 Pins
- Bessere WiFi-Performance
- 60+ FPS problemlos möglich

### Timing-Referenzen

| LED-Typ | Frequenz | µs/LED | LEDs @ 60 FPS max |
|---------|----------|--------|-------------------|
| WS2811  | 800 kHz  | ~30 µs | ~555 LEDs        |
| WS2812B | 800 kHz  | ~30 µs | ~555 LEDs        |
| WS2813  | 800 kHz  | ~30 µs | ~555 LEDs        |
| APA102  | >10 MHz  | ~2 µs  | ~8000 LEDs       |

*Bei sequenzieller Ausgabe. Bei paralleler Ausgabe (N Strips): Multiplikator ×N

### Debugging

#### FPS messen

```cpp
unsigned long lastFrame = 0;
unsigned long frameCount = 0;

void loop() {
    // Animation code...
    FastLED.show();

    frameCount++;
    if (millis() - lastFrame >= 1000) {
        Serial.printf("FPS: %lu\n", frameCount);
        frameCount = 0;
        lastFrame = millis();
    }
}
```

#### Frame-Zeit messen

```cpp
void loop() {
    unsigned long start = micros();
    FastLED.show();
    unsigned long duration = micros() - start;

    Serial.printf("Frame Zeit: %lu µs (%.2f ms)\n",
                  duration, duration / 1000.0);
    delay(1000 / FPS);
}
```

### Weitere Ressourcen

- [FastLED ESP8266 Notes](https://github.com/FastLED/FastLED/wiki/ESP8266-notes)
- [FastLED Parallel Output](https://github.com/FastLED/FastLED/wiki/Parallel-Output)
- [WS2811 Datasheet](https://cdn-shop.adafruit.com/datasheets/WS2811.pdf)

## Dateien

- `src/main.cpp` - Main Loop, Frame/Command Processing
- `include/m_handler.h` - Hardware Config, LED/WiFi Setup
- `include/o_udpConnection.h` - UDP Connector
- `include/o_tcpConnection.h` - WebSocket Connector
- `include/o_serialConnection.h` - Serial Connector mit Buffer
