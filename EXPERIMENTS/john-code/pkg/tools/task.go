package tools

import (
	"context"
	"fmt"
)

// TaskRunner is a function that runs a sub-agent
type TaskRunner func(ctx context.Context, task string) (string, error)

type TaskTool struct {
    runner TaskRunner
}

func NewTaskTool(runner TaskRunner) *TaskTool {
    return &TaskTool{runner: runner}
}

func (t *TaskTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "Task",
		Description: `Delegate a complex task to a sub-agent.
- Use when you need to perform complex multi-step tasks
- Use when you need to run an operation that will produce a lot of output (tokens) that is not needed after the sub-agent's task completes
- When the agent is done, it will return a single message back to you.`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"task": map[string]interface{}{
					"type":        "string",
					"description": "The task description for the sub-agent.",
				},
			},
			"required": []string{"task"},
		},
	}
}

func (t *TaskTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    task, ok := args["task"].(string)
    if !ok {
        return "", fmt.Errorf("task required")
    }
    
    if t.runner == nil {
        return "", fmt.Errorf("task runner not initialized")
    }

    return t.runner(ctx, task)
}
