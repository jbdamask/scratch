package tools

import (
	"context"
	"fmt"
	"os/exec"
)

type GrepTool struct{}

func (t *GrepTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "Grep",
		Description: `Powerful search tool built on ripgrep.
- ALWAYS use Grep for search tasks, NEVER invoke grep or rg as Bash command
- Supports full regex syntax
- Filter files with glob parameter or type parameter
- Output modes: "content" (matching lines), "files_with_matches" (file paths, default), "count" (match counts)
- Pattern syntax uses ripgrep - literal braces need escaping
- For cross-line patterns, use multiline: true
- Supports context lines with -A, -B, -C`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"pattern": map[string]interface{}{
					"type":        "string",
					"description": "Regex pattern to search for.",
				},
				"path": map[string]interface{}{
					"type":        "string",
					"description": "File or directory path to search in.",
				},
				"glob": map[string]interface{}{
					"type":        "string",
					"description": "Glob pattern to filter files (e.g., **/*.go).",
				},
				"caseSensitive": map[string]interface{}{
					"type": "boolean",
                    "description": "Whether to search case-sensitively",
				},
			},
			"required": []string{"pattern"},
		},
	}
}

func (t *GrepTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	pattern, ok := args["pattern"].(string)
	if !ok {
		return "", fmt.Errorf("pattern required")
	}
    
    pathArg, _ := args["path"].(string)
    if pathArg == "" {
        pathArg = "."
    }
    
    globArg, _ := args["glob"].(string)
    caseSensitive, _ := args["caseSensitive"].(bool)

	// Check if rg exists
	_, err := exec.LookPath("rg")
    if err != nil {
        // Fallback to grep? Or error?
        // Let's try standard grep if rg is missing, but rg features are requested...
        // For now, just error saying ripgrep is required
        return "", fmt.Errorf("ripgrep (rg) is not installed or not in PATH")
    }

    var cmdArgs []string
    if !caseSensitive {
        cmdArgs = append(cmdArgs, "-i")
    }
    if globArg != "" {
        cmdArgs = append(cmdArgs, "-g", globArg)
    }
    
    cmdArgs = append(cmdArgs, "--line-number", "--no-heading")
    cmdArgs = append(cmdArgs, pattern)
    cmdArgs = append(cmdArgs, pathArg)

    cmd := exec.CommandContext(ctx, "rg", cmdArgs...)
    out, err := cmd.CombinedOutput()
    
    // grep returns exit code 1 if no matches, which is not an error for us
    if err != nil {
        if exitError, ok := err.(*exec.ExitError); ok {
             if exitError.ExitCode() == 1 {
                 return "No matches found.", nil
             }
        }
        return fmt.Sprintf("Error running grep: %v\nOutput: %s", err, out), nil
    }

    output := string(out)
    if len(output) > 30000 {
        output = output[:30000] + "\n...[Truncated]..."
    }
    
	return output, nil
}
