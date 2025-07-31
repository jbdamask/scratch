import Database from 'better-sqlite3'
import { Message, PRDDocument } from '../types'

export interface DatabaseProject {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface DatabaseConversation {
  id: string
  title: string
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export interface DatabaseMessage extends Message {
  conversationId: string
}

export interface DatabasePRDDocument extends PRDDocument {
  projectId: string
}

export interface UserPreference {
  key: string
  value: string
  updatedAt: Date
}

class DatabaseService {
  private db: Database.Database

  constructor(dbPath: string = 'prd-maker.db') {
    this.db = new Database(dbPath)
    this.initializeDatabase()
  }

  private initializeDatabase(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')

    // Drop all tables to start fresh with clean schema
    this.db.exec(`DROP TABLE IF EXISTS messages`)
    this.db.exec(`DROP TABLE IF EXISTS conversations`)
    this.db.exec(`DROP TABLE IF EXISTS prd_documents`)
    this.db.exec(`DROP TABLE IF EXISTS projects`)
    
    // Create projects table
    this.db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create conversations table
    this.db.exec(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        project_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `)

    // Create messages table
    this.db.exec(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
      )
    `)

    // Create PRD documents table
    this.db.exec(`
      CREATE TABLE prd_documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        project_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `)

    // Create user preferences table (keep existing data)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
      CREATE INDEX idx_messages_timestamp ON messages (timestamp);
      CREATE INDEX idx_conversations_project_id ON conversations (project_id);
      CREATE INDEX idx_prd_documents_project_id ON prd_documents (project_id);
      CREATE INDEX idx_projects_updated_at ON projects (updated_at);
    `)
  }

  // Project methods
  createProject(name: string): DatabaseProject {
    const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name)
      VALUES (?, ?)
    `)
    
    try {
      stmt.run(id, name)
      
      // Create default conversation for this project
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.db.prepare(`
        INSERT INTO conversations (id, title, project_id)
        VALUES (?, ?, ?)
      `).run(conversationId, 'Project Chat', id)
      
      // Create default PRD document for this project
      const prdId = `prd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.db.prepare(`
        INSERT INTO prd_documents (id, title, content, project_id)
        VALUES (?, ?, ?, ?)
      `).run(prdId, 'Product Requirements Document', `# ${name}

## Overview
This is a new PRD document for ${name}. Start editing to customize it.

## Features
- Feature 1
- Feature 2
- Feature 3

## Technical Requirements
- Requirement 1
- Requirement 2
- Requirement 3`, id)
      
      return this.getProject(id)!
    } catch (error) {
      throw new Error(`Failed to create project: ${error}`)
    }
  }

  getProject(id: string): DatabaseProject | null {
    const stmt = this.db.prepare(`
      SELECT id, name, created_at, updated_at
      FROM projects
      WHERE id = ?
    `)
    
    const row = stmt.get(id) as any
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  getAllProjects(): DatabaseProject[] {
    const stmt = this.db.prepare(`
      SELECT id, name, created_at, updated_at
      FROM projects
      ORDER BY updated_at DESC
    `)
    
    const rows = stmt.all() as any[]
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))
  }

  updateProject(id: string, name: string): void {
    const stmt = this.db.prepare(`
      UPDATE projects 
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    
    const result = stmt.run(name, id)
    if (result.changes === 0) {
      throw new Error(`Project with id ${id} not found`)
    }
  }

  deleteProject(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    const result = stmt.run(id)
    if (result.changes === 0) {
      throw new Error(`Project with id ${id} not found`)
    }
  }

  // Get conversation by project
  getConversationByProject(projectId: string): DatabaseConversation | null {
    const stmt = this.db.prepare(`
      SELECT id, title, project_id, created_at, updated_at
      FROM conversations
      WHERE project_id = ?
    `)
    
    const row = stmt.get(projectId) as any
    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      projectId: row.project_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  // Get PRD document by project
  getPRDDocumentByProject(projectId: string): DatabasePRDDocument | null {
    const stmt = this.db.prepare(`
      SELECT id, title, content, project_id, created_at, updated_at
      FROM prd_documents
      WHERE project_id = ?
    `)
    
    const row = stmt.get(projectId) as any
    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      projectId: row.project_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  getConversation(id: string): DatabaseConversation | null {
    const stmt = this.db.prepare(`
      SELECT id, title, project_id, created_at, updated_at
      FROM conversations
      WHERE id = ?
    `)
    
    const row = stmt.get(id) as any
    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      projectId: row.project_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  // Message methods
  addMessage(message: DatabaseMessage): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    try {
      stmt.run(
        message.id,
        message.conversationId,
        message.role,
        message.content,
        message.timestamp.toISOString()
      )

      // Update conversation's updated_at timestamp
      this.db.prepare(`
        UPDATE conversations 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(message.conversationId)
    } catch (error) {
      throw new Error(`Failed to add message: ${error}`)
    }
  }

  getMessages(conversationId: string): DatabaseMessage[] {
    const stmt = this.db.prepare(`
      SELECT id, conversation_id, role, content, timestamp
      FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `)
    
    const rows = stmt.all(conversationId) as any[]
    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: new Date(row.timestamp)
    }))
  }

  getPRDDocument(id: string): DatabasePRDDocument | null {
    const stmt = this.db.prepare(`
      SELECT id, title, content, project_id, created_at, updated_at
      FROM prd_documents
      WHERE id = ?
    `)
    
    const row = stmt.get(id) as any
    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      projectId: row.project_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  updatePRDDocument(id: string, updates: Partial<Pick<DatabasePRDDocument, 'title' | 'content'>>): void {
    const fields: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }

    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
    }

    if (fields.length === 0) return

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE prd_documents 
      SET ${fields.join(', ')}
      WHERE id = ?
    `)
    
    const result = stmt.run(...values)
    if (result.changes === 0) {
      throw new Error(`PRD document with id ${id} not found`)
    }
  }

  // User preferences methods
  setUserPreference(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_preferences (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `)
    
    stmt.run(key, value)
  }

  getUserPreference(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM user_preferences WHERE key = ?')
    const row = stmt.get(key) as any
    return row ? row.value : null
  }

  getAllUserPreferences(): UserPreference[] {
    const stmt = this.db.prepare(`
      SELECT key, value, updated_at
      FROM user_preferences
      ORDER BY key
    `)
    
    const rows = stmt.all() as any[]
    return rows.map(row => ({
      key: row.key,
      value: row.value,
      updatedAt: new Date(row.updated_at)
    }))
  }

  deleteUserPreference(key: string): void {
    const stmt = this.db.prepare('DELETE FROM user_preferences WHERE key = ?')
    const result = stmt.run(key)
    if (result.changes === 0) {
      throw new Error(`User preference with key ${key} not found`)
    }
  }

  // Utility methods
  close(): void {
    this.db.close()
  }

  // Transaction support
  transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn)
    return transaction()
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
export default DatabaseService