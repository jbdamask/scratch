# John Code Backlog

## Core Infrastructure
- [x] Initialize Go module and project structure
- [x] Implement LLM Client Interface (Mock implemented)
- [x] Implement Agent Loop (ReAct/Tool Use loop basic version)
- [x] Implement CLI UI (Input/Output)
- [x] Configuration Management (Loads ANTHROPIC_API_KEY)

## Tool Implementations
- [x] **Bash**: Execute shell commands
- [x] **Read**: Read file contents (with line numbers)
- [x] **Write**: Write file contents
- [x] **Edit**: String replacement in files
- [x] **Glob**: File pattern matching
- [x] **Grep**: Ripgrep wrapper
- [x] **TodoWrite**: Task management state
- [x] **WebSearch**: Search API integration (Brave Search)
- [x] **WebFetch**: URL fetching and parsing
- [x] **AskUserQuestion**: Interactive prompt
- [x] **BashOutput** & **KillShell**: Background process management
- [x] **Task**: Sub-agent delegation mechanism (Recursive agent)

## Advanced Features
- [x] **Real LLM Integration**: Anthropic API client
- [ ] Git Integration (status, diff, commit protocols)
- [ ] Slash Commands handling
- [ ] Context Management (managing token window, summarizing)
- [ ] "Oracle" or "Planner" mode integration

## UI/UX
- [ ] Rich text output (Markdown)
- [ ] Spinner/Progress indicators
- [ ] Interactive prompts (AskUserQuestion)
