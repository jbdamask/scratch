package llm

import "context"

type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleSystem    Role = "system"
    RoleTool      Role = "tool"
)

type ToolCall struct {
	ID   string                 `json:"id"`
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type ToolResult struct {
	ToolCallID string `json:"tool_use_id"`
	ToolName   string `json:"tool_name"` // Needed for Gemini function responses
	Content    string `json:"content"`
}

type Message struct {
	Role       Role        `json:"role"`
	Content    string      `json:"content"`
    Images     []string    `json:"images,omitempty"` // Paths to images
    ToolCalls  []ToolCall  `json:"tool_calls,omitempty"`
    ToolResult *ToolResult `json:"tool_result,omitempty"`
}

type Client interface {
	Generate(ctx context.Context, messages []Message, tools []interface{}) (*Message, error)
    GenerateStream(ctx context.Context, messages []Message, tools []interface{}, outputChan chan<- string) (*Message, error)
}

type MockClient struct{}

func NewMockClient() *MockClient {
    return &MockClient{}
}

func (m *MockClient) Generate(ctx context.Context, messages []Message, tools []interface{}) (*Message, error) {
    // Simple mock behavior
    return &Message{
        Role:    RoleAssistant,
        Content: "I am a mock agent.",
    }, nil
}

func (m *MockClient) GenerateStream(ctx context.Context, messages []Message, tools []interface{}, outputChan chan<- string) (*Message, error) {
    response := "I am a mock agent streaming..."
    for _, c := range response {
        outputChan <- string(c)
    }
    return &Message{
        Role: RoleAssistant,
        Content: response,
    }, nil
}
