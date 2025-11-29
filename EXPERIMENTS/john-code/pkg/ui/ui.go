package ui

import (
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.design/x/clipboard"
)

type UI struct{}

func New() *UI {
	return &UI{}
}

func (u *UI) Print(msg string) {
	fmt.Println(msg)
}

// Input Handling

type inputModel struct {
	textInput    textinput.Model
	err          error
	output       string
	canceled     bool
	slashTrigger bool // Triggered when "/" is typed as first char
}

func initialInputModel(prompt string) inputModel {
	ti := textinput.New()
	ti.Placeholder = "Type your message..."
	ti.Focus()
	ti.CharLimit = 0
	ti.Width = 80
    ti.Prompt = prompt

	return inputModel{
		textInput: ti,
		err:       nil,
	}
}

func (m inputModel) Init() tea.Cmd {
	return textinput.Blink
}

func (m inputModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter:
			m.output = m.textInput.Value()
			return m, tea.Quit
		case tea.KeyCtrlC, tea.KeyEsc:
			m.canceled = true
			return m, tea.Quit
		case tea.KeyCtrlV:
			// Check for image data in clipboard
			err := clipboard.Init()
			if err == nil {
				imageBytes := clipboard.Read(clipboard.FmtImage)
				if len(imageBytes) > 0 {
					// Save to temp file
					tmpDir := "/tmp" // Cross platform consideration needed? For MVP /tmp is ok
					filename := fmt.Sprintf("john_clipboard_%d.png", time.Now().UnixNano())
					path := filepath.Join(tmpDir, filename)

					if err := ioutil.WriteFile(path, imageBytes, 0644); err == nil {
						m.textInput.SetValue(m.textInput.Value() + fmt.Sprintf(" [Image: %s] ", path))
						// Position cursor at end
						m.textInput.SetCursor(len(m.textInput.Value()))
					}
				}
			}
		case tea.KeyRunes:
			// Check if "/" is typed as first character (empty input)
			if len(msg.Runes) == 1 && msg.Runes[0] == '/' && m.textInput.Value() == "" {
				m.slashTrigger = true
				m.output = "/"
				return m, tea.Quit
			}
		}
	case error:
		m.err = msg
		return m, nil
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func (m inputModel) View() string {
	return fmt.Sprintf(
		"%s\n",
		m.textInput.View(),
	)
}

func (u *UI) Prompt(prompt string) string {
	p := tea.NewProgram(initialInputModel(prompt))
	m, err := p.Run()
	if err != nil {
		fmt.Printf("Alas, there's been an error: %v", err)
		return ""
	}

	if mModel, ok := m.(inputModel); ok {
        if mModel.canceled {
            return "exit"
        }
		return strings.TrimSpace(mModel.output)
	}
	return ""
}

// Stream Handling

type streamModel struct {
	sub      <-chan string
	content  string
	showing  bool
	finished bool
}

type tokenMsg string
type finishMsg struct{}

func waitForToken(sub <-chan string) tea.Cmd {
	return func() tea.Msg {
		token, ok := <-sub
		if !ok {
			return finishMsg{}
		}
		return tokenMsg(token)
	}
}

func (m streamModel) Init() tea.Cmd {
	return waitForToken(m.sub)
}

func (m streamModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		if msg.String() == "ctrl+o" {
			m.showing = !m.showing
			return m, nil
		}
        if msg.Type == tea.KeyCtrlC {
            return m, tea.Quit
        }
	case tokenMsg:
		m.content += string(msg)
		return m, waitForToken(m.sub)
	case finishMsg:
		m.finished = true
        // Ensure we show the content at the end
        m.showing = true
		return m, tea.Quit
	}
	return m, nil
}

func (m streamModel) View() string {
	if !m.showing {
		return "Thinking... (Press Ctrl+O to show stream)"
	}
	return m.content
}

func (u *UI) DisplayStream(outputChan <-chan string) {
	// Simple streaming: just print tokens as they arrive
	// This allows natural terminal scrolling and is more responsive
	for token := range outputChan {
		fmt.Print(token)
	}
	fmt.Println() // Newline at end
}

// Command Picker for slash commands

// CommandItem represents a slash command in the picker list
type CommandItem struct {
	name        string
	description string
}

func (i CommandItem) Title() string       { return "/" + i.name }
func (i CommandItem) Description() string { return i.description }
func (i CommandItem) FilterValue() string { return i.name }

type commandPickerModel struct {
	list     list.Model
	selected string
	canceled bool
}

func newCommandPickerModel(commands []CommandItem) commandPickerModel {
	items := make([]list.Item, len(commands))
	for i, cmd := range commands {
		items[i] = cmd
	}

	delegate := list.NewDefaultDelegate()
	delegate.Styles.SelectedTitle = lipgloss.NewStyle().
		Border(lipgloss.NormalBorder(), false, false, false, true).
		BorderForeground(lipgloss.Color("62")).
		Foreground(lipgloss.Color("170")).
		Padding(0, 0, 0, 1)
	delegate.Styles.SelectedDesc = lipgloss.NewStyle().
		Border(lipgloss.NormalBorder(), false, false, false, true).
		BorderForeground(lipgloss.Color("62")).
		Foreground(lipgloss.Color("240")).
		Padding(0, 0, 0, 1)

	l := list.New(items, delegate, 40, 10)
	l.Title = "Commands"
	l.SetShowStatusBar(false)
	l.SetFilteringEnabled(true)
	l.Styles.Title = lipgloss.NewStyle().
		Foreground(lipgloss.Color("170")).
		Bold(true).
		Padding(0, 1)

	return commandPickerModel{list: l}
}

func (m commandPickerModel) Init() tea.Cmd {
	return nil
}

func (m commandPickerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter:
			if item, ok := m.list.SelectedItem().(CommandItem); ok {
				m.selected = item.name
			}
			return m, tea.Quit
		case tea.KeyCtrlC, tea.KeyEsc:
			m.canceled = true
			return m, tea.Quit
		}
	case tea.WindowSizeMsg:
		m.list.SetWidth(msg.Width)
		return m, nil
	}

	var cmd tea.Cmd
	m.list, cmd = m.list.Update(msg)
	return m, cmd
}

func (m commandPickerModel) View() string {
	return m.list.View()
}

// CommandInfo holds command info for the picker
type CommandInfo struct {
	Name        string
	Description string
}

// PickCommand displays a command picker and returns the selected command name
// Returns empty string if canceled
func (u *UI) PickCommand(commands []CommandInfo) string {
	items := make([]CommandItem, len(commands))
	for i, cmd := range commands {
		items[i] = CommandItem{name: cmd.Name, description: cmd.Description}
	}

	p := tea.NewProgram(newCommandPickerModel(items))
	m, err := p.Run()
	if err != nil {
		fmt.Printf("Error in command picker: %v\n", err)
		return ""
	}

	if model, ok := m.(commandPickerModel); ok {
		if model.canceled {
			return ""
		}
		return model.selected
	}
	return ""
}

// Model Picker for /model command

// ModelItem represents a model in the picker list
type ModelItem struct {
	id          string
	name        string
	provider    string
	description string
	isCurrent   bool
}

func (i ModelItem) Title() string {
	indicator := "  "
	if i.isCurrent {
		indicator = "✓ "
	}
	return indicator + i.name
}
func (i ModelItem) Description() string {
	return fmt.Sprintf("[%s] %s", i.provider, i.description)
}
func (i ModelItem) FilterValue() string { return i.name + " " + i.provider }

type modelPickerModel struct {
	list     list.Model
	selected string
	canceled bool
}

func newModelPickerModel(models []ModelItem) modelPickerModel {
	items := make([]list.Item, len(models))
	for i, m := range models {
		items[i] = m
	}

	delegate := list.NewDefaultDelegate()
	delegate.Styles.SelectedTitle = lipgloss.NewStyle().
		Border(lipgloss.NormalBorder(), false, false, false, true).
		BorderForeground(lipgloss.Color("62")).
		Foreground(lipgloss.Color("170")).
		Padding(0, 0, 0, 1)
	delegate.Styles.SelectedDesc = lipgloss.NewStyle().
		Border(lipgloss.NormalBorder(), false, false, false, true).
		BorderForeground(lipgloss.Color("62")).
		Foreground(lipgloss.Color("240")).
		Padding(0, 0, 0, 1)

	l := list.New(items, delegate, 60, 14)
	l.Title = "Select Model"
	l.SetShowStatusBar(false)
	l.SetFilteringEnabled(true)
	l.Styles.Title = lipgloss.NewStyle().
		Foreground(lipgloss.Color("170")).
		Bold(true).
		Padding(0, 1)

	return modelPickerModel{list: l}
}

func (m modelPickerModel) Init() tea.Cmd {
	return nil
}

func (m modelPickerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter:
			if item, ok := m.list.SelectedItem().(ModelItem); ok {
				m.selected = item.id
			}
			return m, tea.Quit
		case tea.KeyCtrlC, tea.KeyEsc:
			m.canceled = true
			return m, tea.Quit
		}
	case tea.WindowSizeMsg:
		m.list.SetWidth(msg.Width)
		return m, nil
	}

	var cmd tea.Cmd
	m.list, cmd = m.list.Update(msg)
	return m, cmd
}

func (m modelPickerModel) View() string {
	return m.list.View()
}

// ModelInfo holds model info for the picker
type ModelInfo struct {
	ID          string
	Name        string
	Provider    string
	Description string
	IsCurrent   bool
}

// PickModel displays a model picker and returns the selected model ID
// Returns empty string if canceled
func (u *UI) PickModel(models []ModelInfo) string {
	items := make([]ModelItem, len(models))
	for i, m := range models {
		items[i] = ModelItem{
			id:          m.ID,
			name:        m.Name,
			provider:    m.Provider,
			description: m.Description,
			isCurrent:   m.IsCurrent,
		}
	}

	p := tea.NewProgram(newModelPickerModel(items))
	m, err := p.Run()
	if err != nil {
		fmt.Printf("Error in model picker: %v\n", err)
		return ""
	}

	if model, ok := m.(modelPickerModel); ok {
		if model.canceled {
			return ""
		}
		return model.selected
	}
	return ""
}
