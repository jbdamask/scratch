package tools

import (
	"context"
	"testing"
    "strings"
)

func TestTodoWriteTool(t *testing.T) {
	tool := NewTodoWriteTool()
	ctx := context.Background()

	todos := []interface{}{
		map[string]interface{}{
			"id":       "1",
			"content":  "Task 1",
			"status":   "pending",
			"priority": "high",
		},
		map[string]interface{}{
			"id":       "2",
			"content":  "Task 2",
			"status":   "completed",
			"priority": "low",
		},
	}

	args := map[string]interface{}{
		"todos": todos,
	}

	output, err := tool.Execute(ctx, args)
	if err != nil {
		t.Fatalf("TodoWriteTool failed: %v", err)
	}

	if !strings.Contains(output, "[ ] Task 1") {
		t.Error("Missing pending task 1")
	}
	if !strings.Contains(output, "[x] Task 2") {
		t.Error("Missing completed task 2")
	}
    
    // Verify internal state
    if len(tool.Todos) != 2 {
        t.Errorf("Expected 2 todos, got %d", len(tool.Todos))
    }
}
