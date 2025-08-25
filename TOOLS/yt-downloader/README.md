# YouTube Downloader 📥

A simple web application that downloads videos and audio from YouTube using yt-dlp. Built with a Python Flask backend and React frontend.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg) ![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg) ![yt-dlp](https://img.shields.io/badge/yt--dlp-latest-orange.svg)

## ✨ Features

- 🎥 **Video Downloads**: Download high-quality MP4 videos from YouTube
- 🎵 **Audio Downloads**: Extract audio as MP3 files
- 📁 **Smart Organization**: Files saved to `YYYY-MM-DD-<video-title-preview>/` directories
- 📱 **Clean Interface**: Simple, responsive web interface built with React
- 📋 **Download Management**: View all downloaded files organized by date
- ⚡ **Real-time Updates**: Live download status and file listing

## 🛠️ Prerequisites

- **Python 3.8 or higher**
- **pip** (Python package installer)

### System Dependencies

**FFmpeg** is required for yt-dlp to process video/audio files:

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

### 1. Navigate to Project Directory
```bash
cd yt-downloader
```

### 2. Start the Application

**Option A: Use the startup script (recommended)**
```bash
# macOS/Linux
./start.sh

# Windows
start.bat
```

**Option B: Manual start**
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Start server
python app.py
```

The server will start on `http://localhost:8080` and display the URL.

### 3. Start Downloading!

1. Open the URL in your browser
2. Paste any public YouTube URL
3. Click "📹 Download Video" or "🎵 Download Audio"
4. Files are saved to `downloads/YYYY-MM-DD-<title>/` directories

## 📖 How It Works

1. **URL Processing**: Validates YouTube URLs
2. **Video Info**: Extracts video title and metadata using yt-dlp
3. **Directory Creation**: Creates dated directories with title previews
4. **Download**: Downloads video/audio in requested format
5. **Organization**: Files saved with original titles in organized folders

## 📁 File Organization

Downloads are automatically organized into directories with this format:
```
downloads/
├── 2025-08-25-How to Code/
│   └── How to Code in Python - Complete Tutorial.mp4
├── 2025-08-25-Music Vide/
│   └── Amazing Music Video 2025.mp3
└── 2025-08-24-Tutorial/
    └── JavaScript Tutorial for Beginners.mp4
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8080 |
| `FLASK_ENV` | Flask environment | `development` |

Example:
```bash
PORT=8080 python app.py
```

## 🐛 Troubleshooting

### Common Issues

**❌ "yt-dlp not found"**
```bash
pip install yt-dlp
```

**❌ "YouTube blocked the download (Error 403)"**
- Video may be private, restricted, or geo-blocked
- Try a different video
- Wait a few minutes and retry

**❌ "FFmpeg not found"**
- Install FFmpeg using the system-specific instructions above
- Restart your terminal after installation

**❌ "Connection refused" / Server won't start**
- Check if the port is already in use
- Try setting a different port: `PORT=8081 python app.py`
- Ensure you're in the project directory

## 🏗️ Development

### Project Structure
```
yt-downloader/
├── backend/
│   ├── app.py              # Flask server
│   └── requirements.txt    # Python dependencies
├── frontend/
│   └── index.html         # React frontend
├── downloads/             # Created automatically
├── start.sh               # macOS/Linux startup script  
├── start.bat              # Windows startup script
└── README.md
```

### API Endpoints

- `GET /` - Serve frontend application
- `POST /api/download` - Download video/audio from YouTube URL
- `GET /api/downloads` - List all downloaded files
- `GET /health` - Health check endpoint

## 🔒 Privacy & Storage

- **Local Processing** - runs entirely on your machine
- **No Data Storage** - no URLs or metadata stored on server
- **Temporary Files** - automatically cleaned up after processing
- **Local Downloads** - all files saved to your local `downloads/` directory

## 📄 License

This project is for educational and personal use. Please respect:
- YouTube's Terms of Service
- Content creators' rights
- Only download content you have permission to use

## 🤝 Contributing

This is a personal tool, but suggestions and improvements are welcome!

---

**Made with ❤️ for content archiving and offline viewing**