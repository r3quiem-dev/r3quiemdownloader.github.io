from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import yt_dlp
import os
import re

app = Flask(__name__)
CORS(app)

DOWNLOAD_FOLDER = 'downloads'
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

def sanitize_filename(filename):
    """Nettoie le nom de fichier pour éviter les problèmes"""
    return re.sub(r'[<>:"/\\|?*]', '', filename)

@app.route('/download', methods=['POST'])
def download():
    try:
        data = request.json
        url = data.get('url')
        file_format = data.get('format', 'mp4')
        quality = data.get('quality', '1080p')
        subtitles = data.get('subtitles', False)

        if not url:
            return jsonify({'error': 'URL manquante'}), 400

        # Configuration yt-dlp selon le format
        if file_format in ['mp3', 'wav']:
            # Pour l'audio
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': file_format,
                    'preferredquality': '192',
                }],
                'quiet': False,
                'no_warnings': False,
            }
        else:
            # Pour la vidéo
            format_string = 'bestvideo+bestaudio/best'
            
            # Adapter selon la qualité demandée
            if quality != 'best':
                height = quality.replace('p', '')
                if quality == '8k':
                    height = '4320'
                elif quality == '4k':
                    height = '2160'
                elif quality == '1440p':
                    height = '1440'
                    
                format_string = f'bestvideo[height<={height}]+bestaudio/best[height<={height}]'
            
            ydl_opts = {
                'format': format_string,
                'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s'),
                'merge_output_format': file_format,
                'quiet': False,
                'no_warnings': False,
            }
            
            # Ajouter les sous-titres si demandé
            if subtitles:
                ydl_opts['writesubtitles'] = True
                ydl_opts['writeautomaticsub'] = True
                ydl_opts['subtitleslangs'] = ['fr', 'en']

        print(f"Téléchargement de: {url}")
        print(f"Format: {file_format}, Qualité: {quality}")

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extraire les infos
            info = ydl.extract_info(url, download=True)
            
            # Préparer le nom de fichier
            title = sanitize_filename(info.get('title', 'video'))
            base_filename = ydl.prepare_filename(info)
            
            # Déterminer l'extension finale
            if file_format in ['mp3', 'wav']:
                final_filename = base_filename.rsplit('.', 1)[0] + f'.{file_format}'
            elif file_format == 'mkv':
                final_filename = base_filename.rsplit('.', 1)[0] + '.mkv'
            else:
                final_filename = base_filename

            print(f"Fichier téléchargé: {final_filename}")

            # Vérifier que le fichier existe
            if not os.path.exists(final_filename):
                # Essayer de trouver le fichier avec une extension différente
                base = final_filename.rsplit('.', 1)[0]
                for ext in ['.mp4', '.webm', '.mkv', f'.{file_format}']:
                    test_file = base + ext
                    if os.path.exists(test_file):
                        final_filename = test_file
                        break
                else:
                    return jsonify({'error': 'Fichier introuvable après téléchargement'}), 500

            # Envoyer le fichier
            response = send_file(
                final_filename,
                as_attachment=True,
                download_name=f"{title}.{file_format}"
            )

            # Nettoyer le fichier après l'envoi (optionnel)
            @response.call_on_close
            def cleanup():
                try:
                    if os.path.exists(final_filename):
                        os.remove(final_filename)
                        print(f"Fichier supprimé: {final_filename}")
                except Exception as e:
                    print(f"Erreur lors du nettoyage: {e}")

            return response

    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Serveur opérationnel'})

if __name__ == '__main__':
    print("🚀 Serveur démarré sur http://localhost:5000")
    print("📁 Dossier de téléchargement:", os.path.abspath(DOWNLOAD_FOLDER))
    app.run(host='0.0.0.0', port=5000, debug=True)
