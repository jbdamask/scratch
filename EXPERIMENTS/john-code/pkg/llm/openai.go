package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const DefaultOpenAIEndpoint = "https://api.openai.com/v1/responses"

type OpenAIClient struct {
	apiKey   string
	endpoint string
	model    string
	client   *http.Client
}

func NewOpenAIClient(apiKey string, model string) *OpenAIClient {
	if model == "" {
		model = "gpt-4o"
	}

	return &OpenAIClient{
		apiKey:   apiKey,
		endpoint: DefaultOpenAIEndpoint,
		model:    model,
		client:   &http.Client{},
	}
}

// OpenAI Responses API structures
type openAIRequest struct {
	Model           string              `json:"model"`
	Input           []openAIInputItem   `json:"input"`
	Tools           []openAITool        `json:"tools,omitempty"`
	MaxOutputTokens int                 `json:"max_output_tokens,omitempty"`
	Stream          bool                `json:"stream,omitempty"`
	Instructions    string              `json:"instructions,omitempty"`
}

type openAIInputItem struct {
	Type      string      `json:"type,omitempty"`
	Role      string      `json:"role,omitempty"`
	Content   interface{} `json:"content,omitempty"`
	CallID    string      `json:"call_id,omitempty"`
	Output    string      `json:"output,omitempty"`
	Name      string      `json:"name,omitempty"`
	Arguments string      `json:"arguments,omitempty"`
}

type openAIContentPart struct {
	Type     string          `json:"type"`
	Text     string          `json:"text,omitempty"`
	ImageURL *openAIImageURL `json:"image_url,omitempty"`
}

type openAIImageURL struct {
	URL string `json:"url"`
}

type openAITool struct {
	Type        string         `json:"type"`
	Name        string         `json:"name,omitempty"`
	Description string         `json:"description,omitempty"`
	Parameters  interface{}    `json:"parameters,omitempty"`
}

// Streaming event structures for Responses API
type openAIStreamEvent struct {
	Type        string `json:"type"`
	ItemID      string `json:"item_id,omitempty"`
	OutputIndex int    `json:"output_index,omitempty"`
	Delta       string `json:"delta,omitempty"`
	Name        string `json:"name,omitempty"`
	CallID      string `json:"call_id,omitempty"`
	Arguments   string `json:"arguments,omitempty"`
}

// Response object structure
type openAIResponse struct {
	ID     string            `json:"id"`
	Output []openAIOutputItem `json:"output"`
	Status string            `json:"status"`
}

type openAIOutputItem struct {
	Type      string `json:"type"`
	ID        string `json:"id,omitempty"`
	CallID    string `json:"call_id,omitempty"`
	Name      string `json:"name,omitempty"`
	Arguments string `json:"arguments,omitempty"`
	Content   []struct {
		Type string `json:"type"`
		Text string `json:"text,omitempty"`
	} `json:"content,omitempty"`
}

func (c *OpenAIClient) Generate(ctx context.Context, messages []Message, tools []interface{}) (*Message, error) {
	return c.GenerateStream(ctx, messages, tools, nil)
}

func (c *OpenAIClient) GenerateStream(ctx context.Context, messages []Message, tools []interface{}, outputChan chan<- string) (*Message, error) {
	inputItems := make([]openAIInputItem, 0, len(messages))
	var systemInstruction string

	for _, msg := range messages {
		switch msg.Role {
		case RoleSystem:
			systemInstruction = msg.Content

		case RoleUser:
			item := openAIInputItem{
				Role: "user",
			}

			if len(msg.Images) > 0 {
				var parts []openAIContentPart
				if msg.Content != "" {
					parts = append(parts, openAIContentPart{
						Type: "input_text",
						Text: msg.Content,
					})
				}
				for _, imgPath := range msg.Images {
					data, err := os.ReadFile(imgPath)
					if err != nil {
						continue
					}
					ext := strings.ToLower(filepath.Ext(imgPath))
					var mediaType string
					switch ext {
					case ".jpg", ".jpeg":
						mediaType = "image/jpeg"
					case ".png":
						mediaType = "image/png"
					case ".gif":
						mediaType = "image/gif"
					case ".webp":
						mediaType = "image/webp"
					default:
						mediaType = "image/jpeg"
					}
					encoded := base64.StdEncoding.EncodeToString(data)
					parts = append(parts, openAIContentPart{
						Type: "input_image",
						ImageURL: &openAIImageURL{
							URL: fmt.Sprintf("data:%s;base64,%s", mediaType, encoded),
						},
					})
				}
				item.Content = parts
			} else {
				item.Content = msg.Content
			}
			inputItems = append(inputItems, item)

		case RoleAssistant:
			// For assistant messages with tool calls, we need to include the function_call items
			if len(msg.ToolCalls) > 0 {
				for _, tc := range msg.ToolCalls {
					argsJSON, _ := json.Marshal(tc.Args)
					inputItems = append(inputItems, openAIInputItem{
						Type:      "function_call",
						CallID:    tc.ID,
						Name:      tc.Name,
						Arguments: string(argsJSON),
					})
				}
			} else if msg.Content != "" {
				// Regular assistant text message
				inputItems = append(inputItems, openAIInputItem{
					Role:    "assistant",
					Content: msg.Content,
				})
			}

		case RoleTool:
			// Tool results use function_call_output type
			inputItems = append(inputItems, openAIInputItem{
				Type:   "function_call_output",
				CallID: msg.ToolResult.ToolCallID,
				Output: msg.ToolResult.Content,
			})
		}
	}

	// Convert tools to OpenAI format
	var openAITools []openAITool
	for _, t := range tools {
		var name, desc string
		var schema interface{}

		switch tool := t.(type) {
		case map[string]interface{}:
			name, _ = tool["name"].(string)
			desc, _ = tool["description"].(string)
			schema = tool["input_schema"]
		default:
			data, err := json.Marshal(t)
			if err != nil {
				continue
			}
			var toolMap map[string]interface{}
			if err := json.Unmarshal(data, &toolMap); err != nil {
				continue
			}
			name, _ = toolMap["name"].(string)
			desc, _ = toolMap["description"].(string)
			schema = toolMap["input_schema"]
		}

		if name != "" {
			openAITools = append(openAITools, openAITool{
				Type:        "function",
				Name:        name,
				Description: desc,
				Parameters:  schema,
			})
		}
	}

	reqBody := openAIRequest{
		Model:           c.model,
		Input:           inputItems,
		Tools:           openAITools,
		MaxOutputTokens: 16384,
		Stream:          true,
		Instructions:    systemInstruction,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Debug logging
	if os.Getenv("JOHN_DEBUG") != "" {
		debugFile, _ := os.OpenFile("/tmp/john_openai_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if debugFile != nil {
			debugFile.WriteString(fmt.Sprintf("\n=== REQUEST %s ===\n", c.model))
			debugFile.WriteString(string(jsonData))
			debugFile.WriteString("\n")
			debugFile.Close()
		}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		if os.Getenv("JOHN_DEBUG") != "" {
			debugFile, _ := os.OpenFile("/tmp/john_openai_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if debugFile != nil {
				debugFile.WriteString(fmt.Sprintf("\n=== ERROR %d ===\n", resp.StatusCode))
				debugFile.WriteString(string(bodyBytes))
				debugFile.WriteString("\n")
				debugFile.Close()
			}
		}
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	finalMsg := &Message{
		Role:      RoleAssistant,
		ToolCalls: []ToolCall{},
	}

	// Track function calls being built
	type funcCallBuilder struct {
		CallID     string
		Name       string
		ArgsBuffer string
	}
	funcCallBuilders := make(map[string]*funcCallBuilder)

	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, fmt.Errorf("error reading stream: %w", err)
		}

		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}

		// Debug log stream events
		if os.Getenv("JOHN_DEBUG") != "" {
			debugFile, _ := os.OpenFile("/tmp/john_openai_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if debugFile != nil {
				debugFile.WriteString(fmt.Sprintf("STREAM: %s\n", data))
				debugFile.Close()
			}
		}

		var event openAIStreamEvent
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}

		switch event.Type {
		case "response.output_text.delta":
			// Text content delta
			if event.Delta != "" {
				finalMsg.Content += event.Delta
				if outputChan != nil {
					outputChan <- event.Delta
				}
			}

		case "response.function_call_arguments.delta":
			// Function call arguments streaming
			if event.CallID != "" {
				if _, exists := funcCallBuilders[event.CallID]; !exists {
					funcCallBuilders[event.CallID] = &funcCallBuilder{
						CallID: event.CallID,
					}
				}
				funcCallBuilders[event.CallID].ArgsBuffer += event.Delta
			}

		case "response.function_call_arguments.done":
			// Function call complete
			if event.CallID != "" {
				if builder, exists := funcCallBuilders[event.CallID]; exists {
					builder.Name = event.Name
					if event.Arguments != "" {
						builder.ArgsBuffer = event.Arguments
					}
				} else {
					funcCallBuilders[event.CallID] = &funcCallBuilder{
						CallID:     event.CallID,
						Name:       event.Name,
						ArgsBuffer: event.Arguments,
					}
				}
			}

		case "response.output_item.added":
			// New output item - might be a function call
			// The name comes in this event for function calls

		case "response.completed", "response.done":
			// Response complete - finalize
		}
	}

	// Finalize function calls
	for _, builder := range funcCallBuilders {
		var args map[string]interface{}
		if err := json.Unmarshal([]byte(builder.ArgsBuffer), &args); err != nil {
			args = make(map[string]interface{})
		}
		finalMsg.ToolCalls = append(finalMsg.ToolCalls, ToolCall{
			ID:   builder.CallID,
			Name: builder.Name,
			Args: args,
		})
	}

	return finalMsg, nil
}
