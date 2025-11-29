package tools

import (
	"context"
	"testing"
)

type MockUI struct {
    PrintHistory []string
    PromptMockResponse string
}

func (m *MockUI) Print(msg string) {
    m.PrintHistory = append(m.PrintHistory, msg)
}

func (m *MockUI) Prompt(prompt string) string {
    return m.PromptMockResponse
}

func TestAskUserQuestionTool(t *testing.T) {
    mockUI := &MockUI{
        PromptMockResponse: "Use Go",
    }
    
    tool := NewAskUserQuestionTool(mockUI)
    ctx := context.Background()
    
    args := map[string]interface{}{
        "question": "What language?",
    }
    
    response, err := tool.Execute(ctx, args)
    if err != nil {
        t.Fatalf("AskUserQuestionTool failed: %v", err)
    }
    
    if response != "Use Go" {
        t.Errorf("Expected 'Use Go', got '%s'", response)
    }
    
    if len(mockUI.PrintHistory) == 0 {
        t.Errorf("Expected Print to be called")
    }
}
