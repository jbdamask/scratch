export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface PRDDocument {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

// Project interface
export interface Project {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

// Database-related interfaces
export interface Conversation {
  id: string
  title: string
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export interface MessageWithConversation extends Message {
  conversationId: string
}

export interface PRDDocumentWithProject extends PRDDocument {
  projectId: string
}

export interface UserPreference {
  key: string
  value: string
  updatedAt: Date
}

// Application state interfaces
export interface AppState {
  currentProjectId: string | null
  projects: Project[]
  userPreferences: Record<string, string>
}

// Error handling
export interface DatabaseError extends Error {
  code?: string
  table?: string
  operation?: string
}

export interface DiagramModalProps {
  isOpen: boolean
  onClose: () => void
  diagramCode: string
  diagramType: 'mermaid'
}

export interface ProjectPanelProps {
  project?: Project
}