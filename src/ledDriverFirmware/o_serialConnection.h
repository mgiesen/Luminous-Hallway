void processFrame(uint8_t *payload, size_t length);
void processCommand(uint8_t *payload, size_t length);

class DataBuffer {
public:
    enum BufferType {
        None,
        Command,
        Frame
    };

private:
    BufferType currentType = None;
    String commandData;
    uint8_t frameData[TOTAL_LED_COUNT * MATRIX_LED_BYTES];
    int dataIndex = 0;

    void resetBuffer() {
        commandData = "";
        dataIndex = 0;
        currentType = None;
    }

public:
    void addCharToBuffer(char c) {
        switch (c) {
        case '{':
            resetBuffer();
            currentType = Command;
            break;
        case '[':
            resetBuffer();
            currentType = Frame;
            break;
        case '}':
            if (currentType == Command) {
                processCommand((uint8_t*)commandData.c_str(), commandData.length());
            }
            resetBuffer();
            break;
        case ']':
            if (currentType == Frame && dataIndex == TOTAL_LED_COUNT * MATRIX_LED_BYTES) {
                processFrame(frameData, dataIndex);
            }
            resetBuffer();
            break;
        default:
            if (currentType == Frame && dataIndex < TOTAL_LED_COUNT * MATRIX_LED_BYTES) {
                frameData[dataIndex++] = (uint8_t)c;
            }
            else if (currentType == Command) {
                commandData += c;
            }
            break;
        }
    }
};

class serialConnector {
private:
    DataBuffer serialDataBuffer;

public:
    void setup() {
      Serial.begin(115200);
    }

    void loop() {
      while (Serial.available()) {
        char receivedChar = Serial.read();
        serialDataBuffer.addCharToBuffer(receivedChar);
      }
    }
};
