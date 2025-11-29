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

const DefaultAnthropicEndpoint = "https://api.anthropic.com/v1/messages"

type AnthropicClient struct {
	apiKey   string
	endpoint string
	model    string
	client   *http.Client
}

func NewAnthropicClient(apiKey string, baseURL string, model string) *AnthropicClient {
    endpoint := DefaultAnthropicEndpoint
    if baseURL != "" {
        // Construct endpoint from baseURL
        // If baseURL ends with /, remove it
        baseURL = strings.TrimSuffix(baseURL, "/")
        // If baseURL doesn't end with /v1/messages, append it? 
        // Usually users provide the base e.g. https://api.anthropic.com
        // But for flexibility, if they provide full path, use it?
        // Let's assume they provide base.
        
        // Simple heuristic: if it contains "messages", trust it.
        if strings.Contains(baseURL, "/messages") {
            endpoint = baseURL
        } else {
            endpoint = baseURL + "/v1/messages"
        }
    }

	if model == "" {
		model = "claude-sonnet-4-5-20250929" // Default model
	}

	return &AnthropicClient{
		apiKey:   apiKey,
		endpoint: endpoint,
		model:    model,
		client:   &http.Client{},
	}
}

// API Request Structures

type apiRequest struct {
	Model     string         `json:"model"`
	MaxTokens int            `json:"max_tokens"`
	Messages  []apiMessage   `json:"messages"`
	Tools     []interface{}  `json:"tools,omitempty"`
	System    string         `json:"system,omitempty"`
	Stream    bool           `json:"stream,omitempty"`
}

type apiMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // string or []apiContentBlock
}

type apiContentBlock struct {
	Type      string      `json:"type"`
	Text      string      `json:"text,omitempty"`
	ID        string      `json:"id,omitempty"`
	Name      string      `json:"name,omitempty"`
	Input     interface{} `json:"input,omitempty"` // map[string]interface{}
    ToolUseID string      `json:"tool_use_id,omitempty"`
    Content   string      `json:"content,omitempty"` // For tool_result
    Source    *apiImageSource `json:"source,omitempty"` // For image
}

type apiImageSource struct {
    Type      string `json:"type"`
    MediaType string `json:"media_type"`
    Data      string `json:"data"`
}

// SSE Event Structures
type sseEvent struct {
    Type         string          `json:"type"`
    Delta        *sseDelta       `json:"delta,omitempty"`
    ContentBlock *apiContentBlock `json:"content_block,omitempty"`
    Index        int             `json:"index,omitempty"`
    Error        *apiError       `json:"error,omitempty"`
}

type sseDelta struct {
    Type        string `json:"type"`
    Text        string `json:"text,omitempty"`
    PartialJSON string `json:"partial_json,omitempty"`
}

type apiError struct {
    Type    string `json:"type"`
    Message string `json:"message"`
}

func (c *AnthropicClient) Generate(ctx context.Context, messages []Message, tools []interface{}) (*Message, error) {
    // Wrapper around GenerateStream with no output channel
    return c.GenerateStream(ctx, messages, tools, nil)
}

func (c *AnthropicClient) GenerateStream(ctx context.Context, messages []Message, tools []interface{}, outputChan chan<- string) (*Message, error) {
	apiMessages := make([]apiMessage, 0, len(messages))
    var systemPrompt string

	for _, msg := range messages {
        if msg.Role == RoleSystem {
            systemPrompt = msg.Content
            continue
        }

		apiMsg := apiMessage{
			Role: string(msg.Role),
		}

        if msg.Role == RoleUser {
            if len(msg.Images) > 0 {
                var blocks []apiContentBlock
                
                // Add text if present
                if msg.Content != "" {
                    blocks = append(blocks, apiContentBlock{
                        Type: "text",
                        Text: msg.Content,
                    })
                }
                
                // Add images
                for _, imgPath := range msg.Images {
                    data, err := os.ReadFile(imgPath)
                    if err != nil {
                         // Warn but skip? Or error? 
                         // For now, skip and log to stderr in real app, here just append error text?
                         continue
                    }
                    
                    // Detect mime type
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
                        // Default or skip?
                        mediaType = "image/jpeg"
                    }
                    
                    encoded := base64.StdEncoding.EncodeToString(data)
                    
                    blocks = append(blocks, apiContentBlock{
                        Type: "image",
                        Source: &apiImageSource{
                            Type: "base64",
                            MediaType: mediaType,
                            Data: encoded,
                        },
                    })
                }
                apiMsg.Content = blocks
            } else {
                apiMsg.Content = msg.Content
            }
        } else if msg.Role == RoleAssistant {
             var blocks []apiContentBlock
             if msg.Content != "" {
                 blocks = append(blocks, apiContentBlock{
                     Type: "text",
                     Text: msg.Content,
                 })
             }
             for _, tc := range msg.ToolCalls {
                 blocks = append(blocks, apiContentBlock{
                     Type: "tool_use",
                     ID: tc.ID,
                     Name: tc.Name,
                     Input: tc.Args,
                 })
             }
             apiMsg.Content = blocks
        } else if msg.Role == RoleTool {
            apiMsg.Role = "user"
            blocks := []apiContentBlock{
                {
                    Type: "tool_result",
                    ToolUseID: msg.ToolResult.ToolCallID,
                    Content: msg.ToolResult.Content,
                },
            }
             apiMsg.Content = blocks
        }

		apiMessages = append(apiMessages, apiMsg)
	}

	reqBody := apiRequest{
		Model:     c.model,
		MaxTokens: 8192,
		Messages:  apiMessages,
		Tools:     tools,
		System:    systemPrompt,
		Stream:    true,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        bodyBytes, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(bodyBytes))
    }

    // Accumulators for final message
    finalMsg := &Message{
        Role: RoleAssistant,
        ToolCalls: []ToolCall{},
    }
    
    // We need to track tool calls being built
    // Map from index to ToolCall builder
    type toolBuilder struct {
        ID string
        Name string
        JSONBuffer string
    }
    toolBuilders := make(map[int]*toolBuilder)
    
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
        
        var event sseEvent
        if err := json.Unmarshal([]byte(data), &event); err != nil {
            // log error?
            continue
        }
        
        switch event.Type {
        case "error":
            if event.Error != nil {
                return nil, fmt.Errorf("API stream error: %s", event.Error.Message)
            }
        case "content_block_start":
            if event.ContentBlock != nil {
                if event.ContentBlock.Type == "tool_use" {
                    toolBuilders[event.Index] = &toolBuilder{
                        ID: event.ContentBlock.ID,
                        Name: event.ContentBlock.Name,
                    }
                }
                // If text, nothing special needed, handled in deltas
            }
        case "content_block_delta":
            if event.Delta != nil {
                if event.Delta.Type == "text_delta" {
                    text := event.Delta.Text
                    finalMsg.Content += text
                    if outputChan != nil {
                        outputChan <- text
                    }
                } else if event.Delta.Type == "input_json_delta" {
                    if tb, ok := toolBuilders[event.Index]; ok {
                        tb.JSONBuffer += event.Delta.PartialJSON
                    }
                }
            }
        case "content_block_stop":
            if tb, ok := toolBuilders[event.Index]; ok {
                // Finish tool call
                var args map[string]interface{}
                if err := json.Unmarshal([]byte(tb.JSONBuffer), &args); err != nil {
                    // If unmarshal fails, maybe it's empty string or partial?
                    // For MVP, we ignore error or create empty map
                    args = make(map[string]interface{})
                }
                
                finalMsg.ToolCalls = append(finalMsg.ToolCalls, ToolCall{
                    ID: tb.ID,
                    Name: tb.Name,
                    Args: args,
                })
                delete(toolBuilders, event.Index)
            }
        case "message_stop":
            // Done
        }
    }

	return finalMsg, nil
}
