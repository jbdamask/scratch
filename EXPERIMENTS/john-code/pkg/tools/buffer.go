package tools

import (
	"bytes"
	"sync"
)

// ThreadSafeBuffer
type ThreadSafeBuffer struct {
    b bytes.Buffer
    m sync.Mutex
}

func (b *ThreadSafeBuffer) Read(p []byte) (n int, err error) {
    b.m.Lock()
    defer b.m.Unlock()
    return b.b.Read(p)
}

func (b *ThreadSafeBuffer) Write(p []byte) (n int, err error) {
    b.m.Lock()
    defer b.m.Unlock()
    return b.b.Write(p)
}

func (b *ThreadSafeBuffer) String() string {
    b.m.Lock()
    defer b.m.Unlock()
    return b.b.String()
}

// We need to update shell_manager to use this or similar logic, 
// but I'll just fix the import in shell_manager first because I used "bytes" but forgot to import it?
// Wait, I did import "bytes".
