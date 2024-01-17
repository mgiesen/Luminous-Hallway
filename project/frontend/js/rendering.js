//==============================================================================
// RENDERING
//==============================================================================

// Konstanten und globale Variablen
const canvas_frame = document.getElementById('frame');
const ctx_frame = canvas_frame.getContext('2d');
const canvas_simulation = document.getElementById('simulation');
const ctx_simulation = canvas_simulation.getContext('2d');

// Konfigurationsobjekt für Raum- und Balkenparameter
const config = {
    room: {
        length: 5100,
        width: 1200
    },
    beams: {
        width: 35
    },
    options:
    {
        renderResolution: 0.7 //Unter 0.5 unbrauchbar
    }
};

function mapRange(value, fromLow, fromHigh, toLow, toHigh)
{
    return toLow + ((value - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow);
}

function isColorDark(r, g, b, threshold = 128)
{
    // Berechnung der relativen Luminanz
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Überprüfen, ob die Luminanz unter dem Schwellenwert liegt
    return luminance < threshold;
}

// Funktion zum Rendern der Simulationsszene
function renderSimulationScene(rgbaArray, enabled)
{
    // Berechnung der Simulationsparameter
    const scaleFactor = config.options.renderResolution;
    const beamCount = canvas_frame.width;
    const ledCountOnBar = canvas_frame.height;
    const simulationWidth = config.room.length * scaleFactor;
    const simulationHeight = config.room.width * scaleFactor;
    const beamWidth = config.beams.width * scaleFactor;
    const virtualLEDSize = 20 * scaleFactor;
    const beamSpacing = (simulationWidth - beamCount * beamWidth) / beamCount;
    const ledSpacing = (simulationHeight - ledCountOnBar * virtualLEDSize) / ledCountOnBar;

    // Anpassen der Canvas-Größe für die Simulation
    canvas_simulation.width = simulationWidth;
    canvas_simulation.height = simulationHeight;
    canvas_simulation.style.maxHeight = "none";

    // Glow-Radius für LEDs
    const maxGlowRadius = virtualLEDSize * 8;
    const minGlowRadius = virtualLEDSize * 2;

    const glowRadius = mapRange(document.getElementById("led_brightness").value, 0, 255, minGlowRadius, maxGlowRadius);

    // Alpha-Wert für LED-Helligkeit
    let alpha = mapRange(document.getElementById("led_brightness").value, 0, 255, 0.05, 0.4);

    // Wenn in der Simulation viele Glow-Radien überlagern wird die Darstellungsintensität reduziert
    const ledCountInGlowRadius = Math.ceil(maxGlowRadius / (virtualLEDSize + ledSpacing));
    alpha = alpha / ledCountInGlowRadius;

    // Zeichnen der Balken und LEDs
    for (let i = 0; i < beamCount; i++)
    {
        // Balken zeichnen
        const beamX = beamSpacing / 2 + i * (beamSpacing + beamWidth);
        ctx_simulation.fillStyle = "rgba(70,60,50, 0.9)";
        ctx_simulation.fillRect(beamX, 0, beamWidth, simulationHeight);

        // Schlagschatten hinter Balken zeichnen
        ctx_simulation.fillStyle = "rgba(0,0,0,0.3)";
        ctx_simulation.fillRect(beamX + -5, 0, beamWidth + 2 * 5, simulationHeight);

        for (let j = 0; j < ledCountOnBar; j++)
        {
            const ledY = ledSpacing / 2 + j * (virtualLEDSize + ledSpacing);
            const ledX = beamX + (beamWidth - virtualLEDSize) / 2;

            const colorIndex = (j * beamCount + i) * 4;
            const r = rgbaArray[colorIndex];
            const g = rgbaArray[colorIndex + 1];
            const b = rgbaArray[colorIndex + 2];
            const fullColor = enabled ? `rgb(${r}, ${g}, ${b})` : "rgb(0,0,0)";

            // LED-Glow zeichnen
            if (enabled && !isColorDark(r, g, b, 50))
            {
                ctx_simulation.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx_simulation.beginPath();
                ctx_simulation.arc(ledX + virtualLEDSize / 2, ledY + virtualLEDSize / 2, glowRadius, 0, Math.PI * 2);
                ctx_simulation.fill();
            }

            // LEDs zeichnen
            ctx_simulation.fillStyle = fullColor;
            ctx_simulation.fillRect(ledX, ledY + 2, virtualLEDSize, virtualLEDSize);
        }
    }
}

// Funktion zum Konvertieren von Millisekunden in Minuten und Sekunden
function formatSecondsToMinutes(millis)
{
    if (millis == null) return "00:00.000";
    const seconds = millis / 1000;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor(millis % 1000);
    const formattedMinutes = String(Math.round(minutes)).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    const formattedMilliseconds = String(milliseconds).padStart(3, '0');

    return `${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
}

// Funktion zum Rendern eines neuen Frames
function renderNewFrame(data)
{
    const width = data.width;
    const height = data.height;
    canvas_frame.width = width;
    canvas_frame.height = height;

    const rgbaArray = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < data.frame.length; i += 3, j += 4)
    {
        rgbaArray[j] = data.frame[i];
        rgbaArray[j + 1] = data.frame[i + 1];
        rgbaArray[j + 2] = data.frame[i + 2];
        rgbaArray[j + 3] = 255;
    }

    const imageDataObject = new ImageData(rgbaArray, width, height);
    ctx_frame.putImageData(imageDataObject, 0, 0);

    let brightnessTrackbar = document.getElementById("led_brightness");

    if (brightnessTrackbar.value != data.brightness && !ledBrightnessTrackbarIsBeingUsed)
    {
        brightnessTrackbar.value = data.brightness;
    }

    renderSimulationScene(rgbaArray, data.enabled);

    document.getElementById("animation_runtime_label").innerText = formatSecondsToMinutes(data.runtime);
    document.getElementById("fps_label").innerText = (data.fps || 0) + " fps";
}
