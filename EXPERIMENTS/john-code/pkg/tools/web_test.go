package tools

import (
	"bytes"
	"context"
	"io/ioutil"
	"net/http"
	"testing"
    "strings"
)

type MockRoundTripper struct {
    RoundTripFunc func(req *http.Request) *http.Response
}

func (m *MockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    return m.RoundTripFunc(req), nil
}

func TestWebSearchTool(t *testing.T) {
    tool := NewWebSearchTool()
    
    // Mock Brave response
    jsonResp := `{
        "web": {
            "results": [
                {
                    "title": "Go Language",
                    "description": "The Go programming language.",
                    "url": "https://go.dev"
                }
            ]
        }
    }`
    
    tool.client.Transport = &MockRoundTripper{
        RoundTripFunc: func(req *http.Request) *http.Response {
            return &http.Response{
                StatusCode: 200,
                Body:       ioutil.NopCloser(bytes.NewBufferString(jsonResp)),
                Header:     make(http.Header),
            }
        },
    }
    tool.apiKey = "test-key" // To bypass empty key check
    tool.baseURL = "http://mock-brave"
    
    args := map[string]interface{}{
        "query": "golang",
    }
    
    output, err := tool.Execute(context.Background(), args)
    if err != nil {
        t.Fatalf("WebSearchTool failed: %v", err)
    }
    
    if !strings.Contains(output, "Go Language") {
        t.Errorf("Expected 'Go Language' in output, got: %s", output)
    }
}

func TestWebFetchTool(t *testing.T) {
    tool := NewWebFetchTool()
    
    htmlContent := `<html><body><h1>Hello Web</h1><p>This is a test.</p></body></html>`
    
    tool.client.Transport = &MockRoundTripper{
        RoundTripFunc: func(req *http.Request) *http.Response {
            return &http.Response{
                StatusCode: 200,
                Body:       ioutil.NopCloser(bytes.NewBufferString(htmlContent)),
                Header:     make(http.Header),
            }
        },
    }
    
    args := map[string]interface{}{
        "url": "http://example.com",
    }
    
    output, err := tool.Execute(context.Background(), args)
    if err != nil {
        t.Fatalf("WebFetchTool failed: %v", err)
    }
    
    // Should be converted to markdown
    if !strings.Contains(output, "# Hello Web") {
        t.Errorf("Expected '# Hello Web', got: %s", output)
    }
}
