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

const GeminiAPIBase = "https://generativelanguage.googleapis.com/v1beta/models"

type GeminiClient struct {
	apiKey   string
	model    string
	client   *http.Client
}

func NewGeminiClient(apiKey string, model string) *GeminiClient {
	if model == "" {
		model = "gemini-2.5-flash"
	}

	return &GeminiClient{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{},
	}
}

// Gemini API structures
type geminiRequest struct {
	Contents          []geminiContent         `json:"contents"`
	Tools             []geminiTool            `json:"tools,omitempty"`
	ToolConfig        *geminiToolConfig       `json:"toolConfig,omitempty"`
	SystemInstruction *geminiContent          `json:"systemInstruction,omitempty"`
	GenerationConfig  *geminiGenerationConfig `json:"generationConfig,omitempty"`
}

type geminiToolConfig struct {
	FunctionCallingConfig *geminiFunctionCallingConfig `json:"functionCallingConfig,omitempty"`
}

type geminiFunctionCallingConfig struct {
	Mode string `json:"mode"` // AUTO, ANY, NONE, VALIDATED
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text             string                `json:"text,omitempty"`
	InlineData       *geminiInlineData     `json:"inlineData,omitempty"`
	FunctionCall     *geminiFunctionCall   `json:"functionCall,omitempty"`
	FunctionResponse *geminiFunctionResponse `json:"functionResponse,omitempty"`
}

type geminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiFunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type geminiFunctionResponse struct {
	Name     string                 `json:"name"`
	Response map[string]interface{} `json:"response"`
}

type geminiTool struct {
	FunctionDeclarations []geminiFunctionDeclaration `json:"functionDeclarations"`
}

type geminiFunctionDeclaration struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  interface{} `json:"parameters"`
}

type geminiGenerationConfig struct {
	MaxOutputTokens int `json:"maxOutputTokens,omitempty"`
}

// Response structures
type geminiResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
}

type geminiCandidate struct {
	Content       geminiContent `json:"content"`
	FinishReason  string        `json:"finishReason,omitempty"`
	FinishMessage string        `json:"finishMessage,omitempty"`
}

// Streaming structures
type geminiStreamChunk struct {
	Candidates []geminiCandidate `json:"candidates"`
}

func (c *GeminiClient) Generate(ctx context.Context, messages []Message, tools []interface{}) (*Message, error) {
	return c.GenerateStream(ctx, messages, tools, nil)
}

func (c *GeminiClient) GenerateStream(ctx context.Context, messages []Message, tools []interface{}, outputChan chan<- string) (*Message, error) {
	contents := make([]geminiContent, 0, len(messages))
	var systemInstruction *geminiContent

	for _, msg := range messages {
		switch msg.Role {
		case RoleSystem:
			systemInstruction = &geminiContent{
				Parts: []geminiPart{{Text: msg.Content}},
			}

		case RoleUser:
			content := geminiContent{
				Role:  "user",
				Parts: []geminiPart{},
			}

			if msg.Content != "" {
				content.Parts = append(content.Parts, geminiPart{Text: msg.Content})
			}

			for _, imgPath := range msg.Images {
				data, err := os.ReadFile(imgPath)
				if err != nil {
					continue
				}
				ext := strings.ToLower(filepath.Ext(imgPath))
				var mimeType string
				switch ext {
				case ".jpg", ".jpeg":
					mimeType = "image/jpeg"
				case ".png":
					mimeType = "image/png"
				case ".gif":
					mimeType = "image/gif"
				case ".webp":
					mimeType = "image/webp"
				default:
					mimeType = "image/jpeg"
				}
				encoded := base64.StdEncoding.EncodeToString(data)
				content.Parts = append(content.Parts, geminiPart{
					InlineData: &geminiInlineData{
						MimeType: mimeType,
						Data:     encoded,
					},
				})
			}

			contents = append(contents, content)

		case RoleAssistant:
			content := geminiContent{
				Role:  "model",
				Parts: []geminiPart{},
			}

			if msg.Content != "" {
				content.Parts = append(content.Parts, geminiPart{Text: msg.Content})
			}

			for _, tc := range msg.ToolCalls {
				content.Parts = append(content.Parts, geminiPart{
					FunctionCall: &geminiFunctionCall{
						Name: tc.Name,
						Args: tc.Args,
					},
				})
			}

			contents = append(contents, content)

		case RoleTool:
			// Gemini expects function responses with the function name
			content := geminiContent{
				Role: "function",
				Parts: []geminiPart{
					{
						FunctionResponse: &geminiFunctionResponse{
							Name: msg.ToolResult.ToolName,
							Response: map[string]interface{}{
								"result": msg.ToolResult.Content,
							},
						},
					},
				},
			}
			contents = append(contents, content)
		}
	}

	// Convert tools to Gemini format
	var geminiTools []geminiTool
	var funcDecls []geminiFunctionDeclaration
	for _, t := range tools {
		var name, desc string
		var schema interface{}

		// Handle both ToolDefinition struct and map[string]interface{}
		switch tool := t.(type) {
		case map[string]interface{}:
			name, _ = tool["name"].(string)
			desc, _ = tool["description"].(string)
			schema = tool["input_schema"]
		default:
			// Try to extract via JSON marshaling (handles ToolDefinition)
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
			// Sanitize schema for Gemini compatibility
			sanitizedSchema := sanitizeSchemaForGemini(schema)
			funcDecls = append(funcDecls, geminiFunctionDeclaration{
				Name:        name,
				Description: desc,
				Parameters:  sanitizedSchema,
			})
		}
	}
	if len(funcDecls) > 0 {
		geminiTools = append(geminiTools, geminiTool{
			FunctionDeclarations: funcDecls,
		})
	}

	reqBody := geminiRequest{
		Contents:          contents,
		Tools:             geminiTools,
		SystemInstruction: systemInstruction,
		GenerationConfig: &geminiGenerationConfig{
			MaxOutputTokens: 8192,
		},
	}

	// Add toolConfig if we have tools - use AUTO mode for flexibility
	if len(geminiTools) > 0 {
		reqBody.ToolConfig = &geminiToolConfig{
			FunctionCallingConfig: &geminiFunctionCallingConfig{
				Mode: "AUTO",
			},
		}
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Debug: Log request to file for diagnostics
	if os.Getenv("JOHN_DEBUG") != "" {
		debugFile, _ := os.OpenFile("/tmp/john_gemini_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if debugFile != nil {
			debugFile.WriteString(fmt.Sprintf("\n=== REQUEST %s ===\n", c.model))
			debugFile.WriteString(string(jsonData))
			debugFile.WriteString("\n")
			debugFile.Close()
		}
	}

	// Gemini uses different endpoint for streaming
	endpoint := fmt.Sprintf("%s/%s:streamGenerateContent?key=%s&alt=sse",
		GeminiAPIBase, c.model, c.apiKey)

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		// Debug: Log error response
		if os.Getenv("JOHN_DEBUG") != "" {
			debugFile, _ := os.OpenFile("/tmp/john_gemini_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if debugFile != nil {
				debugFile.WriteString(fmt.Sprintf("\n=== ERROR RESPONSE %d ===\n", resp.StatusCode))
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

	reader := bufio.NewReader(resp.Body)
	toolCallIndex := 0

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
		if data == "" {
			continue
		}

		// Debug: Log raw stream data
		if os.Getenv("JOHN_DEBUG") != "" {
			debugFile, _ := os.OpenFile("/tmp/john_gemini_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if debugFile != nil {
				debugFile.WriteString(fmt.Sprintf("STREAM: %s\n", data))
				debugFile.Close()
			}
		}

		var chunk geminiStreamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}

		for _, candidate := range chunk.Candidates {
			// Check for malformed function call error
			if candidate.FinishReason == "MALFORMED_FUNCTION_CALL" {
				// Gemini generated code-style function call instead of JSON
				// Return an error message as content so the agent can try again
				errMsg := "I encountered an issue with tool formatting. Let me try a different approach.\n"
				if outputChan != nil {
					outputChan <- errMsg
				}
				finalMsg.Content = errMsg
				return finalMsg, nil
			}

			for _, part := range candidate.Content.Parts {
				if part.Text != "" {
					finalMsg.Content += part.Text
					if outputChan != nil {
						outputChan <- part.Text
					}
				}

				if part.FunctionCall != nil {
					finalMsg.ToolCalls = append(finalMsg.ToolCalls, ToolCall{
						ID:   fmt.Sprintf("call_%d", toolCallIndex),
						Name: part.FunctionCall.Name,
						Args: part.FunctionCall.Args,
					})
					toolCallIndex++
				}
			}
		}
	}

	return finalMsg, nil
}

// sanitizeSchemaForGemini removes JSON Schema fields that Gemini doesn't support.
// Gemini uses a subset of OpenAPI schema and rejects standard JSON Schema fields
// like $schema, additionalProperties, etc.
func sanitizeSchemaForGemini(schema interface{}) interface{} {
	if schema == nil {
		return nil
	}

	schemaMap, ok := schema.(map[string]interface{})
	if !ok {
		return schema
	}

	// Fields to remove (not supported by Gemini's OpenAPI subset)
	unsupportedFields := []string{
		"$schema",
		"additionalProperties",
		"$id",
		"$ref",
		"$defs",
		"definitions",
		"default",
		"examples",
		"const",
		"contentMediaType",
		"contentEncoding",
		"if",
		"then",
		"else",
		"allOf",
		"anyOf",
		"oneOf",
		"not",
		"patternProperties",
		"propertyNames",
		"unevaluatedProperties",
		"unevaluatedItems",
		"dependentSchemas",
		"dependentRequired",
		"minContains",
		"maxContains",
		"contains",
	}

	result := make(map[string]interface{})
	for key, value := range schemaMap {
		// Skip unsupported fields
		skip := false
		for _, unsupported := range unsupportedFields {
			if key == unsupported {
				skip = true
				break
			}
		}
		if skip {
			continue
		}

		// Convert "type" values to uppercase (Gemini requires STRING, OBJECT, ARRAY, etc.)
		if key == "type" {
			if typeStr, ok := value.(string); ok {
				result[key] = strings.ToUpper(typeStr)
				continue
			}
		}

		// Recursively sanitize nested objects
		switch v := value.(type) {
		case map[string]interface{}:
			result[key] = sanitizeSchemaForGemini(v)
		case []interface{}:
			// Handle arrays (e.g., items in array schemas, or allOf/anyOf arrays)
			sanitized := make([]interface{}, len(v))
			for i, item := range v {
				if itemMap, ok := item.(map[string]interface{}); ok {
					sanitized[i] = sanitizeSchemaForGemini(itemMap)
				} else {
					sanitized[i] = item
				}
			}
			result[key] = sanitized
		default:
			result[key] = value
		}
	}

	return result
}
