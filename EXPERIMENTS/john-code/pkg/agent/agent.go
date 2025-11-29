package agent

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	"github.com/jbdamask/john-code/pkg/commands"
	"github.com/jbdamask/john-code/pkg/config"
	"github.com/jbdamask/john-code/pkg/history"
	"github.com/jbdamask/john-code/pkg/llm"
	"github.com/jbdamask/john-code/pkg/mcp"
	"github.com/jbdamask/john-code/pkg/tools"
	"github.com/jbdamask/john-code/pkg/ui"
)

type Agent struct {
	cfg          *config.Config
	ui           *ui.UI
	tools        *tools.Registry
	commands     *commands.Registry
	mcpManager   *mcp.Manager
	client       llm.Client
	currentModel string
	history      []llm.Message
	session      *history.SessionManager
}

func New(cfg *config.Config, ui *ui.UI) *Agent {
    registry := tools.NewRegistry()
    registry.Register(tools.NewBashTool())
    registry.Register(&tools.ReadTool{})
    registry.Register(&tools.WriteTool{})
    registry.Register(&tools.EditTool{})
    registry.Register(&tools.GlobTool{})
    registry.Register(tools.NewTodoWriteTool())
    registry.Register(&tools.GrepTool{})
    
    registry.Register(tools.NewWebSearchTool())
    registry.Register(tools.NewWebFetchTool())
    registry.Register(tools.NewAskUserQuestionTool(ui))
    registry.Register(&tools.NotebookEditTool{})
    registry.Register(&tools.BashOutputTool{})
    registry.Register(&tools.KillShellTool{})

    // Task Tool - Recursive Agent
    // We need to define the runner closure
    // Note: This creates a circular dependency concept if we try to use 'New' directly? 
    // No, we are inside 'New', so we can't use 'New' easily without infinite recursion if we aren't careful about compilation,
    // but runtime is fine.
    // Actually, we need to extract NewAgent logic or use a method on Agent.
    
    // For now, let's delay the runner creation or use a method.
    // But we need to register the tool NOW.
    
    // We can pass a placeholder and set it later? No, registry needs initialized tool.
    // We can make a closure that calls a package level function? No.
    
    // Let's solve this by passing the factory function to New? 
    // Or just creating the tool with a closure that refers to a function we define here.
    
    taskRunner := func(ctx context.Context, task string) (string, error) {
        // Create a new agent instance for the subtask
        // We need to use the same config and UI (maybe indented UI?)
        // For MVP, share UI.
        
        // We can't call New() here easily if it's in the same package but we are in New...
        // Go allows recursive calls.
        
        subAgent := New(cfg, ui)
        
        // Override history to start with the task
        subAgent.history = []llm.Message{
            {
                Role: llm.RoleSystem,
                Content: "You are a sub-agent working on a specific task: " + task,
            },
            {
                Role: llm.RoleUser,
                Content: "Please perform the task: " + task,
            },
        }
        
        // Run the agent loop until it finishes? 
        // Our current Agent.Run() is an interactive loop reading from Stdin.
        // We need a non-interactive Run mode (RunTask).
        
        return subAgent.RunTask(ctx)
    }
    
	registry.Register(tools.NewTaskTool(taskRunner))

	// Initialize MCP manager
	mcpManager := mcp.NewManager()

	// Create the agent first (client will be set after)
	agent := &Agent{
		cfg:          cfg,
		ui:           ui,
		tools:        registry,
		mcpManager:   mcpManager,
		currentModel: llm.DefaultModelID,
		session:      nil, // Will init in Run
		history: []llm.Message{
			{
				Role:    llm.RoleSystem,
				Content: SystemPrompt,
			},
		},
	}

	// Initialize the client for the default model
	agent.client = agent.createClientForModel(llm.DefaultModelID)

	// Initialize slash commands (model command needs reference to agent)
	cmdRegistry := commands.NewRegistry()
	cmdRegistry.Register(commands.NewInitCommand())
	cmdRegistry.Register(commands.NewMCPCommand(mcpManager))
	cmdRegistry.Register(commands.NewModelCommand(agent.currentModel, agent.switchModel))

	agent.commands = cmdRegistry

	return agent
}

// createClientForModel creates an LLM client for the specified model
func (a *Agent) createClientForModel(modelID string) llm.Client {
	model := llm.GetModelByID(modelID)
	if model == nil {
		// Fallback to mock if model not found
		return llm.NewMockClient()
	}

	switch model.Provider {
	case llm.ProviderAnthropic:
		apiKey := a.cfg.APIKey
		if apiKey == "" || apiKey == "dummy" {
			return llm.NewMockClient()
		}
		return llm.NewAnthropicClient(apiKey, a.cfg.BaseURL, model.APIModel)

	case llm.ProviderOpenAI:
		apiKey := os.Getenv("OPENAI_API_KEY")
		if apiKey == "" {
			a.ui.Print("Warning: OPENAI_API_KEY not set, using mock client")
			return llm.NewMockClient()
		}
		return llm.NewOpenAIClient(apiKey, model.APIModel)

	case llm.ProviderGoogle:
		apiKey := os.Getenv("GEMINI_API_KEY")
		if apiKey == "" {
			a.ui.Print("Warning: GEMINI_API_KEY not set, using mock client")
			return llm.NewMockClient()
		}
		return llm.NewGeminiClient(apiKey, model.APIModel)

	default:
		return llm.NewMockClient()
	}
}

// switchModel changes the current model
func (a *Agent) switchModel(modelID string) error {
	model := llm.GetModelByID(modelID)
	if model == nil {
		return fmt.Errorf("unknown model: %s", modelID)
	}

	a.client = a.createClientForModel(modelID)
	a.currentModel = modelID

	// Update session manager if present
	if a.session != nil {
		a.session.SetModel(model.APIModel)
	}

	a.ui.Print(fmt.Sprintf("Switched to %s", model.Name))
	return nil
}

// CurrentModelName returns the display name of the current model
func (a *Agent) CurrentModelName() string {
	model := llm.GetModelByID(a.currentModel)
	if model == nil {
		return a.currentModel
	}
	return model.Name
}

func (a *Agent) Run() error {
	a.ui.DrawBanner(a.CurrentModelName())
	a.ui.Print("Type 'exit' or 'quit' to stop.")

	cwd, err := os.Getwd()
	if err == nil {
		sm, err := history.NewSessionManager(cwd)
		if err != nil {
			a.ui.Print(fmt.Sprintf("Warning: Failed to initialize session manager: %v", err))
		} else {
			a.session = sm
			a.ui.Print(fmt.Sprintf("Session ID: %s", sm.SessionID))
		}
	}

	// Load and connect to MCP servers
	ctx := context.Background()
	if err := a.mcpManager.LoadAndConnect(ctx); err != nil {
		a.ui.Print(fmt.Sprintf("Warning: Failed to load MCP servers: %v", err))
	}

	// Register MCP tools
	a.registerMCPTools()

	for {
		input := a.ui.Prompt("> ")
		if input == "exit" || input == "quit" {
			break
		}
		if input == "" {
			continue
		}

		// Check for slash command trigger
		if strings.HasPrefix(input, "/") {
			cmdName := strings.TrimPrefix(input, "/")
			cmdName = strings.TrimSpace(cmdName)

			// If just "/", show picker
			if cmdName == "" {
				cmdList := a.commands.List()
				if len(cmdList) == 0 {
					a.ui.Print("No commands available")
					continue
				}

				// Build command info for picker
				cmdInfos := make([]ui.CommandInfo, len(cmdList))
				for i, cmd := range cmdList {
					cmdInfos[i] = ui.CommandInfo{
						Name:        cmd.Name(),
						Description: cmd.Description(),
					}
				}

				selected := a.ui.PickCommand(cmdInfos)
				if selected == "" {
					continue // User canceled
				}
				cmdName = selected
			}

			// Handle /model specially - show model picker
			if cmdName == "model" {
				modelCmd, ok := a.commands.Get("model")
				if ok {
					if mc, ok := modelCmd.(*commands.ModelCommand); ok {
						models := mc.GetModels()
						modelInfos := make([]ui.ModelInfo, len(models))
						for i, m := range models {
							modelInfos[i] = ui.ModelInfo{
								ID:          m.ID,
								Name:        m.Name,
								Provider:    m.Provider,
								Description: m.Description,
								IsCurrent:   m.ID == a.currentModel,
							}
						}

						selected := a.ui.PickModel(modelInfos)
						if selected != "" && selected != a.currentModel {
							if err := a.switchModel(selected); err != nil {
								a.ui.Print(fmt.Sprintf("Error switching model: %v", err))
							}
						}
					}
				}
				continue
			}

			// Execute the command by name
			cmd, ok := a.commands.Get(cmdName)
			if !ok {
				a.ui.Print(fmt.Sprintf("Unknown command: /%s", cmdName))
				continue
			}

			commandMessage, instructions, err := cmd.Execute()
			if err != nil {
				a.ui.Print(fmt.Sprintf("Error executing command: %v", err))
				continue
			}

			// Use the command output as the input
			input = commandMessage + "\n" + instructions
		}

		// Parse for images in input
		var images []string
		cleanInput := input

		// Very basic regex-like parsing for [Image: path]
		for {
			start := strings.Index(cleanInput, "[Image: ")
			if start == -1 {
				break
			}
			end := strings.Index(cleanInput[start:], "]")
			if end == -1 {
				break
			}

			fullTag := cleanInput[start : start+end+1]
			path := strings.TrimPrefix(fullTag, "[Image: ")
			path = strings.TrimSuffix(path, "]")

			images = append(images, strings.TrimSpace(path))

			// Remove tag from text
			cleanInput = strings.Replace(cleanInput, fullTag, "", 1)
		}
		cleanInput = strings.TrimSpace(cleanInput)

		// Construct full content with reminders
		fullContent := cleanInput
        
        // 1. Inject Todo Status
        todoTool, ok := a.tools.Get("TodoWrite")
        if ok {
            if tt, ok := todoTool.(*tools.TodoWriteTool); ok {
                if len(tt.Todos) == 0 {
                    fullContent += "\n<system-reminder>\nThis is a reminder that your todo list is currently empty. DO NOT mention this to the user explicitly because they are already aware. If you are working on tasks that would benefit from a todo list please use the TodoWrite tool to create one. If not, please feel free to ignore. Again do not mention this message to the user.\n</system-reminder>"
                } else {
                    // Maybe inject current todos? Claude Code likely does.
                    // For now, let's just stick to the "empty" reminder pattern seen in logs.
                }
            }
        }
        
        // 2. Inject CLAUDE.md / AGENTS.md
        projectFiles := []string{"CLAUDE.md", "AGENTS.md", ".claude.md"}
        for _, fname := range projectFiles {
            if _, err := os.Stat(fname); err == nil {
                content, err := ioutil.ReadFile(fname)
                if err == nil {
                    fullContent += fmt.Sprintf("\n<system-reminder>\nAs you answer the user's questions, you can use the following context:\n# claudeMd\nCodebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.\n\nContents of %s (project instructions, checked into the codebase):\n\n%s\n</system-reminder>", fname, string(content))
                    break // Only use the first one found
                }
            }
        }
        
        // 3. Inject Git Status (inferred from logs)
        // For MVP, let's skip git status injection to avoid heavy shell calls every turn, 
        // unless we implement a caching mechanism.
        
		// Add user message to history
        userMsg := llm.Message{
			Role:    llm.RoleUser,
			Content: fullContent,
            Images:  images,
		}
		a.history = append(a.history, userMsg)
        
        if a.session != nil {
            if err := a.session.Append(llm.RoleUser, userMsg); err != nil {
                a.ui.Print(fmt.Sprintf("Warning: Failed to log user message: %v", err))
            }
        }

		// Run the LLM loop (handling tool calls)
		if err := a.processTurn(); err != nil {
			a.ui.Print(fmt.Sprintf("Error: %v", err))
		}
	}

	// Cleanup MCP connections
	a.mcpManager.Close()

	return nil
}

// registerMCPTools registers all tools from connected MCP servers
func (a *Agent) registerMCPTools() {
	mcpTools := a.mcpManager.GetAllTools()
	for _, toolDef := range mcpTools {
		mcpTool := tools.NewMCPTool(a.mcpManager, toolDef)
		a.tools.Register(mcpTool)
	}
	if len(mcpTools) > 0 {
		a.ui.Print(fmt.Sprintf("Registered %d MCP tools", len(mcpTools)))
	}
}

func (a *Agent) RunTask(ctx context.Context) (string, error) {
    // Run the agent loop non-interactively until it produces a final answer or finishes.
    // For the agent to "finish", it needs to decide it is done. 
    // Standard tool-use agents usually stop when they output text without tool calls?
    // Or we can give it a "TaskDone" tool?
    // For now, let's say if it outputs text without tool calls, that's the result.
    
    // We'll run up to N turns.
    
    // But wait, processTurn runs up to 10 tool interactions in a loop.
    // If processTurn returns nil (no tool calls), it means it has produced a final response text.
    
    err := a.processTurn()
    if err != nil {
        return "", err
    }
    
    // The last message in history (from Assistant) is the result
    if len(a.history) > 0 {
        last := a.history[len(a.history)-1]
        if last.Role == llm.RoleAssistant {
            return last.Content, nil
        }
    }
    return "Task completed with no output", nil
}

func (a *Agent) processTurn() error {
    ctx := context.Background()
    
    // Max turns to prevent infinite loops
    for i := 0; i < 50; i++ {
        // Prepare tools for the API
        var apiTools []interface{}
        for _, t := range a.tools.List() {
             apiTools = append(apiTools, t)
        }

        ch := make(chan string)
        type result struct {
            resp *llm.Message
            err  error
        }
        resultCh := make(chan result, 1)
        
        go func() {
            defer close(ch)
            r, err := a.client.GenerateStream(ctx, a.history, apiTools, ch)
            resultCh <- result{resp: r, err: err}
        }()

        a.ui.DisplayStream(ch)
        
        res := <-resultCh
        if res.err != nil {
            return res.err
        }
        if res.resp == nil {
            return fmt.Errorf("generation produced no response")
        }
        resp := res.resp

        a.history = append(a.history, *resp)
        if a.session != nil {
            if err := a.session.Append(llm.RoleAssistant, *resp); err != nil {
                a.ui.Print(fmt.Sprintf("Warning: Failed to log assistant message: %v", err))
            }
        }

        // If no tool calls, we're done with this turn (waiting for user input)
        if len(resp.ToolCalls) == 0 {
            return nil
        }

        // Handle tool calls
        for _, tc := range resp.ToolCalls {
            a.ui.Print(fmt.Sprintf("Running tool: %s", tc.Name))
            
            tool, found := a.tools.Get(tc.Name)
            var result string
            var err error
            
            if !found {
                result = fmt.Sprintf("Error: Tool %s not found", tc.Name)
            } else {
                result, err = tool.Execute(ctx, tc.Args)
                if err != nil {
                    result = fmt.Sprintf("Error executing tool: %v", err)
                }
            }
            
            // Append tool result to history
            toolMsg := llm.Message{
                Role: llm.RoleTool,
                ToolResult: &llm.ToolResult{
                    ToolCallID: tc.ID,
                    ToolName:   tc.Name,
                    Content:    result,
                },
            }
            a.history = append(a.history, toolMsg)
            
            if a.session != nil {
                if err := a.session.Append(llm.RoleTool, toolMsg); err != nil {
                    a.ui.Print(fmt.Sprintf("Warning: Failed to log tool result: %v", err))
                }
            }
        }
        // Loop continues to send tool results back to LLM
    }
    
    return fmt.Errorf("max turns reached")
}
