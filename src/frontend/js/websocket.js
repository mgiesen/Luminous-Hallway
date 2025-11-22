const debug = false;
const serverAddress = debug ? `localhost` : `${window.location.host}`;

let ws = new ReconnectingWebSocket(`ws://${serverAddress}`);

ws.binaryType = 'blob';

ws.addEventListener('open', function ()
{
    // Logik für die Behandlung der Öffnung der Verbindung
});

ws.addEventListener('message', function (event)
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

ws.addEventListener('error', function (error)
{
    showLoader("Verbindung zum Server verloren. Versuche erneut zu verbinden...");
});

ws.addEventListener('close', function (event)
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
    if (!ws || ws.readyState !== WebSocket.OPEN)
    {
        return;
    }

    const data = {
        command: command,
        value: value
    };
    ws.send(JSON.stringify(data));
}

//==============================================================================
// HANDLER METHODEN
//==============================================================================

// Funktion zum Aktualisieren des Systemstatus
function updateState(data)
{
    document.getElementById("driver_connected_label").innerText = data.driverConnected ? "Verbunden" : "Getrennt";

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
