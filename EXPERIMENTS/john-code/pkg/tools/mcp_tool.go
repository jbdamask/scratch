package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jbdamask/john-code/pkg/mcp"
)

// MCPTool wraps an MCP server tool to implement the Tool interface
type MCPTool struct {
	manager      *mcp.Manager
	serverName   string
	toolName     string
	originalName string
	description  string
	inputSchema  json.RawMessage
}

// NewMCPTool creates a new MCP tool wrapper
func NewMCPTool(manager *mcp.Manager, def mcp.MCPToolDefinition) *MCPTool {
	return &MCPTool{
		manager:      manager,
		serverName:   def.ServerName,
		toolName:     def.Name,
		originalName: def.OriginalName,
		description:  def.Description,
		inputSchema:  def.InputSchema,
	}
}

// Definition returns the tool definition for the LLM API
func (t *MCPTool) Definition() ToolDefinition {
	// Parse the input schema to include in the definition
	var schema map[string]interface{}
	if err := json.Unmarshal(t.inputSchema, &schema); err != nil {
		// Fallback to empty schema
		schema = map[string]interface{}{
			"type":       "object",
			"properties": map[string]interface{}{},
		}
	}

	return ToolDefinition{
		Name:        t.toolName,
		Description: fmt.Sprintf("[MCP:%s] %s", t.serverName, t.description),
		Schema:      schema,
	}
}

// Execute runs the MCP tool
func (t *MCPTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	// Convert args map to JSON
	argsJSON, err := json.Marshal(args)
	if err != nil {
		return "", fmt.Errorf("failed to marshal args: %w", err)
	}

	result, err := t.manager.CallTool(ctx, t.serverName, t.originalName, argsJSON)
	if err != nil {
		return "", fmt.Errorf("MCP tool %s failed: %w", t.toolName, err)
	}
	return result, nil
}
