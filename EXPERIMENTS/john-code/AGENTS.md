# AGENTS.md

This file provides guidance to John Code (and other AI coding agents) when working with code in this repository.

## Project Overview

John Code is a CLI tool that provides an AI coding assistant interface, inspired by Claude Code. It uses the Anthropic API to provide an interactive ReAct-style agent that can execute tools like bash commands, file operations, web searches, and more.

## Build and Development Commands

### Building
```bash
go build -o john ./cmd/john
```

### Running
Requires `ANTHROPIC_API_KEY` environment variable:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
./john
```

### Testing
```bash
# Run all tests
go test ./...

# Run tests with verbose output
go test -v ./...

# Run specific package tests
go test -v ./pkg/tools
```

### Prerequisites
- Go 1.24+
- `ripgrep` installed (for the Grep tool)
- Anthropic API key

## Architecture

### Core Components

**Agent Loop (pkg/agent/agent.go)**
- The main `Agent` struct orchestrates the ReAct loop
- `Run()` provides the interactive CLI loop reading user input
- `RunTask()` provides non-interactive execution for sub-agents (used by Task tool)
- `processTurn()` handles the LLM request-response cycle with tool execution
- Maximum 10 tool interaction turns per user message to prevent infinite loops
- Automatically injects system reminders (todo status, AGENTS.md/CLAUDE.md files) into user messages

**Tool System (pkg/tools/)**
- All tools implement the `Tool` interface with `Definition()` and `Execute()` methods
- `Registry` manages tool registration and lookup
- Each tool defines its JSON schema for the LLM API
- Tools are stateless except for BashTool (maintains CWD) and TodoWriteTool (maintains state)

**LLM Client (pkg/llm/)**
- `Client` interface abstracts LLM providers
- `AnthropicClient` implements streaming API calls to Anthropic
- `MockClient` for testing without API calls
- Message history is maintained in `[]llm.Message` with roles: user, assistant, system, tool

**UI (pkg/ui/)**
- Uses Charm libraries (bubbletea, bubbles, lipgloss) for TUI
- `Prompt()` provides input with image paste support (Ctrl+V)
- `DisplayStream()` shows streaming LLM responses
- `PickCommand()` displays slash command picker

**Session Management (pkg/history/)**
- Logs all messages to `~/.john_sessions/<session_id>/`
- Each turn logged as separate JSON file with timestamp

**Slash Commands (pkg/commands/)**
- Commands implement `Command` interface
- `/init` command triggers AGENTS.md generation/analysis (this file!)
- Typing `/` alone shows interactive command picker UI
- Commands inject their message and instructions into the agent's prompt
- Currently implemented: `/init` only (more commands planned per TODO.md)

### Key Design Patterns

**Recursive Agent Pattern**
- The Task tool creates new Agent instances to handle sub-tasks
- Sub-agents share the same config and UI but have fresh history
- Enables complex multi-step operations without polluting main context

**Tool Call Protocol**
- Agent sends message history + tool definitions to LLM
- LLM responds with text and/or tool calls
- Agent executes tools and appends results as tool messages
- Loop continues until LLM responds without tool calls

**Streaming Architecture**
- LLM responses stream through Go channels
- UI consumes stream in real-time via bubbletea
- Final response assembled and added to history after stream completes

### Important Implementation Details

**File Operations**
- Read tool adds line numbers to output (format: `%6d\t%s\n`)
- Edit tool must strip line numbers and requires exact string match
- Edit fails if old_string appears multiple times (uniqueness constraint)
- Write tool used for new files, Edit preferred for modifications

**Bash Tool CWD Handling**
- BashTool maintains internal `cwd` state
- Explicit `cd` commands update the internal state
- All bash commands executed with `cmd.Dir = t.cwd`

**Background Process Management**
- `GlobalShellManager` (pkg/tools/shell_manager.go) tracks background processes
- BashOutput tool retrieves incremental output from background shells
- KillShell tool terminates background processes by ID

**Image Support**
- Ctrl+V in input prompt detects clipboard images
- Saves to `/tmp/john_clipboard_*.png`
- Injects `[Image: path]` tag into message
- Agent parses tags and adds to Message.Images array

## Testing Conventions

- Test files use `_test.go` suffix
- Mock implementations provided where needed
- Most tools have basic unit tests in pkg/tools/

## Common Patterns for Tool Development

When adding a new tool:
1. Create struct implementing `Tool` interface
2. Define JSON schema in `Definition()` with clear descriptions
3. Implement `Execute()` with proper error handling
4. Register in `agent.New()` (pkg/agent/agent.go:29-90)
5. Add test coverage in pkg/tools/*_test.go

## Project Structure Note

- `cmd/john/` - Main binary entry point
- `cmd/genlogo/` - Utility for generating banner logo
- `pkg/agent/` - Core agent logic and system prompt
- `pkg/tools/` - All tool implementations
- `pkg/llm/` - LLM client abstraction
- `pkg/ui/` - Terminal UI components
- `pkg/config/` - Configuration loading
- `pkg/history/` - Session persistence
- `pkg/commands/` - Slash command implementations
- `index.html`, `script.js`, `styles.css`, `breakout.html` - Web demos (not part of CLI)
