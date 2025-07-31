import { DatabaseConversation, DatabaseMessage, DatabasePRDDocument, UserPreference } from './database'

export class BrowserStorageService {
  private getStorageKey(prefix: string): string {
    return `prd-maker:${prefix}`
  }

  private setItem(key: string, value: any): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      throw new Error('Storage operation failed')
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getStorageKey(key))
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('Failed to read from localStorage:', error)
      return null
    }
  }

  private removeItem(key: string): void {
    localStorage.removeItem(this.getStorageKey(key))
  }

  // Conversation methods
  createConversation(id: string, title: string): DatabaseConversation {
    const conversation: DatabaseConversation = {
      id,
      title,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const conversations = this.getAllConversations()
    conversations.push(conversation)
    this.setItem('conversations', conversations)

    return conversation
  }

  getConversation(id: string): DatabaseConversation | null {
    const conversations = this.getAllConversations()
    return conversations.find(conv => conv.id === id) || null
  }

  getAllConversations(): DatabaseConversation[] {
    const conversations = this.getItem<any[]>('conversations') || []
    return conversations.map(conv => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt)
    }))
  }

  updateConversation(id: string, title: string): void {
    const conversations = this.getAllConversations()
    const index = conversations.findIndex(conv => conv.id === id)
    
    if (index === -1) {
      throw new Error(`Conversation with id ${id} not found`)
    }

    conversations[index].title = title
    conversations[index].updatedAt = new Date()
    this.setItem('conversations', conversations)
  }

  deleteConversation(id: string): void {
    const conversations = this.getAllConversations()
    const filtered = conversations.filter(conv => conv.id !== id)
    
    if (filtered.length === conversations.length) {
      throw new Error(`Conversation with id ${id} not found`)
    }

    this.setItem('conversations', filtered)
    
    // Also delete all messages for this conversation
    const messages = this.getMessages(id)
    if (messages.length > 0) {
      const allMessages = this.getItem<DatabaseMessage[]>('messages') || []
      const filteredMessages = allMessages.filter(msg => msg.conversationId !== id)
      this.setItem('messages', filteredMessages)
    }
  }

  // Message methods
  addMessage(message: DatabaseMessage): void {
    const messages = this.getItem<DatabaseMessage[]>('messages') || []
    messages.push({
      ...message,
      timestamp: message.timestamp
    })
    this.setItem('messages', messages)

    // Update conversation's updated_at timestamp
    const conversations = this.getAllConversations()
    const conversationIndex = conversations.findIndex(conv => conv.id === message.conversationId)
    if (conversationIndex !== -1) {
      conversations[conversationIndex].updatedAt = new Date()
      this.setItem('conversations', conversations)
    }
  }

  getMessages(conversationId: string): DatabaseMessage[] {
    const allMessages = this.getItem<any[]>('messages') || []
    return allMessages
      .filter(msg => msg.conversationId === conversationId)
      .map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  // PRD Document methods
  createPRDDocument(document: Omit<DatabasePRDDocument, 'createdAt' | 'updatedAt'>): DatabasePRDDocument {
    const prdDocument: DatabasePRDDocument = {
      ...document,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const documents = this.getAllPRDDocuments()
    documents.push(prdDocument)
    this.setItem('prd_documents', documents)

    return prdDocument
  }

  getPRDDocument(id: string): DatabasePRDDocument | null {
    const documents = this.getAllPRDDocuments()
    return documents.find(doc => doc.id === id) || null
  }

  getAllPRDDocuments(): DatabasePRDDocument[] {
    const documents = this.getItem<any[]>('prd_documents') || []
    return documents
      .filter(doc => !doc.parentId) // Only return root documents
      .map(doc => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  getPRDDocumentVersions(parentId: string): DatabasePRDDocument[] {
    const allDocuments = this.getItem<any[]>('prd_documents') || []
    return allDocuments
      .filter(doc => doc.parentId === parentId || doc.id === parentId)
      .map(doc => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }))
      .sort((a, b) => a.version - b.version)
  }

  updatePRDDocument(id: string, updates: Partial<Pick<DatabasePRDDocument, 'title' | 'content'>>): void {
    const documents = this.getItem<DatabasePRDDocument[]>('prd_documents') || []
    const index = documents.findIndex(doc => doc.id === id)
    
    if (index === -1) {
      throw new Error(`PRD document with id ${id} not found`)
    }

    if (updates.title !== undefined) {
      documents[index].title = updates.title
    }
    if (updates.content !== undefined) {
      documents[index].content = updates.content
    }
    
    documents[index].updatedAt = new Date()
    this.setItem('prd_documents', documents)
  }

  createPRDDocumentVersion(originalId: string, newContent: string): DatabasePRDDocument {
    const original = this.getPRDDocument(originalId)
    if (!original) {
      throw new Error(`Original PRD document with id ${originalId} not found`)
    }

    const newVersionId = `${originalId}-v${original.version + 1}-${Date.now()}`
    const newVersion: Omit<DatabasePRDDocument, 'createdAt' | 'updatedAt'> = {
      id: newVersionId,
      title: original.title,
      content: newContent,
      version: original.version + 1,
      parentId: original.parentId || originalId
    }

    return this.createPRDDocument(newVersion)
  }

  deletePRDDocument(id: string): void {
    const documents = this.getItem<DatabasePRDDocument[]>('prd_documents') || []
    const filtered = documents.filter(doc => doc.id !== id)
    
    if (filtered.length === documents.length) {
      throw new Error(`PRD document with id ${id} not found`)
    }

    this.setItem('prd_documents', filtered)
  }

  // User preferences methods
  setUserPreference(key: string, value: string): void {
    const preferences = this.getAllUserPreferences()
    const existingIndex = preferences.findIndex(pref => pref.key === key)
    
    const preference: UserPreference = {
      key,
      value,
      updatedAt: new Date()
    }

    if (existingIndex !== -1) {
      preferences[existingIndex] = preference
    } else {
      preferences.push(preference)
    }

    this.setItem('user_preferences', preferences)
  }

  getUserPreference(key: string): string | null {
    const preferences = this.getAllUserPreferences()
    const preference = preferences.find(pref => pref.key === key)
    return preference ? preference.value : null
  }

  getAllUserPreferences(): UserPreference[] {
    const preferences = this.getItem<any[]>('user_preferences') || []
    return preferences.map(pref => ({
      ...pref,
      updatedAt: new Date(pref.updatedAt)
    }))
  }

  deleteUserPreference(key: string): void {
    const preferences = this.getAllUserPreferences()
    const filtered = preferences.filter(pref => pref.key !== key)
    
    if (filtered.length === preferences.length) {
      throw new Error(`User preference with key ${key} not found`)
    }

    this.setItem('user_preferences', filtered)
  }

  // Transaction support (simple implementation for localStorage)
  transaction<T>(fn: () => T): T {
    return fn()
  }

  // Utility methods
  close(): void {
    // No-op for localStorage
  }
}

// Export singleton instance
export const browserStorageService = new BrowserStorageService()
export default BrowserStorageService