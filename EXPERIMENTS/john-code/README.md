# John Code

```
⠀⠀⠀⠀⠀⠀⢀⣤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⢤⣤⣀⣀⡀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⡼⠋⠀⣀⠄⡂⠍⣀⣒⣒⠂⠀⠬⠤⠤⠬⠍⠉⠝⠲⣄⡀⠀⠀
⠀⠀⠀⢀⡾⠁⠀⠊⢔⠕⠈⣀⣀⡀⠈⠆⠀⠀⠀⡍⠁⠀⠁⢂⠀⠈⣷⠀⠀
⠀⠀⣠⣾⠥⠀⠀⣠⢠⣞⣿⣿⣿⣉⠳⣄⠀⠀⣀⣤⣶⣶⣶⡄⠀⠀⣘⢦⡀
⢀⡞⡍⣠⠞⢋⡛⠶⠤⣤⠴⠚⠀⠈⠙⠁⠀⠀⢹⡏⠁⠀⣀⣠⠤⢤⡕⠱⣷
⠘⡇⠇⣯⠤⢾⡙⠲⢤⣀⡀⠤⠀⢲⡖⣂⣀⠀⠀⢙⣶⣄⠈⠉⣸⡄⠠⣠⡿
⠀⠹⣜⡪⠀⠈⢷⣦⣬⣏⠉⠛⠲⣮⣧⣁⣀⣀⠶⠞⢁⣀⣨⢶⢿⣧⠉⡼⠁
⠀⠀⠈⢷⡀⠀⠀⠳⣌⡟⠻⠷⣶⣧⣀⣀⣹⣉⣉⣿⣉⣉⣇⣼⣾⣿⠀⡇⠀
⠀⠀⠀⠈⢳⡄⠀⠀⠘⠳⣄⡀⡼⠈⠉⠛⡿⠿⠿⡿⠿⣿⢿⣿⣿⡇⠀⡇⠀
⠀⠀⠀⠀⠀⠙⢦⣕⠠⣒⠌⡙⠓⠶⠤⣤⣧⣀⣸⣇⣴⣧⠾⠾⠋⠀⠀⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠙⠶⣭⣒⠩⠖⢠⣤⠄⠀⠀⠀⠀⠀⠠⠔⠁⡰⠀⣧⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠲⢤⣀⣀⠉⠉⠀⠀⠀⠀⠀⠁⠀⣠⠏⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠛⠒⠲⠶⠤⠴⠒⠚⠁⠀⠀
```

An AI coding assistant CLI, reverse-engineered from Claude Code.

## Why This Project Exists

This project started as an experiment: **How much of Claude Code could I recreate using only its system prompts, tool definitions, and API logs captured via a reverse proxy?**

By routing Claude Code's traffic through a proxy, I captured the exact prompts, tool schemas, and message flows that make it work. John Code is the result—a functional coding agent built by studying and replicating those patterns.

This is also a learning exercise to understand how modern coding agents are built:
- How tool-use loops work (the ReAct pattern)
- How context is managed across turns
- How system prompts shape agent behavior
- How MCP (Model Context Protocol) enables extensibility

## Features

- **Interactive CLI** with streaming responses
- **Tool use**: Bash, file read/write/edit, glob, grep, web search, and more
- **Slash commands**: `/init` to generate AGENTS.md, `/mcp` to manage servers
- **MCP support**: Connect to external tools via Model Context Protocol
- **Session persistence**: Conversation history logged to `~/.john_sessions/`
- **Todo tracking**: Built-in task management for complex operations

## Prerequisites

- Go 1.20+
- `ripgrep` installed (for the Grep tool)
- Anthropic API key

## Installation

```bash
git clone https://github.com/jbdamask/john-code.git
cd john-code
go build -o john ./cmd/john
```

## Usage

```bash
export ANTHROPIC_API_KEY="your-api-key"
./john
```

### Commands

| Command | Description |
|---------|-------------|
| `/init` | Analyze codebase and generate AGENTS.md |
| `/mcp` | View MCP server status |
| `exit` | Quit the session |

### MCP Server Management

```bash
# Add an MCP server
./john mcp add playwright npx @anthropic-ai/mcp-playwright

# List configured servers
./john mcp list

# Remove a server
./john mcp remove playwright
```

## How It Works

John Code implements a ReAct-style agent loop:

1. User sends a message
2. LLM responds with text and/or tool calls
3. Tools are executed, results appended to context
4. Loop continues until LLM responds without tool calls

The system prompt and tool definitions were derived from captured Claude Code API traffic, then adapted for this implementation.

## Project Structure

```
cmd/john/          # CLI entrypoint
pkg/agent/         # Agent loop and system prompt
pkg/commands/      # Slash commands (/init, /mcp)
pkg/llm/           # Anthropic API client
pkg/mcp/           # MCP client and server management
pkg/tools/         # Tool implementations
pkg/ui/            # Terminal UI (bubbletea)
pkg/history/       # Session persistence
```

## License

MIT
