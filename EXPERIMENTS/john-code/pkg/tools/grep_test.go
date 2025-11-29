package tools

import (
	"context"
	"os"
    "os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestGrepTool(t *testing.T) {
    // Check if rg is installed
    _, err := exec.LookPath("rg")
    if err != nil {
        t.Skip("ripgrep (rg) not found in PATH, skipping GrepTool test")
    }

	tmpDir, err := os.MkdirTemp("", "grep-test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create some files
	os.WriteFile(filepath.Join(tmpDir, "a.go"), []byte("package main\nfunc Foo() {}"), 0644)
	os.WriteFile(filepath.Join(tmpDir, "b.go"), []byte("package main\nfunc Bar() {}"), 0644)
    os.WriteFile(filepath.Join(tmpDir, "c.txt"), []byte("Just text"), 0644)

	tool := &GrepTool{}
	ctx := context.Background()

	// Test search
	args := map[string]interface{}{
		"pattern": "func",
        "path": tmpDir,
        "glob": "*.go",
	}
    
	output, err := tool.Execute(ctx, args)
	if err != nil {
		t.Fatalf("GrepTool failed: %v", err)
	}

	if !strings.Contains(output, "a.go") {
		t.Errorf("Expected a.go in output, got: %s", output)
	}
    if !strings.Contains(output, "b.go") {
		t.Errorf("Expected b.go in output, got: %s", output)
	}
    if strings.Contains(output, "c.txt") {
		t.Errorf("Did not expect c.txt in output (glob filter), got: %s", output)
	}
}
