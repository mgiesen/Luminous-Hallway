#include <FastLED.h>    // https://github.com/FastLED/FastLED

#define MCU_OPTION_ESP8266 1
#define MCU_OPTION_ESP32 2

#define MCU MCU_OPTION_ESP8266
#define CONNECTION UDP

#define LED_TYPE WS2811
#define COLOR_ORDER GRB
#define FPS 40

// Pin Setup und propritäre Bibiliotheken für den ESP 8266
#if MCU == MCU_OPTION_ESP8266
#include <ESP8266WiFi.h>

#define sp1 5  // D1
#define sp2 4  // D2
#define sp3 2  // D4
#define sp4 13 // D7
#define sp5 12 // D6
#define sp6 14 // D5

// Pin Setup und propritäre Bibiliotheken für den ESP 32
#elif MCU == MCU_OPTION_ESP32
#include <WiFi.h>

#define sp1 23 // D23
#define sp2 22 // D22
#define sp3 1  // TX0
#define sp4 3  // RX0
#define sp5 21 // D21
#define sp6 19 // D19

// Abbruch, falls keine Fallbehandlung für den definierten Microcontroller gefunden wurde
#else
#error "Unbekannte MCU Konfiguration"
#endif

// STRUT LAYOUT
#define MATRIX_LED_BYTES 3
#define STRUT_LED_COUNT 34

// SEGMENT LED COUNT
#define slc1 4 * STRUT_LED_COUNT
#define slc2 4 * STRUT_LED_COUNT
#define slc3 3 * STRUT_LED_COUNT
#define slc4 4 * STRUT_LED_COUNT
#define slc5 4 * STRUT_LED_COUNT
#define slc6 3 * STRUT_LED_COUNT

// SEGMENT START INDEX
#define ssi1 0
#define ssi2 slc1
#define ssi3 slc1 + slc2
#define ssi4 slc1 + slc2 + slc3
#define ssi5 slc1 + slc2 + slc3 + slc4
#define ssi6 slc1 + slc2 + slc3 + slc4 + slc5

#define TOTAL_LED_COUNT (slc1 + slc2 + slc3 + slc4 + slc5 + slc6)

CRGB MATRIX[TOTAL_LED_COUNT];

void ledSetup()
{
    FastLED.addLeds<LED_TYPE, sp1, COLOR_ORDER>(&MATRIX[ssi1], slc1);
    FastLED.addLeds<LED_TYPE, sp2, COLOR_ORDER>(&MATRIX[ssi2], slc2);
    FastLED.addLeds<LED_TYPE, sp3, COLOR_ORDER>(&MATRIX[ssi3], slc3);
    FastLED.addLeds<LED_TYPE, sp4, COLOR_ORDER>(&MATRIX[ssi4], slc4);
    FastLED.addLeds<LED_TYPE, sp5, COLOR_ORDER>(&MATRIX[ssi5], slc5);
    FastLED.addLeds<LED_TYPE, sp6, COLOR_ORDER>(&MATRIX[ssi6], slc6);

    FastLED.clear();
    FastLED.setBrightness(50);
}

unsigned long previousMillis = 0;

void ledLoop()
{
    unsigned long currentMillis = millis();

    // Alle LEDs aktualisieren
    if (currentMillis - previousMillis >= 1000 / FPS)
    {
        previousMillis = currentMillis;
        FastLED.show();
    }
}

void serialSetup()
{
    delay(100);
    Serial.begin(115200);
    Serial.println("");
    Serial.println("Serial Interface gestartet");
}

void wifiSetup(const char *ssid, const char *password)
{
    // Hostname setzen (MUSS VOR WiFi.begin() und WiFi.config()!)
    WiFi.hostname(SECRET_HOSTNAME);

    // Statische IP konfigurieren (BEVOR WiFi.begin())
    if (!WiFi.config(STATIC_IP, GATEWAY, SUBNET, DNS_PRIMARY))
    {
        Serial.println("Fehler: Statische IP konnte nicht konfiguriert werden");
    }

    WiFi.begin(ssid, password);
    Serial.print("Verbinde mit WLAN (");
    Serial.print(SECRET_HOSTNAME);
    Serial.print(" @ ");
    Serial.print(STATIC_IP);
    Serial.print(")...");

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("Erfolgreich mit WLAN verbunden");
    Serial.print("Hostname: ");
    Serial.println(WiFi.hostname());
    Serial.print("IP-Adresse: ");
    Serial.println(WiFi.localIP());
    Serial.print("MAC-Adresse: ");
    Serial.println(WiFi.macAddress());
    Serial.println();
}


#if CONNECTION == UDP
#include "o_udpConnection.h"

udpConnector Connector(4210, TOTAL_LED_COUNT, MATRIX_LED_BYTES);

#elif CONNECTION == TCP
#include "o_tcpConnection.h"

tcpConnector Connector();

#elseif CONNECTION == SERIAL
#include "o_serialConnection.h"

serialConnector Connector();

#endif
