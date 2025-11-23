const debug = true;
const serverAddress = debug ? `localhost:80` : `${window.location.host}`;

window.ws = new ReconnectingWebSocket(`ws://${serverAddress}`);

window.ws.binaryType = 'blob';

window.ws.addEventListener('open', function ()
{
    // Logik für die Behandlung der Öffnung der Verbindung
});

window.ws.addEventListener('message', function (event)
{
    const data = JSON.parse(event.data);
    if (data.command == 'updateFrame')
    {
        throttledRenderNewFrame(data);
    }
    else if (data.command == 'updateStatus')
    {
        updateState(data);
    }
});

window.ws.addEventListener('error', function (error)
{
    showLoader("Verbindung zum Server verloren. Versuche erneut zu verbinden...");
});

window.ws.addEventListener('close', function (event)
{
    showLoader("Verbindung zum Server verloren. Versuche erneut zu verbinden...");
});

// Funktion zum Erstellen einer debounced Version einer Funktion
function debounce(func, wait)
{
    let timeout;

    return function executedFunction(...args)
    {
        const later = () =>
        {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Funktion zum Erstellen einer throttled Version einer Funktion
function throttle(func, limit)
{
    let inThrottle;
    return function ()
    {
        const args = arguments;
        const context = this;
        if (!inThrottle)
        {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

const sendValueOverWebSocketDebounced = debounce(sendValueOverWebSocket, 10);
const throttledRenderNewFrame = throttle(renderNewFrame, 1000 / 24);

// Wert über Websocket senden
function sendValueOverWebSocket(value, command)
{
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN)
    {
        return;
    }

    const data = {
        command: command,
        value: value
    };
    window.ws.send(JSON.stringify(data));
}

//==============================================================================
// HANDLER METHODEN
//==============================================================================

// Funktion zum Aktualisieren des Systemstatus
function updateState(data)
{
    if (data.uploadInProgress)
    {
        showLoader("Upload wird durchgeführt");
    }
    else if (data.fileProcessingInProgress)
    {
        showLoader("Upload wird verarbeitet");
    } else
    {
        showLoader(false);
    }
}
