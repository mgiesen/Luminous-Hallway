const EventEmitter = require('events');
class Emitter extends EventEmitter { }
const emitter = new Emitter();

const fs = require('fs');
const { readdir } = require('fs').promises;
const sharp = require('sharp');

const config = require('./config.json');
const driver = require('./driverConnector');

class ProgramHandler
{
    constructor()
    {
        this._enabled = false;
        this._brightness = 50;
        this.rawArrayRGB = [];
        this.frameIndex = 0;
        this.frameCount = 0;
        this.timestampFirstFrame = null;
        this.timestampPrevFrame = null;
        this.timestampCurrentFrame = null;
        this.animationTimeout = null;  // Timeout-Handler
    }

    clear()
    {
        this.enabled = false;  // Programm stoppen
        this.resetValues();    // Werte zurücksetzen
    }

    resetValues()
    {
        this._brightness = 50;
        this.rawArrayRGB = [];
        this.frameIndex = 0;
        this.frameCount = 0;
        this.timestampFirstFrame = null;
        this.timestampPrevFrame = null;
        this.timestampCurrentFrame = null;
    }

    get enabled()
    {
        return this._enabled;
    }

    set enabled(value)
    {
        this._enabled = value;
        if (value)
        {
            this.startAnimation();
        } else
        {
            this.stopAnimation();
        }
    }

    get brightness()
    {
        return this._brightness;
    }

    set brightness(value)
    {
        this._brightness = value;
        driver.sendCommand("setBrightness", value);
    }

    getNextFrame()
    {
        if (this.timestampFirstFrame == null)
        {
            this.timestampFirstFrame = Date.now();
        }

        this.timestampPrevFrame = this.timestampCurrentFrame;
        this.timestampCurrentFrame = Date.now();

        if (this.frameIndex < this.frameCount - 1)
        {
            this.frameIndex++;
        } else
        {
            this.frameIndex = 0;
            this.timestampFirstFrame = Date.now();
        }

        return this.rawArrayRGB[this.frameIndex];
    }

    animateFrame()
    {
        if (!this._enabled) return;

        driver.sendFrame(this.getNextFrame());
        emitter.emit('frameUpdate');

        if (this._enabled)
        {
            this.animationTimeout = setTimeout(() => this.animateFrame(), 1000 / config.animation.framerate);
        }
    }

    startAnimation()
    {
        this.animateFrame();
    }

    stopAnimation()
    {
        if (this.animationTimeout != null)
        {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }

        driver.sendCommand('turnOff');
        emitter.emit('frameUpdate');
    }
}

let programHandler = new ProgramHandler();

async function load()
{
    // Überprüfen, ob der Ordner existiert. Wenn nicht, erstellen
    const dir = './program';
    if (!fs.existsSync(dir))
    {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Liste aller Dateien im Ordner
    const files = await readdir('./program');

    if (files.length == 0) return;

    // Reihenfolge sicherstellen
    files.sort((a, b) =>
    {
        const numberA = parseInt(a.match(/\d+/)[0], 10);
        const numberB = parseInt(b.match(/\d+/)[0], 10);
        return numberA - numberB;
    });

    // Aktives Programm zurücksetzen
    programHandler.clear();

    let ImageBuffer = [];

    // Neues Programm laden
    for (const image of files)
    {
        // Konvertiere jedes Bild in das RGB-Format
        const imageBuffer = await sharp(`./program/${image}`)
            .toColorspace('srgb') // Konvertiere in standardisierten sRGB-Farbraum
            .raw()               // Konvertiere in Rohdaten (Buffer)
            .toBuffer();         // Erhalte den Buffer

        ImageBuffer.push(new Uint8Array(imageBuffer));
    }

    programHandler.rawArrayRGB = ImageBuffer;
    programHandler.frameCount = ImageBuffer.length;
    programHandler.enabled = true;
};

module.exports = {
    load,
    programHandler,
    emitter
};
