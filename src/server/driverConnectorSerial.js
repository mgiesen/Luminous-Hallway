const { SerialPort } = require('serialport');
const config = require('./config.json');
const EventEmitter = require('events');
const transformMatrix = require('./transformMatrix');

class DriverConnector extends EventEmitter
{
    constructor()
    {
        super();
        this.port = new SerialPort({ path: config.ledDriver.port, baudRate: config.ledDriver.baudrate });

        this.port.on('open', () => this.emit('ledDriverConnected'));
        this.port.on('close', () => this.emit('ledDriverDisconnected'));
        this.port.on('error', () => this.emit('ledDriverProblem'));
        this.port.on('data', (data) => this.emit('ledDriverFeedback', data));
    }

    sendFrame(frame)
    {
        try
        {
            if (this.port && this.port.isOpen)
            {
                this.port.write('[');
                this.port.write(transformMatrix(frame));
                this.port.write(']');

                // Hinweis: Hier besteht ein ungelöster Fehler. Ein blauer, roter, grüner, weißer oder auch weiß-roter Frame werden problemlos übertragen
                // Sobald aber ein "unruhigeres" Bild übertragen wird, kommt es zu einem Fehler. Die Ursache ist noch nicht gefunden.
                // Ich habe sichergestellt, dass die gesendeten Arrays exakt gleich groß sind, alle Werte zwischen 0 und 255 liegen und die Werte in der richtigen Reihenfolge gesendet werden. 
            }
        }
        catch (error)
        {
            console.error('Fehler beim Senden des Frames:', error);
        }
    }

    sendCommand(command, value)
    {
        try
        {
            if (this.port && this.port.isOpen)
            {
                this.port.write('{');
                this.port.write(`${command}:${value}`);
                this.port.write('}');
            }
        }
        catch (error)
        {
            console.error('Fehler beim Senden des Objekts:', error);
        }
    }
}

module.exports = new DriverConnector();