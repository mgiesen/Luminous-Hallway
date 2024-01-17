const ReconnectingWebSocket = require('reconnecting-websocket');
const WebSocket = require('ws');
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
        this.rws = new ReconnectingWebSocket(`ws://${config.ledDriver.websocket.ip}:${config.ledDriver.websocket.port}`, [], {
            WebSocket: WebSocket,
            connectionTimeout: 4000
        });

        this.rws.addEventListener('open', () => this.emit('ledDriverConnected'));
        this.rws.addEventListener('close', () => this.emit('ledDriverDisconnected'));
        this.rws.addEventListener('error', () => this.emit('ledDriverProblem'));
        this.rws.addEventListener('data', (data) => this.emit('ledDriverFeedback', data));
    }

    sendFrame(frame)
    {
        try
        {
            if (this.rws.readyState === WebSocket.OPEN)
            {
                const transformedMatrix = transformMatrix(frame);
                this.rws.send(transformedMatrix);
            }
        } catch (error)
        {
            console.error('Fehler beim Senden des Frames:', error);
        }
    }

    sendCommand(command, value)
    {
        try
        {
            if (this.rws.readyState === WebSocket.OPEN)
            {
                const commandString = `{${command}:${value}}`;
                this.rws.send(commandString);
            }
        }
        catch (error)
        {
            console.error('Fehler beim Senden des Objekts:', error);
        }
    }
}

module.exports = new DriverConnector();