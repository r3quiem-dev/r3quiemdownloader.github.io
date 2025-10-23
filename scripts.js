// Soumission du formulaire
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    const format = formatSelect.value;

    if (!url) {
        showStatus('⚠️ Veuillez entrer une URL valide', 'error');
        return;
    }

    const platform = detectPlatform(url);
    if (!platform) {
        showStatus('❌ Plateforme non supportée. Vérifiez votre lien.', 'error');
        return;
    }

    // Début du téléchargement
    downloadBtn.disabled = true;
    btnContent.innerHTML = '<span class="loader"></span><span>Téléchargement...</span>';

    showStatus('🔄 Connexion à ' + platform + '...', 'info');

    try {
        const response = await fetch('http://localhost:5000/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `video.${format}`;
        a.click();

        showStatus(`✅ Téléchargement réussi !`, 'success');
    } catch (error) {
        showStatus(`❌ Erreur : ${error.message}`, 'error');
    } finally {
        downloadBtn.disabled = false;
        btnContent.innerHTML = '<span class="btn-icon">⬇️</span><span>Télécharger</span>';
    }
});
