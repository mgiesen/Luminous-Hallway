#include <WebSocketsServer.h>

// Forward Declarations
void processFrame(uint8_t *payload, size_t length);
void processCommand(uint8_t *payload, size_t length);

class tcpConnector {
  private:
    WebSocketsServer webSocket;

     void onWebSocketEvent(uint8_t client, WStype_t type, uint8_t *payload, size_t length) {
      if (type == WStype_BIN) {
        if (length == TOTAL_LED_COUNT * MATRIX_LED_BYTES) {
          processFrame(payload, length);
        } else {
          Serial.println("Ungültige Framegröße");
        }
      } else if (type == WStype_TEXT) {
        if (payload[0] == '{' && payload[length - 1] == '}') {
          processCommand(payload + 1, length - 2);
        }
      }
    }

  public:
    tcpConnector(unsigned int port) : webSocket(port) {}

    void setup() {
      webSocket.begin();
      webSocket.onEvent([this](uint8_t client, WStype_t type, uint8_t * payload, size_t length) {
        this->onWebSocketEvent(client, type, payload, length);
      });

      Serial.print("WebSocket Server gestartet an Port: ");
      Serial.println(webSocket.port());
    }

    void loop() {
      webSocket.loop();
    }

};


