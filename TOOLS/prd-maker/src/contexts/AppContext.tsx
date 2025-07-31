import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Project } from '../types'

interface AppContextType {
  // Project state
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  
  // Project management
  createProject: (name: string) => Promise<Project | null>
  updateProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  
  // Notification system
  notification: string | null
  setNotification: (message: string | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const createProject = async (name: string): Promise<Project | null> => {
    try {
      // Import apiClient dynamically to avoid circular dependencies
      const { apiClient } = await import('../services/apiClient')
      
      const project = await apiClient.createProject(name)
      setCurrentProject(project)
      setNotification(`Project "${name}" created successfully!`)
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
      
      return project
    } catch (error) {
      console.error('Failed to create project:', error)
      setNotification('Failed to create project')
      setTimeout(() => setNotification(null), 3000)
      return null
    }
  }

  const updateProject = async (id: string, name: string): Promise<void> => {
    try {
      const { apiClient } = await import('../services/apiClient')
      await apiClient.updateProject(id, name)
      
      // Update current project if it's the one being updated
      if (currentProject && currentProject.id === id) {
        setCurrentProject({ ...currentProject, name })
      }
      
      setNotification(`Project renamed to "${name}"`)
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Failed to update project:', error)
      setNotification('Failed to update project')
      setTimeout(() => setNotification(null), 3000)
      throw error
    }
  }

  const deleteProject = async (id: string): Promise<void> => {
    try {
      const { apiClient } = await import('../services/apiClient')
      await apiClient.deleteProject(id)
      
      // Clear current project if it's the one being deleted
      if (currentProject && currentProject.id === id) {
        setCurrentProject(null)
      }
      
      setNotification('Project deleted')
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Failed to delete project:', error)
      setNotification('Failed to delete project')
      setTimeout(() => setNotification(null), 3000)
      throw error
    }
  }

  return (
    <AppContext.Provider value={{
      currentProject,
      setCurrentProject,
      createProject,
      updateProject,
      deleteProject,
      notification,
      setNotification
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}