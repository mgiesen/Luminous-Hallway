const dgram = require('dgram');
const config = require('./config.json');
const EventEmitter = require('events');
const transformMatrix = require('./transformMatrix');

class DriverConnector extends EventEmitter
{
    constructor()
    {
        super();
        this.udpClient = dgram.createSocket('udp4');

        this.udpClient.on('error', (err) =>
        {
            console.error(`UDP-Client-Fehler:\n${err.stack}`);
            this.udpClient.close();
            this.emit('ledDriverProblem');
        });
    }

    sendFrame(frame)
    {
        try
        {
            const transformedMatrix = transformMatrix(frame, config.animation.frameSize.height, config.animation.frameSize.width, true, true);

            this.udpClient.send(transformedMatrix, 0, transformedMatrix.length, config.ledDriver.udp.port, config.ledDriver.udp.ip);
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
            const commandString = `{${command}:${value}}`;
            this.udpClient.send(commandString, 0, commandString.length, config.ledDriver.udp.port, config.ledDriver.udp.ip);
        }
        catch (error)
        {
            console.error('Fehler beim Senden des Befehls:', error);
        }
    }
}

module.exports = new DriverConnector();