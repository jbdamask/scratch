package llm

import (
	"reflect"
	"testing"
)

func TestSanitizeSchemaForGemini(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected interface{}
	}{
		{
			name:     "nil schema",
			input:    nil,
			expected: nil,
		},
		{
			name:     "non-map schema",
			input:    "string",
			expected: "string",
		},
		{
			name: "removes $schema field and converts type to uppercase",
			input: map[string]interface{}{
				"$schema": "http://json-schema.org/draft-07/schema#",
				"type":    "object",
			},
			expected: map[string]interface{}{
				"type": "OBJECT",
			},
		},
		{
			name: "removes additionalProperties field",
			input: map[string]interface{}{
				"type":                 "object",
				"additionalProperties": false,
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type": "string",
					},
				},
			},
			expected: map[string]interface{}{
				"type": "OBJECT",
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type": "STRING",
					},
				},
			},
		},
		{
			name: "recursively sanitizes nested objects",
			input: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"config": map[string]interface{}{
						"type":                 "object",
						"additionalProperties": true,
						"$schema":              "test",
						"properties": map[string]interface{}{
							"key": map[string]interface{}{
								"type":    "string",
								"default": "value",
							},
						},
					},
				},
			},
			expected: map[string]interface{}{
				"type": "OBJECT",
				"properties": map[string]interface{}{
					"config": map[string]interface{}{
						"type": "OBJECT",
						"properties": map[string]interface{}{
							"key": map[string]interface{}{
								"type": "STRING",
							},
						},
					},
				},
			},
		},
		{
			name: "handles array items",
			input: map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type":                 "object",
					"additionalProperties": false,
				},
			},
			expected: map[string]interface{}{
				"type": "ARRAY",
				"items": map[string]interface{}{
					"type": "OBJECT",
				},
			},
		},
		{
			name: "preserves supported fields and uppercases types",
			input: map[string]interface{}{
				"type":        "object",
				"description": "A test schema",
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type":        "string",
						"description": "The name",
					},
					"count": map[string]interface{}{
						"type":    "integer",
						"minimum": 0,
						"maximum": 100,
					},
				},
				"required": []interface{}{"name"},
			},
			expected: map[string]interface{}{
				"type":        "OBJECT",
				"description": "A test schema",
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type":        "STRING",
						"description": "The name",
					},
					"count": map[string]interface{}{
						"type":    "INTEGER",
						"minimum": 0,
						"maximum": 100,
					},
				},
				"required": []interface{}{"name"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeSchemaForGemini(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("sanitizeSchemaForGemini() = %v, expected %v", result, tt.expected)
			}
		})
	}
}
