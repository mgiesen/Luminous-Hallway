const EventEmitter = require('events');
class Emitter extends EventEmitter { }
const emitter = new Emitter();

const fs = require('fs');
const { readdir } = require('fs').promises;
const sharp = require('sharp');

const config = require('./config.json');
const driver = require('./driverConnector');
const { AnimationRunner } = require('./animationRunner');

class ProgramHandler
{
    constructor()
    {
        this._enabled = false;
        this._brightness = 50;
        this.rawArrayRGB = [];
        this.frameIndex = 0;
        this.frameCount = 0;
        this.outputType = 'image';  // 'image', 'video', oder 'animation'
        this.timestampFirstFrame = null;
        this.timestampPrevFrame = null;
        this.timestampCurrentFrame = null;
        this.animationTimeout = null;  // Timeout-Handler
        this.mode = 'file';  // 'file' oder 'code'
        this.animationRunner = new AnimationRunner();  // Code-Animation Runner
        this.currentAnimationId = null;  // ID der aktuellen Code-Animation
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
        this.outputType = 'image';
        this.timestampFirstFrame = null;
        this.timestampPrevFrame = null;
        this.timestampCurrentFrame = null;
        this.mode = 'file';
        this.currentAnimationId = null;
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

        // Code-Animation Modus
        if (this.mode === 'code')
        {
            if (this.animationRunner.isLoaded())
            {
                return this.animationRunner.generateFrame();
            }
            else
            {
                // Fallback: schwarzer Frame
                const frameSize = config.animation.frameSize.width * config.animation.frameSize.height * 3;
                return new Uint8Array(frameSize);
            }
        }

        // File-Animation Modus (bestehend)
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

        setTimeout(() =>
        {
            emitter.emit('frameUpdate');
        }, 100);
    }
}

let programHandler = new ProgramHandler();

async function load(mimeType = 'image/jpeg')
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

    // OutputType basierend auf frameCount und mimeType bestimmen
    if (ImageBuffer.length === 1)
    {
        programHandler.outputType = 'image';
    }
    else if (mimeType.startsWith('video/'))
    {
        programHandler.outputType = 'video';
    }
    else
    {
        programHandler.outputType = 'animation';
    }

    programHandler.enabled = true;
};

/**
 * Code-Animation laden
 * @param {string} animationId - ID der Animation
 * @param {string} code - Animation-Code
 */
async function loadCodeAnimation(animationId, code)
{
    console.log('[loadCodeAnimation] Starte Animation:', animationId);

    try {
        // Aktives Programm stoppen
        programHandler.clear();

        // ROBUSTNESS: Animation-Runner mit Code laden (kann fehlschlagen!)
        programHandler.animationRunner.load(code);
        programHandler.mode = 'code';
        programHandler.outputType = 'animation';
        programHandler.currentAnimationId = animationId;

        console.log('[loadCodeAnimation] Mode:', programHandler.mode, 'OutputType:', programHandler.outputType);

        // Animation starten
        programHandler.enabled = true;

        console.log('[loadCodeAnimation] Enabled:', programHandler.enabled);
    } catch (error) {
        console.error('[loadCodeAnimation] Fehler beim Laden der Animation:', error);

        // ROBUSTNESS: Cleanup bei Fehler
        programHandler.resetValues();
        programHandler.enabled = false;

        // Error weiterwerfen für Caller
        throw new Error(`Konnte Animation nicht laden: ${error.message}`);
    }
}

module.exports = {
    load,
    loadCodeAnimation,
    programHandler,
    emitter
};
