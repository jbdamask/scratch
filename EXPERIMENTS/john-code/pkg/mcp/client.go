package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"sync/atomic"
)

// JSON-RPC message types
type JSONRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int64       `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *JSONRPCError   `json:"error,omitempty"`
}

type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// MCP protocol types
type InitializeParams struct {
	ProtocolVersion string     `json:"protocolVersion"`
	Capabilities    Capability `json:"capabilities"`
	ClientInfo      ClientInfo `json:"clientInfo"`
}

type Capability struct {
	Roots *RootsCapability `json:"roots,omitempty"`
}

type RootsCapability struct {
	ListChanged bool `json:"listChanged"`
}

type ClientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type InitializeResult struct {
	ProtocolVersion string           `json:"protocolVersion"`
	Capabilities    ServerCapability `json:"capabilities"`
	ServerInfo      ServerInfo       `json:"serverInfo"`
}

type ServerCapability struct {
	Tools *ToolsCapability `json:"tools,omitempty"`
}

type ToolsCapability struct {
	ListChanged bool `json:"listChanged,omitempty"`
}

type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	InputSchema json.RawMessage `json:"inputSchema"`
}

type ListToolsResult struct {
	Tools []Tool `json:"tools"`
}

type CallToolParams struct {
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments,omitempty"`
}

type CallToolResult struct {
	Content []ToolContent `json:"content"`
	IsError bool          `json:"isError,omitempty"`
}

type ToolContent struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

// Client represents a connection to an MCP server
type Client struct {
	name      string
	cmd       *exec.Cmd
	stdin     io.WriteCloser
	stdout    io.ReadCloser
	scanner   *bufio.Scanner
	requestID int64
	mu        sync.Mutex
	pending   map[int64]chan *JSONRPCResponse
	tools     []Tool
	connected bool
}

// NewClient creates a new MCP client for a server
func NewClient(name string, config ServerConfig) (*Client, error) {
	// Expand environment variables in command and args
	command := os.ExpandEnv(config.Command)
	args := make([]string, len(config.Args))
	for i, arg := range config.Args {
		args[i] = os.ExpandEnv(arg)
	}

	cmd := exec.Command(command, args...)

	// Set environment variables
	cmd.Env = os.Environ()
	for k, v := range config.Env {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, os.ExpandEnv(v)))
	}

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	// Capture stderr for debugging
	cmd.Stderr = os.Stderr

	client := &Client{
		name:    name,
		cmd:     cmd,
		stdin:   stdin,
		stdout:  stdout,
		scanner: bufio.NewScanner(stdout),
		pending: make(map[int64]chan *JSONRPCResponse),
	}

	// Use larger buffer for scanner
	buf := make([]byte, 1024*1024) // 1MB buffer
	client.scanner.Buffer(buf, len(buf))

	return client, nil
}

// Connect starts the server process and initializes the connection
func (c *Client) Connect(ctx context.Context) error {
	if err := c.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start server: %w", err)
	}

	// Start response reader
	go c.readResponses()

	// Send initialize request
	result, err := c.Initialize(ctx)
	if err != nil {
		c.Close()
		return fmt.Errorf("failed to initialize: %w", err)
	}

	_ = result // Could log server info here

	// Send initialized notification
	if err := c.sendNotification("notifications/initialized", nil); err != nil {
		c.Close()
		return fmt.Errorf("failed to send initialized notification: %w", err)
	}

	// Get list of tools
	tools, err := c.ListTools(ctx)
	if err != nil {
		c.Close()
		return fmt.Errorf("failed to list tools: %w", err)
	}

	c.tools = tools
	c.connected = true
	return nil
}

// Initialize sends the initialize request to the server
func (c *Client) Initialize(ctx context.Context) (*InitializeResult, error) {
	params := InitializeParams{
		ProtocolVersion: "2024-11-05",
		Capabilities: Capability{
			Roots: &RootsCapability{ListChanged: true},
		},
		ClientInfo: ClientInfo{
			Name:    "john-code",
			Version: "0.1.0",
		},
	}

	resp, err := c.sendRequest(ctx, "initialize", params)
	if err != nil {
		return nil, err
	}

	var result InitializeResult
	if err := json.Unmarshal(resp.Result, &result); err != nil {
		return nil, fmt.Errorf("failed to parse initialize result: %w", err)
	}

	return &result, nil
}

// ListTools gets the list of available tools from the server
func (c *Client) ListTools(ctx context.Context) ([]Tool, error) {
	resp, err := c.sendRequest(ctx, "tools/list", nil)
	if err != nil {
		return nil, err
	}

	var result ListToolsResult
	if err := json.Unmarshal(resp.Result, &result); err != nil {
		return nil, fmt.Errorf("failed to parse tools list: %w", err)
	}

	return result.Tools, nil
}

// CallTool invokes a tool on the server
func (c *Client) CallTool(ctx context.Context, name string, arguments json.RawMessage) (*CallToolResult, error) {
	params := CallToolParams{
		Name:      name,
		Arguments: arguments,
	}

	resp, err := c.sendRequest(ctx, "tools/call", params)
	if err != nil {
		return nil, err
	}

	var result CallToolResult
	if err := json.Unmarshal(resp.Result, &result); err != nil {
		return nil, fmt.Errorf("failed to parse tool result: %w", err)
	}

	return &result, nil
}

// Tools returns the list of available tools
func (c *Client) Tools() []Tool {
	return c.tools
}

// Name returns the server name
func (c *Client) Name() string {
	return c.name
}

// Connected returns whether the client is connected
func (c *Client) Connected() bool {
	return c.connected
}

// Close shuts down the connection and server process
func (c *Client) Close() error {
	c.connected = false
	c.stdin.Close()
	c.stdout.Close()
	if c.cmd.Process != nil {
		c.cmd.Process.Kill()
	}
	return c.cmd.Wait()
}

func (c *Client) sendRequest(ctx context.Context, method string, params interface{}) (*JSONRPCResponse, error) {
	id := atomic.AddInt64(&c.requestID, 1)

	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params:  params,
	}

	// Create response channel
	respChan := make(chan *JSONRPCResponse, 1)
	c.mu.Lock()
	c.pending[id] = respChan
	c.mu.Unlock()

	defer func() {
		c.mu.Lock()
		delete(c.pending, id)
		c.mu.Unlock()
	}()

	// Send request
	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	c.mu.Lock()
	_, err = fmt.Fprintf(c.stdin, "%s\n", data)
	c.mu.Unlock()
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	// Wait for response
	select {
	case resp := <-respChan:
		if resp.Error != nil {
			return nil, fmt.Errorf("RPC error %d: %s", resp.Error.Code, resp.Error.Message)
		}
		return resp, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (c *Client) sendNotification(method string, params interface{}) error {
	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      0, // Notifications don't have an ID
		Method:  method,
		Params:  params,
	}

	data, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	_, err = fmt.Fprintf(c.stdin, "%s\n", data)
	return err
}

func (c *Client) readResponses() {
	for c.scanner.Scan() {
		line := c.scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var resp JSONRPCResponse
		if err := json.Unmarshal(line, &resp); err != nil {
			continue // Skip malformed responses
		}

		// Route response to waiting request
		c.mu.Lock()
		if ch, ok := c.pending[resp.ID]; ok {
			ch <- &resp
		}
		c.mu.Unlock()
	}
}
