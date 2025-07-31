import { apiClient } from './apiClient'
import { 
  Conversation, 
  MessageWithConversation, 
  PRDDocumentWithVersion
} from '../types'
import {
  validateMessage,
  validatePRDTitle,
  validatePRDContent,
  validateConversationTitle,
  validateId,
  validateRole,
  validatePreferenceKey,
  validatePreferenceValue,
  withErrorHandling,
  sanitizeString,
  ValidationError
} from '../utils/validation'

export class DataService {
  // Conversation methods
  async createConversation(title: string): Promise<Conversation> {
    return withErrorHandling(async () => {
      const sanitizedTitle = sanitizeString(title)
      validateConversationTitle(sanitizedTitle)
      
      return await apiClient.createConversation(sanitizedTitle)
    }, 'createConversation', 'conversations')
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return withErrorHandling(async () => {
      validateId(id, 'conversationId')
      
      try {
        return await apiClient.getConversation(id)
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          return null
        }
        throw error
      }
    }, 'getConversation', 'conversations')
  }

  async getAllConversations(): Promise<Conversation[]> {
    return withErrorHandling(async () => {
      return await apiClient.getAllConversations()
    }, 'getAllConversations', 'conversations')
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    return withErrorHandling(async () => {
      validateId(id, 'conversationId')
      const sanitizedTitle = sanitizeString(title)
      validateConversationTitle(sanitizedTitle)
      
      await apiClient.updateConversation(id, sanitizedTitle)
    }, 'updateConversationTitle', 'conversations')
  }

  async deleteConversation(id: string): Promise<void> {
    return withErrorHandling(async () => {
      validateId(id, 'conversationId')
      await apiClient.deleteConversation(id)
    }, 'deleteConversation', 'conversations')
  }

  async linkConversationToPRD(conversationId: string, prdDocumentId: string): Promise<void> {
    return withErrorHandling(async () => {
      validateId(conversationId, 'conversationId')
      validateId(prdDocumentId, 'prdDocumentId')
      await apiClient.linkConversationToPRD(conversationId, prdDocumentId)
    }, 'linkConversationToPRD', 'conversations')
  }

  async getConversationByPRD(prdDocumentId: string): Promise<Conversation | null> {
    return withErrorHandling(async () => {
      validateId(prdDocumentId, 'prdDocumentId')
      return await apiClient.getConversationByPRD(prdDocumentId)
    }, 'getConversationByPRD', 'conversations')
  }

  // Message methods
  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string, timestamp?: Date): Promise<MessageWithConversation | { userMessage: MessageWithConversation; aiMessage?: MessageWithConversation; aiError?: string }> {
    return withErrorHandling(async () => {
      validateId(conversationId, 'conversationId')
      validateRole(role)
      const sanitizedContent = sanitizeString(content)
      validateMessage(sanitizedContent)
      
      return await apiClient.addMessage(conversationId, role, sanitizedContent)
    }, 'addMessage', 'messages')
  }

  async getMessages(conversationId: string): Promise<MessageWithConversation[]> {
    return withErrorHandling(async () => {
      validateId(conversationId, 'conversationId')
      
      return await apiClient.getMessages(conversationId)
    }, 'getMessages', 'messages')
  }

  // PRD Document methods
  async createPRDDocument(title: string, content: string): Promise<PRDDocumentWithVersion> {
    return withErrorHandling(async () => {
      const sanitizedTitle = sanitizeString(title)
      const sanitizedContent = sanitizeString(content)
      
      validatePRDTitle(sanitizedTitle)
      validatePRDContent(sanitizedContent)
      
      return await apiClient.createPRDDocument(sanitizedTitle, sanitizedContent)
    }, 'createPRDDocument', 'prd_documents')
  }

  async getPRDDocument(id: string): Promise<PRDDocumentWithVersion | null> {
    return withErrorHandling(async () => {
      validateId(id, 'documentId')
      
      try {
        return await apiClient.getPRDDocument(id)
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          return null
        }
        throw error
      }
    }, 'getPRDDocument', 'prd_documents')
  }

  async getAllPRDDocuments(): Promise<PRDDocumentWithVersion[]> {
    return withErrorHandling(async () => {
      return await apiClient.getAllPRDDocuments()
    }, 'getAllPRDDocuments', 'prd_documents')
  }

  async updatePRDDocument(id: string, updates: { title?: string; content?: string }): Promise<void> {
    return withErrorHandling(async () => {
      validateId(id, 'documentId')
      
      const sanitizedUpdates: typeof updates = {}
      
      if (updates.title !== undefined) {
        sanitizedUpdates.title = sanitizeString(updates.title)
        validatePRDTitle(sanitizedUpdates.title)
      }
      
      if (updates.content !== undefined) {
        sanitizedUpdates.content = sanitizeString(updates.content)
        validatePRDContent(sanitizedUpdates.content)
      }
      
      if (Object.keys(sanitizedUpdates).length === 0) {
        throw new ValidationError('At least one field must be provided for update')
      }
      
      await apiClient.updatePRDDocument(id, sanitizedUpdates)
    }, 'updatePRDDocument', 'prd_documents')
  }

  async createPRDDocumentVersion(originalId: string, newContent: string): Promise<PRDDocumentWithVersion> {
    return withErrorHandling(async () => {
      validateId(originalId, 'originalDocumentId')
      const sanitizedContent = sanitizeString(newContent)
      validatePRDContent(sanitizedContent)
      
      return await apiClient.createPRDDocumentVersion(originalId, sanitizedContent)
    }, 'createPRDDocumentVersion', 'prd_documents')
  }

  async getPRDDocumentVersions(parentId: string): Promise<PRDDocumentWithVersion[]> {
    return withErrorHandling(async () => {
      validateId(parentId, 'parentDocumentId')
      
      return await apiClient.getPRDDocumentVersions(parentId)
    }, 'getPRDDocumentVersions', 'prd_documents')
  }

  async deletePRDDocument(id: string): Promise<void> {
    return withErrorHandling(async () => {
      validateId(id, 'documentId')
      await apiClient.deletePRDDocument(id)
    }, 'deletePRDDocument', 'prd_documents')
  }

  // User preferences methods
  async setUserPreference(key: string, value: string): Promise<void> {
    return withErrorHandling(async () => {
      validatePreferenceKey(key)
      validatePreferenceValue(value)
      
      await apiClient.setUserPreference(key, value)
    }, 'setUserPreference', 'user_preferences')
  }

  async getUserPreference(key: string): Promise<string | null> {
    return withErrorHandling(async () => {
      validatePreferenceKey(key)
      return await apiClient.getUserPreference(key)
    }, 'getUserPreference', 'user_preferences')
  }

  async getAllUserPreferences(): Promise<Record<string, string>> {
    return withErrorHandling(async () => {
      return await apiClient.getAllUserPreferences()
    }, 'getAllUserPreferences', 'user_preferences')
  }

  async deleteUserPreference(key: string): Promise<void> {
    return withErrorHandling(async () => {
      validatePreferenceKey(key)
      await apiClient.deleteUserPreference(key)
    }, 'deleteUserPreference', 'user_preferences')
  }

  // Utility methods
  generateConversationTitle(firstMessage: string): string {
    // Generate a conversation title from the first message
    const maxLength = 50
    const cleaned = firstMessage.trim().replace(/\s+/g, ' ')
    
    if (cleaned.length <= maxLength) {
      return cleaned
    }
    
    // Find the last complete word within the limit
    const truncated = cleaned.substring(0, maxLength)
    const lastSpaceIndex = truncated.lastIndexOf(' ')
    
    if (lastSpaceIndex > maxLength * 0.7) {
      return truncated.substring(0, lastSpaceIndex) + '...'
    }
    
    return truncated + '...'
  }

  // Bulk operations for efficiency
  async addMessages(conversationId: string, messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: Date }>): Promise<MessageWithConversation[]> {
    return withErrorHandling(async () => {
      validateId(conversationId, 'conversationId')
      
      const addedMessages: MessageWithConversation[] = []
      
      for (const message of messages) {
        const addedMessage = await this.addMessage(conversationId, message.role, message.content, message.timestamp)
        addedMessages.push(addedMessage)
      }
      
      return addedMessages
    }, 'addMessages', 'messages')
  }

  // Search functionality
  async searchConversations(query: string): Promise<Conversation[]> {
    return withErrorHandling(async () => {
      const sanitizedQuery = sanitizeString(query).toLowerCase()
      if (sanitizedQuery.length === 0) return []
      
      const allConversations = await this.getAllConversations()
      return allConversations.filter(conv => 
        conv.title.toLowerCase().includes(sanitizedQuery)
      )
    }, 'searchConversations', 'conversations')
  }

  async searchPRDDocuments(query: string): Promise<PRDDocumentWithVersion[]> {
    return withErrorHandling(async () => {
      const sanitizedQuery = sanitizeString(query).toLowerCase()
      if (sanitizedQuery.length === 0) return []
      
      const allDocuments = await this.getAllPRDDocuments()
      return allDocuments.filter(doc => 
        doc.title.toLowerCase().includes(sanitizedQuery) ||
        doc.content.toLowerCase().includes(sanitizedQuery)
      )
    }, 'searchPRDDocuments', 'prd_documents')
  }

  // PRD Generation
  async generatePRDContent(prompt: string, existingContent?: string): Promise<string> {
    return withErrorHandling(async () => {
      const sanitizedPrompt = sanitizeString(prompt)
      if (sanitizedPrompt.length === 0) {
        throw new ValidationError('Prompt cannot be empty')
      }
      
      const response = await apiClient.generatePRD(sanitizedPrompt, existingContent)
      return response.content
    }, 'generatePRDContent', 'prd_generation')
  }

}

// Export singleton instance
export const dataService = new DataService()
export default DataService