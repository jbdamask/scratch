# PDF Paragraph Summarizer

A web application that uploads PDFs, extracts paragraphs, and uses local Ollama AI (llama3.2:3b) to summarize each paragraph into a single sentence. Features intelligent processing with user-controllable stop functionality and runs completely locally for privacy.

## Features

- **PDF Processing**: Upload PDF files and automatically extract paragraphs using intelligent text splitting
- **Local AI Summarization**: Summarize each paragraph using Ollama's llama3.2:3b model (runs locally)
- **Privacy First**: All processing happens locally - no data sent to external APIs
- **Stop Control**: Stop processing at any time with immediate cleanup of resources
- **Clean UI**: American Heartland themed interface with intuitive design
- **Export Options**: Copy results as markdown or save as .md file
- **Auto-Discovery**: Automatically finds available backend ports (5000-5009)
- **Error Handling**: Comprehensive error handling with connection checks

## Setup

### Prerequisites: Install Ollama

**For Mac M1/M2/M3:**

1. Install Ollama using Homebrew:
   ```bash
   brew install ollama
   ```

2. Start the Ollama server:
   ```bash
   ollama serve
   ```

3. Download the llama3.2:3b model (first time only):
   ```bash
   ollama run llama3.2:3b "Summarize this: Ollama provides a local API for models."
   ```

   This will download the model weights (~2GB) and test the installation. You should see a summary response.

4. Keep the Ollama server running in the background for the application to work.

**Alternative Installation:**
- Download from [ollama.com](https://ollama.com) and follow the installation instructions
- Make sure the model is downloaded: `ollama pull llama3.2:3b`

### Backend (Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. **Optional**: Create a `.env` file for configuration (not required for basic setup):
   ```bash
   # Optional: customize Ollama settings
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2:3b
   ```

5. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. **First**: Make sure Ollama is running (`ollama serve`)
2. Start both backend and frontend servers
3. Open the frontend in your browser (typically http://localhost:5173)
4. Upload a PDF file using the file picker
5. Click "Process PDF" to start processing
6. **Optional**: Click "Stop" button to halt processing at any time
7. View the summarized paragraphs with original text toggles
8. Copy results as markdown or save as .md file
9. Use "Reset" button to clear results and start over

**Note**: The first request may take a moment as Ollama loads the model into memory.

## Processing Details

### Intelligent Paragraph Extraction
- Multiple text splitting strategies for different PDF formats
- Filters out short fragments and headers
- Groups sentences into meaningful paragraphs when needed

### Local AI Processing
- **Sequential Processing**: Processes paragraphs one at a time using local Ollama API
- **Memory Efficient**: Uses streaming to avoid loading large responses into memory
- **Stop Control**: Can interrupt processing between paragraphs with immediate feedback
- **Privacy**: All processing happens locally - no external API calls

### Stop Functionality
- Stops processing between paragraphs
- Provides immediate user feedback
- Maintains partial results if stopped mid-process

## API Endpoints

- `POST /upload` - Upload and process PDF file
- `POST /stop` - Stop current processing
- `GET /status` - Get current processing status  
- `GET /health` - Health check endpoint

## Architecture

- **Backend**: Python 3.12 + Flask with Ollama integration
- **Frontend**: React + Vite with American Heartland theme  
- **AI Model**: Ollama llama3.2:3b (local inference)
- **Processing**: Sequential paragraph processing with stop controls
- **State Management**: Global processing state tracking
- **Privacy**: 100% local processing - no external API calls

## Troubleshooting

**"Could not connect to Ollama" error:**
- Make sure Ollama is installed: `brew install ollama`
- Start the Ollama server: `ollama serve`
- Test the connection: `curl http://localhost:11434/api/tags`

**"Model not found" error:**
- Download the model: `ollama pull llama3.2:3b`
- Verify it's available: `ollama list`

**Slow processing:**
- First request loads model into memory (takes ~10-30 seconds)
- Subsequent requests are much faster
- Consider using a smaller model for faster processing: `llama3.2:1b`