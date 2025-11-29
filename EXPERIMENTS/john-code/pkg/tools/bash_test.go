package tools

import (
	"context"
	"strings"
	"testing"
)

func TestBashTool(t *testing.T) {
	tool := NewBashTool()
	ctx := context.Background()

	// Test simple command
	args := map[string]interface{}{
		"command": "echo 'Hello Bash'",
	}
	output, err := tool.Execute(ctx, args)
	if err != nil {
		t.Fatalf("BashTool failed: %v", err)
	}
	if strings.TrimSpace(output) != "Hello Bash" {
		t.Errorf("Expected 'Hello Bash', got '%s'", output)
	}

	// Test changing directory (simulated)
	// Note: This depends on internal implementation detail of BashTool
	cdArgs := map[string]interface{}{
		"command": "cd /tmp",
	}
	output, err = tool.Execute(ctx, cdArgs)
	if err != nil {
		t.Fatalf("BashTool cd failed: %v", err)
	}
    
    // Note: Mac /tmp is often /private/tmp, so strict string matching might fail.
    // Checking if it contains /tmp or /private/tmp
	if !strings.Contains(output, "Changed directory to") {
		t.Errorf("Expected success message for cd, got '%s'", output)
	}
    
    // Verify cwd changed (by running pwd)
    pwdArgs := map[string]interface{}{
        "command": "pwd",
    }
    output, err = tool.Execute(ctx, pwdArgs)
    if err != nil {
        t.Fatalf("BashTool pwd failed: %v", err)
    }
    
    // Assuming /tmp exists on the system running tests
    if !strings.Contains(output, "/tmp") {
         t.Errorf("Expected pwd to be /tmp, got '%s'", output)
    }
}
