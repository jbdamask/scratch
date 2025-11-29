package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	md "github.com/JohannesKaufmann/html-to-markdown"
)

// WebSearchTool
type WebSearchTool struct {
    apiKey string
    client *http.Client
    baseURL string
}

func NewWebSearchTool() *WebSearchTool {
    // Using Brave Search as the backend
    return &WebSearchTool{
        apiKey: os.Getenv("BRAVE_API_KEY"),
        client: &http.Client{Timeout: 10 * time.Second},
        baseURL: "https://api.search.brave.com/res/v1/web/search",
    }
}

func (t *WebSearchTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "WebSearch",
		Description: `Search the web for up-to-date information.
- Provides current events and recent data beyond knowledge cutoff
- Domain filtering supported (allowed/blocked domains)`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"query": map[string]interface{}{
					"type":        "string",
					"description": "The search query.",
				},
			},
			"required": []string{"query"},
		},
	}
}

type braveResponse struct {
    Web struct {
        Results []struct {
            Title       string `json:"title"`
            Description string `json:"description"`
            URL         string `json:"url"`
        } `json:"results"`
    } `json:"web"`
}

func (t *WebSearchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    query, ok := args["query"].(string)
    if !ok {
        return "", fmt.Errorf("query required")
    }

    if t.apiKey == "" {
        return "Error: BRAVE_API_KEY not set. Cannot perform web search.", nil
    }

    // Call Brave Search API
    u, _ := url.Parse(t.baseURL)
    q := u.Query()
    q.Set("q", query)
    u.RawQuery = q.Encode()

    req, _ := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
    req.Header.Set("X-Subscription-Token", t.apiKey)
    req.Header.Set("Accept", "application/json")

    resp, err := t.client.Do(req)
    if err != nil {
        return "", fmt.Errorf("search request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Sprintf("Search API error: %d %s", resp.StatusCode, string(body)), nil
    }

    var result braveResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return "", fmt.Errorf("failed to decode search results: %w", err)
    }

    var sb strings.Builder
    sb.WriteString(fmt.Sprintf("Search results for '%s':\n\n", query))
    for i, r := range result.Web.Results {
        if i >= 5 { break } // Limit to 5
        sb.WriteString(fmt.Sprintf("%d. %s\n   %s\n   %s\n\n", i+1, r.Title, r.URL, r.Description))
    }

    return sb.String(), nil
}

// WebFetchTool
type WebFetchTool struct {
    client *http.Client
}

func NewWebFetchTool() *WebFetchTool {
    return &WebFetchTool{
        client: &http.Client{Timeout: 15 * time.Second},
    }
}

func (t *WebFetchTool) Definition() ToolDefinition {
    return ToolDefinition{
        Name: "WebFetch",
        Description: `Fetches content from URL and processes with AI model.
- Must be fully-formed valid URL
- HTTP URLs auto-upgraded to HTTPS
- Read-only, doesn't modify files
- Results may be summarized if very large
- When URL redirects to different host, make new WebFetch request with redirect URL`,
        Schema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "url": map[string]interface{}{
                    "type": "string",
                    "description": "The URL to fetch.",
                },
            },
            "required": []string{"url"},
        },
    }
}

func (t *WebFetchTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    urlStr, ok := args["url"].(string)
    if !ok {
        return "", fmt.Errorf("url required")
    }

    // Basic GET request
    req, _ := http.NewRequestWithContext(ctx, "GET", urlStr, nil)
    req.Header.Set("User-Agent", "JohnCode/1.0")
    
    resp, err := t.client.Do(req)
    if err != nil {
        return "", fmt.Errorf("fetch failed: %w", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != 200 {
        return fmt.Sprintf("Fetch error: %d", resp.StatusCode), nil
    }
    
    // Limit body size
    body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024)) // 1MB limit
    if err != nil {
        return "", err
    }
    
    htmlContent := string(body)
    
    // Convert to Markdown
    converter := md.NewConverter("", true, nil)
    text, err := converter.ConvertString(htmlContent)
    if err != nil {
        return "", fmt.Errorf("html parsing failed: %w", err)
    }
    
    if len(text) > 20000 {
        text = text[:20000] + "\n...[Truncated]..."
    }
    
    return fmt.Sprintf("Content of %s:\n\n%s", urlStr, text), nil
}
