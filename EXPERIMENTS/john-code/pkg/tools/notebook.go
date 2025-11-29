package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"strings"
)

// NotebookEditTool
type NotebookEditTool struct {}

func (t *NotebookEditTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "NotebookEdit",
		Description: `Completely replaces contents of specific cell in Jupyter notebook.
- Must use absolute path
- Cell number is 0-indexed
- Use edit_mode=insert to add new cell
- Use edit_mode=delete to delete cell
- Can specify cell_type (code or markdown)`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"notebook_path": map[string]interface{}{
					"type": "string",
                    "description": "The absolute path to the notebook file",
				},
                "cell_number": map[string]interface{}{
                    "type": "integer",
                    "description": "The 0-indexed cell number to edit",
                },
                "new_source": map[string]interface{}{
                    "type": "string",
                    "description": "The new content for the cell",
                },
                "edit_mode": map[string]interface{}{
                    "type": "string",
                    "enum": []string{"replace", "insert", "delete"},
                    "description": "The edit mode: replace (default), insert, or delete",
                },
                "cell_type": map[string]interface{}{
                    "type": "string",
                    "enum": []string{"code", "markdown"},
                    "description": "The type of cell: code (default) or markdown",
                },
			},
			"required": []string{"notebook_path", "cell_number"},
		},
	}
}

// Minimal Notebook Structs
type notebook struct {
    Cells []cell `json:"cells"`
    Metadata interface{} `json:"metadata"`
    Nbformat int `json:"nbformat"`
    NbformatMinor int `json:"nbformat_minor"`
}

type cell struct {
    CellType string `json:"cell_type"`
    Metadata interface{} `json:"metadata"`
    Source []string `json:"source"` // Jupyter uses array of strings usually
    Outputs []interface{} `json:"outputs,omitempty"`
    ExecutionCount *int `json:"execution_count,omitempty"`
}

func (t *NotebookEditTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    path, _ := args["notebook_path"].(string)
    
    // Handle float64 from JSON unmarshal for cell_number
    var cellNum int
    if cn, ok := args["cell_number"].(float64); ok {
        cellNum = int(cn)
    } else if cn, ok := args["cell_number"].(int); ok {
        cellNum = cn
    } else {
        return "", fmt.Errorf("cell_number invalid")
    }
    
    newSource, _ := args["new_source"].(string)
    editMode, _ := args["edit_mode"].(string)
    if editMode == "" { editMode = "replace" }
    cellType, _ := args["cell_type"].(string)
    if cellType == "" { cellType = "code" }

    content, err := ioutil.ReadFile(path)
    if err != nil {
        return "", err
    }

    var nb notebook
    if err := json.Unmarshal(content, &nb); err != nil {
        return "", fmt.Errorf("failed to parse notebook: %w", err)
    }

    if cellNum < 0 {
        return "", fmt.Errorf("invalid cell number")
    }

    // Create new cell object
    // Jupyter source is usually lines.
    sourceLines := strings.SplitAfter(newSource, "\n")
    // Ensure ends with \n if not empty? Jupyter is picky sometimes but let's keep it simple.
    
    newCell := cell{
        CellType: cellType,
        Metadata: map[string]interface{}{},
        Source: sourceLines,
        Outputs: []interface{}{},
        ExecutionCount: nil,
    }

    switch editMode {
    case "replace":
        if cellNum >= len(nb.Cells) {
            return "", fmt.Errorf("cell number out of range")
        }
        nb.Cells[cellNum] = newCell
        
    case "delete":
        if cellNum >= len(nb.Cells) {
            return "", fmt.Errorf("cell number out of range")
        }
        nb.Cells = append(nb.Cells[:cellNum], nb.Cells[cellNum+1:]...)
        
    case "insert":
        if cellNum > len(nb.Cells) {
             cellNum = len(nb.Cells)
        }
        nb.Cells = append(nb.Cells[:cellNum], append([]cell{newCell}, nb.Cells[cellNum:]...)...)
    }

    // Write back
    newContent, err := json.MarshalIndent(nb, "", " ")
    if err != nil {
        return "", err
    }
    
    if err := ioutil.WriteFile(path, newContent, 0644); err != nil {
        return "", err
    }

    return "Notebook updated successfully.", nil
}
