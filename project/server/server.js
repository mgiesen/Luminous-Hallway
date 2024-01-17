const express = require('express');
const multer = require('multer');
const path = require('path');

const WebSocket = require('ws');

const config = require('../config.json');
const processor = require('./processor');
const program = require('./program');
const driverConnector = require('./driverConnector');
const HomeKitDevice = require('./HomeKitDevice');

const app = express();
const port = 80;

// =============================================================
// Webserver für Frontend
// =============================================================

// Upload Filter
const fileFilter = (req, file, cb) =>
{
    // Erlaubte MIME-Typen
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];

    if (allowedTypes.includes(file.mimetype))
    {
        // Akzeptiere den Upload
        cb(null, true);
    }
    else
    {
        // Ablehnen des Uploads
        cb(null, false);
        cb(new Error('Nur JPG, PNG und MP4 Dateien sind erlaubt'));
    }
};

// Multer Konfiguration
const upload = multer({
    dest: 'uploads/',
    fileFilter: fileFilter
});

// Serve Frontend
app.use(express.static("./frontend", { index: 'index.html' }));

function uploadErrorHandler(err, req, res, next) 
{
    if (err)
    {
        state.uploadInProgress = false;
        sendStateUpdate();

        return res.status(500).send('Fehler beim Hochladen der Datei');
    }
    next();
}

// POST-Anfrage für den Datei-Upload
app.post('/upload', upload.single('file'), uploadErrorHandler, async (req, res) =>
{
    if (!req.file)
    {
        return res.status(400).send('Keine Datei hochgeladen oder Dateityp nicht unterstützt.');
    }

    state.uploadInProgress = true;
    sendStateUpdate();

    // Verarbeitung basierend auf dem MIME-Typ
    const mimeType = req.file.mimetype;
    const fileExtname = path.extname(req.file.originalname);

    await processor.processUpload(req.file.path, config.animation.frameSize, mimeType, fileExtname);

    // Upload Ordner leeren
    processor.clearFolder('./uploads');

    state.uploadInProgress = false;
    sendStateUpdate();

    return res.status(200).send('Datei wurde erfolgreich verarbeitet');
});

// Start the server
const server = app.listen(port, () =>
{
    console.log(`Server running on port ${port}`);
});

// =============================================================
// WebSocket Server für Frontend
// =============================================================

const wss = new WebSocket.Server({ server });

const state = {
    command: 'updateStatus',
    uploadInProgress: false,
    driverConnected: false,
};

function sendStateUpdate()
{
    wss.clients.forEach(function each(client)
    {
        if (client.readyState === WebSocket.OPEN)
        {
            client.send(JSON.stringify(state));
        }
    });
}

function serveNewFrame(ws) 
{
    const toAllClients = Boolean(ws == undefined);

    if (program.programHandler.rawArrayRGB.length == 0)
    {
        return;
    }

    const currentProgram = program.programHandler;

    const fps = parseInt((currentProgram.frameIndex + 1) / (currentProgram.timestampCurrentFrame - currentProgram.timestampFirstFrame) * 1000);
    const runtime = parseInt(currentProgram.timestampCurrentFrame - currentProgram.timestampFirstFrame);

    const frameCommand =
    {
        command: 'updateFrame',
        enabled: currentProgram.enabled,
        frame: Array.from(currentProgram.rawArrayRGB[currentProgram.frameIndex]),
        width: config.animation.frameSize.width,
        height: config.animation.frameSize.height,
        brightness: currentProgram.brightness,
        fps: fps,
        runtime: runtime,
    };

    if (toAllClients)
    {
        wss.clients.forEach(function each(client)
        {
            if (client.readyState === WebSocket.OPEN)
            {
                client.send(JSON.stringify(frameCommand));
            }
        });
    }
    else
    {
        ws.send(JSON.stringify(frameCommand));
    }

}

wss.on('connection', function connection(ws)
{
    console.log("Frontend Client angemeldet");

    ws.on('message', function incoming(message)
    {
        const data = JSON.parse(message);

        if (data.command == "setBrightness")
        {
            program.programHandler.brightness = parseInt(data.value);
        }
        if (data.command == "togglePower")
        {
            program.programHandler.enabled = !program.programHandler.enabled;
        }
    });

    ws.on('close', function ()
    {
        console.log("Frontend Client abgemeldet");
    });

    //Client den aktuellen Status übergeben
    serveNewFrame(ws);

    // Statusobjekt an Client senden
    sendStateUpdate();

});

// =============================================================
// Driver Handler
// =============================================================

const driverLabel = "[LED TREIBER]";

driverConnector.on('ledDriverConnected', () =>
{
    console.log(`${driverLabel} Erfolgreich verbunden`);
    state.driverConnected = true;
    sendStateUpdate();
});

driverConnector.on('ledDriverProblem', () =>
{
    console.error(`${driverLabel} WebSocket Fehler`);
    state.driverConnected = false;
    sendStateUpdate();
});

driverConnector.on('ledDriverDisconnected', () =>
{
    console.log(`${driverLabel} Verbindung getrennt`);
    state.driverConnected = false;
    sendStateUpdate();
});

driverConnector.on('ledDriverFeedback', (data) =>
{
    console.log(`${driverLabel} Mitteilung: ${data}`);
});

// =============================================================
// Program Handler
// =============================================================

program.emitter.on('frameUpdate', serveNewFrame);

// =============================================================
// HomeKit Handler
// =============================================================

function handleOnSet(value)
{
    console.log('Licht ein/aus gesetzt:', value);
    program.programHandler.enabled = value;
}

function handleBrightnessSet(value)
{
    console.log('Helligkeit gesetzt:', value);
    program.programHandler.brightness = parseInt(value) / 100 * 255;
}

const HomeKitDeviceConfig = {
    username: config.homekit.username,
    pincode: config.homekit.pincode,
    port: config.homekit.port,
};

const ledDecke = new HomeKitDevice("LED Decke", HomeKitDeviceConfig, handleOnSet, handleBrightnessSet);

// =============================================================
// Programm Start
// =============================================================

// Nach Skript-Start 2 Sekunden warten und Programm laden
setTimeout(() =>
{
    program.load();
}, 1000);

process.on('uncaughtException', (error) =>
{
    // WebSocket Fehler beim Verbinden mit dem Treiber ignorieren (Tritt auf wenn der Server zu Beginn offline ist)
    if (!error.message.includes('WebSocket was closed before the connection was established'))
    {
        console.error('Ungefangener Fehler:', error);
    }
});


