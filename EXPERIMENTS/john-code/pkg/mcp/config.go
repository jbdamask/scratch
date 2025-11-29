package mcp

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// ServerConfig represents the configuration for a single MCP server
type ServerConfig struct {
	Command string            `json:"command"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
}

// MCPConfig represents the full MCP configuration file
type MCPConfig struct {
	MCPServers map[string]ServerConfig `json:"mcpServers"`
}

// Scope represents where the MCP config is stored
type Scope string

const (
	ScopeUser    Scope = "user"    // ~/.config/john-code/mcp.json
	ScopeProject Scope = "project" // .mcp.json in project root
	ScopeLocal   Scope = "local"   // .mcp.json in current directory (private)
)

// GetConfigPath returns the path to the MCP config file for the given scope
func GetConfigPath(scope Scope) (string, error) {
	switch scope {
	case ScopeUser:
		home, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("failed to get home directory: %w", err)
		}
		return filepath.Join(home, ".config", "john-code", "mcp.json"), nil
	case ScopeProject, ScopeLocal:
		cwd, err := os.Getwd()
		if err != nil {
			return "", fmt.Errorf("failed to get working directory: %w", err)
		}
		return filepath.Join(cwd, ".mcp.json"), nil
	default:
		return "", fmt.Errorf("unknown scope: %s", scope)
	}
}

// LoadConfig loads MCP configuration from a file
func LoadConfig(path string) (*MCPConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &MCPConfig{MCPServers: make(map[string]ServerConfig)}, nil
		}
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config MCPConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	if config.MCPServers == nil {
		config.MCPServers = make(map[string]ServerConfig)
	}

	return &config, nil
}

// SaveConfig saves MCP configuration to a file
func SaveConfig(path string, config *MCPConfig) error {
	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// LoadAllConfigs loads and merges MCP configs from all scopes
// Precedence: local > project > user
func LoadAllConfigs() (*MCPConfig, error) {
	merged := &MCPConfig{MCPServers: make(map[string]ServerConfig)}

	// Load in order of lowest to highest precedence
	for _, scope := range []Scope{ScopeUser, ScopeProject} {
		path, err := GetConfigPath(scope)
		if err != nil {
			continue
		}

		config, err := LoadConfig(path)
		if err != nil {
			continue // Skip if file doesn't exist or can't be read
		}

		// Merge servers (later scopes override earlier ones)
		for name, server := range config.MCPServers {
			merged.MCPServers[name] = server
		}
	}

	return merged, nil
}

// AddServer adds a server to the config at the specified scope
func AddServer(name string, server ServerConfig, scope Scope) error {
	path, err := GetConfigPath(scope)
	if err != nil {
		return err
	}

	config, err := LoadConfig(path)
	if err != nil {
		return err
	}

	config.MCPServers[name] = server
	return SaveConfig(path, config)
}

// RemoveServer removes a server from the config at the specified scope
func RemoveServer(name string, scope Scope) error {
	path, err := GetConfigPath(scope)
	if err != nil {
		return err
	}

	config, err := LoadConfig(path)
	if err != nil {
		return err
	}

	if _, exists := config.MCPServers[name]; !exists {
		return fmt.Errorf("server %q not found in %s config", name, scope)
	}

	delete(config.MCPServers, name)
	return SaveConfig(path, config)
}
