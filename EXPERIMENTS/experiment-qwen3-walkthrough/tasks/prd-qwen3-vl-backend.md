# PRD: Qwen3-VL-8B-Instruct Backend Server

## Introduction

Build a local backend server that hosts the Qwen3-VL-8B-Instruct vision-language model and exposes it via a REST API. This backend powers the existing React/TypeScript frontend showcase application, enabling users to submit text prompts with images and receive AI-generated responses.

The backend uses Ollama for simplified model deployment on Apple Silicon Macs, providing a quick MVP that "just works" for local development and demonstration.

## Goals

- Serve the Qwen3-VL-8B-Instruct model locally via Ollama
- Implement the `/api/generate` endpoint matching the frontend's expected contract
- Handle both base64-encoded images and image URLs
- Support multi-turn conversations with context history
- Return token usage statistics with each response
- Run efficiently on Apple Silicon (M1/M2/M3) with unified memory

## User Stories

### US-001: Install and configure Ollama with Qwen3-VL model
**Description:** As a developer, I need Ollama installed with the Qwen3-VL model so the backend can generate responses.

**Acceptance Criteria:**
- [ ] Documentation for installing Ollama on macOS
- [ ] Instructions for pulling/running the Qwen3-VL model
- [ ] Verify model responds to a test prompt via Ollama CLI

### US-002: Create backend server with /api/generate endpoint
**Description:** As a frontend application, I need a POST endpoint at `/api/generate` so I can send prompts and receive completions.

**Acceptance Criteria:**
- [ ] Server starts on a configurable port (default 8000)
- [ ] POST `/api/generate` accepts JSON body with `prompt`, `image`, and `conversationHistory` fields
- [ ] Returns JSON response with `id`, `content`, and `usage` fields
- [ ] Server logs incoming requests for debugging

### US-003: Process base64-encoded image input
**Description:** As a user uploading an image file, I need the backend to decode and process base64 image data so the model can analyze it.

**Acceptance Criteria:**
- [ ] Accepts `image.type: "file"` with `image.data` containing base64 data URL
- [ ] Extracts image bytes from data URL format (`data:image/png;base64,XXX`)
- [ ] Passes decoded image to Ollama for vision analysis
- [ ] Supports JPEG, PNG, GIF, and WebP formats

### US-004: Process image URL input
**Description:** As a user providing an image URL, I need the backend to fetch and process the remote image so the model can analyze it.

**Acceptance Criteria:**
- [ ] Accepts `image.type: "url"` with `image.data` containing the URL string
- [ ] Fetches image from URL with reasonable timeout (10s)
- [ ] Handles common HTTP errors gracefully (404, timeout, etc.)
- [ ] Passes fetched image to Ollama for vision analysis

### US-005: Handle conversation history for multi-turn context
**Description:** As a user having a conversation, I need the backend to include previous exchanges so the model understands context.

**Acceptance Criteria:**
- [ ] Accepts `conversationHistory` array in request body
- [ ] Formats history into Ollama's expected message format
- [ ] Model responses reflect awareness of previous conversation turns
- [ ] Works correctly with empty history (first message in conversation)

### US-006: Return token usage statistics
**Description:** As a frontend application, I need token usage data so I can display it to users.

**Acceptance Criteria:**
- [ ] Response includes `usage.prompt_tokens` count
- [ ] Response includes `usage.completion_tokens` count
- [ ] Response includes `usage.total_tokens` count
- [ ] Values are integers (estimate if Ollama doesn't provide exact counts)

### US-007: Handle errors with proper response format
**Description:** As a frontend application, I need structured error responses so I can display meaningful messages to users.

**Acceptance Criteria:**
- [ ] Errors return JSON: `{ "error": { "message": "string", "code": "string" } }`
- [ ] Returns 400 for invalid request body (missing prompt, malformed JSON)
- [ ] Returns 500 for model/Ollama errors with descriptive message
- [ ] Returns 503 if Ollama is not running or model not loaded

### US-008: Proxy setup for frontend development
**Description:** As a developer, I need the frontend dev server to proxy API requests to the backend so everything works together.

**Acceptance Criteria:**
- [ ] Vite proxy configuration added to forward `/api/*` to backend
- [ ] Frontend can call `/api/generate` without CORS issues
- [ ] Documentation for running frontend and backend together

## Functional Requirements

- FR-1: Implement POST `/api/generate` endpoint accepting JSON body
- FR-2: Parse `prompt` field (required, string, max 4000 characters)
- FR-3: Parse `image` field (optional, object with `type` and `data`)
- FR-4: Parse `conversationHistory` field (optional, array of message objects)
- FR-5: Decode base64 images from data URL format when `image.type === "file"`
- FR-6: Fetch remote images when `image.type === "url"`
- FR-7: Format request for Ollama API with text and image content
- FR-8: Include conversation history in Ollama request for context
- FR-9: Generate unique ID for each response (UUID v4)
- FR-10: Extract or estimate token usage from Ollama response
- FR-11: Return structured error responses for all failure cases

## Non-Goals

- No authentication or rate limiting (local development only)
- No persistent storage of conversations (frontend handles this)
- No streaming responses (batch completion only for MVP)
- No configurable model parameters (fixed defaults)
- No Docker containerization (runs directly on host)
- No production deployment considerations
- No support for multiple concurrent models

## Technical Considerations

### Stack
- **Runtime:** Python 3.11+ (good Ollama library support)
- **Framework:** FastAPI (async, fast, easy)
- **Model Server:** Ollama (running as separate process)
- **Target Platform:** macOS with Apple Silicon (M1/M2/M3)

### Ollama Model
- Model: `qwen3-vl` (or closest available multimodal Qwen model in Ollama)
- The model must support vision (image input) capabilities
- If exact model unavailable, document alternative (e.g., `llava`, `bakllava`)

### API Contract

**Request:**
```json
{
  "prompt": "Describe this image in detail",
  "image": {
    "type": "file",
    "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  },
  "conversationHistory": [
    {
      "role": "user",
      "content": "What do you see?",
      "imageUrl": "data:image/jpeg;base64,..."
    },
    {
      "role": "assistant",
      "content": "I see a cat sitting on a windowsill."
    }
  ]
}
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "The image shows a detailed scene of...",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 89,
    "total_tokens": 239
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": {
    "message": "Ollama is not running. Please start Ollama first.",
    "code": "SERVICE_UNAVAILABLE"
  }
}
```

### Project Structure
The backend is added to the existing frontend project:
```
experiment-qwen3-walkthrough/
├── backend/                  # NEW: Local Ollama backend
│   ├── main.py              # FastAPI app and /api/generate endpoint
│   ├── ollama_client.py     # Ollama API interaction
│   ├── image_processor.py   # Base64 decoding and URL fetching
│   ├── requirements.txt     # Python dependencies
│   └── README.md            # Backend setup instructions
├── api/                      # EXISTING: Vercel serverless (cloud option)
│   └── generate.ts          # Cloud API using Alibaba DashScope
├── src/                      # EXISTING: React frontend
├── vite.config.ts           # MODIFIED: Add proxy for local backend
└── ...
```

**Note:** The existing `api/generate.ts` is a Vercel serverless function for cloud deployment.
The new `backend/` directory provides local Ollama-based inference as an alternative.

## Success Metrics

- Backend starts without errors on Apple Silicon Mac
- Frontend submits prompt + image and receives valid response
- Multi-turn conversation maintains context
- Error states show meaningful messages in frontend
- Total setup time under 15 minutes (including Ollama install)

## Open Questions

- Which exact Ollama model tag supports Qwen3-VL vision capabilities? (Need to verify availability)
- Does Ollama provide token counts, or do we need to estimate?
- Should we add a health check endpoint (`GET /health`) for debugging?
