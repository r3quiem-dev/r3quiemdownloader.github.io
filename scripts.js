// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const themeIcon = themeToggle.querySelector('.icon');
const themeNotification = document.getElementById('themeNotification');

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Show notification
    themeNotification.textContent = newTheme === 'dark' ? '🌙 Mode sombre activé' : '☀️ Mode clair activé';
    themeNotification.classList.add('show');
    setTimeout(() => {
        themeNotification.classList.remove('show');
    }, 2000);
});

// Form elements
const form = document.getElementById('downloadForm');
const urlInput = document.getElementById('url');
const downloadBtn = document.getElementById('downloadBtn');
const btnContent = downloadBtn.querySelector('.btn-content');
const status = document.getElementById('status');
const formatSelect = document.getElementById('format');
const qualitySelect = document.getElementById('quality');
const detectedPlatform = document.getElementById('detectedPlatform');

// Platform detection
const platforms = {
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'tiktok.com': 'TikTok',
    'soundcloud.com': 'SoundCloud',
    'facebook.com': 'Facebook',
    'fb.watch': 'Facebook',
    'vimeo.com': 'Vimeo',
    'rumble.com': 'Rumble',
    'bilibili.com': 'Bilibili',
    'dailymotion.com': 'Dailymotion',
    'twitch.tv': 'Twitch'
};

function detectPlatform(url) {
    for (let [domain, name] of Object.entries(platforms)) {
        if (url.includes(domain)) {
            return name;
        }
    }
    return null;
}

// Auto-detect platform on input
urlInput.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
        const platform = detectPlatform(url);
        if (platform) {
            detectedPlatform.innerHTML = `🎯 Plateforme détectée : <strong>${platform}</strong>`;
            detectedPlatform.classList.add('show');
        } else {
            detectedPlatform.classList.remove('show');
        }
    } else {
        detectedPlatform.classList.remove('show');
    }
});

// Disable quality for audio formats
formatSelect.addEventListener('change', (e) => {
    const isAudio = e.target.value === 'mp3' || e.target.value === 'wav';
    qualitySelect.disabled = isAudio;
    if (isAudio) {
        qualitySelect.value = 'best';
    }
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    const format = formatSelect.value;
    const quality = qualitySelect.value;
    const subtitles = document.getElementById('subtitles').checked;

    if (!url) {
        showStatus('⚠️ Veuillez entrer une URL valide', 'error');
        return;
    }

    const platform = detectPlatform(url);
    if (!platform) {
        showStatus('❌ Plateforme non supportée. Vérifiez votre lien.', 'error');
        return;
    }

    // Start download
    downloadBtn.disabled = true;
    btnContent.innerHTML = '<span class="loader"></span><span>Téléchargement...</span>';
    
    showStatus('🔄 Connexion à ' + platform + '...', 'info');

    try {
        const response = await fetch('http://localhost:5000/download', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url, 
                format,
                quality,
                subtitles
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur de téléchargement');
        }

        // Get filename from header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `video.${format}`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        // Download file
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        showStatus(
            `✅ <strong>Téléchargement réussi !</strong><br>
            📱 Plateforme : ${platform}<br>
            📂 Format : ${format.toUpperCase()}<br>
            ✨ Qualité : ${quality}${subtitles ? '<br>💬 Sous-titres : Inclus' : ''}`,
            'success'
        );
    } catch (error) {
        console.error('Erreur:', error);
        showStatus(`❌ Erreur : ${error.message}`, 'error');
    } finally {
        downloadBtn.disabled = false;
        btnContent.innerHTML = '<span class="btn-icon">⬇️</span><span>Télécharger</span>';
    }
});

function showStatus(message, type) {
    status.className = `status ${type} show`;
    status.innerHTML = message;
}
