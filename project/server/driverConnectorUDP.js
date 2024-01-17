const dgram = require('dgram');
const config = require('../config.json');
const EventEmitter = require('events');

function transformMatrix(arr)
{
    return arr;
    let result = [];
    let rows = 22;
    let cols = 34;
    let ledSize = 3;

    for (let row = 0; row < rows; row++)
    {
        for (let col = 0; col < cols; col++)
        {
            let index = (row * cols + col) * ledSize;
            if (row % 2 === 0)
            {
                // Gerade Reihen: Elemente in normaler Reihenfolge hinzufügen
                for (let i = 0; i < ledSize; i++)
                {
                    result.push(arr[index + i]);
                }
            } else
            {
                // Ungerade Reihen: Elemente in umgekehrter Reihenfolge hinzufügen
                // Index für die umgekehrte Reihenfolge berechnen
                let reverseIndex = (row * cols + (cols - 1 - col)) * ledSize;
                for (let i = 0; i < ledSize; i++)
                {
                    result.push(arr[reverseIndex + i]);
                }
            }
        }
    }

    return new Uint8Array(result);
}

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
            const transformedMatrix = transformMatrix(frame);
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