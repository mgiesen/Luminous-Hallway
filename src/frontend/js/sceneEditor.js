// Scene Editor - Verwaltet Bild/Video-Uploads und Code-Animationen

let currentEditingAnimation = null; // Aktuell bearbeitete Animation

document.addEventListener('DOMContentLoaded', () => {
    // ==================================================
    // DOM-Elemente
    // ==================================================
    const frameContainer = document.getElementById('frame-container');
    const sceneEditorModal = document.getElementById('sceneEditorModal');
    const animationEditorModal = document.getElementById('animationEditorModal');

    // File Upload Elemente
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');

    // Animation Liste
    const animationsList = document.getElementById('animationsList');
    const addAnimationBtn = document.getElementById('addAnimationBtn');

    // Animation Editor Elemente
    const editorTitle = document.getElementById('editorTitle');
    const animationTitleInput = document.getElementById('animationTitleInput');
    const animationCodeInput = document.getElementById('animationCodeInput');
    const saveAnimationBtn = document.getElementById('saveAnimationBtn');
    const deleteAnimationBtn = document.getElementById('deleteAnimationBtn');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    const editorBackdrop = document.getElementById('editorBackdrop');

    // ==================================================
    // Scene Editor Modal
    // ==================================================

    // Modal öffnen beim Klick auf Frame Container (Preview)
    frameContainer.addEventListener('click', () => {
        sceneEditorModal.showModal();
        loadAnimations(); // Animationen laden wenn Modal geöffnet wird
    });

    // ==================================================
    // File Upload (Drag & Drop)
    // ==================================================

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-base-300');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-base-300');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-base-300');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]); // Nur erste Datei
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    function handleFileUpload(file) {
        // Validierung
        const validTypes = ['image/jpeg', 'image/png', 'video/mp4'];
        if (!validTypes.includes(file.type)) {
            alert('Nur JPG, PNG und MP4 Dateien sind erlaubt!');
            return;
        }

        // FormData erstellen
        const formData = new FormData();
        formData.append('file', file);

        // Progress anzeigen
        uploadProgress.classList.remove('hidden');

        // Upload
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Upload fehlgeschlagen');
                }
                return response.text();
            })
            .then(() => {
                console.log('Upload erfolgreich');
                uploadProgress.classList.add('hidden');
                sceneEditorModal.close();
                // Reset file input
                fileInput.value = '';
            })
            .catch(error => {
                console.error('Upload-Fehler:', error);
                alert('Fehler beim Hochladen der Datei');
                uploadProgress.classList.add('hidden');
            });
    }

    // ==================================================
    // Animationen laden und anzeigen
    // ==================================================

    function loadAnimations() {
        fetch('/api/animations')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(animations => {
                renderAnimationsList(animations);
            })
            .catch(error => {
                console.error('Fehler beim Laden der Animationen:', error);
                animationsList.innerHTML = '<p class="text-center text-sm opacity-60 p-4">Fehler beim Laden: ' + error.message + '</p>';
            });
    }

    function renderAnimationsList(animations) {
        if (animations.length === 0) {
            animationsList.innerHTML = '<p class="text-center text-sm opacity-60 p-4">Keine Animationen vorhanden</p>';
            return;
        }

        animationsList.innerHTML = animations.map(animation => `
            <div class="flex items-center gap-2 bg-base-300 hover:bg-base-100 rounded-lg p-3 cursor-pointer transition-all group" data-animation-id="${animation.id}">
                <div class="flex-1 animation-title" data-animation-id="${animation.id}">
                    <span class="font-medium">${escapeHtml(animation.title)}</span>
                </div>
                <button class="btn btn-xs btn-ghost edit-animation-btn" data-animation-id="${animation.id}" title="Bearbeiten">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
        `).join('');

        // Event Listener für Animations-Auswahl
        document.querySelectorAll('.animation-title').forEach(el => {
            el.addEventListener('click', (e) => {
                const animationId = e.currentTarget.dataset.animationId;
                runAnimation(animationId);
                sceneEditorModal.close();
            });
        });

        // Event Listener für Edit-Buttons
        document.querySelectorAll('.edit-animation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Verhindere dass Animation gestartet wird
                const animationId = e.currentTarget.dataset.animationId;
                openAnimationEditor(animationId);
            });
        });
    }

    // ==================================================
    // Animation ausführen
    // ==================================================

    function runAnimation(animationId) {
        // Sende Befehl via WebSocket an Server
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify({
                command: 'runAnimation',
                animationId: animationId
            }));
        } else {
            console.error('WebSocket nicht verbunden');
        }
    }

    // ==================================================
    // Animation Editor
    // ==================================================

    // Neue Animation erstellen
    addAnimationBtn.addEventListener('click', () => {
        sceneEditorModal.close(); // Scene Editor schließen
        currentEditingAnimation = null;
        editorTitle.textContent = 'Neue Animation erstellen';
        animationTitleInput.value = '';
        animationCodeInput.value = `function(frame, time) {\n  // Dein Code hier\n  frame.fill({ r: 255, g: 0, b: 0 });\n}`;
        deleteAnimationBtn.style.display = 'none';
        animationEditorModal.showModal();
    });

    // Bestehende Animation bearbeiten
    function openAnimationEditor(animationId) {
        sceneEditorModal.close(); // Scene Editor schließen
        fetch(`/api/animations/${animationId}`)
            .then(response => response.json())
            .then(animation => {
                currentEditingAnimation = animation;
                editorTitle.textContent = 'Animation bearbeiten';
                animationTitleInput.value = animation.title;
                animationCodeInput.value = animation.code;
                deleteAnimationBtn.style.display = 'inline-flex';
                animationEditorModal.showModal();
            })
            .catch(error => {
                console.error('Fehler beim Laden der Animation:', error);
                alert('Fehler beim Laden der Animation');
            });
    }

    // Animation speichern
    saveAnimationBtn.addEventListener('click', () => {
        const title = animationTitleInput.value.trim();
        const code = animationCodeInput.value.trim();

        if (!title) {
            alert('Bitte gib einen Titel ein');
            return;
        }

        if (!code) {
            alert('Bitte gib Code ein');
            return;
        }

        const url = currentEditingAnimation
            ? `/api/animations/${currentEditingAnimation.id}`
            : '/api/animations';

        const method = currentEditingAnimation ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, code })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Fehler beim Speichern');
                    }).catch(() => {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(() => {
                animationEditorModal.close();
                sceneEditorModal.showModal(); // Scene Editor wieder öffnen
                loadAnimations(); // Liste aktualisieren
            })
            .catch(error => {
                console.error('Fehler beim Speichern:', error);
                alert('Fehler beim Speichern der Animation:\n' + error.message);
            });
    });

    // Animation löschen
    deleteAnimationBtn.addEventListener('click', () => {
        if (!currentEditingAnimation) return;

        if (!confirm(`Animation "${currentEditingAnimation.title}" wirklich löschen?`)) {
            return;
        }

        fetch(`/api/animations/${currentEditingAnimation.id}`, {
            method: 'DELETE'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Fehler beim Löschen');
                }
                return response.json();
            })
            .then(() => {
                animationEditorModal.close();
                sceneEditorModal.showModal(); // Scene Editor wieder öffnen
                loadAnimations(); // Liste aktualisieren
            })
            .catch(error => {
                console.error('Fehler beim Löschen:', error);
                alert('Fehler beim Löschen der Animation');
            });
    });

    // Editor schließen (X-Button)
    closeEditorBtn.addEventListener('click', () => {
        animationEditorModal.close();
        sceneEditorModal.showModal(); // Scene Editor wieder öffnen
    });

    editorBackdrop.addEventListener('click', () => {
        animationEditorModal.close();
        sceneEditorModal.showModal(); // Scene Editor wieder öffnen
    });

    // ==================================================
    // Hilfsfunktionen
    // ==================================================

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
});
