package commands

import (
	"github.com/jbdamask/john-code/pkg/llm"
)

// ModelCommand allows switching between LLM models
type ModelCommand struct {
	currentModelID string
	onModelChange  func(modelID string) error
}

// NewModelCommand creates a new ModelCommand
func NewModelCommand(currentModelID string, onModelChange func(modelID string) error) *ModelCommand {
	return &ModelCommand{
		currentModelID: currentModelID,
		onModelChange:  onModelChange,
	}
}

// Name returns the command name
func (c *ModelCommand) Name() string {
	return "model"
}

// Description returns a short description shown in the command picker
func (c *ModelCommand) Description() string {
	return "Switch LLM model"
}

// Execute is not used for model command - it uses interactive picker instead
func (c *ModelCommand) Execute() (commandMessage string, instructions string, err error) {
	return "<command-message>Use /model to select a different model</command-message>",
		"Model selection requires interactive picker. Current model: " + c.currentModelID,
		nil
}

// GetModels returns all available models for the picker
func (c *ModelCommand) GetModels() []ModelOption {
	options := make([]ModelOption, len(llm.SupportedModels))
	for i, m := range llm.SupportedModels {
		options[i] = ModelOption{
			ID:          m.ID,
			Name:        m.Name,
			Provider:    string(m.Provider),
			Description: m.Description,
			IsCurrent:   m.ID == c.currentModelID,
		}
	}
	return options
}

// SetModel changes the current model
func (c *ModelCommand) SetModel(modelID string) error {
	if c.onModelChange != nil {
		if err := c.onModelChange(modelID); err != nil {
			return err
		}
	}
	c.currentModelID = modelID
	return nil
}

// CurrentModel returns the current model ID
func (c *ModelCommand) CurrentModel() string {
	return c.currentModelID
}

// ModelOption represents a model choice in the picker
type ModelOption struct {
	ID          string
	Name        string
	Provider    string
	Description string
	IsCurrent   bool
}
