const fs = require('fs');
const path = require('path');

const ANIMATIONS_DIR = path.join(__dirname, 'animations');

// ID-Validierung gegen Path Traversal
function validateId(id) {
    if (!id || typeof id !== 'string') {
        throw new Error('Ungültige Animation-ID: ID fehlt oder falscher Typ');
    }

    // Nur alphanumerische Zeichen, Unterstriche und Bindestriche erlauben
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new Error('Ungültige Animation-ID: Nur Buchstaben, Zahlen, - und _ erlaubt');
    }

    // Länge limitieren
    if (id.length > 100) {
        throw new Error('Ungültige Animation-ID: Zu lang (max 100 Zeichen)');
    }

    return true;
}

// Einfache ID-Generierung (offline-tauglich, max 20 Animationen)
function generateId() {
    return `anim_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Sicherstellen dass Animations-Ordner existiert
function ensureAnimationsDir() {
    if (!fs.existsSync(ANIMATIONS_DIR)) {
        fs.mkdirSync(ANIMATIONS_DIR, { recursive: true });
    }
}

// Alle Animationen auflisten (nur Metadaten)
function listAnimations() {
    ensureAnimationsDir();

    const files = fs.readdirSync(ANIMATIONS_DIR)
        .filter(file => file.endsWith('.json'));

    const animations = files.map(file => {
        const filePath = path.join(ANIMATIONS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Nur Metadaten zurückgeben (kein Code)
        return {
            id: data.id,
            title: data.title
        };
    });

    return animations.sort((a, b) => a.title.localeCompare(b.title));
}

// Einzelne Animation laden (mit Code)
function getAnimation(id) {
    ensureAnimationsDir();
    validateId(id); // SECURITY: Path Traversal Prevention

    const filePath = path.join(ANIMATIONS_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Animation mit ID ${id} nicht gefunden`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
}

// Neue Animation erstellen
function createAnimation(title, code) {
    ensureAnimationsDir();

    // Validierung
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('Titel ist erforderlich');
    }

    if (title.length > 200) {
        throw new Error('Titel zu lang (max 200 Zeichen)');
    }

    if (!code || typeof code !== 'string') {
        throw new Error('Code ist erforderlich');
    }

    // SECURITY: Code-Size Limit (max 50KB)
    if (code.length > 50000) {
        throw new Error('Code zu lang (max 50KB)');
    }

    const id = generateId();
    const animation = {
        id,
        title: title.trim(),
        code: code.trim()
    };

    const filePath = path.join(ANIMATIONS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(animation, null, 2), 'utf8');

    return animation;
}

// Animation aktualisieren
function updateAnimation(id, title, code) {
    ensureAnimationsDir();
    validateId(id); // SECURITY: Path Traversal Prevention

    const filePath = path.join(ANIMATIONS_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Animation mit ID ${id} nicht gefunden`);
    }

    // Validierung
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('Titel ist erforderlich');
    }

    if (title.length > 200) {
        throw new Error('Titel zu lang (max 200 Zeichen)');
    }

    if (!code || typeof code !== 'string') {
        throw new Error('Code ist erforderlich');
    }

    // SECURITY: Code-Size Limit (max 50KB)
    if (code.length > 50000) {
        throw new Error('Code zu lang (max 50KB)');
    }

    const animation = {
        id,
        title: title.trim(),
        code: code.trim()
    };

    fs.writeFileSync(filePath, JSON.stringify(animation, null, 2), 'utf8');

    return animation;
}

// Animation löschen
function deleteAnimation(id) {
    ensureAnimationsDir();
    validateId(id); // SECURITY: Path Traversal Prevention

    const filePath = path.join(ANIMATIONS_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Animation mit ID ${id} nicht gefunden`);
    }

    fs.unlinkSync(filePath);

    return { success: true };
}

module.exports = {
    listAnimations,
    getAnimation,
    createAnimation,
    updateAnimation,
    deleteAnimation
};
