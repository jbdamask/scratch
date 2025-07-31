import React, { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline'
import { MessageWithConversation, Conversation } from '../types'
import { apiClient } from '../services/apiClient'
import { useAppContext } from '../contexts/AppContext'
import { detectPRDContent, extractPRDTitle } from '../utils/prdDetection'

const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<MessageWithConversation[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { currentProject } = useAppContext()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Check for PRD content in assistant messages and update the project PRD
  const checkForPRDContent = async (message: MessageWithConversation) => {
    if (message.role !== 'assistant' || !currentProject) {
      return message
    }

    const prdData = detectPRDContent(message.content)
    if (prdData && prdData.isFullPRD) {
      const title = extractPRDTitle(prdData.content)
      
      // Update the PRD document content directly
      if (typeof window !== 'undefined' && (window as any).updatePRDContent) {
        (window as any).updatePRDContent(prdData.content, title)
      }

      // Return message with modified content for chat display
      return {
        ...message,
        content: prdData.chatDisplayContent
      }
    }

    return message
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load project conversation when project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectConversation()
    } else {
      setConversation(null)
      setMessages([])
    }
  }, [currentProject])

  const loadProjectConversation = async () => {
    if (!currentProject) return

    try {
      const projectConversation = await apiClient.getProjectConversation(currentProject.id)
      setConversation(projectConversation)
      
      const conversationMessages = await apiClient.getMessages(projectConversation.id)
      
      // Process messages for PRD content and get display versions
      const processedMessages = await Promise.all(
        conversationMessages.map(async (message) => {
          if (message.role === 'assistant') {
            return await checkForPRDContent(message)
          }
          return message
        })
      )
      
      setMessages(processedMessages)
      
      setError(null)
    } catch (err) {
      setError('Failed to load project conversation')
      console.error('Error loading project conversation:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !conversation) return

    const userInput = input.trim()
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Add user message and get AI response
      const response = await apiClient.addMessage(conversation.id, 'user', userInput)
      
      // Handle the new response format
      if ('userMessage' in response) {
        // Add user message to UI
        setMessages(prev => [...prev, response.userMessage])
        
        // Add AI message if successful
        if (response.aiMessage) {
          // Process AI message for PRD content
          const processedAiMessage = await checkForPRDContent(response.aiMessage!)
          setMessages(prev => [...prev, processedAiMessage])
        } else if (response.aiError) {
          setError(`AI Response Error: ${response.aiError}`)
        }
      } else {
        // Fallback for single message response
        const singleMessage = response as MessageWithConversation
        // Process single message for PRD content if it's from assistant
        if (singleMessage.role === 'assistant') {
          const processedMessage = await checkForPRDContent(singleMessage)
          setMessages(prev => [...prev, processedMessage])
        } else {
          setMessages(prev => [...prev, singleMessage])
        }
      }
    } catch (err) {
      setError('Failed to send message')
      console.error('Error sending message:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Chat with Claude</h2>
        
        {currentProject ? (
          <p className="text-sm text-gray-400">
            Collaborate on your PRD with AI assistance for {currentProject.name}
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            Select or create a project to start chatting
          </p>
        )}
        
        {/* Error display */}
        {error && (
          <div className="mt-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
        {messages.length === 0 && currentProject && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm mt-2">
              Ask me to help you create a Product Requirements Document for {currentProject.name}
            </p>
          </div>
        )}
        
        {!currentProject && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium">No project selected</p>
            <p className="text-sm mt-2">
              Create or select a project from the header to start chatting
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-400 text-sm">Claude is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {currentProject && (
        <div className="flex-shrink-0 border-t border-gray-700 px-6 py-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors duration-200"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default ChatPanel