# Audio Transcriber

A single-page HTML application that transcribes audio files using OpenAI's Whisper API. Perfect for transcribing interviews, meetings, podcasts, and other audio content.

## Features

- **Drag & Drop Upload** - Simply drag audio files into the browser
- **File Picker** - Traditional file selection interface
- **Large File Support** - Automatically chunks files over 25MB for processing
- **Multiple Audio Formats** - Supports MP3, WAV, M4A, FLAC, and more
- **Visual Progress Tracking** - Step-by-step progress indicator with time estimates
- **Copy & Download** - Copy transcription to clipboard or download as text file
- **API Key Management** - Securely stores OpenAI API key in localStorage
- **Offline Ready** - Self-contained HTML file, no external dependencies

## Quick Start

1. **Get OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Make sure you have credits available

2. **Open the Tool**
   - Open `audio-transcriber.html` in any modern web browser
   - Chrome, Firefox, Safari, and Edge are all supported

3. **Add API Key**
   - Enter your OpenAI API key when prompted
   - It's stored securely in your browser's localStorage

4. **Upload & Transcribe**
   - Drag an audio file onto the page, or use "Choose File"
   - Click "Transcribe" and wait for processing
   - Copy or download your results

## Supported File Types

- **Audio**: MP3, WAV, FLAC, M4A, AAC, OGG
- **Video**: MP4, AVI, MOV, MKV (audio track will be extracted)
- **Size Limit**: 25MB per file (larger files are automatically chunked)

## How It Works

### Small Files (< 25MB)
1. **Preparing** - File validation and setup
2. **Transcribing** - Direct upload to OpenAI Whisper API
3. **Complete** - Results ready for copy/download

### Large Files (> 25MB)
1. **Preparing** - File validation and setup
2. **Analyzing Audio** - Extract audio properties
3. **Creating Chunks** - Split into 5-minute segments
4. **Transcribing** - Process each chunk sequentially
5. **Complete** - Combine all chunks into final transcription

## Technical Details

- **Frontend**: Vanilla JavaScript with React (CDN)
- **Audio Processing**: Web Audio API for chunking
- **API**: OpenAI Whisper-1 model
- **Storage**: localStorage for API key persistence
- **Dependencies**: None (fully self-contained)

## Privacy & Security

- **API Key**: Stored locally in your browser only
- **Files**: Processed directly by OpenAI, not stored on any intermediate server
- **No Tracking**: No analytics or external requests (except to OpenAI)
- **Local Processing**: Audio chunking happens in your browser

## Troubleshooting

### "Invalid API Key"
- Verify your OpenAI API key is correct
- Check that you have available credits
- Try regenerating your API key

### "File Too Large" (Old Error)
- This tool automatically handles large files
- Files are chunked into 5-minute segments
- Maximum practical limit is around 2GB

### "Transcription Failed"
- Check your internet connection
- Verify the file is a valid audio/video format
- Try a shorter audio file to test your setup

### Poor Quality Results
- Use higher quality audio files when possible
- Ensure clear speech with minimal background noise
- Consider preprocessing audio with noise reduction

## Limitations

- **Internet Required**: Needs connection to OpenAI API
- **OpenAI Credits**: Costs apply based on audio duration
- **Browser Memory**: Very large files may use significant RAM during chunking
- **URL Support**: This version doesn't support direct URL input (see MCP server for URL support)

## API Costs

OpenAI Whisper API pricing (as of 2024):
- **$0.006 per minute** of audio transcribed
- Example: 1 hour of audio ≈ $0.36
- Chunked files are processed as separate requests but billed normally

## Browser Requirements

- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript**: Must be enabled
- **Features Used**: File API, Web Audio API, Fetch API, localStorage

## Files

- `audio-transcriber.html` - Complete application (single file)
- `README.md` - This documentation

---

**Need URL Support?** Check out the [Audio Transcription MCP Server](./MCP-SERVER-GUIDE.md) for YouTube and URL processing capabilities.