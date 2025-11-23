const express = require('express');
const multer = require('multer');
const path = require('path');

const WebSocket = require('ws');

const config = require('./config.json');
const processor = require('./processor');
const program = require('./program');
const driverConnector = require('./driverConnector');
const HomeKitDevice = require('./HomeKitDevice');
const animationStorage = require('./animationStorage');

const app = express();
const port = 80;

// JSON Body Parser
app.use(express.json());

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

app.get('/kill', (req, res) =>
{
    console.log("Prozess wird beendet");

    process.exit(0);
});

// =============================================================
// Animation API Endpunkte
// =============================================================

// Alle Animationen auflisten (nur Metadaten)
app.get('/api/animations', (req, res) =>
{
    try
    {
        const animations = animationStorage.listAnimations();
        res.json(animations);
    }
    catch (error)
    {
        console.error('Fehler beim Auflisten der Animationen:', error);
        res.status(500).json({ error: 'Fehler beim Auflisten der Animationen' });
    }
});

// Einzelne Animation abrufen (mit Code)
app.get('/api/animations/:id', (req, res) =>
{
    try
    {
        const animation = animationStorage.getAnimation(req.params.id);
        res.json(animation);
    }
    catch (error)
    {
        console.error('Fehler beim Abrufen der Animation:', error);
        res.status(404).json({ error: error.message });
    }
});

// Neue Animation erstellen
app.post('/api/animations', (req, res) =>
{
    try
    {
        const { title, code } = req.body;

        if (!title || !code)
        {
            return res.status(400).json({ error: 'Titel und Code sind erforderlich' });
        }

        const animation = animationStorage.createAnimation(title, code);
        res.status(201).json(animation);
    }
    catch (error)
    {
        console.error('Fehler beim Erstellen der Animation:', error);
        res.status(400).json({ error: error.message });
    }
});

// Animation aktualisieren
app.put('/api/animations/:id', (req, res) =>
{
    try
    {
        const { title, code } = req.body;

        if (!title || !code)
        {
            return res.status(400).json({ error: 'Titel und Code sind erforderlich' });
        }

        const animation = animationStorage.updateAnimation(req.params.id, title, code);
        res.json(animation);
    }
    catch (error)
    {
        console.error('Fehler beim Aktualisieren der Animation:', error);
        res.status(404).json({ error: error.message });
    }
});

// Animation löschen
app.delete('/api/animations/:id', (req, res) =>
{
    try
    {
        // Nicht die aktuell laufende Animation löschen
        if (program.programHandler.currentAnimationId === req.params.id)
        {
            return res.status(409).json({ error: 'Kann laufende Animation nicht löschen. Bitte zuerst stoppen.' });
        }

        animationStorage.deleteAnimation(req.params.id);
        res.json({ success: true });
    }
    catch (error)
    {
        console.error('Fehler beim Löschen der Animation:', error);
        res.status(404).json({ error: error.message });
    }
});

// =============================================================
// Serve Frontend (NACH API-Routen!)
// =============================================================
app.use(express.static("../frontend", { index: 'index.html' }));

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

    const currentProgram = program.programHandler;

    // Default-Frame erstellen wenn keine Animation geladen ist
    let frameData;
    let enabled = false;
    let runtime = 0;
    let brightness = 128;

    // Code-Animation: Frame vom AnimationRunner holen
    if (currentProgram.mode === 'code' && currentProgram.animationRunner.isLoaded())
    {
        try
        {
            // ROBUSTNESS: generateFrame() kann werfen!
            frameData = Array.from(currentProgram.animationRunner.generateFrame());
            enabled = currentProgram.enabled;
            runtime = parseInt(Date.now() - currentProgram.timestampFirstFrame);
            brightness = currentProgram.brightness;
        }
        catch (error)
        {
            console.error('Fehler bei Frame-Generierung:', error.message);
            // Fallback: Schwarzer Frame
            const width = config.animation.frameSize.width;
            const height = config.animation.frameSize.height;
            const frameSize = width * height * 3;
            frameData = new Array(frameSize).fill(0);
        }
    }
    // File-Animation: Frame aus rawArrayRGB holen
    else if (currentProgram.rawArrayRGB.length > 0)
    {
        frameData = Array.from(currentProgram.rawArrayRGB[currentProgram.frameIndex]);
        enabled = currentProgram.enabled;
        runtime = currentProgram.frameCount > 1 ? parseInt(currentProgram.timestampCurrentFrame - currentProgram.timestampFirstFrame) : 0;
        brightness = currentProgram.brightness;
    }
    // Fallback: Schwarzer Frame
    else
    {
        const width = config.animation.frameSize.width;
        const height = config.animation.frameSize.height;
        const frameSize = width * height * 3; // RGB
        frameData = new Array(frameSize).fill(0); // Alle LEDs schwarz (aus)
    }

    const frameCommand =
    {
        command: 'updateFrame',
        enabled: enabled,
        frame: frameData,
        width: config.animation.frameSize.width,
        height: config.animation.frameSize.height,
        brightness: brightness,
        runtime: runtime,
        outputType: currentProgram.outputType,
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
        if (data.command == "runAnimation")
        {
            // SECURITY: Input Validation
            if (!data.animationId || typeof data.animationId !== 'string')
            {
                console.error('WebSocket: Ungültige animationId');
                return;
            }

            // Code-Animation starten
            const animationId = data.animationId;

            try
            {
                const animation = animationStorage.getAnimation(animationId);
                program.loadCodeAnimation(animationId, animation.code);
                console.log(`Code-Animation gestartet: ${animation.title}`);
            }
            catch (error)
            {
                console.error('Fehler beim Starten der Animation:', error.message);
                // TODO: Send error feedback to client via WebSocket
            }
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
});

driverConnector.on('ledDriverProblem', () =>
{
    console.error(`${driverLabel} WebSocket Fehler`);
});

driverConnector.on('ledDriverDisconnected', () =>
{
    console.log(`${driverLabel} Verbindung getrennt`);
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


