# Qwen3-VL Backend

Local backend server using Ollama to serve vision-language model capabilities.

## Prerequisites

- Python 3.8+
- Ollama

## Setup

### 1. Install Ollama

```bash
brew install ollama
```

### 2. Pull the Vision Model

```bash
ollama pull llava
```

### 3. Start Ollama

```bash
ollama serve
```

This runs the Ollama server on port 11434.

### 4. Set Up Python Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5. Run the Backend Server

```bash
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.

## Running the Full Application

Both the backend and frontend must be running for the app to work:

1. **Terminal 1 - Ollama:** `ollama serve`
2. **Terminal 2 - Backend:** `cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000`
3. **Terminal 3 - Frontend:** `npm run dev` (in project root)

The frontend dev server proxies `/api` requests to the backend automatically.

## API Endpoints

### POST /api/generate

Generate a response from the vision model.

**Request Body:**
```json
{
  "prompt": "Describe this image",
  "image": {
    "type": "base64",
    "data": "data:image/png;base64,..."
  },
  "conversationHistory": []
}
```

**Response:**
```json
{
  "id": "uuid",
  "content": "The image shows...",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```
