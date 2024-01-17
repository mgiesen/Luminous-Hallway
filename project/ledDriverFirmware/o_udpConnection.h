#include <WiFiUdp.h>

// Forward Declarations
void processFrame(uint8_t *payload, size_t length);
void processCommand(uint8_t *payload, size_t length);

class udpConnector
{
private:
  WiFiUDP udp;
  unsigned int localUdpPort;
  unsigned int totalLedCount;
  unsigned int bytesPerLed;
  unsigned int totalLedBytes;
  byte *udpPacketBuffer;

public:
  udpConnector(unsigned int port, unsigned int totalLedCount, unsigned int bytesPerLed)
  {
    this->localUdpPort = port;
    this->totalLedCount = TOTAL_LED_COUNT;
    this->bytesPerLed = MATRIX_LED_BYTES;
    this->totalLedBytes = totalLedCount * bytesPerLed;
    this->udpPacketBuffer = new byte[this->totalLedBytes];
  }

  void setup()
  {
    udp.begin(localUdpPort);
    Serial.print("UDP Server gestartet an Port: ");
    Serial.println(localUdpPort);
  }

  void handle()
  {
    int packetSize = udp.parsePacket();
    if (packetSize)
    {
      int len = udp.read(udpPacketBuffer, totalLedBytes);
      if (len > 0)
      {
        if (udpPacketBuffer[0] == '{' && udpPacketBuffer[len - 1] == '}')
        {
          processCommand(udpPacketBuffer + 1, len - 2);
        }
        else if (len == totalLedBytes)
        {
          processFrame(udpPacketBuffer, len);
        }
        else
        {
          Serial.println("Ungültige UDP-Nachrichtengröße");
        }
      }
    }
  }

  ~udpConnector()
  {
    delete[] udpPacketBuffer;
  }
};
