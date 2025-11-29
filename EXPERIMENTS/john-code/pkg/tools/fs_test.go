package tools

import (
	"context"
	"os"
	"path/filepath"
    "strings"
	"testing"
)

func TestFSTools(t *testing.T) {
	// Setup temporary directory
	tmpDir, err := os.MkdirTemp("", "john-code-test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	ctx := context.Background()
	testFile := filepath.Join(tmpDir, "test.txt")

	// 1. Test WriteTool
	writeTool := &WriteTool{}
	writeArgs := map[string]interface{}{
		"file_path": testFile,
		"content":   "Hello, World!\nLine 2",
	}
	
	if _, err := writeTool.Execute(ctx, writeArgs); err != nil {
		t.Fatalf("WriteTool failed: %v", err)
	}

	// Verify content on disk
	content, err := os.ReadFile(testFile)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}
	if string(content) != "Hello, World!\nLine 2" {
		t.Errorf("Expected 'Hello, World!\\nLine 2', got '%s'", string(content))
	}

	// 2. Test ReadTool
	readTool := &ReadTool{}
	readArgs := map[string]interface{}{
		"file_path": testFile,
	}
	output, err := readTool.Execute(ctx, readArgs)
	if err != nil {
		t.Fatalf("ReadTool failed: %v", err)
	}
	// ReadTool adds line numbers
	expectedRead := "     1\tHello, World!\n     2\tLine 2\n"
	if output != expectedRead {
		t.Errorf("ReadTool output mismatch.\nExpected:\n%q\nGot:\n%q", expectedRead, output)
	}

	// 3. Test EditTool
	editTool := &EditTool{}
	editArgs := map[string]interface{}{
		"file_path":  testFile,
		"old_string": "Line 2",
		"new_string": "Line Two",
	}
	if _, err := editTool.Execute(ctx, editArgs); err != nil {
		t.Fatalf("EditTool failed: %v", err)
	}

	// Verify edit
	content, _ = os.ReadFile(testFile)
	if string(content) != "Hello, World!\nLine Two" {
		t.Errorf("EditTool failed. Got content: %s", string(content))
	}

    // 4. Test GlobTool
    globTool := &GlobTool{}
    // Create nested structure
    os.MkdirAll(filepath.Join(tmpDir, "subdir"), 0755)
    os.WriteFile(filepath.Join(tmpDir, "subdir", "match.go"), []byte("package main"), 0644)
    os.WriteFile(filepath.Join(tmpDir, "subdir", "ignore.txt"), []byte("text"), 0644)
    
    globArgs := map[string]interface{}{
        "pattern": filepath.Join(tmpDir, "subdir", "*.go"),
    }
    
    globOut, err := globTool.Execute(ctx, globArgs)
    if err != nil {
        t.Fatalf("GlobTool failed: %v", err)
    }
    
    if !strings.Contains(globOut, "match.go") {
        t.Errorf("Glob failed to find match.go. Got: %s", globOut)
    }
    if strings.Contains(globOut, "ignore.txt") {
         t.Errorf("Glob found ignore.txt but shouldn't have. Got: %s", globOut)
    }
}
