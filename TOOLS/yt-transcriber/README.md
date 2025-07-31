# YouTube Transcriber 🎬

A web application that automatically downloads audio from YouTube videos and transcribes them using OpenAI's Whisper API. Simply paste a YouTube URL, and get a full text transcription in minutes.

![YouTube Transcriber](https://img.shields.io/badge/Python-3.8+-blue.svg) ![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg) ![OpenAI](https://img.shields.io/badge/OpenAI-Whisper-orange.svg)

## ✨ Features

- 🎥 **YouTube Audio Extraction**: Downloads audio from any public YouTube video using yt-dlp
- 🎙️ **AI Transcription**: Transcribes audio using OpenAI's state-of-the-art Whisper model
- ✂️ **Smart Chunking**: Automatically splits large audio files (>25MB) for processing
- 📝 **Easy Export**: Copy transcriptions to clipboard or download as text files
- 🔐 **Secure**: API keys stored locally in browser, never on our servers
- 📱 **Clean Interface**: Simple, responsive web interface built with React
- ⚡ **Real-time Progress**: Live progress updates during download and transcription

## 🛠️ Prerequisites

Before you begin, ensure you have:

- **Python 3.8 or higher**
- **pip** (Python package installer)
- **An OpenAI API key** ([Get one here](https://platform.openai.com/api-keys))

### System Dependencies

**FFmpeg** is required for:
- yt-dlp to extract audio from YouTube videos
- Audio file processing and chunking

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
Download from [FFmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd yt-transcriber

# Create and activate virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt
```

### 3. Start the Application

**Option A: Use the startup script (recommended)**
```bash
# macOS/Linux
./start.sh

# Windows
start.bat
```

**Option B: Manual start**
```bash
cd backend
python app.py
```

The server will automatically find an available port and display the URL:
```
🎬 YouTube Transcriber starting on http://localhost:8080
📱 Open your browser to: http://localhost:8080
```

### 4. Configure OpenAI API Key

1. Open the URL in your browser
2. Enter your OpenAI API key (starts with `sk-`)
3. The key is securely stored in your browser's local storage

### 5. Start Transcribing!

1. Paste any public YouTube URL
2. Click "🎙️ Transcribe Video"
3. Wait for the magic to happen ✨
4. Copy or download your transcription

## 🔧 Configuration

### Environment Variables

Customize the application with these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | Auto-detected free port |
| `FLASK_ENV` | Flask environment | `development` |

Example:
```bash
PORT=8080 python app.py
```

### File Processing Limits

- **Direct transcription**: Files ≤25MB (OpenAI limit)
- **Chunked processing**: Files >25MB automatically split
- **Supported formats**: MP3, MP4, WAV, M4A, WebM (via yt-dlp)

## 📖 How It Works

1. **URL Processing**: Validates and processes YouTube URLs
2. **Audio Download**: Uses yt-dlp to extract high-quality audio
3. **Format Conversion**: Converts to MP3 for optimal processing
4. **Smart Chunking**: Large files split into <25MB chunks
5. **AI Transcription**: Each chunk processed by OpenAI Whisper
6. **Result Assembly**: Chunks combined into final transcription

## 🐛 Troubleshooting

### Common Issues

**❌ "yt-dlp command line tool not found"**
```bash
pip install yt-dlp
```

**❌ "YouTube blocked the download (Error 403)"**
- Video may be private, restricted, or geo-blocked
- Try a different video
- Ensure you're logged into YouTube in your browser
- Wait a few minutes and retry

**❌ "FFmpeg not found"**
- Install FFmpeg using the system-specific instructions above
- Restart your terminal after installation

**❌ "OpenAI API error"**
- Verify your API key is correct and active
- Check you have sufficient OpenAI credits
- Ensure API key has Whisper access

**❌ "Connection refused" / Server won't start**
- Check if the port is already in use
- Try setting a different port: `PORT=8081 python app.py`
- Ensure you're in the `backend` directory

### Performance Tips

- **Large files** (>1 hour) may take significant time to process
- **Internet speed** affects download time
- **OpenAI rate limits** may slow transcription of very large files
- **Consider shorter clips** for faster results

## 🏗️ Development

### Project Structure
```
yt-transcriber/
├── backend/
│   ├── app.py              # Flask server
│   └── requirements.txt    # Python dependencies
├── frontend/
│   └── index.html         # React frontend
├── start.sh               # macOS/Linux startup script
├── start.bat              # Windows startup script
└── README.md
```

### Development Mode

Enable Flask development mode for auto-reload:
```bash
export FLASK_ENV=development  # Linux/macOS
set FLASK_ENV=development     # Windows
python app.py
```

### API Endpoints

- `GET /` - Serve frontend application
- `POST /api/transcribe` - Process YouTube URL and return transcription
- `GET /health` - Health check endpoint

## 🔒 Security & Privacy

- **API keys** stored locally in browser localStorage only
- **Temporary files** automatically cleaned up after processing
- **No data persistence** - no transcriptions stored on server
- **Local processing** - runs entirely on your machine

## 📄 License

This project is for educational and personal use. Please respect:
- YouTube's Terms of Service
- Content creators' rights
- Only transcribe content you have permission to use

## 🤝 Contributing

This is a personal tool, but suggestions and improvements are welcome!

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Ensure all prerequisites are installed
3. Verify your OpenAI API key is working
4. Try with a different YouTube video

---

**Made with ❤️ for content creators, researchers, and accessibility advocates**