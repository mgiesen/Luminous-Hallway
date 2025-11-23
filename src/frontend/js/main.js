//Methode die direkt bei page load audgerufen wird. Das Ausblenden erfolgt über 
//das erste empfangene Status-Objekt
showLoader("Verbindung wird hergestellt");

// Funktion zum Anzeigen und Verbergen eines Ladebildschirms
function showLoader(status)
{
    const loader = document.getElementById('bodyLoader');
    const loaderText = document.getElementById('bodyLoaderText');

    if (status)
    {
        loaderText.innerText = status;
        loader.style.display = 'flex';
    }
    else
    {
        setTimeout(() =>
        {
            loader.style.display = 'none';
        }, 750);
    }
}

// Funktion zum Hochladen von Dateien
function uploadFile()
{
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/jpg,image/gif,video/mp4,video/webm,video/ogg';
    fileInput.style.display = 'none'; // Versteckt das Element

    // Fügt das Element zum DOM hinzu, was in Safari erforderlich sein kann
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', function (event)
    {
        showLoader("Datei wird vorbereitet");

        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        fetch(`${apiBaseUrl}/upload`, {
            method: 'POST',
            body: formData
        }).then(response =>
        {
            if (response.status === 200)
            {
                response.text().then(data =>
                {
                    console.log(data);
                });
            } else
            {
                console.error('Fehler beim Hochladen der Datei');
            }
        }).catch(error => console.error('Fehler:', error));
    });

    fileInput.click();

    // Entfernt das Element nach dem Klick aus dem DOM
    fileInput.remove();
}

// Event-Listener für den Helligkeitsregler
const ledBrightness = document.getElementById('led_brightness');
window.ledBrightnessTrackbarIsBeingUsed = false;

led_brightness.addEventListener('input', function ()
{
    sendValueOverWebSocketDebounced(this.value, 'setBrightness');
});

led_brightness.addEventListener('mousedown', () =>
{
    window.ledBrightnessTrackbarIsBeingUsed = true;
});

led_brightness.addEventListener('mouseup', () =>
{
    window.ledBrightnessTrackbarIsBeingUsed = false;
});

document.getElementById('powerButton').addEventListener('click', function ()
{
    sendValueOverWebSocket(false, 'togglePower');
});

// Slider Progress-Effekt
function updateSliderProgress(slider) {
    const value = slider.value;
    const min = slider.min || 0;
    const max = slider.max || 100;
    const percentage = ((value - min) / (max - min)) * 100;

    slider.style.background = `linear-gradient(to right,
        rgba(255, 255, 255, 0.5) 0%,
        rgba(255, 255, 255, 0.5) ${percentage}%,
        rgba(255, 255, 255, 0.15) ${percentage}%,
        rgba(255, 255, 255, 0.15) 100%)`;
}

const brightnessSlider = document.getElementById('led_brightness');
updateSliderProgress(brightnessSlider);

brightnessSlider.addEventListener('input', function() {
    updateSliderProgress(this);
});


