package llm

import (
	"testing"
)

func TestNewAnthropicClientEndpoint(t *testing.T) {
	tests := []struct {
		baseURL  string
		expected string
	}{
		{"", "https://api.anthropic.com/v1/messages"},
		{"https://my-proxy.com", "https://my-proxy.com/v1/messages"},
		{"https://my-proxy.com/", "https://my-proxy.com/v1/messages"},
		{"https://custom-endpoint.com/v1/messages", "https://custom-endpoint.com/v1/messages"},
        {"http://localhost:8080/v1/messages", "http://localhost:8080/v1/messages"},
	}

	for _, tt := range tests {
		client := NewAnthropicClient("dummy", tt.baseURL, "")
		if client.endpoint != tt.expected {
			t.Errorf("NewAnthropicClient(%q).endpoint = %q; want %q", tt.baseURL, client.endpoint, tt.expected)
		}
	}
}
