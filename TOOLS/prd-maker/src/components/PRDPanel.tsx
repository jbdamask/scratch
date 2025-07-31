import React, { useState, useEffect } from 'react'
import { Tab } from '@headlessui/react'
import clsx from 'clsx'
import { 
  DocumentTextIcon, 
  PencilSquareIcon, 
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import PreviewTab from './PreviewTab'
import EditTab from './EditTab'
import { PRDDocumentWithProject } from '../types'
import { apiClient } from '../services/apiClient'
import { useAppContext } from '../contexts/AppContext'

const PRDPanel: React.FC = () => {
  const [document, setDocument] = useState<PRDDocumentWithProject | null>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const { currentProject } = useAppContext()

  // Load project PRD when project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectPRD()
    } else {
      setDocument(null)
      setContent('')
      setTitle('')
      setLastSaved(null)
    }
  }, [currentProject])

  // Auto-save functionality
  useEffect(() => {
    if (document && content && title && (content !== document.content || title !== document.title)) {
      const timer = setTimeout(() => {
        saveDocument()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer)
    }
  }, [content, title, document])

  const loadProjectPRD = async () => {
    if (!currentProject) return

    try {
      const projectPRD = await apiClient.getProjectPRD(currentProject.id)
      setDocument(projectPRD)
      setContent(projectPRD.content)
      setTitle(projectPRD.title)
      setLastSaved(projectPRD.updatedAt)
      setError(null)
    } catch (err) {
      setError('Failed to load project PRD')
      console.error('Error loading project PRD:', err)
    }
  }

  const saveDocument = async () => {
    if (!document || !content || !title) return

    setIsAutoSaving(true)
    try {
      await apiClient.updatePRDDocument(document.id, { title, content })
      setDocument(prev => prev ? { ...prev, title, content } : null)
      setLastSaved(new Date())
      setError(null)
    } catch (err) {
      setError('Failed to save document')
      console.error('Error saving document:', err)
    } finally {
      setIsAutoSaving(false)
    }
  }

  // Method to update PRD content from chat (will be called from ChatPanel)
  const updatePRDContent = (newContent: string, newTitle?: string) => {
    setContent(newContent)
    if (newTitle) {
      setTitle(newTitle)
    }
  }

  // Expose this method so ChatPanel can call it
  useEffect(() => {
    if (currentProject && typeof window !== 'undefined') {
      (window as any).updatePRDContent = updatePRDContent
    }
  }, [currentProject])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
  }

  const exportPRD = () => {
    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md` : 'prd-document.md'
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatLastSaved = () => {
    if (!lastSaved) return ''
    return lastSaved.toLocaleString()
  }

  const tabs = [
    {
      name: 'Preview',
      icon: DocumentTextIcon,
      component: <PreviewTab content={content} />
    },
    {
      name: 'Edit',
      icon: PencilSquareIcon,
      component: <EditTab 
        content={content} 
        onChange={handleContentChange}
        title={title}
        onTitleChange={handleTitleChange}
      />
    }
  ]

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-100">Product Requirements Document</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportPRD}
              disabled={!content || !currentProject}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        {currentProject ? (
          <p className="text-sm text-gray-400 mb-2">
            Document for {currentProject.name}
          </p>
        ) : (
          <p className="text-sm text-gray-400 mb-2">
            Select or create a project to get started
          </p>
        )}
        
        {/* Status and error display */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            {document ? (
              <>
                {isAutoSaving && <span className="text-yellow-400">Saving...</span>}
                {!isAutoSaving && lastSaved && (
                  <span>Last saved: {formatLastSaved()}</span>
                )}
              </>
            ) : currentProject ? (
              'Loading document...'
            ) : (
              'No project selected'
            )}
          </div>
        </div>
        
        {/* Error display */}
        {error && (
          <div className="mt-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tab.Group defaultIndex={0}>
        <Tab.List className="flex-shrink-0 flex border-b border-gray-700 bg-gray-850">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                clsx(
                  'flex items-center space-x-2 px-6 py-3 text-sm font-medium focus:outline-none',
                  selected
                    ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )
              }
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="flex-1 min-h-0 overflow-hidden">
          {tabs.map((tab) => (
            <Tab.Panel key={tab.name} className="h-full overflow-hidden">
              {tab.component}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}

export default PRDPanel