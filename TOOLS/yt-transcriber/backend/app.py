from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import subprocess
from pydub import AudioSegment
import openai
import math
import time
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB in bytes
CHUNK_DURATION_MS = 60000  # 60 seconds per chunk

class YTTranscriber:
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
    
    def download_youtube_audio(self, url):
        """Download audio from YouTube using yt-dlp command line tool"""
        try:
            # Create temp directory for this session
            session_dir = tempfile.mkdtemp()
            
            # Use yt-dlp command line tool with the exact format you specified
            output_template = os.path.join(session_dir, '%(title)s.%(ext)s')
            
            # First, get the video info to extract title
            info_cmd = [
                'yt-dlp',
                '--get-title',
                url
            ]
            
            try:
                result = subprocess.run(info_cmd, capture_output=True, text=True, check=True)
                title = result.stdout.strip()
            except subprocess.CalledProcessError:
                title = 'youtube_audio'  # fallback title
            
            # Use the exact command that works in CLI
            download_cmd = [
                'yt-dlp', '-x', '--audio-format', 'mp3', '-o', output_template, url
            ]
            
            # Debug: Print the command and environment
            print(f"Running command: {' '.join(download_cmd)}")
            print(f"Working directory: {session_dir}")
            print(f"PATH: {os.environ.get('PATH', 'Not found')}")
            
            # Run with environment and working directory matching CLI
            result = subprocess.run(
                download_cmd, 
                capture_output=True, 
                text=True, 
                check=True,
                env=os.environ.copy(),  # Inherit all environment variables including virtual env
                cwd=session_dir  # Set working directory to session directory
            )
            
            print("Download command completed successfully")
            print(f"stdout: {result.stdout}")
            if result.stderr:
                print(f"stderr: {result.stderr}")
            
            # Find the downloaded file
            for file in os.listdir(session_dir):
                if file.endswith('.mp3'):
                    audio_path = os.path.join(session_dir, file)
                    return audio_path, title
                        
            raise Exception("No MP3 file found after download")
            
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr if e.stderr else str(e)
            if "403: Forbidden" in error_msg or "Precondition check failed" in error_msg:
                raise Exception(f"YouTube blocked the download (Error 403). This can happen due to:\n\n• Geographic restrictions\n• Video is private/restricted\n• YouTube's anti-bot measures\n\nSuggestions:\n1. Try a different video\n2. Make sure you're logged into YouTube in your browser\n3. Wait a few minutes and try again\n4. Try downloading manually: yt-dlp -x --audio-format mp3 \"{url}\"")
            else:
                raise Exception(f"yt-dlp command failed: {error_msg}")
        except Exception as e:
            raise Exception(f"Failed to download YouTube audio: {str(e)}")
    
    def convert_to_mp3(self, audio_path):
        """Convert audio file to MP3 format"""
        try:
            audio = AudioSegment.from_file(audio_path)
            mp3_path = audio_path.rsplit('.', 1)[0] + '.mp3'
            audio.export(mp3_path, format="mp3")
            return mp3_path
        except Exception as e:
            raise Exception(f"Failed to convert audio: {str(e)}")
    
    def get_file_size(self, file_path):
        """Get file size in bytes"""
        return os.path.getsize(file_path)
    
    def create_audio_chunks(self, audio_path):
        """Split audio file into chunks if it's too large"""
        try:
            file_size = self.get_file_size(audio_path)
            
            if file_size <= MAX_FILE_SIZE:
                return [audio_path]
            
            # Load audio file
            audio = AudioSegment.from_file(audio_path)
            
            # Calculate chunk duration based on file size
            duration_ms = len(audio)
            estimated_chunks = math.ceil(file_size / MAX_FILE_SIZE)
            chunk_duration = duration_ms // estimated_chunks
            
            # Ensure minimum chunk duration
            chunk_duration = max(chunk_duration, 30000)  # At least 30 seconds
            
            chunks = []
            chunk_dir = os.path.dirname(audio_path)
            base_name = os.path.splitext(os.path.basename(audio_path))[0]
            
            for i in range(0, duration_ms, chunk_duration):
                end = min(i + chunk_duration, duration_ms)
                chunk = audio[i:end]
                
                chunk_path = os.path.join(chunk_dir, f"{base_name}_chunk_{len(chunks)}.mp3")
                chunk.export(chunk_path, format="mp3")
                chunks.append(chunk_path)
            
            return chunks
            
        except Exception as e:
            raise Exception(f"Failed to create audio chunks: {str(e)}")
    
    def transcribe_audio_chunk(self, audio_path, api_key):
        """Transcribe a single audio chunk using OpenAI Whisper"""
        try:
            # Initialize OpenAI client with just the API key
            client = openai.OpenAI(api_key=api_key)
            
            with open(audio_path, 'rb') as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            
            return transcript.text
            
        except Exception as e:
            # More detailed error information
            error_msg = str(e)
            if "proxies" in error_msg:
                raise Exception(f"OpenAI client version issue. Please update openai library: pip install --upgrade openai")
            else:
                raise Exception(f"Failed to transcribe audio chunk: {error_msg}")
    
    def transcribe_audio(self, audio_path, api_key, progress_callback=None):
        """Transcribe audio file, handling chunking if necessary"""
        try:
            # Create chunks if needed
            if progress_callback:
                progress_callback("Creating audio chunks...", 10)
            
            chunks = self.create_audio_chunks(audio_path)
            
            if progress_callback:
                progress_callback(f"Processing {len(chunks)} chunks...", 20)
            
            # Transcribe each chunk
            transcriptions = []
            for i, chunk_path in enumerate(chunks):
                if progress_callback:
                    progress = 20 + (i / len(chunks)) * 70
                    progress_callback(f"Transcribing chunk {i+1}/{len(chunks)}...", progress)
                
                chunk_transcription = self.transcribe_audio_chunk(chunk_path, api_key)
                transcriptions.append(chunk_transcription)
                
                # Clean up chunk file (except if it's the original file)
                if chunk_path != audio_path:
                    try:
                        os.remove(chunk_path)
                    except:
                        pass
                
                # Brief pause to avoid rate limiting
                time.sleep(0.1)
            
            if progress_callback:
                progress_callback("Combining transcriptions...", 95)
            
            # Combine all transcriptions
            final_transcription = " ".join(transcriptions)
            
            if progress_callback:
                progress_callback("Transcription complete!", 100)
            
            return final_transcription
            
        except Exception as e:
            raise Exception(f"Failed to transcribe audio: {str(e)}")
    
    def cleanup_temp_files(self, file_path):
        """Clean up temporary files"""
        try:
            if os.path.exists(file_path):
                # Clean up the file and its directory if it's in temp
                if file_path.startswith(tempfile.gettempdir()):
                    dir_path = os.path.dirname(file_path)
                    import shutil
                    shutil.rmtree(dir_path, ignore_errors=True)
                else:
                    os.remove(file_path)
        except:
            pass

# Initialize transcriber
transcriber = YTTranscriber()

@app.route('/')
def index():
    """Serve the frontend"""
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
    return send_from_directory(frontend_dir, 'index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
    static_dir = os.path.join(frontend_dir, 'static')
    return send_from_directory(static_dir, filename)

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Handle transcription requests"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        youtube_url = data.get('youtube_url')
        api_key = data.get('api_key')
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        if not api_key:
            return jsonify({'error': 'OpenAI API key is required'}), 400
        
        # Download audio from YouTube
        try:
            audio_path, title = transcriber.download_youtube_audio(youtube_url)
        except Exception as e:
            return jsonify({'error': str(e)}), 400
        
        # Convert to MP3 if needed
        try:
            mp3_path = transcriber.convert_to_mp3(audio_path)
            if mp3_path != audio_path:
                transcriber.cleanup_temp_files(audio_path)
                audio_path = mp3_path
        except Exception as e:
            transcriber.cleanup_temp_files(audio_path)
            return jsonify({'error': str(e)}), 500
        
        # Transcribe the audio
        try:
            transcription = transcriber.transcribe_audio(audio_path, api_key)
            
            # Clean up
            transcriber.cleanup_temp_files(audio_path)
            
            return jsonify({
                'transcription': transcription,
                'title': title,
                'success': True
            })
            
        except Exception as e:
            transcriber.cleanup_temp_files(audio_path)
            return jsonify({'error': str(e)}), 500
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/transcribe/progress', methods=['POST'])
def transcribe_with_progress():
    """Handle transcription requests with progress updates"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        youtube_url = data.get('youtube_url')
        api_key = data.get('api_key')
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        if not api_key:
            return jsonify({'error': 'OpenAI API key is required'}), 400
        
        def progress_generator():
            yield f"data: {{'status': 'downloading', 'message': 'Downloading audio from YouTube...', 'progress': 5}}\n\n"
            
            try:
                # Download audio from YouTube
                audio_path, title = transcriber.download_youtube_audio(youtube_url)
                yield f"data: {{'status': 'processing', 'message': 'Download complete, processing audio...', 'progress': 15}}\n\n"
                
                # Convert to MP3 if needed
                mp3_path = transcriber.convert_to_mp3(audio_path)
                if mp3_path != audio_path:
                    transcriber.cleanup_temp_files(audio_path)
                    audio_path = mp3_path
                
                yield f"data: {{'status': 'transcribing', 'message': 'Starting transcription...', 'progress': 20}}\n\n"
                
                # Transcribe with progress updates
                def progress_callback(message, progress):
                    yield f"data: {{'status': 'transcribing', 'message': '{message}', 'progress': {progress}}}\n\n"
                
                transcription = transcriber.transcribe_audio(audio_path, api_key, progress_callback)
                
                # Clean up
                transcriber.cleanup_temp_files(audio_path)
                
                yield f"data: {{'status': 'complete', 'transcription': '{transcription.replace(chr(10), ' ').replace(chr(13), ' ')}', 'title': '{title}', 'progress': 100}}\n\n"
                
            except Exception as e:
                if 'audio_path' in locals():
                    transcriber.cleanup_temp_files(audio_path)
                yield f"data: {{'status': 'error', 'error': '{str(e)}'}}\n\n"
        
        return app.response_class(
            progress_generator(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        )
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

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
        # Check if yt-dlp command line tool is available
        try:
            subprocess.run(['yt-dlp', '--version'], capture_output=True, check=True)
            print("✅ yt-dlp command line tool found")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Error: yt-dlp command line tool not found")
            print("Please install it with: pip install yt-dlp")
            print("Or follow instructions at: https://github.com/yt-dlp/yt-dlp#installation")
            exit(1)
        
        # Check if frontend directory exists
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
        if not os.path.exists(frontend_dir):
            print(f"❌ Error: Frontend directory not found at {frontend_dir}")
            print("Make sure you're running this from the backend directory")
            exit(1)
        
        if not os.path.exists(os.path.join(frontend_dir, 'index.html')):
            print(f"❌ Error: index.html not found in {frontend_dir}")
            exit(1)
        
        print(f"✅ Frontend directory found: {frontend_dir}")
        
        # Try to use port from environment variable, otherwise use a fixed port for development
        port = int(os.environ.get('PORT', 8080))
        
        print(f"🎬 YouTube Transcriber starting on http://localhost:{port}")
        print(f"📱 Open your browser to: http://localhost:{port}")
        print("🛑 Press Ctrl+C to stop the server")
        print("")
    else:
        port = int(os.environ.get('PORT', 8080))
    
    app.run(debug=True, host='localhost', port=port)