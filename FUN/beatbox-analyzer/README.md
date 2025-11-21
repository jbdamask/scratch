# Audio Spectrogram Analyzer

A web application that generates and displays frequency spectrograms for uploaded audio files.

## Features

- Upload audio files in multiple formats (WAV, MP3, OGG, FLAC, M4A)
- Generate frequency spectrograms using STFT (Short-Time Fourier Transform)
- **Real-time audio playback** with HTML5 audio player
- **Synchronized cursor** that tracks playback position on the spectrogram
- Display audio metadata (duration, sample rate, number of samples)
- Modern, responsive web interface
- Drag-and-drop file upload

## Tech Stack

**Backend:**
- FastAPI - Fast, modern Python web framework
- librosa - Audio analysis library
- matplotlib - Visualization library
- NumPy - Numerical computing

**Frontend:**
- HTML5
- CSS3 (with modern gradients and animations)
- Vanilla JavaScript (no frameworks)

## Installation

1. Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

### Quick Start (Recommended)
Simply run the startup script:
```bash
./start.sh
```

This script will:
- Create a virtual environment if it doesn't exist
- Activate the virtual environment
- Install/update dependencies
- Start the server

### Manual Start
1. Activate the virtual environment:
```bash
source venv/bin/activate
```

2. Start the server:
```bash
python main.py
```

3. Open your browser and navigate to:
```
http://localhost:8001
```

## Usage

1. Click the upload box or drag and drop an audio file
2. Wait for the spectrogram to be generated
3. Use the audio player controls to play/pause the audio
4. Watch the **red cursor** move across the spectrogram in sync with playback
5. The cursor shows exactly which frequencies are playing at any moment
6. Click anywhere on the audio timeline to jump to that position

## API Endpoints

### POST /api/upload
Upload an audio file and generate its spectrogram.

**Request:**
- Content-Type: multipart/form-data
- Body: file (audio file)

**Response:**
```json
{
  "success": true,
  "filename": "audio.wav",
  "audio_url": "/audio/uuid-filename.wav",
  "spectrogram": "data:image/png;base64,...",
  "duration": 3.5,
  "sample_rate": 44100,
  "samples": 154350
}
```

### GET /audio/{filename}
Serves an audio file for playback.

**Parameters:**
- `filename`: The unique filename of the uploaded audio file

**Returns:** The audio file with appropriate content-type headers

### GET /
Serves the main HTML page.

## Project Structure

```
.
├── main.py              # FastAPI backend
├── start.sh            # Startup script (recommended)
├── requirements.txt     # Python dependencies
├── static/
│   ├── index.html      # Main HTML page
│   ├── styles.css      # CSS styling
│   └── script.js       # JavaScript logic (includes sync logic)
├── uploads/            # Temporary upload directory
└── venv/               # Virtual environment
```

## How It Works

1. **Upload & Processing**: When you upload an audio file, the backend:
   - Saves the file with a unique UUID filename
   - Uses librosa to load and analyze the audio
   - Generates a spectrogram using STFT (Short-Time Fourier Transform)
   - Returns both the spectrogram image and a URL to stream the audio

2. **Synchronized Playback**: The frontend:
   - Loads the audio into an HTML5 audio player
   - Listens for `timeupdate` events from the audio player
   - Calculates the cursor position based on: `(currentTime / duration) × spectrogramWidth`
   - Updates the red cursor position in real-time
   - Shows/hides the cursor on play/pause events

3. **Real-time Visualization**: As the audio plays, you can see exactly which frequencies are active at each moment, making it easy to identify:
   - Bass frequencies (bottom of the spectrogram)
   - Mid-range frequencies (middle)
   - High frequencies (top of the spectrogram)
   - Harmonics and overtones
   - Silence periods (darker areas)
