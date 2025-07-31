import React, { useRef } from 'react'
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'

interface EditTabProps {
  content: string
  onChange: (content: string) => void
  title?: string
  onTitleChange?: (title: string) => void
}

const EditTab: React.FC<EditTabProps> = ({ content, onChange, title, onTitleChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      // You could add a toast notification here
      console.log('Content copied to clipboard')
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      
      // Insert 2 spaces for tab
      const newContent = content.substring(0, start) + '  ' + content.substring(end)
      onChange(newContent)
      
      // Move cursor to after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Title Input */}
      {title !== undefined && onTitleChange && (
        <div className="flex-shrink-0 bg-gray-850 border-b border-gray-700 px-4 py-3">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Document Title"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
      
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>Markdown Editor</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-sm transition-colors duration-200"
        >
          <ClipboardDocumentIcon className="w-4 h-4" />
          <span>Copy</span>
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-gray-900 text-gray-100 p-6 font-mono text-sm leading-relaxed resize-none border-none outline-none focus:ring-0 overflow-y-auto"
          placeholder="Start writing your PRD in Markdown..."
          style={{ 
            tabSize: 2,
            lineHeight: '1.6'
          }}
        />
        
        {/* Line numbers could be added here if desired */}
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Lines: {content.split('\n').length} | 
            Characters: {content.length} | 
            Words: {content.trim() ? content.trim().split(/\s+/).length : 0}
          </span>
          <span>Markdown</span>
        </div>
      </div>
    </div>
  )
}

export default EditTab