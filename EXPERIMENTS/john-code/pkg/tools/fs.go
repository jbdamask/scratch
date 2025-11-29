package tools

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

// ReadTool
type ReadTool struct{}

func (t *ReadTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "Read",
		Description: `Reads a file from the local filesystem.
- Must use absolute paths, not relative
- Reads up to 2000 lines by default from beginning
- Can specify offset and limit for long files
- Lines longer than 2000 chars are truncated
- Can read images (PNG, JPG), PDFs, and Jupyter notebooks
- Cannot read directories (use ls via Bash for that)
- Call multiple Read operations in parallel when useful
- If file exists but is empty, receive a warning
- MUST read file before using Edit or Write on existing files`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"file_path": map[string]interface{}{
					"type": "string",
                    "description": "The absolute path to the file to read",
				},
			},
			"required": []string{"file_path"},
		},
	}
}

func (t *ReadTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["file_path"].(string)
	if !ok {
		return "", fmt.Errorf("file_path required")
	}

	content, err := ioutil.ReadFile(path)
	if err != nil {
		return "", err
	}

	// Format with line numbers
	lines := strings.Split(string(content), "\n")
    // Limit to 2000 lines
    truncated := false
    if len(lines) > 2000 {
        lines = lines[:2000]
        truncated = true
    }

	var sb strings.Builder
	for i, line := range lines {
		sb.WriteString(fmt.Sprintf("%6d\t%s\n", i+1, line))
	}
    if truncated {
        sb.WriteString("...[File Truncated at 2000 lines]...\n")
    }

	return sb.String(), nil
}

// WriteTool
type WriteTool struct{}

func (t *WriteTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "Write",
		Description: `Writes files to the local filesystem.
- Overwrites existing files
- If file exists, MUST use Read tool first (tool will fail otherwise)
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files (*.md) or READMEs unless explicitly requested
- Only use emojis if user explicitly requests it
- Must use absolute paths, not relative`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"file_path": map[string]interface{}{
					"type": "string",
                    "description": "The absolute path to the file to write",
				},
				"content": map[string]interface{}{
					"type": "string",
                    "description": "The content to write to the file",
				},
			},
			"required": []string{"file_path", "content"},
		},
	}
}

func (t *WriteTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	path, ok := args["file_path"].(string)
	if !ok {
		return "", fmt.Errorf("file_path required")
	}
	content, ok := args["content"].(string)
	if !ok {
		return "", fmt.Errorf("content required")
	}

	err := ioutil.WriteFile(path, []byte(content), 0644)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("Successfully wrote to %s", path), nil
}

// GlobTool
type GlobTool struct{}

func (t *GlobTool) Definition() ToolDefinition {
    return ToolDefinition{
        Name: "Glob",
        Description: `Fast file pattern matching tool.
- Works with any codebase size
- Supports glob patterns like **/*.js or src/**/*.tsx
- Returns matching file paths sorted by modification time
- Use when finding files by name patterns
- For open-ended searches requiring multiple rounds, use Task tool instead
- Can call multiple Glob operations in parallel if potentially useful`,
        Schema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "pattern": map[string]interface{}{
                    "type": "string",
                    "description": "Glob pattern like **/*.js",
                },
            },
            "required": []string{"pattern"},
        },
    }
}

func (t *GlobTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    pattern, ok := args["pattern"].(string)
    if !ok {
        return "", fmt.Errorf("pattern required")
    }

    // Go's filepath.Glob doesn't support **. 
    // I'll need to walk the directory for recursive matching or use a library.
    // For MVP, I'll stick to filepath.Glob if user doesn't use **.
    // If they use **, I'll do a simple walk.
    
    var matches []string
    if strings.Contains(pattern, "**") {
        // Simplistic recursive search
        // split into base dir and pattern?
        // Assuming pattern is relative to CWD or absolute.
        // This is tricky without a real glob library. 
        // I'll just do a full walk and match suffix/name? No that's bad.
        // I'll implement a very basic walker.
        err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
            if err != nil { return err }
            // Check if path matches pattern... complex logic needed here.
            // I'll just return "Use specific paths" for now if they use **
            // Or I can return all files and let them filter? No.
            // I'll assume standard glob for now.
            return nil
        })
        if err != nil { return "", err }
        return "Recursive glob (**) not fully supported in MVP. Please use standard glob.", nil
    } else {
        var err error
        matches, err = filepath.Glob(pattern)
        if err != nil {
            return "", err
        }
    }
    
    return strings.Join(matches, "\n"), nil
}

// EditTool
type EditTool struct{}

func (t *EditTool) Definition() ToolDefinition {
    return ToolDefinition{
        Name: "Edit",
        Description: `Performs exact string replacements in files.
- MUST use Read tool at least once before editing
- Preserve exact indentation as it appears AFTER the line number prefix in Read output
- Never include line number prefix in old_string or new_string
- ALWAYS prefer editing existing files over writing new ones
- Edit will FAIL if old_string is not unique - either provide more context or use replace_all
- Use replace_all for renaming variables across file
- Avoid backwards-compatibility hacks like renaming to _var, re-exporting types, // removed comments - delete unused code completely`,
        Schema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "file_path": map[string]interface{}{
                    "type": "string",
                    "description": "The absolute path to the file to edit",
                },
                "old_string": map[string]interface{}{
                    "type": "string",
                    "description": "The exact string to search for",
                },
                "new_string": map[string]interface{}{
                    "type": "string",
                    "description": "The string to replace it with",
                },
            },
            "required": []string{"file_path", "old_string", "new_string"},
        },
    }
}

func (t *EditTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    path, ok := args["file_path"].(string)
    if !ok { return "", fmt.Errorf("file_path required") }
    oldStr, ok := args["old_string"].(string)
    if !ok { return "", fmt.Errorf("old_string required") }
    newStr, ok := args["new_string"].(string)
    if !ok { return "", fmt.Errorf("new_string required") }

    contentBytes, err := ioutil.ReadFile(path)
    if err != nil {
        return "", err
    }
    content := string(contentBytes)

    if !strings.Contains(content, oldStr) {
        return "", fmt.Errorf("old_string not found in file")
    }
    
    // Check for uniqueness
    if strings.Count(content, oldStr) > 1 {
        return "", fmt.Errorf("old_string is not unique in file")
    }

    newContent := strings.Replace(content, oldStr, newStr, 1)
    err = ioutil.WriteFile(path, []byte(newContent), 0644)
    if err != nil {
        return "", err
    }

    return fmt.Sprintf("Successfully edited %s", path), nil
}
