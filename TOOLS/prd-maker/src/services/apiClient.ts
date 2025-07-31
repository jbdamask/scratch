import { 
  Project,
  Conversation, 
  MessageWithConversation, 
  PRDDocumentWithProject
} from '../types'

const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3002/api'

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Project methods
  async getAllProjects(): Promise<Project[]> {
    const projects = await this.request<any[]>('/projects')
    return projects.map(project => ({
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    }))
  }

  async createProject(name: string): Promise<Project> {
    const project = await this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    }
  }

  async getProject(id: string): Promise<Project> {
    const project = await this.request<any>(`/projects/${id}`)
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    }
  }

  async updateProject(id: string, name: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    })
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    })
  }

  // Get project conversation and PRD
  async getProjectConversation(projectId: string): Promise<Conversation> {
    const conversation = await this.request<any>(`/projects/${projectId}/conversation`)
    return {
      ...conversation,
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt)
    }
  }

  async getProjectPRD(projectId: string): Promise<PRDDocumentWithProject> {
    const prd = await this.request<any>(`/projects/${projectId}/prd`)
    return {
      ...prd,
      createdAt: new Date(prd.createdAt),
      updatedAt: new Date(prd.updatedAt)
    }
  }


  // Message methods
  async getMessages(conversationId: string): Promise<MessageWithConversation[]> {
    const messages = await this.request<any[]>(`/conversations/${conversationId}/messages`)
    return messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }))
  }

  async addMessage(
    conversationId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<MessageWithConversation | { userMessage: MessageWithConversation; aiMessage?: MessageWithConversation; aiError?: string }> {
    const response = await this.request<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    })
    
    // Handle the new response format for user messages that trigger AI responses
    if (response.userMessage) {
      return {
        userMessage: {
          ...response.userMessage,
          timestamp: new Date(response.userMessage.timestamp)
        },
        aiMessage: response.aiMessage ? {
          ...response.aiMessage,
          timestamp: new Date(response.aiMessage.timestamp)
        } : undefined,
        aiError: response.aiError
      }
    }
    
    // Handle single message response (assistant messages)
    return {
      ...response,
      timestamp: new Date(response.timestamp)
    }
  }

  // PRD Document methods (simplified for project-based structure)
  async updatePRDDocument(
    id: string, 
    updates: { title?: string; content?: string }
  ): Promise<void> {
    await this.request(`/prd-documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // User preferences methods
  async getAllUserPreferences(): Promise<Record<string, string>> {
    return this.request<Record<string, string>>('/preferences')
  }

  async getUserPreference(key: string): Promise<string | null> {
    try {
      const response = await this.request<{ key: string; value: string }>(`/preferences/${key}`)
      return response.value
    } catch (error) {
      // Return null if preference not found (404)
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  async setUserPreference(key: string, value: string): Promise<void> {
    await this.request(`/preferences/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    })
  }

  async deleteUserPreference(key: string): Promise<void> {
    await this.request(`/preferences/${key}`, {
      method: 'DELETE',
    })
  }

  // PRD Generation
  async generatePRD(prompt: string, existingContent?: string): Promise<{ content: string; usage?: any }> {
    return this.request<{ content: string; usage?: any }>('/generate-prd', {
      method: 'POST',
      body: JSON.stringify({ prompt, existingContent }),
    })
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
export default ApiClient