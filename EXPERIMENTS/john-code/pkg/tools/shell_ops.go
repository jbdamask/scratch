package tools

import (
	"context"
	"fmt"
)

// BashOutputTool
type BashOutputTool struct{}

func (t *BashOutputTool) Definition() ToolDefinition {
    return ToolDefinition{
        Name: "BashOutput",
        Description: `Retrieves output from a running or completed background bash shell
- Takes a shell_id parameter identifying the shell
- Always returns only new output since the last check
- Returns stdout and stderr output along with shell status
- Supports optional regex filtering to show only lines matching a pattern
- Use this tool when you need to monitor or check the output of a long-running shell
- Shell IDs can be found using the /tasks command`,
        Schema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "shell_id": map[string]interface{}{
                    "type": "string",
                    "description": "The ID of the background shell to retrieve output from",
                },
            },
            "required": []string{"shell_id"},
        },
    }
}

func (t *BashOutputTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    id, ok := args["shell_id"].(string)
    if !ok {
        return "", fmt.Errorf("shell_id required")
    }

    output, done, err := GlobalShellManager.GetOutput(id)
    
    status := "running"
    if done {
        status = "finished"
    }
    if err != nil {
        status = fmt.Sprintf("error: %v", err)
    }

    return fmt.Sprintf("Shell ID: %s\nStatus: %s\nOutput:\n%s", id, status, output), nil
}

// KillShellTool
type KillShellTool struct{}

func (t *KillShellTool) Definition() ToolDefinition {
    return ToolDefinition{
        Name: "KillShell",
        Description: `Kills a running background bash shell by its ID
- Takes a shell_id parameter identifying the shell to kill
- Returns a success or failure status 
- Use this tool when you need to terminate a long-running shell
- Shell IDs can be found using the /tasks command`,
        Schema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "shell_id": map[string]interface{}{
                    "type": "string",
                    "description": "The ID of the background shell to kill",
                },
            },
            "required": []string{"shell_id"},
        },
    }
}

func (t *KillShellTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    id, ok := args["shell_id"].(string)
    if !ok {
        return "", fmt.Errorf("shell_id required")
    }

    err := GlobalShellManager.Kill(id)
    if err != nil {
        return "", err
    }
    return fmt.Sprintf("Successfully killed shell %s", id), nil
}
