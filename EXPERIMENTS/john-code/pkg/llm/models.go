package llm

// Provider represents an LLM provider
type Provider string

const (
	ProviderAnthropic Provider = "anthropic"
	ProviderOpenAI    Provider = "openai"
	ProviderGoogle    Provider = "google"
)

// ModelInfo contains information about a supported model
type ModelInfo struct {
	ID          string   // Internal ID used in code
	Name        string   // Display name
	Provider    Provider // Provider (anthropic, openai, google)
	APIModel    string   // Model name to send to API
	Description string   // Short description
}

// SupportedModels lists all models supported by John Code
var SupportedModels = []ModelInfo{
	// Anthropic Claude models
	{
		ID:          "claude-sonnet-4.5",
		Name:        "Claude Sonnet 4.5",
		Provider:    ProviderAnthropic,
		APIModel:    "claude-sonnet-4-5-20250929",
		Description: "Balanced performance and speed (default)",
	},
	{
		ID:          "claude-opus-4.5",
		Name:        "Claude Opus 4.5",
		Provider:    ProviderAnthropic,
		APIModel:    "claude-opus-4-5-20251101",
		Description: "Most capable, best for complex tasks",
	},
	{
		ID:          "claude-haiku-4.5",
		Name:        "Claude Haiku 4.5",
		Provider:    ProviderAnthropic,
		APIModel:    "claude-haiku-4-5-20251001",
		Description: "Fastest, best for simple tasks",
	},

	// OpenAI GPT models
	{
		ID:          "gpt-5",
		Name:        "GPT-5",
		Provider:    ProviderOpenAI,
		APIModel:    "gpt-5",
		Description: "OpenAI's most capable model",
	},
	{
		ID:          "gpt-5-mini",
		Name:        "GPT-5 Mini",
		Provider:    ProviderOpenAI,
		APIModel:    "gpt-5-mini",
		Description: "Balanced performance and cost",
	},
	{
		ID:          "gpt-5-nano",
		Name:        "GPT-5 Nano",
		Provider:    ProviderOpenAI,
		APIModel:    "gpt-5-nano",
		Description: "Fastest and most affordable",
	},

	// Google Gemini models
	{
		ID:          "gemini-2.5-pro",
		Name:        "Gemini 2.5 Pro",
		Provider:    ProviderGoogle,
		APIModel:    "gemini-2.5-pro",
		Description: "Google's most capable model",
	},
	{
		ID:          "gemini-2.5-flash",
		Name:        "Gemini 2.5 Flash",
		Provider:    ProviderGoogle,
		APIModel:    "gemini-2.5-flash",
		Description: "Fast and efficient",
	},
	{
		ID:          "gemini-2.5-flash-lite",
		Name:        "Gemini 2.5 Flash Lite",
		Provider:    ProviderGoogle,
		APIModel:    "gemini-2.5-flash-lite",
		Description: "Lightweight and quick",
	},
}

// DefaultModelID is the default model to use
const DefaultModelID = "claude-sonnet-4.5"

// GetModelByID returns model info by ID
func GetModelByID(id string) *ModelInfo {
	for _, m := range SupportedModels {
		if m.ID == id {
			return &m
		}
	}
	return nil
}

// GetModelsByProvider returns all models for a given provider
func GetModelsByProvider(provider Provider) []ModelInfo {
	var models []ModelInfo
	for _, m := range SupportedModels {
		if m.Provider == provider {
			models = append(models, m)
		}
	}
	return models
}
