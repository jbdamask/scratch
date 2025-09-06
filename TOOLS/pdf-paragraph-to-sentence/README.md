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

2. Download the llama3.2:3b model (first time only):
   ```bash
   ollama pull llama3.2:3b
   ```

   This will download the model weights (~2GB).

3. Test the installation:
   ```bash
   ollama run llama3.2:3b "Summarize this: Ollama provides a local API for models."
   ```

   You should see a summary response if everything is working.

**Alternative Installation:**
- Download from [ollama.com](https://ollama.com) and follow the installation instructions
- Make sure the model is downloaded: `ollama pull llama3.2:3b`

**Note**: The backend will automatically start multiple Ollama instances, so you don't need to run `ollama serve` manually.

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

1. Start the backend server (it will automatically start multiple Ollama instances)
2. Start the frontend server
3. Open the frontend in your browser (typically http://localhost:5173)
4. Upload a PDF file using the file picker
5. Click "Process PDF" to start processing
6. **Optional**: Click "Stop" button to halt processing at any time
7. View the summarized paragraphs with original text toggles
8. Copy results as markdown or save as .md file
9. Use "Reset" button to clear results and start over

**Notes**: 
- The backend automatically starts 4 Ollama instances for parallel processing
- The first request may take a moment as Ollama loads the model into memory on each instance
- Processing should be significantly faster due to true parallelization

## Processing Details

### Intelligent Paragraph Extraction
- Multiple text splitting strategies for different PDF formats
- Filters out short fragments and headers
- Groups sentences into meaningful paragraphs when needed

### Local AI Processing
- **Parallel Processing**: Automatically spawns 4 Ollama instances for true parallelization
- **Load Balancing**: Distributes paragraphs across instances using round-robin
- **Stop Control**: Can interrupt processing and cleanly shut down all instances
- **Privacy**: All processing happens locally - no external API calls
- **Auto-Management**: Handles Ollama instance startup, monitoring, and cleanup

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

- **Backend**: Python 3.12 + Flask with multi-instance Ollama integration
- **Frontend**: React + Vite with American Heartland theme  
- **AI Model**: Ollama llama3.2:3b (local inference, 4 parallel instances)
- **Processing**: True parallel processing across multiple Ollama instances
- **Load Balancing**: Round-robin distribution across instances (ports 11434-11437)
- **State Management**: Global processing state tracking with instance management
- **Privacy**: 100% local processing - no external API calls

## Troubleshooting

**Backend fails to start:**
- Make sure Ollama is installed: `brew install ollama`
- Ensure the model is downloaded: `ollama pull llama3.2:3b`
- Check that ports 11434-11437 are available
- Try running: `ollama --version` to verify installation

**"Failed to start Ollama instances" error:**
- Check if any Ollama processes are already running: `ps aux | grep ollama`
- Kill existing processes if needed: `pkill ollama`
- Restart the backend

**Slow initial processing:**
- First request loads model into memory on all 4 instances (may take 30-60 seconds)
- Subsequent processing should be much faster due to parallelization
- Consider using a smaller model for faster startup: `llama3.2:1b`

**Performance issues:**
- Check system resources (CPU/Memory usage)
- Reduce OLLAMA_INSTANCES in the backend code if system is overloaded
- Monitor logs to ensure all instances are healthy