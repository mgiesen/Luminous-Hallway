const dgram = require('dgram');

// KONFIGURATION
const MCU_IP = '192.168.178.74';
const MCU_PORT = 4210;
const TOTAL_LEDS = 714;
const BYTES_PER_LED = 3;

// UDP Client erstellen
const client = dgram.createSocket('udp4');

// Frame-Buffer erstellen (alle LEDs weiß: R=255, G=255, B=255)
const frame = Buffer.alloc(TOTAL_LEDS * BYTES_PER_LED);
for (let i = 0; i < TOTAL_LEDS; i++) {
    const offset = i * BYTES_PER_LED;
    frame[offset] = 255;     // R
    frame[offset + 1] = 255; // G
    frame[offset + 2] = 255; // B
}

console.log(`Sende ${frame.length} bytes an ${MCU_IP}:${MCU_PORT}`);
console.log('Setze alle LEDs auf Weiß (255, 255, 255)...');

// Frame senden
client.send(frame, MCU_PORT, MCU_IP, (err) => {
    if (err) {
        console.error('Fehler beim Senden:', err);
    } else {
        console.log('Frame erfolgreich gesendet!');
    }
    client.close();
});
