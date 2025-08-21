// Import database only in Node.js environment
let Database: any = null;
try {
  if (typeof window === 'undefined') {
    Database = (await import('better-sqlite3')).default;
  }
} catch (error) {
  console.warn('SQLite not available in browser environment');
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  diagram_type?: string;
  mermaid_code?: string;
}

export interface ChatSession {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  status: 'active' | 'completed' | 'on-hold';
  created_at: string;
  updated_at: string;
}

export interface DiagramCatalog {
  id: string;
  project_id: string;
  session_id: string;
  title: string;
  diagram_type: string;
  mermaid_code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

class ChatDatabase {
  private db: any;

  constructor(filename = 'chats.db') {
    if (Database) {
      this.db = new Database(filename);
      this.initTables();
    } else {
      console.warn('Database not available, using localStorage fallback');
      this.db = null;
    }
  }

  private initTables() {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        industry TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'on-hold')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        diagram_type TEXT,
        mermaid_code TEXT,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS diagram_catalog (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        diagram_type TEXT NOT NULL,
        mermaid_code TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON chat_sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions(updated_at);
      CREATE INDEX IF NOT EXISTS idx_diagrams_project ON diagram_catalog(project_id);
      CREATE INDEX IF NOT EXISTS idx_diagrams_session ON diagram_catalog(session_id);
    `);
  }

  // Project methods
  createProject(name: string, description?: string, industry?: string): string {
    const projectId = crypto.randomUUID();
    
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO projects (id, name, description, industry) VALUES (?, ?, ?, ?)
      `);
      stmt.run(projectId, name, description || null, industry || null);
    } else {
      const project = {
        id: projectId,
        name,
        description,
        industry,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`project_${projectId}`, JSON.stringify(project));
    }
    
    return projectId;
  }

  getProjects(): Project[] {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM projects ORDER BY updated_at DESC
      `);
      return stmt.all() as Project[];
    } else {
      const projects: Project[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('project_')) {
          const project = JSON.parse(localStorage.getItem(key)!);
          projects.push(project);
        }
      }
      return projects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
  }

  getProject(projectId: string): Project | null {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM projects WHERE id = ?
      `);
      return (stmt.get(projectId) as Project) || null;
    } else {
      const project = localStorage.getItem(`project_${projectId}`);
      return project ? JSON.parse(project) : null;
    }
  }

  updateProject(projectId: string, updates: Partial<Project>): void {
    if (this.db) {
      const fields = Object.keys(updates).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id');
      
      const stmt = this.db.prepare(`
        UPDATE projects SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `);
      stmt.run(...values, projectId);
    } else {
      const project = this.getProject(projectId);
      if (project) {
        Object.assign(project, updates, { updated_at: new Date().toISOString() });
        localStorage.setItem(`project_${projectId}`, JSON.stringify(project));
      }
    }
  }

  deleteProject(projectId: string): void {
    if (this.db) {
      const stmt = this.db.prepare(`DELETE FROM projects WHERE id = ?`);
      stmt.run(projectId);
    } else {
      localStorage.removeItem(`project_${projectId}`);
      // Also remove related sessions and messages
      const sessions = this.getSessionsByProject(projectId);
      sessions.forEach(session => this.deleteSession(session.id));
    }
  }

  createSession(projectId: string, title: string): string {
    const sessionId = crypto.randomUUID();
    
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO chat_sessions (id, project_id, title) VALUES (?, ?, ?)
      `);
      stmt.run(sessionId, projectId, title);
    } else {
      const session = {
        id: sessionId,
        project_id: projectId,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`session_${sessionId}`, JSON.stringify(session));
    }
    
    return sessionId;
  }

  getSessionsByProject(projectId: string): ChatSession[] {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_sessions WHERE project_id = ? ORDER BY updated_at DESC
      `);
      return stmt.all(projectId) as ChatSession[];
    } else {
      const sessions: ChatSession[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('session_')) {
          const session = JSON.parse(localStorage.getItem(key)!);
          if (session.project_id === projectId) {
            sessions.push(session);
          }
        }
      }
      return sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
  }

  getSessions(): ChatSession[] {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_sessions ORDER BY updated_at DESC
      `);
      return stmt.all() as ChatSession[];
    }
    return [];
  }

  getSession(sessionId: string): ChatSession | null {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_sessions WHERE id = ?
      `);
      return (stmt.get(sessionId) as ChatSession) || null;
    }
    
    const session = localStorage.getItem(`session_${sessionId}`);
    return session ? JSON.parse(session) : null;
  }

  updateSessionTitle(sessionId: string, title: string) {
    if (this.db) {
      const stmt = this.db.prepare(`
        UPDATE chat_sessions 
        SET title = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(title, sessionId);
      
      // Also update project timestamp
      const session = this.getSession(sessionId);
      if (session) {
        this.updateProject(session.project_id, {});  // This will update the timestamp
      }
    } else {
      const session = this.getSession(sessionId);
      if (session) {
        session.title = title;
        session.updated_at = new Date().toISOString();
        localStorage.setItem(`session_${sessionId}`, JSON.stringify(session));
        
        // Update project timestamp
        const project = this.getProject(session.project_id);
        if (project) {
          project.updated_at = new Date().toISOString();
          localStorage.setItem(`project_${session.project_id}`, JSON.stringify(project));
        }
      }
    }
  }

  deleteSession(sessionId: string) {
    if (this.db) {
      const stmt = this.db.prepare(`
        DELETE FROM chat_sessions WHERE id = ?
      `);
      stmt.run(sessionId);
    } else {
      localStorage.removeItem(`session_${sessionId}`);
      // Also remove messages
      const messages = this.getMessages(sessionId);
      messages.forEach(msg => localStorage.removeItem(`message_${msg.id}`));
    }
  }

  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    diagramType?: string,
    mermaidCode?: string
  ): number {
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO chat_messages (session_id, role, content, diagram_type, mermaid_code)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(sessionId, role, content, diagramType || null, mermaidCode || null);
      
      // Update session timestamp
      const updateStmt = this.db.prepare(`
        UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `);
      updateStmt.run(sessionId);
      
      // Update project timestamp
      const session = this.getSession(sessionId);
      if (session) {
        this.updateProject(session.project_id, {});
      }
      
      return result.lastInsertRowid as number;
    } else {
      const messageId = Date.now(); // Simple ID generation
      const message = {
        id: messageId,
        session_id: sessionId,
        role,
        content,
        timestamp: new Date().toISOString(),
        diagram_type: diagramType,
        mermaid_code: mermaidCode
      };
      localStorage.setItem(`message_${messageId}`, JSON.stringify(message));
      
      // Update session timestamp
      const session = this.getSession(sessionId);
      if (session) {
        session.updated_at = new Date().toISOString();
        localStorage.setItem(`session_${sessionId}`, JSON.stringify(session));
      }
      
      return messageId;
    }
  }

  getMessages(sessionId: string): ChatMessage[] {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
      `);
      return stmt.all(sessionId) as ChatMessage[];
    } else {
      const messages: ChatMessage[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('message_')) {
          const message = JSON.parse(localStorage.getItem(key)!);
          if (message.session_id === sessionId) {
            messages.push(message);
          }
        }
      }
      return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  }

  deleteMessage(messageId: number) {
    if (this.db) {
      const stmt = this.db.prepare(`
        DELETE FROM chat_messages WHERE id = ?
      `);
      stmt.run(messageId);
    } else {
      localStorage.removeItem(`message_${messageId}`);
    }
  }

  // Diagram Catalog methods
  addDiagramToCatalog(
    projectId: string,
    sessionId: string,
    title: string,
    diagramType: string,
    mermaidCode: string,
    description?: string
  ): string {
    const diagramId = crypto.randomUUID();
    
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO diagram_catalog (id, project_id, session_id, title, diagram_type, mermaid_code, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(diagramId, projectId, sessionId, title, diagramType, mermaidCode, description || null);
    } else {
      const diagram = {
        id: diagramId,
        project_id: projectId,
        session_id: sessionId,
        title,
        diagram_type: diagramType,
        mermaid_code: mermaidCode,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`diagram_${diagramId}`, JSON.stringify(diagram));
    }
    
    return diagramId;
  }

  getDiagramsByProject(projectId: string): DiagramCatalog[] {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM diagram_catalog WHERE project_id = ? ORDER BY updated_at DESC
      `);
      return stmt.all(projectId) as DiagramCatalog[];
    } else {
      const diagrams: DiagramCatalog[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('diagram_')) {
          const diagram = JSON.parse(localStorage.getItem(key)!);
          if (diagram.project_id === projectId) {
            diagrams.push(diagram);
          }
        }
      }
      return diagrams.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
  }

  getDiagramsBySession(sessionId: string): DiagramCatalog[] {
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM diagram_catalog WHERE session_id = ? ORDER BY created_at ASC
      `);
      return stmt.all(sessionId) as DiagramCatalog[];
    } else {
      const diagrams: DiagramCatalog[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('diagram_')) {
          const diagram = JSON.parse(localStorage.getItem(key)!);
          if (diagram.session_id === sessionId) {
            diagrams.push(diagram);
          }
        }
      }
      return diagrams.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  }

  updateDiagram(diagramId: string, updates: Partial<DiagramCatalog>): void {
    if (this.db) {
      const fields = Object.keys(updates).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id');
      
      const stmt = this.db.prepare(`
        UPDATE diagram_catalog SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `);
      stmt.run(...values, diagramId);
    } else {
      const diagram = localStorage.getItem(`diagram_${diagramId}`);
      if (diagram) {
        const parsedDiagram = JSON.parse(diagram);
        Object.assign(parsedDiagram, updates, { updated_at: new Date().toISOString() });
        localStorage.setItem(`diagram_${diagramId}`, JSON.stringify(parsedDiagram));
      }
    }
  }

  deleteDiagram(diagramId: string): void {
    if (this.db) {
      const stmt = this.db.prepare(`DELETE FROM diagram_catalog WHERE id = ?`);
      stmt.run(diagramId);
    } else {
      localStorage.removeItem(`diagram_${diagramId}`);
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export const chatDb = new ChatDatabase();