package tools

import (
	"context"
	"fmt"
	"strings"
)

type TodoStatus string

const (
	TodoPending    TodoStatus = "pending"
	TodoInProgress TodoStatus = "in_progress"
	TodoCompleted  TodoStatus = "completed"
)

type TodoItem struct {
	ID         string     `json:"id"`
	Content    string     `json:"content"`
	Status     TodoStatus `json:"status"`
	Priority   string     `json:"priority"` // high, medium, low
}

type TodoWriteTool struct {
	Todos []TodoItem
}

func NewTodoWriteTool() *TodoWriteTool {
	return &TodoWriteTool{
		Todos: []TodoItem{},
	}
}

func (t *TodoWriteTool) Definition() ToolDefinition {
	return ToolDefinition{
		Name:        "TodoWrite",
		Description: `Create and manage structured task lists.
- Complex multi-step tasks (3+ distinct steps)
- Non-trivial and complex tasks
- User explicitly requests todo list
- User provides multiple tasks
- After receiving new instructions
- When starting work on a task (mark as in_progress BEFORE beginning)
- After completing a task (mark as completed immediately)
- Tasks must have two forms: content (imperative, e.g., "Run tests") and activeForm (present continuous, e.g., "Running tests")
- Update status in real-time
- Mark complete IMMEDIATELY after finishing (don't batch)
- Exactly ONE task must be in_progress at any time
- Complete current tasks before starting new ones`,
		Schema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"todos": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"id":       map[string]interface{}{"type": "string"},
							"content":  map[string]interface{}{"type": "string"},
							"status":   map[string]interface{}{"type": "string", "enum": []string{"pending", "in_progress", "completed"}},
							"priority": map[string]interface{}{"type": "string"},
						},
						"required": []string{"id", "content", "status"},
					},
                    "description": "The list of todo items. This replaces any existing todos.",
				},
			},
			"required": []string{"todos"},
		},
	}
}

func (t *TodoWriteTool) Execute(ctx context.Context, args map[string]interface{}) (string, error) {
    // The input 'todos' is likely a []interface{} coming from JSON unmarshal
    todosInterface, ok := args["todos"].([]interface{})
    if !ok {
        return "", fmt.Errorf("todos argument must be an array")
    }

    var newTodos []TodoItem
    for _, itemInterface := range todosInterface {
        itemMap, ok := itemInterface.(map[string]interface{})
        if !ok {
             return "", fmt.Errorf("invalid todo item format")
        }
        
        id, _ := itemMap["id"].(string)
        content, _ := itemMap["content"].(string)
        statusStr, _ := itemMap["status"].(string)
        priority, _ := itemMap["priority"].(string)
        
        newTodos = append(newTodos, TodoItem{
            ID: id,
            Content: content,
            Status: TodoStatus(statusStr),
            Priority: priority,
        })
    }

    t.Todos = newTodos // Replace entire list as per tool behavior often seen
    
    // Format output
    var sb strings.Builder
    sb.WriteString("Updated Todo List:\n")
    for _, todo := range t.Todos {
        mark := "[ ]"
        if todo.Status == TodoCompleted {
            mark = "[x]"
        } else if todo.Status == TodoInProgress {
            mark = "[*]"
        }
        sb.WriteString(fmt.Sprintf("%s %s (%s) - %s\n", mark, todo.Content, todo.Priority, todo.Status))
    }
    
	return sb.String(), nil
}
