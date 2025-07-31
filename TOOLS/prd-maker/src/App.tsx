import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import ChatPanel from './components/ChatPanel'
import PRDPanel from './components/PRDPanel'
import ProjectSelector from './components/ProjectSelector'
import ErrorBoundary from './components/ErrorBoundary'
import { AppProvider, useAppContext } from './contexts/AppContext'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

function AppContent() {
  const { notification, currentProject } = useAppContext()

  return (
    <div className="h-screen bg-gray-950 text-gray-100 relative flex flex-col">
      {/* Notification */}
      {notification && (
        <div className="absolute top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <CheckCircleIcon className="w-5 h-5" />
          <span>{notification}</span>
        </div>
      )}
      
      {/* Project Selector */}
      <ProjectSelector />
      
      {/* Main Content */}
      {currentProject ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <PanelGroup direction="horizontal" className="h-full w-full">
            <Panel defaultSizePercentage={50} minSizePercentage={30}>
              <div className="h-full overflow-hidden">
                <ErrorBoundary>
                  <ChatPanel />
                </ErrorBoundary>
              </div>
            </Panel>
            
            <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center">
              <div className="w-1 h-8 bg-gray-600 rounded-full" />
            </PanelResizeHandle>
            
            <Panel defaultSizePercentage={50} minSizePercentage={30}>
              <div className="h-full overflow-hidden">
                <ErrorBoundary>
                  <PRDPanel />
                </ErrorBoundary>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-300 mb-4">Welcome to PRD Maker</h2>
            <p className="text-gray-400 mb-6">Create a new project to start collaborating with AI on your Product Requirements Document</p>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App