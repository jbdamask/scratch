package tools

import (
	"context"
	"testing"
)

func TestTaskTool(t *testing.T) {
    ctx := context.Background()
    
    // Mock runner
    runner := func(ctx context.Context, task string) (string, error) {
        return "Completed: " + task, nil
    }
    
    tool := NewTaskTool(runner)
    
    args := map[string]interface{}{
        "task": "Do something",
    }
    
    output, err := tool.Execute(ctx, args)
    if err != nil {
        t.Fatalf("TaskTool failed: %v", err)
    }
    
    if output != "Completed: Do something" {
        t.Errorf("Expected 'Completed: Do something', got '%s'", output)
    }
}
