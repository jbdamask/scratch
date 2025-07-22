# Read It To Me

A React application that converts uploaded documents (PDF, TXT, HTML) into speech using OpenAI's text-to-speech API.

## Features

- Upload PDF, TXT, and HTML files
- Extract text from uploaded documents
- Convert text to speech using OpenAI's TTS API
- Play audio with custom controls
- Clean, responsive interface

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example` and add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Click "Choose File to Read" to upload a document
2. The app will extract text from the document
3. Text is automatically converted to speech using OpenAI's TTS
4. Use the audio player controls to play/pause and seek through the audio

## Supported File Types

- **PDF**: Uses PDF.js for client-side text extraction
- **TXT**: Direct text file reading
- **HTML**: Extracts text content from HTML documents

## API Requirements

You'll need an OpenAI API key with access to the text-to-speech API. The app uses the `tts-1` model with the `alloy` voice by default.