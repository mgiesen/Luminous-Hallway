const vm = require('vm');
const config = require('./config.json');

/**
 * Frame-Wrapper-Klasse
 * Bietet sichere Methoden zur Frame-Manipulation
 */
class FrameWrapper {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8Array(width * height * 3); // RGB
    }

    /**
     * Einzelnes Pixel setzen
     * @param {number} x - X-Koordinate (0 bis width-1)
     * @param {number} y - Y-Koordinate (0 bis height-1)
     * @param {object} color - {r, g, b} mit Werten 0-255
     */
    setPixel(x, y, color) {
        // Validierung
        x = Math.floor(x);
        y = Math.floor(y);

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return; // Außerhalb des Rahmens, ignorieren
        }

        if (!color || typeof color !== 'object') {
            return;
        }

        const r = Math.max(0, Math.min(255, Math.floor(color.r || 0)));
        const g = Math.max(0, Math.min(255, Math.floor(color.g || 0)));
        const b = Math.max(0, Math.min(255, Math.floor(color.b || 0)));

        const index = (y * this.width + x) * 3;
        this.data[index] = r;
        this.data[index + 1] = g;
        this.data[index + 2] = b;
    }

    /**
     * Pixel-Farbe abrufen
     * @param {number} x - X-Koordinate
     * @param {number} y - Y-Koordinate
     * @returns {object} {r, g, b}
     */
    getPixel(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return { r: 0, g: 0, b: 0 };
        }

        const index = (y * this.width + x) * 3;
        return {
            r: this.data[index],
            g: this.data[index + 1],
            b: this.data[index + 2]
        };
    }

    /**
     * Gesamten Frame mit einer Farbe füllen
     * @param {object} color - {r, g, b}
     */
    fill(color) {
        if (!color || typeof color !== 'object') {
            return;
        }

        const r = Math.max(0, Math.min(255, Math.floor(color.r || 0)));
        const g = Math.max(0, Math.min(255, Math.floor(color.g || 0)));
        const b = Math.max(0, Math.min(255, Math.floor(color.b || 0)));

        for (let i = 0; i < this.data.length; i += 3) {
            this.data[i] = r;
            this.data[i + 1] = g;
            this.data[i + 2] = b;
        }
    }

    /**
     * Frame leeren (alles schwarz)
     */
    clear() {
        this.data.fill(0);
    }

    /**
     * Rohdaten abrufen (für Treiber)
     */
    getRawData() {
        return this.data;
    }
}

/**
 * Animation-Runner
 * Führt User-Code sicher in isolierter Umgebung aus
 */
class AnimationRunner {
    constructor() {
        this.context = null; // Persistenter VM Context
        this.sandbox = null;
        this.cachedScript = null; // Cached Script für Performance
        this.startTime = null;
        this.width = config.animation.frameSize.width;
        this.height = config.animation.frameSize.height;
        this.logCount = 0; // SECURITY: Log-Spam Prevention
        this.maxLogs = 100; // Max 100 Logs pro Animation
    }

    /**
     * Animation-Code laden und kompilieren
     * @param {string} code - Animation-Code als String
     */
    load(code) {
        if (!code || typeof code !== 'string') {
            throw new Error('Ungültiger Animation-Code');
        }

        try {
            // Reset Log Counter
            this.logCount = 0;

            // Wrapper-Funktion erstellen
            // Der Code muss eine Funktion sein: function(frame, time) { ... }
            const wrappedCode = `this.animFunc = ${code.trim()}`;

            // SECURITY: Persistenten, isolierten Context erstellen
            this.sandbox = {
                frame: null, // Wird bei jedem Frame gesetzt
                time: 0,
                Math: Math, // Mathe-Funktionen erlauben
                // SECURITY: Limitiertes Console (Log-Spam Prevention)
                console: {
                    log: (...args) => {
                        if (this.logCount < this.maxLogs) {
                            console.log('[Animation]', ...args);
                            this.logCount++;
                        } else if (this.logCount === this.maxLogs) {
                            console.warn('[Animation] Log-Limit erreicht (max 100)');
                            this.logCount++;
                        }
                    },
                    error: (...args) => {
                        if (this.logCount < this.maxLogs) {
                            console.error('[Animation]', ...args);
                            this.logCount++;
                        }
                    }
                },
                animFunc: null // Animation-Funktion wird hier gespeichert
            };

            this.context = vm.createContext(this.sandbox);

            // Code im Context kompilieren und ausführen
            const loadScript = new vm.Script(wrappedCode);
            loadScript.runInContext(this.context, {
                timeout: 1000 // Max 1 Sekunde für Kompilierung
            });

            // Validierung
            if (typeof this.sandbox.animFunc !== 'function') {
                throw new Error('Animation-Code muss eine Funktion sein');
            }

            // PERFORMANCE: Execution-Script cachen
            this.cachedScript = new vm.Script('this.animFunc(frame, time)');

            this.startTime = Date.now();

        } catch (error) {
            // Cleanup bei Fehler
            this.context = null;
            this.sandbox = null;
            this.cachedScript = null;

            console.error('Fehler beim Laden der Animation:', error.message);
            throw new Error(`Animation-Code ungültig: ${error.message}`);
        }
    }

    /**
     * Nächsten Frame generieren
     * @returns {Uint8Array} Frame-Daten
     */
    generateFrame() {
        if (!this.context || !this.cachedScript) {
            throw new Error('Keine Animation geladen');
        }

        const frame = new FrameWrapper(this.width, this.height);
        const time = (Date.now() - this.startTime) / 1000; // Zeit in Sekunden

        try {
            // SECURITY: Frame und Zeit im isolierten Sandbox setzen
            this.sandbox.frame = frame;
            this.sandbox.time = time;

            // PERFORMANCE: Cached Script im persistenten Context ausführen
            this.cachedScript.runInContext(this.context, {
                timeout: 100 // Max 100ms pro Frame
            });

        } catch (error) {
            console.error('Fehler bei Frame-Generierung:', error.message);
            // Bei Fehler schwarzen Frame zurückgeben
            frame.clear();
        }

        return frame.getRawData();
    }

    /**
     * Animation zurücksetzen
     */
    reset() {
        this.startTime = Date.now();
    }

    /**
     * Prüfen ob Animation geladen ist
     */
    isLoaded() {
        return this.context !== null && this.cachedScript !== null;
    }

    /**
     * Animation und Context cleanup
     */
    unload() {
        this.context = null;
        this.sandbox = null;
        this.cachedScript = null;
        this.startTime = null;
        this.logCount = 0;
    }
}

module.exports = {
    AnimationRunner,
    FrameWrapper
};
