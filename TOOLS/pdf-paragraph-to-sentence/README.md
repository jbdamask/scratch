# PDF Paragraph Summarizer

A simple webapp that uploads PDFs, extracts paragraphs, and uses GPT-4o-mini to summarize each paragraph into a single sentence.

## Features

- Upload PDF files
- Extract individual paragraphs from PDF
- Summarize each paragraph using OpenAI's GPT-4o-mini
- Display results in a clean UI
- Copy results as markdown
- Save results as markdown file

## Setup

### Backend (Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   venv  # using your venv alias
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Copy `.env` and add your OpenAI API key:
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
3. Upload a PDF file
4. Wait for processing
5. View the summarized paragraphs
6. Copy or save the results as markdown

## API Endpoints

- `POST /upload` - Upload and process PDF file
- `GET /health` - Health check endpoint