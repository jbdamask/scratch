package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/jbdamask/john-code/pkg/agent"
	"github.com/jbdamask/john-code/pkg/config"
	"github.com/jbdamask/john-code/pkg/mcp"
	"github.com/jbdamask/john-code/pkg/ui"
)

func main() {
	// Check for subcommands
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "mcp":
			handleMCPCommand(os.Args[2:])
			return
		case "help", "--help", "-h":
			printHelp()
			return
		case "version", "--version", "-v":
			fmt.Println("John Code v0.1.0")
			return
		}
	}

	// Default: run interactive agent
	fmt.Println("Starting John Code...")

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading config: %v\n", err)
		os.Exit(1)
	}

	ui := ui.New()
	ag := agent.New(cfg, ui)

	if err := ag.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func printHelp() {
	fmt.Println(`John Code - AI Coding Assistant

Usage:
  john                    Start interactive session
  john mcp <command>      Manage MCP servers
  john help               Show this help message
  john version            Show version

MCP Commands:
  john mcp add <name> <command> [args...]   Add an MCP server
  john mcp add <name> --json '<config>'     Add server from JSON config
  john mcp remove <name>                    Remove an MCP server
  john mcp list                             List configured servers

Examples:
  john mcp add playwright npx @anthropic-ai/mcp-playwright
  john mcp add filesystem npx -y @anthropic-ai/mcp-filesystem /path/to/dir
  john mcp list
  john mcp remove playwright`)
}

func handleMCPCommand(args []string) {
	if len(args) == 0 {
		fmt.Println("Usage: john mcp <add|remove|list>")
		os.Exit(1)
	}

	switch args[0] {
	case "add":
		handleMCPAdd(args[1:])
	case "remove", "rm":
		handleMCPRemove(args[1:])
	case "list", "ls":
		handleMCPList()
	default:
		fmt.Fprintf(os.Stderr, "Unknown MCP command: %s\n", args[0])
		os.Exit(1)
	}
}

func handleMCPAdd(args []string) {
	if len(args) < 2 {
		fmt.Println("Usage: john mcp add <name> <command> [args...]")
		fmt.Println("       john mcp add <name> --json '<config>'")
		os.Exit(1)
	}

	name := args[0]
	var serverConfig mcp.ServerConfig

	// Check for JSON config
	if args[1] == "--json" {
		if len(args) < 3 {
			fmt.Println("Error: --json requires a JSON configuration string")
			os.Exit(1)
		}
		if err := json.Unmarshal([]byte(args[2]), &serverConfig); err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing JSON config: %v\n", err)
			os.Exit(1)
		}
	} else {
		serverConfig = mcp.ServerConfig{
			Command: args[1],
			Args:    args[2:],
		}
	}

	// Parse optional flags
	scope := mcp.ScopeUser
	for i, arg := range args {
		if arg == "--scope" && i+1 < len(args) {
			switch args[i+1] {
			case "user":
				scope = mcp.ScopeUser
			case "project":
				scope = mcp.ScopeProject
			case "local":
				scope = mcp.ScopeLocal
			default:
				fmt.Fprintf(os.Stderr, "Unknown scope: %s\n", args[i+1])
				os.Exit(1)
			}
		}
	}

	if err := mcp.AddServer(name, serverConfig, scope); err != nil {
		fmt.Fprintf(os.Stderr, "Error adding server: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Added MCP server %q\n", name)
	fmt.Printf("Command: %s %s\n", serverConfig.Command, strings.Join(serverConfig.Args, " "))
}

func handleMCPRemove(args []string) {
	if len(args) < 1 {
		fmt.Println("Usage: john mcp remove <name>")
		os.Exit(1)
	}

	name := args[0]
	scope := mcp.ScopeUser

	// Try to remove from user scope first, then project
	err := mcp.RemoveServer(name, scope)
	if err != nil {
		// Try project scope
		err = mcp.RemoveServer(name, mcp.ScopeProject)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error removing server: %v\n", err)
			os.Exit(1)
		}
	}

	fmt.Printf("Removed MCP server %q\n", name)
}

func handleMCPList() {
	config, err := mcp.LoadAllConfigs()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading config: %v\n", err)
		os.Exit(1)
	}

	if len(config.MCPServers) == 0 {
		fmt.Println("No MCP servers configured")
		fmt.Println("\nTo add a server:")
		fmt.Println("  john mcp add <name> <command> [args...]")
		return
	}

	fmt.Println("Configured MCP servers:")
	for name, server := range config.MCPServers {
		fmt.Printf("  %s\n", name)
		fmt.Printf("    Command: %s\n", server.Command)
		if len(server.Args) > 0 {
			fmt.Printf("    Args: %s\n", strings.Join(server.Args, " "))
		}
		if len(server.Env) > 0 {
			fmt.Printf("    Env: %v\n", server.Env)
		}
		fmt.Println()
	}
}
