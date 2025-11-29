package tools

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

type BashTool struct {
	cwd string
}

func NewBashTool() *BashTool {
	cwd, _ := os.Getwd()
	return &BashTool{
		cwd: cwd,
	}
}

func (t *BashTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "Bash",
		Description: `Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.

IMPORTANT: This tool is for terminal operations like git, npm, docker, etc. DO NOT use it for file operations (reading, writing, editing, searching, finding files) - use the specialized tools for this instead.

Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use ls to verify the parent directory exists and is the correct location
   - For example, before running "mkdir foo/bar", first use ls foo to check that "foo" exists and is the intended parent directory

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
   - Examples of proper quoting:
     - cd "/Users/name/My Documents" (correct)
     - cd /Users/name/My Documents (incorrect - will fail)
     - python "/path/with spaces/script.py" (correct)
     - python /path/with spaces/script.py (incorrect - will fail)
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes).
  - It is very helpful if you write a clear, concise description of what this command does in 5-10 words.
  - If the output exceeds 30000 characters, output will be truncated before being returned to you.
  - You can use the run_in_background parameter to run the command in the background, which allows you to continue working while the command runs. You can monitor the output using the Bash tool as it becomes available. You do not need to use '&' at the end of the command when using this parameter.
  
  - Avoid using Bash with the find, grep, cat, head, tail, sed, awk, or echo commands, unless explicitly instructed or when these commands are truly necessary for the task. Instead, always prefer using the dedicated tools for these commands:
    - File search: Use Glob (NOT find or ls)
    - Content search: Use Grep (NOT grep or rg)
    - Read files: Use Read (NOT cat/head/tail)
    - Edit files: Use Edit (NOT sed/awk)
    - Write files: Use Write (NOT echo >/cat <<EOF)
    - Communication: Output text directly (NOT echo/printf)
  - When issuing multiple commands:
    - If the commands are independent and can run in parallel, make multiple Bash tool calls in a single message. For example, if you need to run "git status" and "git diff", send a single message with two Bash tool calls in parallel.
    - If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together (e.g., git add . && git commit -m "message" && git push). For instance, if one operation must complete before another starts (like mkdir before cp, Write before Bash for git operations, or git add before git commit), run these operations sequentially instead.
    - Use ';' only when you need to run commands sequentially but don't care if earlier commands fail
    - DO NOT use newlines to separate commands (newlines are ok in quoted strings)
  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of cd. You may use cd if the User explicitly requests it.`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"command": map[string]interface{}{
					"type":        "string",
					"description": "The bash command to execute.",
				},
				"timeout": map[string]interface{}{
					"type":        "integer",
					"description": "Timeout in milliseconds (default 120000).",
				},
                "run_in_background": map[string]interface{}{
                    "type": "boolean",
                    "description": "Run the command in the background.",
                },
			},
			"required": []string{"command"},
		},
	}
}

func (t *BashTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	cmdStr, ok := args["command"].(string)
	if !ok {
		return "", fmt.Errorf("command argument is required and must be a string")
	}
    
    runInBackground, _ := args["run_in_background"].(bool)

    // Handle explicit CD commands to update internal state
    // This is a heuristic to simulate persistent CWD
    if strings.HasPrefix(strings.TrimSpace(cmdStr), "cd ") {
        path := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(cmdStr), "cd "))
        // clean up quotes
        path = strings.Trim(path, "\"'")
        
        // actually, checking if directory exists
        err := os.Chdir(path)
        if err == nil {
            t.cwd, _ = os.Getwd()
            return fmt.Sprintf("Changed directory to %s", t.cwd), nil
        }
    }

	// Create command
	cmd := exec.CommandContext(ctx, "bash", "-c", cmdStr)
	cmd.Dir = t.cwd
    
    if runInBackground {
        id := GlobalShellManager.Start(cmd)
        return fmt.Sprintf("Started background process with ID %s. Use BashOutput tool to monitor.", id), nil
    }

	out, err := cmd.CombinedOutput()
	output := string(out)

	if err != nil {
		return fmt.Sprintf("Error: %v\nOutput:\n%s", err, output), nil
	}

	if len(output) > 30000 {
		output = output[:30000] + "\n...[Output Truncated]..."
	}

	return output, nil
}
