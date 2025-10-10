import { useState, useEffect } from 'react'

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

const API_BASE = 'http://localhost:8000'

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [files, setFiles] = useState<ChatFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [chatData, setChatData] = useState<ChatData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

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
    if (selectedFile) {
      setSelectedFile(null)
      setChatData(null)
    } else if (selectedProject) {
      setSelectedProject(null)
      setFiles([])
    }
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

  const renderMessageContent = (content: string | any[]) => {
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
      return content.map((item, index) => {
        if (typeof item === 'object' && item.type === 'text') {
          return item.text
        }
        return JSON.stringify(item, null, 2)
      }).join(' ')
    }
    return JSON.stringify(content, null, 2)
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
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px'}}>
            {(selectedProject || selectedFile) && (
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

          {selectedProject && !selectedFile && (
            <div style={{color: '#94a3b8'}}>
              <span style={{color: '#34d399'}}>Project:</span> {selectedProject}
            </div>
          )}

          {selectedFile && (
            <div style={{color: '#94a3b8'}}>
              <span style={{color: '#34d399'}}>File:</span> {selectedFile}
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

        {!selectedProject && !loading && (
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
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#34d399',
                marginBottom: '12px',
                letterSpacing: '0.05em'
              }}>
                ▼ MESSAGE STREAM
              </h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {chatData.messages.map((message, index) => (
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
                          ...(message.message.role === 'user'
                            ? {background: '#1e3a8a', color: '#93c5fd', border: '1px solid #1d4ed8'}
                            : {background: '#064e3b', color: '#6ee7b7', border: '1px solid #059669'})
                        }}>
                          {message.message.role.toUpperCase()}
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
                        {renderMessageContent(message.message.content)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App