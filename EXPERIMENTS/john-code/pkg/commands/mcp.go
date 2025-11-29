package commands

import (
	"fmt"
	"strings"

	"github.com/jbdamask/john-code/pkg/mcp"
)

// MCPCommand manages MCP servers
type MCPCommand struct {
	manager *mcp.Manager
}

// NewMCPCommand creates a new MCPCommand
func NewMCPCommand(manager *mcp.Manager) *MCPCommand {
	return &MCPCommand{manager: manager}
}

// Name returns the command name
func (c *MCPCommand) Name() string {
	return "mcp"
}

// Description returns a short description shown in the command picker
func (c *MCPCommand) Description() string {
	return "Manage MCP servers"
}

// Execute runs the command - for /mcp, we show server status
// The actual interactive management happens in the agent
func (c *MCPCommand) Execute() (commandMessage string, instructions string, err error) {
	servers := c.manager.ListServers()

	if len(servers) == 0 {
		return "<command-message>No MCP servers configured</command-message>",
			"No MCP servers are currently configured. You can add one using the CLI:\n\n" +
				"```\njohn mcp add <name> <command> [args...]\n```\n\n" +
				"For example:\n```\njohn mcp add playwright npx @anthropic-ai/mcp-playwright\n```",
			nil
	}

	var sb strings.Builder
	sb.WriteString("## MCP Server Status\n\n")

	for _, server := range servers {
		status := "❌ disconnected"
		if server.Connected {
			status = fmt.Sprintf("✓ connected (%d tools)", server.ToolCount)
		}
		sb.WriteString(fmt.Sprintf("- **%s**: %s\n", server.Name, status))
	}

	sb.WriteString("\nTo manage servers, use the CLI commands:\n")
	sb.WriteString("- `john mcp add <name> <command> [args...]` - Add a server\n")
	sb.WriteString("- `john mcp remove <name>` - Remove a server\n")
	sb.WriteString("- `john mcp list` - List all servers\n")

	return "<command-message>Showing MCP server status</command-message>",
		sb.String(),
		nil
}

// GetManager returns the MCP manager for external use
func (c *MCPCommand) GetManager() *mcp.Manager {
	return c.manager
}
