import React, { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import mermaid from 'mermaid'
import { DiagramModalProps } from '../types'

const DiagramModal: React.FC<DiagramModalProps> = ({ 
  isOpen, 
  onClose, 
  diagramCode, 
  diagramType 
}) => {
  const [svgContent, setSvgContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && diagramCode && diagramType === 'mermaid') {
      renderDiagram()
    }
  }, [isOpen, diagramCode, diagramType])

  const renderDiagram = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // Configure mermaid for modal rendering
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          primaryColor: '#3b82f6',
          primaryTextColor: '#f3f4f6',
          primaryBorderColor: '#1f2937',
          lineColor: '#6b7280',
          secondaryColor: '#1f2937',
          tertiaryColor: '#374151',
          background: '#111827',
          mainBkg: '#1f2937',
          secondBkg: '#374151',
          tertiaryBkg: '#4b5563'
        }
      })

      const { svg } = await mermaid.render('modal-diagram', diagramCode)
      setSvgContent(svg)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render diagram')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-7xl h-[90vh] bg-gray-900 rounded-lg border border-gray-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-100">
              Diagram Viewer
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-950 rounded-b-lg">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-gray-400 mt-2">Rendering diagram...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="bg-red-900 border border-red-700 text-red-200 p-6 rounded-lg max-w-md">
                  <h3 className="font-medium mb-2">Error rendering diagram</h3>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {svgContent && !isLoading && !error && (
              <TransformWrapper
                initialScale={1}
                minScale={0.1}
                maxScale={5}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                doubleClick={{ mode: 'reset' }}
              >
                <TransformComponent
                  wrapperClass="w-full h-full"
                  contentClass="flex items-center justify-center min-w-full min-h-full"
                >
                  <div
                    className="diagram-container"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                </TransformComponent>
              </TransformWrapper>
            )}
          </div>

          {/* Controls hint */}
          <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-400 text-center">
            Mouse wheel to zoom • Drag to pan • Double-click to reset
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default DiagramModal