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

        fetch(`http://${serverAddress}/upload`, {
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

// Event-Listener für den Update-Button
document.getElementById('updateBtn').addEventListener('click', function ()
{
    fetch(`/update`, {
        method: 'GET'
    }).then(response =>
    {
        if (response.status === 200)
        {
            response.text().then(data =>
            {
                alert("Update erfolgreich. Server wird neu gestartet.");

                window.location.reload();
            });
        } else
        {
            alert("Update fehlgeschlagen");
        }
    }).catch(error => console.error('Fehler:', error));
});

// Event-Listener für den Upload-Button
document.getElementById('uploadButton').addEventListener('click', function ()
{
    uploadFile();
});

// Event-Listener für den Helligkeitsregler
const ledBrightness = document.getElementById('led_brightness');
let ledBrightnessTrackbarIsBeingUsed = false;

led_brightness.addEventListener('input', function ()
{
    sendValueOverWebSocketDebounced(this.value, 'setBrightness');
});

led_brightness.addEventListener('mousedown', () =>
{
    ledBrightnessTrackbarIsBeingUsed = true;
});

led_brightness.addEventListener('mouseup', () =>
{
    ledBrightnessTrackbarIsBeingUsed = false;
});

document.getElementById('powerButton').addEventListener('click', function ()
{
    sendValueOverWebSocket(false, 'togglePower');
});


