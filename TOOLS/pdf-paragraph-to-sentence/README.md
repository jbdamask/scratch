# PDF Paragraph Summarizer

A web application that uploads PDFs, extracts paragraphs, and uses OpenAI's GPT-4o-mini to summarize each paragraph into a single sentence. Features intelligent processing with batch API optimization and user-controllable stop functionality.

## Features

- **PDF Processing**: Upload PDF files and automatically extract paragraphs using intelligent text splitting
- **AI Summarization**: Summarize each paragraph using OpenAI's GPT-4o-mini model
- **Batch Processing**: Optimized with OpenAI Batch API for efficient processing of multiple paragraphs
- **Stop Control**: Stop processing at any time with immediate cleanup of resources
- **Clean UI**: American Heartland themed interface with intuitive design
- **Export Options**: Copy results as markdown or save as .md file
- **Auto-Discovery**: Automatically finds available backend ports (5000-5009)
- **Error Handling**: Comprehensive error handling with fallback mechanisms

## Setup

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

4. Set up environment variables:
   - Create a `.env` file in the backend directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
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

1. Start both backend and frontend servers
2. Open the frontend in your browser (typically http://localhost:5173)
3. Upload a PDF file using the file picker
4. Click "Process PDF" to start processing
5. **Optional**: Click "Stop" button to halt processing at any time
6. View the summarized paragraphs with original text toggles
7. Copy results as markdown or save as .md file
8. Use "Reset" button to clear results and start over

## Processing Details

### Intelligent Paragraph Extraction
- Multiple text splitting strategies for different PDF formats
- Filters out short fragments and headers
- Groups sentences into meaningful paragraphs when needed

### Optimized API Processing
- **Batch Mode**: Uses OpenAI Batch API for efficient bulk processing (primary method)
- **Individual Mode**: Falls back to individual API calls when batch processing fails or times out
- **Stop Control**: Can interrupt processing at any stage with proper resource cleanup

### Stop Functionality
- Cancels OpenAI batch jobs in progress
- Cleans up uploaded files and temporary resources
- Stops individual API calls between paragraphs
- Provides immediate user feedback

## API Endpoints

- `POST /upload` - Upload and process PDF file
- `POST /stop` - Stop current processing
- `GET /status` - Get current processing status  
- `GET /health` - Health check endpoint

## Architecture

- **Backend**: Python 3.12 + Flask with OpenAI integration
- **Frontend**: React + Vite with American Heartland theme
- **Processing**: Batch API optimization with individual fallback
- **State Management**: Global processing state tracking