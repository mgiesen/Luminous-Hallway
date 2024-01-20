const ReconnectingWebSocket = require('reconnecting-websocket');
const WebSocket = require('ws');
const config = require('./config.json');
const EventEmitter = require('events');
const transformMatrix = require('./transformMatrix');

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