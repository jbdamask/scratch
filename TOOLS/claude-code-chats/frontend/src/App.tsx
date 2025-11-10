import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

interface Project {
  name: string
  path: string
  created: number
}

interface ChatFile {
  name: string
  path: string
  size: number
  modified: number
}

interface Message {
  type: string
  message: {
    role: string
    content: string | any[]
  }
  timestamp: string
  uuid: string
}

interface ChatData {
  messages: Message[]
  count: number
  file_info: {
    name: string
    size: number
    modified: number
  }
}

interface SearchResult {
  projectName: string
  fileName: string
  messageIndex: number
  message: Message
  matchText: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [files, setFiles] = useState<ChatFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [chatData, setChatData] = useState<ChatData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showClearTextOnly, setShowClearTextOnly] = useState(true)
  const [hoverImage, setHoverImage] = useState<{url: string, index: number, x: number, y: number} | null>(null)
  const [clickedImage, setClickedImage] = useState<{url: string, index: number} | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  // Handle escape key to close full-size image popup
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && clickedImage) {
        setClickedImage(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [clickedImage])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/projects`)
      const data = await response.json()
      setProjects(data.projects)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
    setLoading(false)
  }

  const fetchProjectFiles = async (projectName: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectName)}/files`)
      const data = await response.json()
      setFiles(data.files)
      setSelectedProject(projectName)
      setSelectedFile(null)
      setChatData(null)
    } catch (error) {
      console.error('Error fetching files:', error)
    }
    setLoading(false)
  }

  const fetchChatFile = async (projectName: string, fileName: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectName)}/files/${encodeURIComponent(fileName)}`)
      const data = await response.json()
      setChatData(data)
      setSelectedFile(fileName)
    } catch (error) {
      console.error('Error fetching chat file:', error)
    }
    setLoading(false)
  }

  const goBack = () => {
    if (showSearchResults) {
      setShowSearchResults(false)
      setSearchResults([])
      setSearchTerm('')
    } else if (selectedFile) {
      setSelectedFile(null)
      setChatData(null)
    } else if (selectedProject) {
      setSelectedProject(null)
      setFiles([])
    }
  }

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    setShowSearchResults(true)

    try {
      // First get all projects
      const projectsResponse = await fetch(`${API_BASE}/projects`)
      const projectsData = await projectsResponse.json()
      const allProjects = projectsData.projects || []

      const allResults: SearchResult[] = []

      // Search through each project
      for (const project of allProjects) {
        try {
          // Get all files for this project
          const filesResponse = await fetch(`${API_BASE}/projects/${encodeURIComponent(project.name)}/files`)
          const filesData = await filesResponse.json()
          const projectFiles = filesData.files || []

          // Search through each file in the project
          for (const file of projectFiles) {
            try {
              // Get the chat data for this file
              const chatResponse = await fetch(`${API_BASE}/projects/${encodeURIComponent(project.name)}/files/${encodeURIComponent(file.name)}`)
              const chatData = await chatResponse.json()

              // Search through messages in this file
              if (chatData.messages) {
                chatData.messages.forEach((message: Message, messageIndex: number) => {
                  const content = renderMessageContent(message.message.content, true) // Use clear text only for search
                  const lowerContent = content.toLowerCase()
                  const lowerTerm = term.toLowerCase()

                  if (lowerContent.includes(lowerTerm)) {
                    // Find the context around the match
                    const matchIndex = lowerContent.indexOf(lowerTerm)
                    const contextStart = Math.max(0, matchIndex - 100)
                    const contextEnd = Math.min(content.length, matchIndex + term.length + 100)
                    let matchText = content.substring(contextStart, contextEnd)

                    // Add ellipsis if we're not at the start/end
                    if (contextStart > 0) matchText = '...' + matchText
                    if (contextEnd < content.length) matchText = matchText + '...'

                    allResults.push({
                      projectName: project.name,
                      fileName: file.name,
                      messageIndex,
                      message,
                      matchText
                    })
                  }
                })
              }
            } catch (fileError) {
              console.error(`Error searching file ${file.name}:`, fileError)
            }
          }
        } catch (projectError) {
          console.error(`Error searching project ${project.name}:`, projectError)
        }
      }

      // Sort results by timestamp (most recent first) and limit to 100 results
      allResults.sort((a, b) => new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime())

      const limitedResults = allResults.slice(0, 100)
      setSearchResults(limitedResults)
    } catch (error) {
      console.error('Error performing search:', error)
      setSearchResults([])
    }

    setIsSearching(false)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        performSearch(searchTerm)
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const viewSearchResult = (result: SearchResult) => {
    setSelectedProject(result.projectName)
    fetchChatFile(result.projectName, result.fileName)
    setShowSearchResults(false)
  }

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text

    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ?
        <span key={index} style={{background: '#fbbf24', color: '#0f172a', fontWeight: 'bold'}}>{part}</span> :
        part
    )
  }

  const isMessageClearText = (message: Message) => {
    // Check if message and message.message exist
    if (!message || !message.message || !message.message.role) {
      return false
    }

    // Only show user and assistant messages
    if (message.message.role !== 'user' && message.message.role !== 'assistant') {
      return false
    }

    const content = message.message.content

    // Handle array content (tool use messages, etc.)
    if (Array.isArray(content)) {
      // Check if any item in the array is clear text (even if there are also images)
      return content.some(item => {
        if (typeof item === 'object' && item.type === 'text' && item.text) {
          return item.text.length > 10 && item.text.includes(' ')
        }
        return false
      })
    }

    // Check if content is a string
    if (typeof content !== 'string') {
      return false
    }

    // Check for image-related content in string format - if it's purely image data, exclude
    if ((content.includes('"type": "image"') ||
        content.includes('base64') ||
        content.includes('media_type') ||
        content.includes('iVBORw0KGgo')) && // Common start of PNG base64
        !content.includes(' ')) { // But if it has spaces, it might have text too
      return false
    }

    // If it's obviously JSON structure, exclude it
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(content)
        // If it successfully parses and looks like tool use or structured data, exclude it
        if (parsed.type === 'tool_use' || parsed.name || parsed.input) {
          return false
        }
        // Check for image data in parsed JSON - exclude if it's purely image data
        if (parsed.type === 'image' || (parsed.source && !parsed.text)) {
          return false
        }
      } catch (e) {
        // If it fails to parse but looks like JSON, it might be malformed - still exclude
        return false
      }
    }

    // More lenient check for clear text
    const trimmed = content.trim()
    const hasReasonableLength = trimmed.length > 5
    const hasLetters = /[a-zA-Z]/.test(trimmed)
    const notPureJson = !(/^[\{\}\[\],":\s]*$/.test(trimmed))

    return hasReasonableLength && hasLetters && notPureJson
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Extract image data URLs from message content
  const extractImagesFromContent = (content: string | any[]): string[] => {
    const images: string[] = []

    if (Array.isArray(content)) {
      content.forEach(item => {
        if (typeof item === 'object' && item.type === 'image' && item.source) {
          const mediaType = item.source.media_type || 'image/png'
          const data = item.source.data
          if (data) {
            images.push(`data:${mediaType};base64,${data}`)
          }
        }
      })
    }

    return images
  }

  // Parse text and hyperlink [Image #N] placeholders with hover
  const hyperlinkImagePlaceholders = (text: string, images: string[]) => {
    // Match [Image #N] pattern
    const imagePattern = /\[Image #(\d+)\]/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = imagePattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      // Add hyperlinked image placeholder
      const imageNumber = parseInt(match[1], 10)
      const imageUrl = images[imageNumber - 1] // Arrays are 0-indexed

      if (imageUrl) {
        parts.push(
          <a
            key={`img-${match.index}`}
            href="#"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setHoverImage({
                url: imageUrl,
                index: imageNumber,
                x: rect.left + rect.width / 2,
                y: rect.top
              })
            }}
            onMouseLeave={() => {
              setHoverImage(null)
            }}
            onClick={(e) => {
              e.preventDefault()
              setClickedImage({ url: imageUrl, index: imageNumber })
              setHoverImage(null) // Hide hover preview when clicking
            }}
            style={{
              color: '#34d399',
              textDecoration: 'underline',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {match[0]}
          </a>
        )
      } else {
        // Image not found, just add the placeholder text
        parts.push(match[0])
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const renderMessageContent = (content: string | any[], clearTextOnly: boolean = false) => {
    if (typeof content === 'string') {
      // Try to detect and pretty-print JSON
      try {
        const parsed = JSON.parse(content)
        return JSON.stringify(parsed, null, 2)
      } catch (e) {
        // Not JSON, return as-is
        return content
      }
    }
    if (Array.isArray(content)) {
      if (clearTextOnly) {
        // Only return text items, skip images and other non-text content
        return content
          .filter(item => typeof item === 'object' && item.type === 'text')
          .map(item => item.text)
          .join(' ')
      } else {
        // Return everything (existing behavior)
        return content.map((item, index) => {
          if (typeof item === 'object' && item.type === 'text') {
            return item.text
          }
          return JSON.stringify(item, null, 2)
        }).join(' ')
      }
    }
    return JSON.stringify(content, null, 2)
  }

  // Render message content with hyperlinked image placeholders
  const renderMessageContentWithImageLinks = (content: string | any[], clearTextOnly: boolean = false) => {
    // First extract images from the full content
    const images = extractImagesFromContent(content)

    // Render the text content
    const textContent = renderMessageContent(content, clearTextOnly)

    // If we have images and the text is a string, hyperlink the placeholders
    if (images.length > 0 && typeof textContent === 'string') {
      return hyperlinkImagePlaceholders(textContent, images)
    }

    return textContent
  }

  const exportClearTextMessages = () => {
    if (!chatData || !selectedFile) return

    const clearTextMessages = chatData.messages.filter(isMessageClearText)

    let exportContent = ''

    clearTextMessages.forEach((message) => {
      const role = (message.message?.role || 'unknown').toUpperCase()
      const content = renderMessageContent(message.message.content, true) // Use clear text only for export

      exportContent += `${role}:\n${content}\n\n`
    })

    // Create and download the file
    const blob = new Blob([exportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedFile.replace('.jsonl', '')}_clear_text.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const cardStyle = {
    padding: '16px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }

  const cardHoverStyle = {
    borderColor: '#34d399',
    background: '#334155'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e1a',
      padding: '24px',
      fontFamily: 'JetBrains Mono, Consolas, Monaco, Courier New, monospace',
      color: '#a3b8cc'
    }}>
      <div style={{maxWidth: '1152px', margin: '0 auto'}}>
        <header style={{marginBottom: '32px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              {(selectedProject || selectedFile || showSearchResults) && (
                <button
                  onClick={goBack}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #34d399',
                    color: '#34d399',
                    background: 'transparent',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#34d399';
                    e.target.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#34d399';
                  }}
                >
                  ← Back
                </button>
              )}
              <h1 style={{
                fontSize: '30px',
                fontWeight: 'bold',
                color: '#34d399',
                letterSpacing: '0.1em',
                margin: 0
              }}>
                ► CLAUDE CODE CHAT HISTORY
              </h1>
            </div>

            <div style={{position: 'relative', width: '300px'}}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  color: '#64748b',
                  zIndex: 1
                }} />
                <input
                  type="text"
                  placeholder="Search across all chats..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '20px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#34d399';
                    e.target.style.background = '#334155';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#334155';
                    e.target.style.background = '#1e293b';
                  }}
                />
              </div>
            </div>
          </div>

          {selectedProject && !selectedFile && (
            <div style={{color: '#94a3b8'}}>
              <span style={{color: '#34d399'}}>Project:</span> {selectedProject}
            </div>
          )}

          {selectedFile && (
            <div style={{color: '#94a3b8'}}>
              <div style={{marginBottom: '4px'}}>
                <span style={{color: '#34d399'}}>Project:</span> {selectedProject}
              </div>
              <div>
                <span style={{color: '#34d399'}}>File:</span> {selectedFile}
              </div>
            </div>
          )}
        </header>

        {loading && (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0'}}>
            <div style={{color: '#34d399'}}>
              ● Processing data streams...
            </div>
          </div>
        )}

        {showSearchResults && (
          <div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#34d399',
                margin: 0,
                letterSpacing: '0.05em'
              }}>
                ▼ SEARCH RESULTS
              </h2>
              {!isSearching && searchResults.length > 0 && (
                <div style={{fontSize: '14px', color: '#64748b'}}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </div>
              )}
            </div>

            {isSearching && (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '8px'}}>
                <div style={{color: '#34d399'}}>
                  ● Searching chat archives...
                </div>
                <div style={{fontSize: '14px', color: '#64748b'}}>
                  Scanning all projects and files recursively
                </div>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchTerm && (
              <div style={{
                ...cardStyle,
                textAlign: 'center',
                color: '#64748b'
              }}>
                No results found for "{searchTerm}"
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    style={cardStyle}
                    onClick={() => viewSearchResult(result)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#34d399';
                      e.currentTarget.style.background = '#334155';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.background = '#1e293b';
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                      <div style={{color: '#34d399', marginTop: '2px'}}>🔍</div>
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                          <h3 style={{color: '#e2e8f0', fontWeight: '500', margin: 0}}>
                            {result.projectName} / {result.fileName}
                          </h3>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            ...(result.message.message?.role === 'user'
                              ? {background: '#1e3a8a', color: '#93c5fd'}
                              : {background: '#064e3b', color: '#6ee7b7'})
                          }}>
                            {result.message.message?.role?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '14px',
                          color: '#cbd5e1',
                          margin: '4px 0 0 0',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {highlightSearchTerm(result.matchText, searchTerm)}
                        </p>
                        <div style={{fontSize: '12px', color: '#64748b', marginTop: '4px'}}>
                          {formatTimestamp(result.message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedProject && !loading && !showSearchResults && (
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#34d399',
              marginBottom: '16px',
              letterSpacing: '0.05em'
            }}>
              ▼ PROJECT DIRECTORIES
            </h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {projects.map((project) => (
                <div
                  key={project.name}
                  style={cardStyle}
                  onClick={() => fetchProjectFiles(project.name)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#34d399';
                    e.currentTarget.style.background = '#334155';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.background = '#1e293b';
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                    <div style={{color: '#34d399', marginTop: '2px'}}>📁</div>
                    <div style={{flex: 1}}>
                      <h3 style={{color: '#e2e8f0', fontWeight: '500', margin: 0}}>{project.name}</h3>
                      <p style={{fontSize: '14px', color: '#64748b', margin: '4px 0 0 0'}}>
                        Created: {new Date(project.created * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProject && !selectedFile && !loading && (
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#34d399',
              marginBottom: '16px',
              letterSpacing: '0.05em'
            }}>
              ▼ CHAT SESSION FILES
            </h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {files.map((file) => (
                <div
                  key={file.name}
                  style={cardStyle}
                  onClick={() => fetchChatFile(selectedProject, file.name)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#34d399';
                    e.currentTarget.style.background = '#334155';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.background = '#1e293b';
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                    <div style={{color: '#34d399', marginTop: '2px'}}>📄</div>
                    <div style={{flex: 1}}>
                      <h3 style={{color: '#e2e8f0', fontWeight: '500', margin: 0}}>{file.name}</h3>
                      <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', fontSize: '14px', color: '#64748b'}}>
                        <span>{formatFileSize(file.size)}</span>
                        <span>{new Date(file.modified * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {chatData && !loading && (
          <div>
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#34d399',
                marginBottom: '12px',
                letterSpacing: '0.05em'
              }}>
                ▼ SESSION ANALYSIS
              </h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{color: '#34d399'}}>●</span>
                  <span style={{color: '#94a3b8'}}>Messages:</span>
                  <span style={{color: '#e2e8f0', fontWeight: 'bold'}}>{chatData.count}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{color: '#34d399'}}>●</span>
                  <span style={{color: '#94a3b8'}}>Size:</span>
                  <span style={{color: '#e2e8f0', fontWeight: 'bold'}}>{formatFileSize(chatData.file_info.size)}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{color: '#34d399'}}>●</span>
                  <span style={{color: '#94a3b8'}}>Modified:</span>
                  <span style={{color: '#e2e8f0', fontWeight: 'bold'}}>{new Date(chatData.file_info.modified * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#34d399',
                  margin: 0,
                  letterSpacing: '0.05em'
                }}>
                  ▼ MESSAGE STREAM
                </h3>

                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                  {chatData && (
                    <div style={{fontSize: '14px', color: '#64748b'}}>
                      {showClearTextOnly
                        ? `${chatData.messages.filter(isMessageClearText).length} of ${chatData.messages.length} messages`
                        : `${chatData.messages.length} messages`
                      }
                    </div>
                  )}
                  <button
                    onClick={exportClearTextMessages}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #34d399',
                      color: '#34d399',
                      background: 'transparent',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#34d399';
                      e.target.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#34d399';
                    }}
                  >
                    Export Clear Text
                  </button>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    <div style={{position: 'relative'}}>
                      <input
                        type="checkbox"
                        checked={showClearTextOnly}
                        onChange={(e) => setShowClearTextOnly(e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          margin: 0,
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '16px',
                        height: '16px',
                        border: '2px solid #34d399',
                        borderRadius: '3px',
                        background: showClearTextOnly ? '#34d399' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        pointerEvents: 'none'
                      }}>
                        {showClearTextOnly && (
                          <span style={{color: '#0f172a', fontSize: '12px', fontWeight: 'bold'}}>✓</span>
                        )}
                      </div>
                    </div>
                    Clear text only
                  </label>
                </div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {chatData.messages
                  .filter(message => !showClearTextOnly || isMessageClearText(message))
                  .map((message, index) => (
                  <div key={message.uuid || index} style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '16px'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          ...(message.message?.role === 'user'
                            ? {background: '#1e3a8a', color: '#93c5fd', border: '1px solid #1d4ed8'}
                            : {background: '#064e3b', color: '#6ee7b7', border: '1px solid #059669'})
                        }}>
                          {message.message?.role?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        <span style={{fontSize: '12px', color: '#64748b'}}>
                          [{message.type}]
                        </span>
                      </div>
                      <span style={{fontSize: '12px', color: '#64748b'}}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '12px'
                    }}>
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px',
                        color: '#cbd5e1',
                        margin: 0,
                        overflowX: 'auto'
                      }}>
                        {message.message?.content ? renderMessageContentWithImageLinks(message.message.content, showClearTextOnly) : '[Invalid message]'}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Hover Popup */}
      {hoverImage && !clickedImage && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverImage.x}px`,
            top: `${hoverImage.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            pointerEvents: 'none',
            marginTop: '-10px'
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '2px solid #34d399',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Image label */}
            <div
              style={{
                color: '#34d399',
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: 'JetBrains Mono, Consolas, Monaco, Courier New, monospace',
                marginBottom: '4px',
                textAlign: 'center'
              }}
            >
              Image #{hoverImage.index}
            </div>

            {/* Image */}
            <img
              src={hoverImage.url}
              alt={`Image ${hoverImage.index}`}
              style={{
                maxWidth: '400px',
                maxHeight: '300px',
                objectFit: 'contain',
                display: 'block',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      )}

      {/* Full-Size Click Popup Modal */}
      {clickedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setClickedImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setClickedImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: '#34d399',
                color: '#0f172a',
                border: 'none',
                borderRadius: '4px',
                width: '32px',
                height: '32px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#10b981'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#34d399'
              }}
            >
              ✕
            </button>

            {/* Image label */}
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                left: '0',
                color: '#34d399',
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'JetBrains Mono, Consolas, Monaco, Courier New, monospace'
              }}
            >
              Image #{clickedImage.index}
            </div>

            {/* Image */}
            <img
              src={clickedImage.url}
              alt={`Image ${clickedImage.index}`}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                border: '2px solid #34d399',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App