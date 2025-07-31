import { DatabaseError } from '../types'

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class DatabaseServiceError extends Error implements DatabaseError {
  constructor(
    message: string,
    public code?: string,
    public table?: string,
    public operation?: string
  ) {
    super(message)
    this.name = 'DatabaseServiceError'
  }
}

// Validation functions
export const validateMessage = (content: string): void => {
  if (!content || content.trim().length === 0) {
    throw new ValidationError('Message content cannot be empty', 'content')
  }
  
  if (content.length > 10000) {
    throw new ValidationError('Message content too long (max 10,000 characters)', 'content')
  }
}

export const validatePRDTitle = (title: string): void => {
  if (!title || title.trim().length === 0) {
    throw new ValidationError('PRD title cannot be empty', 'title')
  }
  
  if (title.length > 200) {
    throw new ValidationError('PRD title too long (max 200 characters)', 'title')
  }
}

export const validatePRDContent = (content: string): void => {
  if (!content || content.trim().length === 0) {
    throw new ValidationError('PRD content cannot be empty', 'content')
  }
  
  if (content.length > 100000) {
    throw new ValidationError('PRD content too long (max 100,000 characters)', 'content')
  }
}

export const validateConversationTitle = (title: string): void => {
  if (!title || title.trim().length === 0) {
    throw new ValidationError('Conversation title cannot be empty', 'title')
  }
  
  if (title.length > 100) {
    throw new ValidationError('Conversation title too long (max 100 characters)', 'title')
  }
}

export const validateId = (id: string, fieldName: string = 'id'): void => {
  if (!id || id.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName)
  }
  
  // Basic ID format validation (alphanumeric, hyphens, underscores)
  const idPattern = /^[a-zA-Z0-9_-]+$/
  if (!idPattern.test(id)) {
    throw new ValidationError(
      `${fieldName} must contain only letters, numbers, hyphens, and underscores`,
      fieldName
    )
  }
}

export const validateRole = (role: string): void => {
  if (!['user', 'assistant'].includes(role)) {
    throw new ValidationError('Role must be either "user" or "assistant"', 'role')
  }
}

export const validatePreferenceKey = (key: string): void => {
  if (!key || key.trim().length === 0) {
    throw new ValidationError('Preference key cannot be empty', 'key')
  }
  
  if (key.length > 50) {
    throw new ValidationError('Preference key too long (max 50 characters)', 'key')
  }
  
  // Key should follow a dot notation pattern like 'app.theme' or 'editor.fontSize'
  const keyPattern = /^[a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9]$/
  if (!keyPattern.test(key)) {
    throw new ValidationError(
      'Preference key must be alphanumeric with dots and underscores only',
      'key'
    )
  }
}

export const validatePreferenceValue = (value: string): void => {
  if (value.length > 1000) {
    throw new ValidationError('Preference value too long (max 1,000 characters)', 'value')
  }
}

// Database error handling wrapper
export const handleDatabaseError = (error: unknown, operation: string, table?: string): never => {
  if (error instanceof ValidationError) {
    throw error
  }
  
  if (error instanceof Error) {
    // Check for common SQLite errors
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new DatabaseServiceError(
        'A record with this identifier already exists',
        'UNIQUE_CONSTRAINT',
        table,
        operation
      )
    }
    
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      throw new DatabaseServiceError(
        'Referenced record does not exist',
        'FOREIGN_KEY_CONSTRAINT',
        table,
        operation
      )
    }
    
    if (error.message.includes('NOT NULL constraint failed')) {
      throw new DatabaseServiceError(
        'Required field is missing',
        'NOT_NULL_CONSTRAINT',
        table,
        operation
      )
    }
    
    if (error.message.includes('database is locked')) {
      throw new DatabaseServiceError(
        'Database is temporarily unavailable',
        'DATABASE_LOCKED',
        table,
        operation
      )
    }
    
    // Generic database error
    throw new DatabaseServiceError(
      `Database operation failed: ${error.message}`,
      'UNKNOWN_ERROR',
      table,
      operation
    )
  }
  
  // Unknown error type
  throw new DatabaseServiceError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    table,
    operation
  )
}

// Utility function to safely execute database operations
export const withErrorHandling = <T>(
  operation: () => T,
  operationName: string,
  table?: string
): T => {
  try {
    return operation()
  } catch (error) {
    return handleDatabaseError(error, operationName, table)
  }
}

// Sanitization functions
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/\0/g, '')
}

export const sanitizeHtml = (input: string): string => {
  // Basic HTML sanitization - in a real app, use a proper library like DOMPurify
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// JSON validation
export const isValidJson = (input: string): boolean => {
  try {
    JSON.parse(input)
    return true
  } catch {
    return false
  }
}

// Date validation
export const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime())
}

export const validateTimestamp = (timestamp: Date): void => {
  if (!isValidDate(timestamp)) {
    throw new ValidationError('Invalid timestamp', 'timestamp')
  }
  
  // Ensure timestamp is not in the future (with 1 minute tolerance)
  const now = new Date()
  const oneMinuteFromNow = new Date(now.getTime() + 60000)
  
  if (timestamp > oneMinuteFromNow) {
    throw new ValidationError('Timestamp cannot be in the future', 'timestamp')
  }
}