import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { databaseService } from '../src/services/database'
import { claudeService } from './services/claudeService'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Project endpoints
app.get('/api/projects', (req, res) => {
  try {
    const projects = databaseService.getAllProjects()
    res.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

app.post('/api/projects', (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    
    const project = databaseService.createProject(name)
    res.status(201).json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = databaseService.getProject(req.params.id)
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

app.put('/api/projects/:id', (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    
    databaseService.updateProject(req.params.id, name)
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating project:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    res.status(500).json({ error: 'Failed to update project' })
  }
})

app.delete('/api/projects/:id', (req, res) => {
  try {
    databaseService.deleteProject(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Get project conversation and PRD
app.get('/api/projects/:id/conversation', (req, res) => {
  try {
    const conversation = databaseService.getConversationByProject(req.params.id)
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found for this project' })
    }
    res.json(conversation)
  } catch (error) {
    console.error('Error fetching project conversation:', error)
    res.status(500).json({ error: 'Failed to fetch project conversation' })
  }
})

app.get('/api/projects/:id/prd', (req, res) => {
  try {
    const prd = databaseService.getPRDDocumentByProject(req.params.id)
    if (!prd) {
      return res.status(404).json({ error: 'PRD document not found for this project' })
    }
    res.json(prd)
  } catch (error) {
    console.error('Error fetching project PRD:', error)
    res.status(500).json({ error: 'Failed to fetch project PRD' })
  }
})

// Conversation endpoints
app.get('/api/conversations', (req, res) => {
  try {
    const conversations = databaseService.getAllConversations()
    res.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

app.post('/api/conversations', (req, res) => {
  try {
    const { title } = req.body
    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }
    
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const conversation = databaseService.createConversation(id, title)
    res.status(201).json(conversation)
  } catch (error) {
    console.error('Error creating conversation:', error)
    res.status(500).json({ error: 'Failed to create conversation' })
  }
})

app.get('/api/conversations/:id', (req, res) => {
  try {
    const conversation = databaseService.getConversation(req.params.id)
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }
    res.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation:', error)
    res.status(500).json({ error: 'Failed to fetch conversation' })
  }
})

app.put('/api/conversations/:id', (req, res) => {
  try {
    const { title } = req.body
    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }
    
    databaseService.updateConversation(req.params.id, title)
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating conversation:', error)
    res.status(500).json({ error: 'Failed to update conversation' })
  }
})

app.delete('/api/conversations/:id', (req, res) => {
  try {
    databaseService.deleteConversation(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    
    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Conversation not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete conversation' })
  }
})

// Link conversation to PRD document
app.put('/api/conversations/:id/link-prd', (req, res) => {
  try {
    const { prdDocumentId } = req.body
    if (!prdDocumentId) {
      return res.status(400).json({ error: 'PRD document ID is required' })
    }
    
    databaseService.linkConversationToPRD(req.params.id, prdDocumentId)
    res.json({ success: true })
  } catch (error) {
    console.error('Error linking conversation to PRD:', error)
    res.status(500).json({ error: 'Failed to link conversation to PRD' })
  }
})

// Get conversation by PRD document
app.get('/api/conversations/by-prd/:prdId', (req, res) => {
  try {
    const conversation = databaseService.getConversationByPRDDocument(req.params.prdId)
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found for this PRD document' })
    }
    res.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation by PRD:', error)
    res.status(500).json({ error: 'Failed to fetch conversation by PRD' })
  }
})

// Message endpoints
app.get('/api/conversations/:id/messages', (req, res) => {
  try {
    const messages = databaseService.getMessages(req.params.id)
    res.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { role, content } = req.body
    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' })
    }
    
    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "user" or "assistant"' })
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const message = {
      id: messageId,
      conversationId: req.params.id,
      role: role as 'user' | 'assistant',
      content,
      timestamp: new Date()
    }
    
    databaseService.addMessage(message)
    
    // If it's a user message, generate an AI response
    if (role === 'user') {
      // Get conversation history for context
      const messages = databaseService.getMessages(req.params.id)
      
      try {
        const aiResponse = await claudeService.generateResponse(messages)
        
        // Save AI response to database
        const aiMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const aiMessage = {
          id: aiMessageId,
          conversationId: req.params.id,
          role: 'assistant' as const,
          content: aiResponse.content,
          timestamp: new Date()
        }
        
        databaseService.addMessage(aiMessage)
        
        // Return both messages
        res.status(201).json({
          userMessage: message,
          aiMessage: aiMessage,
          usage: aiResponse.usage
        })
      } catch (aiError) {
        console.error('AI response error:', aiError)
        // Still return the user message even if AI fails
        res.status(201).json({
          userMessage: message,
          aiError: aiError instanceof Error ? aiError.message : 'AI response failed'
        })
      }
    } else {
      // For assistant messages, just return the message
      res.status(201).json(message)
    }
  } catch (error) {
    console.error('Error adding message:', error)
    res.status(500).json({ error: 'Failed to add message' })
  }
})

// PRD Document endpoints
app.get('/api/prd-documents', (req, res) => {
  try {
    const documents = databaseService.getAllPRDDocuments()
    res.json(documents)
  } catch (error) {
    console.error('Error fetching PRD documents:', error)
    res.status(500).json({ error: 'Failed to fetch PRD documents' })
  }
})

app.post('/api/prd-documents', (req, res) => {
  try {
    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }
    
    const id = `prd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const document = {
      id,
      title,
      content,
      version: 1
    }
    
    const created = databaseService.createPRDDocument(document)
    res.status(201).json(created)
  } catch (error) {
    console.error('Error creating PRD document:', error)
    res.status(500).json({ error: 'Failed to create PRD document' })
  }
})

app.get('/api/prd-documents/:id', (req, res) => {
  try {
    const document = databaseService.getPRDDocument(req.params.id)
    if (!document) {
      return res.status(404).json({ error: 'PRD document not found' })
    }
    res.json(document)
  } catch (error) {
    console.error('Error fetching PRD document:', error)
    res.status(500).json({ error: 'Failed to fetch PRD document' })
  }
})

app.put('/api/prd-documents/:id', (req, res) => {
  try {
    const { title, content } = req.body
    const updates: any = {}
    
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided for update' })
    }
    
    databaseService.updatePRDDocument(req.params.id, updates)
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating PRD document:', error)
    res.status(500).json({ error: 'Failed to update PRD document' })
  }
})

app.delete('/api/prd-documents/:id', (req, res) => {
  try {
    databaseService.deletePRDDocument(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting PRD document:', error)
    
    // Check if it's a not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'PRD document not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete PRD document' })
  }
})

app.post('/api/prd-documents/:id/versions', (req, res) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }
    
    const newVersion = databaseService.createPRDDocumentVersion(req.params.id, content)
    res.status(201).json(newVersion)
  } catch (error) {
    console.error('Error creating PRD document version:', error)
    res.status(500).json({ error: 'Failed to create PRD document version' })
  }
})

app.get('/api/prd-documents/:id/versions', (req, res) => {
  try {
    const versions = databaseService.getPRDDocumentVersions(req.params.id)
    res.json(versions)
  } catch (error) {
    console.error('Error fetching PRD document versions:', error)
    res.status(500).json({ error: 'Failed to fetch PRD document versions' })
  }
})

// User preferences endpoints
app.get('/api/preferences', (req, res) => {
  try {
    const preferences = databaseService.getAllUserPreferences()
    const result: Record<string, string> = {}
    
    for (const pref of preferences) {
      result[pref.key] = pref.value
    }
    
    res.json(result)
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    res.status(500).json({ error: 'Failed to fetch user preferences' })
  }
})

app.get('/api/preferences/:key', (req, res) => {
  try {
    const value = databaseService.getUserPreference(req.params.key)
    if (value === null) {
      return res.status(404).json({ error: 'Preference not found' })
    }
    res.json({ key: req.params.key, value })
  } catch (error) {
    console.error('Error fetching user preference:', error)
    res.status(500).json({ error: 'Failed to fetch user preference' })
  }
})

app.put('/api/preferences/:key', (req, res) => {
  try {
    const { value } = req.body
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' })
    }
    
    databaseService.setUserPreference(req.params.key, value)
    res.json({ success: true })
  } catch (error) {
    console.error('Error setting user preference:', error)
    res.status(500).json({ error: 'Failed to set user preference' })
  }
})

app.delete('/api/preferences/:key', (req, res) => {
  try {
    databaseService.deleteUserPreference(req.params.key)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting user preference:', error)
    res.status(500).json({ error: 'Failed to delete user preference' })
  }
})

// PRD Generation endpoint
app.post('/api/generate-prd', async (req, res) => {
  try {
    const { prompt, existingContent } = req.body
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const prdResponse = await claudeService.generatePRDContent(prompt, existingContent)
    res.json({
      content: prdResponse.content,
      usage: prdResponse.usage
    })
  } catch (error) {
    console.error('Error generating PRD:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate PRD content'
    res.status(500).json({ error: errorMessage })
  }
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})