package tools

import (
	"context"
	"fmt"
)

type UserPrompter interface {
    Print(string)
    Prompt(string) string
}

// AskUserQuestionTool
type AskUserQuestionTool struct {
    ui UserPrompter
}

func NewAskUserQuestionTool(ui UserPrompter) *AskUserQuestionTool {
    return &AskUserQuestionTool{ui: ui}
}

func (t *AskUserQuestionTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "AskUserQuestion",
		Description: `Ask user questions during execution.
- Use to gather preferences/requirements, clarify ambiguous instructions, get decisions on implementation choices
- Users can always select "Other" for custom text input`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"question": map[string]interface{}{
					"type":        "string",
					"description": "The question to ask the user.",
				},
			},
			"required": []string{"question"},
		},
	}
}

func (t *AskUserQuestionTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
	question, ok := args["question"].(string)
	if !ok {
		return "", fmt.Errorf("question required")
	}

    // Use the UI to prompt the user
    // We need a way to interrupt the stream/display a specific prompt.
    // The UI.Prompt method is synchronous and waits for input, which is what we want.
    
    t.ui.Print(fmt.Sprintf("\n[Question] %s", question))
    answer := t.ui.Prompt("> ")
    
    return answer, nil
}
