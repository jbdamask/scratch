package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

// Manager handles multiple MCP server connections
type Manager struct {
	clients map[string]*Client
	mu      sync.RWMutex
}

// NewManager creates a new MCP manager
func NewManager() *Manager {
	return &Manager{
		clients: make(map[string]*Client),
	}
}

// LoadAndConnect loads all configured servers and connects to them
func (m *Manager) LoadAndConnect(ctx context.Context) error {
	config, err := LoadAllConfigs()
	if err != nil {
		return fmt.Errorf("failed to load MCP configs: %w", err)
	}

	for name, serverConfig := range config.MCPServers {
		if err := m.ConnectServer(ctx, name, serverConfig); err != nil {
			// Log error but continue with other servers
			fmt.Printf("Warning: failed to connect to MCP server %q: %v\n", name, err)
		}
	}

	return nil
}

// ConnectServer connects to a specific MCP server
func (m *Manager) ConnectServer(ctx context.Context, name string, config ServerConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Close existing connection if any
	if existing, ok := m.clients[name]; ok {
		existing.Close()
	}

	client, err := NewClient(name, config)
	if err != nil {
		return err
	}

	if err := client.Connect(ctx); err != nil {
		return err
	}

	m.clients[name] = client
	return nil
}

// DisconnectServer disconnects from a specific server
func (m *Manager) DisconnectServer(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	client, ok := m.clients[name]
	if !ok {
		return fmt.Errorf("server %q not connected", name)
	}

	delete(m.clients, name)
	return client.Close()
}

// GetClient returns a client by name
func (m *Manager) GetClient(name string) (*Client, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	client, ok := m.clients[name]
	return client, ok
}

// ListServers returns information about all servers
func (m *Manager) ListServers() []ServerStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// First get configured servers
	config, _ := LoadAllConfigs()

	statuses := make([]ServerStatus, 0)
	
	// Add connected servers
	for name, client := range m.clients {
		statuses = append(statuses, ServerStatus{
			Name:      name,
			Connected: client.Connected(),
			ToolCount: len(client.Tools()),
		})
	}

	// Add configured but not connected servers
	if config != nil {
		for name := range config.MCPServers {
			if _, connected := m.clients[name]; !connected {
				statuses = append(statuses, ServerStatus{
					Name:      name,
					Connected: false,
					ToolCount: 0,
				})
			}
		}
	}

	return statuses
}

// ServerStatus represents the status of an MCP server
type ServerStatus struct {
	Name      string
	Connected bool
	ToolCount int
}

// GetAllTools returns all tools from all connected servers
// Tool names are prefixed with mcp__<server>__
func (m *Manager) GetAllTools() []MCPToolDefinition {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var tools []MCPToolDefinition
	for serverName, client := range m.clients {
		if !client.Connected() {
			continue
		}
		for _, tool := range client.Tools() {
			tools = append(tools, MCPToolDefinition{
				ServerName:  serverName,
				Name:        fmt.Sprintf("mcp__%s__%s", serverName, tool.Name),
				OriginalName: tool.Name,
				Description: tool.Description,
				InputSchema: tool.InputSchema,
			})
		}
	}
	return tools
}

// MCPToolDefinition represents a tool exposed by an MCP server
type MCPToolDefinition struct {
	ServerName   string
	Name         string // Full name: mcp__<server>__<tool>
	OriginalName string // Original tool name on the server
	Description  string
	InputSchema  json.RawMessage
}

// CallTool calls a tool on the appropriate server
func (m *Manager) CallTool(ctx context.Context, serverName, toolName string, arguments json.RawMessage) (string, error) {
	m.mu.RLock()
	client, ok := m.clients[serverName]
	m.mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("server %q not connected", serverName)
	}

	result, err := client.CallTool(ctx, toolName, arguments)
	if err != nil {
		return "", err
	}

	// Concatenate all text content
	var output string
	for _, content := range result.Content {
		if content.Type == "text" {
			output += content.Text
		}
	}

	if result.IsError {
		return "", fmt.Errorf("tool error: %s", output)
	}

	return output, nil
}

// Close closes all server connections
func (m *Manager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, client := range m.clients {
		client.Close()
	}
	m.clients = make(map[string]*Client)
}
