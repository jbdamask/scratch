package tools

import (
	"fmt"
	"os/exec"
	"sync"
	"time"
)

// ShellManager manages background processes
type ShellManager struct {
	mu        sync.Mutex
	processes map[string]*BackgroundProcess
    nextID    int
}

type BackgroundProcess struct {
	ID        string
	Cmd       *exec.Cmd
	OutputBuf *ThreadSafeBuffer
    Done      bool
    Error     error
    StartTime time.Time
}

var GlobalShellManager = &ShellManager{
	processes: make(map[string]*BackgroundProcess),
    nextID: 1,
}

func (sm *ShellManager) Start(cmd *exec.Cmd) string {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	id := fmt.Sprintf("%d", sm.nextID)
	sm.nextID++

    buf := &ThreadSafeBuffer{}
    cmd.Stdout = buf
    cmd.Stderr = buf
    
    bp := &BackgroundProcess{
        ID: id,
        Cmd: cmd,
        OutputBuf: buf,
        StartTime: time.Now(),
    }
    
    sm.processes[id] = bp
    
    if err := cmd.Start(); err != nil {
        bp.Done = true
        bp.Error = err
    } else {
        go func() {
            err := cmd.Wait()
            sm.mu.Lock()
            bp.Done = true
            bp.Error = err
            sm.mu.Unlock()
        }()
    }
    
    return id
}

func (sm *ShellManager) GetOutput(id string) (string, bool, error) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    
    bp, ok := sm.processes[id]
    if !ok {
        return "", false, fmt.Errorf("shell %s not found", id)
    }
    
    // Read buffer. Note: this is simple and not thread-safe for concurrent reads/writes strictly speaking 
    // without a proper ring buffer or mutex on the buffer itself, but bytes.Buffer is not thread safe.
    // In a real app, we'd use a pipe and a reader goroutine that appends to a thread-safe buffer.
    // For MVP, let's hope the race checker isn't too angry or use a simpler approach.
    // Actually, cmd.Stdout writing to buf while we read String() is a race.
    // I'll fix this by making BackgroundProcess handle the locking.
    
    // Refactoring Start to use a safe buffer wrapper would be better, 
    // but for now let's just return what we have.
    
    return bp.OutputBuf.String(), bp.Done, bp.Error
}

func (sm *ShellManager) Kill(id string) error {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    
    bp, ok := sm.processes[id]
    if !ok {
        return fmt.Errorf("shell %s not found", id)
    }
    
    if bp.Done {
        return nil
    }
    
    if bp.Cmd.Process != nil {
        return bp.Cmd.Process.Kill()
    }
    return nil
}
