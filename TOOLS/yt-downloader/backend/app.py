from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import subprocess
import shutil
from datetime import datetime
from werkzeug.utils import secure_filename
import re

app = Flask(__name__)
CORS(app)

class YTDownloader:
    def __init__(self):
        self.base_download_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'downloads')
        # Create downloads directory if it doesn't exist
        os.makedirs(self.base_download_dir, exist_ok=True)
    
    def sanitize_filename(self, filename):
        """Sanitize filename for filesystem compatibility"""
        # Remove or replace problematic characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        filename = re.sub(r'[\x00-\x1f]', '', filename)  # Remove control characters
        return filename[:100]  # Limit length
    
    def create_download_directory(self, title):
        """Create directory with YYYY-MM-DD-<first 10 chars of title> format"""
        today = datetime.now().strftime('%Y-%m-%d')
        title_preview = self.sanitize_filename(title)[:10]
        dir_name = f"{today}-{title_preview}"
        
        download_path = os.path.join(self.base_download_dir, dir_name)
        os.makedirs(download_path, exist_ok=True)
        return download_path
    
    def get_video_info(self, url):
        """Get video information using yt-dlp"""
        try:
            cmd = [
                'yt-dlp',
                '--get-title',
                '--get-duration',
                '--get-filename',
                '-o', '%(title)s',
                url
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            lines = result.stdout.strip().split('\n')
            
            title = lines[0] if len(lines) > 0 else 'Unknown'
            return title
            
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to get video info: {e.stderr if e.stderr else str(e)}")
    
    def download_video(self, url, format_type='video'):
        """Download video or audio from YouTube"""
        try:
            # Get video info first
            title = self.get_video_info(url)
            
            # Create download directory
            download_dir = self.create_download_directory(title)
            
            # Set up download command based on format
            if format_type == 'audio':
                # Download audio only (mp3)
                cmd = [
                    'yt-dlp',
                    '-x', '--audio-format', 'mp3',
                    '-o', os.path.join(download_dir, '%(title)s.%(ext)s'),
                    url
                ]
            else:
                # Download video (best quality mp4)
                cmd = [
                    'yt-dlp',
                    '-f', 'best[ext=mp4]',
                    '-o', os.path.join(download_dir, '%(title)s.%(ext)s'),
                    url
                ]
            
            print(f"Running command: {' '.join(cmd)}")
            
            # Execute download
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                env=os.environ.copy()
            )
            
            print("Download completed successfully")
            print(f"stdout: {result.stdout}")
            if result.stderr:
                print(f"stderr: {result.stderr}")
            
            # Find the downloaded file
            downloaded_files = []
            for file in os.listdir(download_dir):
                if file.endswith(('.mp4', '.mp3', '.webm', '.mkv')):
                    downloaded_files.append({
                        'filename': file,
                        'path': os.path.join(download_dir, file),
                        'size': os.path.getsize(os.path.join(download_dir, file))
                    })
            
            if not downloaded_files:
                raise Exception("No media file found after download")
            
            return {
                'title': title,
                'directory': os.path.basename(download_dir),
                'files': downloaded_files,
                'format': format_type
            }
            
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr if e.stderr else str(e)
            if "403: Forbidden" in error_msg or "Precondition check failed" in error_msg:
                raise Exception("YouTube blocked the download (Error 403). Try a different video or wait a few minutes.")
            else:
                raise Exception(f"yt-dlp command failed: {error_msg}")
        except Exception as e:
            raise Exception(f"Failed to download: {str(e)}")
    
    def list_downloads(self):
        """List all downloaded files organized by directory"""
        downloads = []
        
        if not os.path.exists(self.base_download_dir):
            return downloads
        
        for dir_name in sorted(os.listdir(self.base_download_dir), reverse=True):
            dir_path = os.path.join(self.base_download_dir, dir_name)
            
            if os.path.isdir(dir_path):
                files = []
                for file in os.listdir(dir_path):
                    if file.endswith(('.mp4', '.mp3', '.webm', '.mkv')):
                        file_path = os.path.join(dir_path, file)
                        files.append({
                            'filename': file,
                            'size': os.path.getsize(file_path),
                            'modified': os.path.getmtime(file_path)
                        })
                
                if files:
                    downloads.append({
                        'directory': dir_name,
                        'files': files,
                        'file_count': len(files)
                    })
        
        return downloads

# Initialize downloader
downloader = YTDownloader()

@app.route('/')
def index():
    """Serve the frontend"""
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
    return send_from_directory(frontend_dir, 'index.html')

@app.route('/api/download', methods=['POST'])
def download():
    """Handle download requests"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        youtube_url = data.get('youtube_url')
        format_type = data.get('format', 'video')  # 'video' or 'audio'
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        if format_type not in ['video', 'audio']:
            return jsonify({'error': 'Format must be "video" or "audio"'}), 400
        
        # Download the content
        try:
            result = downloader.download_video(youtube_url, format_type)
            
            return jsonify({
                'success': True,
                'message': f'{format_type.title()} downloaded successfully!',
                **result
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/downloads', methods=['GET'])
def list_downloads_endpoint():
    """List all downloaded files"""
    try:
        downloads = downloader.list_downloads()
        return jsonify({
            'success': True,
            'downloads': downloads,
            'total_directories': len(downloads)
        })
    except Exception as e:
        return jsonify({'error': f'Failed to list downloads: {str(e)}'}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    import socket
    
    def find_free_port():
        """Find a free port to use"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port
    
    # Only run setup on the main process (not the reloader)
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        # Check if yt-dlp is available
        try:
            subprocess.run(['yt-dlp', '--version'], capture_output=True, check=True)
            print("✅ yt-dlp found")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Error: yt-dlp not found")
            print("Please install it with: pip install yt-dlp")
            exit(1)
        
        # Check frontend directory
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
        if not os.path.exists(frontend_dir):
            print(f"❌ Error: Frontend directory not found at {frontend_dir}")
            exit(1)
        
        print(f"✅ Frontend directory found: {frontend_dir}")
        
        # Create downloads directory
        downloads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'downloads')
        os.makedirs(downloads_dir, exist_ok=True)
        print(f"✅ Downloads directory: {downloads_dir}")
        
        # Try to use port from environment variable, otherwise find a free port
        preferred_port = int(os.environ.get('PORT', 8080))
        
        # Test if preferred port is available
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', preferred_port))
                port = preferred_port
        except OSError:
            # Port is in use, find a free one
            port = find_free_port()
            print(f"⚠️  Port {preferred_port} is in use, using port {port} instead")
        
        print(f"🎥 YouTube Downloader starting on http://localhost:{port}")
        print(f"📱 Open your browser to: http://localhost:{port}")
        print("🛑 Press Ctrl+C to stop the server")
        print("")
    else:
        # For reloader process, try to get port from environment or find free port
        preferred_port = int(os.environ.get('PORT', 8080))
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', preferred_port))
                port = preferred_port
        except OSError:
            port = find_free_port()
    
    app.run(debug=True, host='localhost', port=port)