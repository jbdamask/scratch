package commands

// Command represents a slash command that can be executed
type Command interface {
	// Name returns the command name (without the leading slash)
	Name() string

	// Description returns a short description shown in the command picker
	Description() string

	// Execute runs the command and returns the content to inject into the user message
	// The first return value is the command message (e.g., "<command-message>init is analyzing your codebase…</command-message>")
	// The second return value is the instruction content to inject
	Execute() (commandMessage string, instructions string, err error)
}

// Registry holds all registered slash commands
type Registry struct {
	commands map[string]Command
	order    []string // Preserve insertion order for display
}

// NewRegistry creates a new command registry
func NewRegistry() *Registry {
	return &Registry{
		commands: make(map[string]Command),
		order:    []string{},
	}
}

// Register adds a command to the registry
func (r *Registry) Register(cmd Command) {
	name := cmd.Name()
	if _, exists := r.commands[name]; !exists {
		r.order = append(r.order, name)
	}
	r.commands[name] = cmd
}

// Get retrieves a command by name
func (r *Registry) Get(name string) (Command, bool) {
	cmd, ok := r.commands[name]
	return cmd, ok
}

// List returns all registered commands in registration order
func (r *Registry) List() []Command {
	cmds := make([]Command, 0, len(r.order))
	for _, name := range r.order {
		cmds = append(cmds, r.commands[name])
	}
	return cmds
}

// Names returns the names of all registered commands
func (r *Registry) Names() []string {
	return r.order
}
