package tools

import "context"

// ToolDefinition describes a tool's interface to the LLM
type ToolDefinition struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Schema      interface{} `json:"input_schema"` // JSON Schema
}

// Tool represents a callable tool
type Tool interface {
	Definition() ToolDefinition
	Execute(ctx context.Context, args map[string]interface{}) (string, error)
}

// Registry manages the available tools
type Registry struct {
	tools map[string]Tool
}

func NewRegistry() *Registry {
	return &Registry{
		tools: make(map[string]Tool),
	}
}

func (r *Registry) Register(t Tool) {
	r.tools[t.Definition().Name] = t
}

func (r *Registry) Get(name string) (Tool, bool) {
	t, ok := r.tools[name]
	return t, ok
}

func (r *Registry) List() []ToolDefinition {
	defs := make([]ToolDefinition, 0, len(r.tools))
	for _, t := range r.tools {
		defs = append(defs, t.Definition())
	}
	return defs
}
