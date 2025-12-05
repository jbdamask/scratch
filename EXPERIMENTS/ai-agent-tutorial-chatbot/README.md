# AI Agent Tutorial Chatbot

An interactive web application that teaches you how AI chatbots work by showing you exactly what happens behind the scenes. Chat with an AI assistant while watching real-time explanations of API calls, tool usage, and the agentic loop pattern.

## Features

- **Interactive Chatbot** - Chat with Claude using the Anthropic API
- **Live Tutorial Panel** - See step-by-step explanations of every API call
- **SDK and Custom Tools** - See how to give the agent access to tools
- **Q&A on Each Step** - Ask questions about any tutorial step with full code context

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser                            │
├─────────────────────────┬───────────────────────────────────┤
│    Chat Panel (40%)     │       Tutorial Panel (60%)        │
│                         │                                   │
│  - User messages        │  - Step-by-step explanations      │
│  - AI responses         │  - Code snippets                  │
│  - Markdown rendered    │  - Request/Response data          │
│                         │  - Q&A input per step             │
└─────────────────────────┴───────────────────────────────────┘
              │                         │
              └─────────┬───────────────┘
                        │ WebSocket (Socket.IO)
                        ▼
              ┌─────────────────────┐
              │    Flask Server     │
              │                     │
              │  - Session mgmt     │
              │  - Agentic loop     │
              │  - Tool execution   │
              │  - Tutorial events  │
              └─────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │   Anthropic API     │
              │                     │
              │  - Claude Sonnet    │
              │  - Web Search Tool  │
              │  - Custom Tools     │
              └─────────────────────┘
```

## Key Concepts Demonstrated

1. **Conversation Context** - How the messages array maintains chat history
2. **The Agentic Loop** - Repeatedly calling the API until `stop_reason="end_turn"`
3. **Tool Use** - Custom tools vs. built-in server tools (web search)
4. **WebSocket Communication** - Real-time updates using Socket.IO

## Setup

### Prerequisites

- Python 3.10+
- An Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd 2025-12-04-showmehow
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your Anthropic API key
   ```

   Or set it as an environment variable:
   ```bash
   export ANTHROPIC_API_KEY=your-api-key-here
   ```

### Running the App

```bash
python app.py
```

Open http://localhost:5001 in your browser.

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes |

### .env File

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

1. **Send a message** in the left panel chat box
2. **Watch the tutorial** panel on the right show each step:
   - Message received
   - API preparation
   - API calls (with iteration count)
   - Tool invocations (if any)
   - Final response
3. **Click any step** to expand it and see:
   - Concept explanation
   - Actual code being executed
   - Request/Response data
4. **Ask questions** using the input box in each expanded step

### Sample Prompts to Try

- "What time is it?" - Demonstrates custom tool use
- "What's the weather in Paris?" - Demonstrates web search
- "Calculate 15 * 7 + 23" - Demonstrates the calculate tool
- "What's the latest AI news?" - Demonstrates web search with multiple results

## Project Structure

```
.
├── app.py              # Flask server with Anthropic API integration
├── templates/
│   └── index.html      # Frontend with chat and tutorial panels
├── requirements.txt    # Python dependencies
├── .env               # API key configuration (create this)
└── README.md          # This file
```

## Technical Details

### Web Search Tool

The app uses Claude's built-in web search tool:

```python
WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5
}
```

Unlike custom tools, web search is executed server-side by Anthropic and returns with `stop_reason="end_turn"` instead of `"tool_use"`.

### Custom Tools

Two custom tools are implemented:

- **get_current_time** - Returns current time in ISO, human-readable, or Unix format
- **calculate** - Safely evaluates mathematical expressions

### Tutorial Q&A Context

The tutorial Q&A chatbot has access to:
- Full `app.py` source code
- Current conversation history
- Step-specific context (code snippets, request/response data)

This allows detailed questions like "Show me the exact function that handles tool execution."

## License

MIT
