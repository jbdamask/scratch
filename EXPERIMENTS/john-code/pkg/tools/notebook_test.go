package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestNotebookEditTool(t *testing.T) {
	tmpDir, _ := os.MkdirTemp("", "nb-test")
	defer os.RemoveAll(tmpDir)

	nbFile := filepath.Join(tmpDir, "test.ipynb")
	initialNB := `{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "print('hello')"
   ]
  }
 ],
 "metadata": {},
 "nbformat": 4,
 "nbformat_minor": 5
}`
	os.WriteFile(nbFile, []byte(initialNB), 0644)

	tool := &NotebookEditTool{}
	ctx := context.Background()

	// Test Insert
	args := map[string]interface{}{
		"notebook_path": nbFile,
		"cell_number":   1, // Insert at end
		"new_source":    "print('world')",
		"edit_mode":     "insert",
		"cell_type":     "code",
	}
	
	if _, err := tool.Execute(ctx, args); err != nil {
		t.Fatalf("Insert failed: %v", err)
	}

	// Verify
	content, _ := os.ReadFile(nbFile)
	var nb notebook
	json.Unmarshal(content, &nb)
	
	if len(nb.Cells) != 2 {
		t.Errorf("Expected 2 cells, got %d", len(nb.Cells))
	}
	if len(nb.Cells[1].Source) > 0 && nb.Cells[1].Source[0] != "print('world')\n" {
         // My implementation uses SplitAfter, so "print('world')" -> ["print('world')"] if no newline
         // Wait, "print('world')" split by \n gives ["print('world')"] if no trailing newline
         // Let's check what my implementation does: strings.SplitAfter(newSource, "\n")
         // If newSource is "print('world')", it returns ["print('world')"]
		if nb.Cells[1].Source[0] != "print('world')" {
             t.Errorf("Unexpected source: %v", nb.Cells[1].Source)
        }
	}
}
