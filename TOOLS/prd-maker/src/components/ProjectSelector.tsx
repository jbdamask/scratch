import React, { useState, useEffect } from 'react'
import { 
  FolderIcon, 
  FolderPlusIcon, 
  PencilSquareIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline'
import { Project } from '../types'
import { useAppContext } from '../contexts/AppContext'
import { apiClient } from '../services/apiClient'

const ProjectSelector: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [projectToRename, setProjectToRename] = useState<Project | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [renameProjectName, setRenameProjectName] = useState('')

  const { currentProject, setCurrentProject, createProject, updateProject, deleteProject } = useAppContext()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const loadedProjects = await apiClient.getAllProjects()
      setProjects(loadedProjects)
      
      // If no current project and projects exist, select the most recent one
      if (!currentProject && loadedProjects.length > 0) {
        setCurrentProject(loadedProjects[0])
      }
      
      setError(null)
    } catch (err) {
      setError('Failed to load projects')
      console.error('Error loading projects:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    const project = await createProject(newProjectName.trim())
    if (project) {
      setProjects(prev => [project, ...prev])
      setNewProjectName('')
      setShowCreateDialog(false)
    }
  }

  const handleRenameProject = async () => {
    if (!projectToRename || !renameProjectName.trim()) return

    try {
      await updateProject(projectToRename.id, renameProjectName.trim())
      setProjects(prev => prev.map(p => 
        p.id === projectToRename.id 
          ? { ...p, name: renameProjectName.trim() }
          : p
      ))
      setShowRenameDialog(false)
      setProjectToRename(null)
      setRenameProjectName('')
    } catch (err) {
      console.error('Error renaming project:', err)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      await deleteProject(projectToDelete.id)
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id))
      setShowDeleteDialog(false)
      setProjectToDelete(null)
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  const selectProject = (project: Project) => {
    setCurrentProject(project)
  }

  const openRenameDialog = (project: Project) => {
    setProjectToRename(project)
    setRenameProjectName(project.name)
    setShowRenameDialog(true)
  }

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project)
    setShowDeleteDialog(true)
  }

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold text-gray-100 flex items-center">
          <FolderIcon className="w-5 h-5 mr-2" />
          Projects
        </h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
        >
          <FolderPlusIcon className="w-4 h-4 mr-1.5" />
          New Project
        </button>
      </div>

      {/* Project selector */}
      {projects.length > 0 && (
        <div className="flex items-center space-x-2">
          <select
            value={currentProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value)
              if (project) selectProject(project)
            }}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-gray-100 text-sm"
          >
            <option value="">Select a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          
          {currentProject && (
            <>
              <button
                onClick={() => openRenameDialog(currentProject)}
                className="flex items-center px-2 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                title="Rename project"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => openDeleteDialog(currentProject)}
                className="flex items-center px-2 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                title="Delete project"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {projects.length === 0 && !isLoading && (
        <p className="text-gray-400 text-sm">
          No projects yet. Create your first project to get started.
        </p>
      )}

      {error && (
        <div className="mt-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Create New Project</h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateDialog(false)
                  setNewProjectName('')
                }}
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Project Dialog */}
      {showRenameDialog && projectToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Rename Project</h3>
            <input
              type="text"
              value={renameProjectName}
              onChange={(e) => setRenameProjectName(e.target.value)}
              placeholder="Enter new project name..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleRenameProject()}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRenameDialog(false)
                  setProjectToRename(null)
                  setRenameProjectName('')
                }}
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameProject}
                disabled={!renameProjectName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Dialog */}
      {showDeleteDialog && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Delete Project</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{projectToDelete.name}"? This will permanently delete the project, its chat history, and PRD document. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setProjectToDelete(null)
                }}
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectSelector