package history

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jbdamask/john-code/pkg/llm"
)

// EventType definitions
const (
	EventTypeUser      = "user"
	EventTypeAssistant = "assistant"
)

// SessionEvent represents a line in the JSONL file
type SessionEvent struct {
	Type       string      `json:"type"`
	UUID       string      `json:"uuid"`
	ParentUUID string      `json:"parentUuid,omitempty"` // Nullable in JSON
	SessionID  string      `json:"sessionId"`
	Timestamp  string      `json:"timestamp"`
	CWD        string      `json:"cwd"`
	Message    interface{} `json:"message,omitempty"`
}

type SessionManager struct {
	SessionID    string
	CurrentUUID  string
	FilePath     string
	CWD          string
	CurrentModel string
}

func NewSessionManager(cwd string) (*SessionManager, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home dir: %w", err)
	}

	sessionID := uuid.New().String()
	
	// Sanitize CWD for path
	// Replace / with - and remove leading - if any?
	// Claude format: -Users-name-path
	sanitized := strings.ReplaceAll(cwd, string(os.PathSeparator), "-")
    // Ensure it starts with - if it was absolute
    if !strings.HasPrefix(sanitized, "-") {
        sanitized = "-" + sanitized
    }

	projectDir := filepath.Join(homeDir, ".johncode", "projects", sanitized)
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create project dir: %w", err)
	}

	filePath := filepath.Join(projectDir, fmt.Sprintf("%s.jsonl", sessionID))

	return &SessionManager{
		SessionID:    sessionID,
		CurrentUUID:  "", // Start with no parent
		FilePath:     filePath,
		CWD:          cwd,
		CurrentModel: "claude-sonnet-4-5-20250929", // Default, can be updated
	}, nil
}

// SetModel updates the current model for logging
func (sm *SessionManager) SetModel(model string) {
	sm.CurrentModel = model
}

func (sm *SessionManager) Append(role llm.Role, msg llm.Message) error {
	// Convert llm.Message to SessionEvent structure
	
	eventUUID := uuid.New().String()
	now := time.Now().UTC().Format(time.RFC3339Nano)

	var eventType string
	var messageObj interface{}

	if role == llm.RoleUser || role == llm.RoleTool {
		eventType = EventTypeUser
		// Simplify user message for JSONL
        // If it's a tool result, Claude format puts it in "content" array with type "tool_result"
        // Our llm.Message for ToolResult has RoleTool.
        
        if role == llm.RoleTool && msg.ToolResult != nil {
             // Map ToolResult to content block
             messageObj = map[string]interface{}{
                 "role": "user",
                 "content": []map[string]interface{}{
                     {
                         "type": "tool_result",
                         "tool_use_id": msg.ToolResult.ToolCallID,
                         "content": msg.ToolResult.Content,
                     },
                 },
             }
        } else {
            // Normal user message
            // Images?
            if len(msg.Images) > 0 {
                 // Complex content array
                 // TODO: Implement image serialization if needed, but for now just text + note?
                 // Or proper content blocks.
                 content := []map[string]interface{}{}
                 if msg.Content != "" {
                     content = append(content, map[string]interface{}{
                         "type": "text",
                         "text": msg.Content,
                     })
                 }
                 for _, img := range msg.Images {
                     content = append(content, map[string]interface{}{
                         "type": "image",
                         "source": map[string]string{
                             "type": "base64",
                             "media_type": "image/png", // Assumption
                             "data": fmt.Sprintf("...image path: %s...", img), // We don't want to store huge base64 in history file unless necessary? Claude does?
                             // Claude likely stores it. For now, let's just reference the path to keep it simple.
                         },
                     })
                 }
                 messageObj = map[string]interface{}{
                    "role": "user",
                    "content": content,
                 }
            } else {
                messageObj = map[string]interface{}{
                    "role": "user",
                    "content": msg.Content,
                }
            }
        }

	} else if role == llm.RoleAssistant {
		eventType = EventTypeAssistant
        // Map Assistant message
        // Content can be text or tool_use blocks
        content := []map[string]interface{}{}
        
        if msg.Content != "" {
            content = append(content, map[string]interface{}{
                "type": "text",
                "text": msg.Content,
            })
        }
        
        for _, tc := range msg.ToolCalls {
            content = append(content, map[string]interface{}{
                "type": "tool_use",
                "id": tc.ID,
                "name": tc.Name,
                "input": tc.Args,
            })
        }
        
		messageObj = map[string]interface{}{
			"role":    "assistant",
			"content": content,
			"model":   sm.CurrentModel,
		}
	} else if role == llm.RoleSystem {
        // We generally don't store system prompt as an event in the linked list in the same way?
        // Or maybe we do?
        // Claude Code session usually starts with User message or empty?
        // Let's skip system messages for the history file to match user-visible history
        return nil
    }

	event := SessionEvent{
		Type:       eventType,
		UUID:       eventUUID,
		ParentUUID: sm.CurrentUUID,
		SessionID:  sm.SessionID,
		Timestamp:  now,
		CWD:        sm.CWD,
		Message:    messageObj,
	}

	// Append to file
	f, err := os.OpenFile(sm.FilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	encoder := json.NewEncoder(f)
	if err := encoder.Encode(event); err != nil {
		return err
	}

	// Update pointer
	sm.CurrentUUID = eventUUID
	return nil
}
