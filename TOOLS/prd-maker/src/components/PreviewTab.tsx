import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import mermaid from 'mermaid'
// import { MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline'
import DiagramModal from './DiagramModal'

interface PreviewTabProps {
  content: string
}

const PreviewTab: React.FC<PreviewTabProps> = ({ content }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDiagram, setSelectedDiagram] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

    const renderDiagrams = async () => {
      if (!containerRef.current) return

      const mermaidElements = containerRef.current.querySelectorAll('.mermaid-diagram')
      
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement
        const code = element.getAttribute('data-code')
        
        if (code) {
          try {
            const { svg } = await mermaid.render(`diagram-${i}`, code)
            
            // Create wrapper with expand button
            const wrapper = document.createElement('div')
            wrapper.className = 'relative group bg-gray-800 p-4 rounded-lg border border-gray-700'
            
            const expandButton = document.createElement('button')
            expandButton.className = 'absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200'
            expandButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>'
            
            expandButton.addEventListener('click', () => {
              setSelectedDiagram(code)
              setIsModalOpen(true)
            })
            
            wrapper.innerHTML = svg
            wrapper.appendChild(expandButton)
            
            element.replaceWith(wrapper)
          } catch (error) {
            console.error('Error rendering Mermaid diagram:', error)
            element.innerHTML = `<div class="bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg">
              <p class="font-medium">Error rendering diagram</p>
              <p class="text-sm mt-1">${error}</p>
            </div>`
          }
        }
      }
    }

    // Small delay to ensure DOM is ready
    setTimeout(renderDiagrams, 100)
  }, [content])

  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      
      if (language === 'mermaid') {
        return (
          <div
            className="mermaid-diagram"
            data-code={String(children).replace(/\n$/, '')}
          >
            Loading diagram...
          </div>
        )
      }
      
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
  }

  return (
    <>
      <div className="h-full overflow-y-auto p-6">
        <div 
          ref={containerRef}
          className="prose-dark prose-lg max-w-none"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={components}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      <DiagramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        diagramCode={selectedDiagram}
        diagramType="mermaid"
      />
    </>
  )
}

export default PreviewTab