import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [stopping, setStopping] = useState(false)
  const [baseUrl, setBaseUrl] = useState(null)
  const [progress, setProgress] = useState({
    current_status: 'idle',
    total_paragraphs: 0,
    completed_paragraphs: 0,
    progress_percent: 0
  })
  const [currentVideo, setCurrentVideo] = useState(null)
  const [eventSource, setEventSource] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('detailed') // 'detailed' or 'sentences'

  // Waiting songs playlist
  const waitingSongs = [
    { title: "Tom Petty And The Heartbreakers – \"The Waiting\"", id: "uMyCa35_mOg" },
    { title: "Richard Marx – \"Right Here Waiting\"", id: "S_E2EHVxNAE" },
    { title: "Cian Ducrot – \"I'll Be Waiting\"", id: "VqXYVrsMGnk" },
    { title: "David Guetta & OneRepublic – \"I Don't Wanna Wait\"", id: "dSDbwfXX5_I" },
    { title: "Maroon 5 – \"Wait\"", id: "4uTNVumfm84" },
    { title: "Lauren Daigle – \"Waiting\"", id: "r7IPCVDimRM" },
    { title: "Bailey Zimmerman – \"Waiting\"", id: "CGyfu6Hfy7U" },
    { title: "James Vincent McMorrow – \"Waiting\"", id: "zmRXq1NB28o" },
    { title: "Zhavia – \"Waiting\"", id: "waQrh4NTi6U" },
    { title: "Russell Dickerson – \"Waiting For You\"", id: "-8nYYNV7w9M" }
  ]

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setError('')
    setResults(null)
  }

  const handleStop = async () => {
    if (!baseUrl) {
      setError('No active connection to stop')
      return
    }

    setStopping(true)
    try {
      console.log('🛑 Sending stop request...')
      const response = await fetch(`${baseUrl}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log('🛑 Stop response:', data)

      if (data.success) {
        setError('Processing stopped by user')
      } else {
        setError(data.message || 'Failed to stop processing')
      }
    } catch (err) {
      console.error('💥 Stop request failed:', err)
      setError('Failed to send stop request')
    } finally {
      setStopping(false)
      setLoading(false)
      setCurrentVideo(null) // Stop music/video
      // Close SSE connection when stopping
      if (eventSource) {
        eventSource.close()
        setEventSource(null)
      }
      // Reset progress state
      setProgress({
        current_status: 'idle',
        total_paragraphs: 0,
        completed_paragraphs: 0,
        progress_percent: 0
      })
    }
  }

  const getRandomWaitingSong = () => {
    const randomIndex = Math.floor(Math.random() * waitingSongs.length)
    return waitingSongs[randomIndex]
  }

  const resetState = () => {
    // Close SSE connection
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    
    setFile(null)
    setResults(null)
    setError('')
    setLoading(false)
    setStopping(false)
    setBaseUrl(null)
    setCurrentVideo(null)
    setProgress({
      current_status: 'idle',
      total_paragraphs: 0,
      completed_paragraphs: 0,
      progress_percent: 0
    })
  }

  const connectSSE = (baseUrl) => {
    if (!baseUrl) return
    
    // Close existing connection
    if (eventSource) {
      eventSource.close()
    }
    
    console.log('🔗 Connecting to SSE stream...')
    const es = new EventSource(`${baseUrl}/events`)
    setEventSource(es)
    
    es.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data)
      console.log('📊 Progress update via SSE:', data)
      setProgress(prev => ({
        ...prev,
        completed_paragraphs: data.completed_paragraphs,
        total_paragraphs: data.total_paragraphs,
        progress_percent: data.progress_percent
      }))
    })
    
    es.addEventListener('completed', (event) => {
      const data = JSON.parse(event.data)
      console.log('✅ Processing completed via SSE:', data)
      setResults(data.results)
      setCurrentVideo(null) // Stop music
      setLoading(false) // Hide loading
      es.close() // Close SSE connection
      setEventSource(null)
    })
    
    es.addEventListener('status', (event) => {
      const status = JSON.parse(event.data)
      console.log('📊 Status update via SSE:', status)
      setProgress({
        current_status: status.current_status,
        total_paragraphs: status.total_paragraphs || 0,
        completed_paragraphs: status.completed_paragraphs || 0,
        progress_percent: status.progress_percent || 0
      })
    })
    
    es.onerror = (event) => {
      console.error('❌ SSE connection error:', event)
      es.close()
      setEventSource(null)
    }
    
    return es
  }


  const findBackendUrl = async () => {
    const ports = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009]
    console.log('🔍 Searching for backend server...')
    
    for (const port of ports) {
      try {
        console.log(`🌐 Trying port ${port}...`)
        const response = await fetch(`http://localhost:${port}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000)
        })
        console.log(`📡 Port ${port} response:`, response.status, response.statusText)
        
        // Check if the health endpoint returns JSON
        const contentType = response.headers.get('content-type')
        if (response.ok && contentType && contentType.includes('application/json')) {
          const healthData = await response.json()
          if (healthData.status === 'healthy') {
            console.log(`✅ Found backend server at http://localhost:${port}`)
            return `http://localhost:${port}`
          }
        }
      } catch (error) {
        console.log(`❌ Port ${port} failed:`, error.message)
        continue
      }
    }
    console.error('🚫 Backend server not found on any port')
    throw new Error('Backend server not found on any port')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file) {
      setError('Please select a PDF file')
      return
    }

    console.log('📁 Starting file upload process...')
    setLoading(true)
    setError('')
    
    // Initialize progress state and start waiting music
    setProgress({
      current_status: 'starting',
      total_paragraphs: 0,
      completed_paragraphs: 0,
      progress_percent: 0
    })
    
    // Pick a random waiting song
    const randomSong = getRandomWaitingSong()
    setCurrentVideo(randomSong)
    console.log(`🎵 Now playing: ${randomSong.title}`)

    const formData = new FormData()
    formData.append('file', file)
    console.log('📦 FormData created with file:', file.name)

    try {
      console.log('🔍 Finding backend server...')
      const foundBaseUrl = await findBackendUrl()
      setBaseUrl(foundBaseUrl)
      console.log(`🚀 Uploading to: ${foundBaseUrl}/upload`)
      
      // Connect to SSE for real-time updates
      console.log('🔗 Connecting to SSE stream...')
      connectSSE(foundBaseUrl)
      
      const response = await fetch(`${foundBaseUrl}/upload`, {
        method: 'POST',
        body: formData,
      })

      console.log('📥 Upload response:', response.status, response.statusText)
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type')
      console.log('📄 Content-Type:', contentType)
      
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error('⚠️ Non-JSON response received:', textResponse)
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📋 Response data:', data)

      if (data.success && data.async) {
        console.log('🚀 Async processing started')
        // Keep loading state true for the music player
        // Processing started in background, polling will handle the rest
        return // Don't set loading to false for async processing
      } else if (data.success && data.results) {
        // Synchronous response with results (fallback)
        console.log(`✅ Success! Received ${data.results.length} results`)
        setResults(data.results)
        setProgress(prev => ({ ...prev, current_status: 'completed' }))
      } else {
        console.error('❌ Server returned error:', data.error || data.message)
        setError(data.error || data.message || 'An error occurred')
        setProgress(prev => ({ ...prev, current_status: 'idle' }))
      }
    } catch (err) {
      console.error('💥 Request failed:', err)
      setError(`Failed to connect to server: ${err.message}`)
      setProgress(prev => ({ ...prev, current_status: 'idle' }))
    }
    
    // Only set loading to false if we're not doing async processing
    setLoading(false)
  }

  const generateMarkdown = () => {
    if (!results) return ''
    
    let markdown = '# PDF Paragraph Summaries\n\n'
    results.forEach((result, index) => {
      markdown += `${index + 1}. ${result.summary}\n\n`
    })
    return markdown
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMarkdown())
      .then(() => alert('Copied to clipboard!'))
      .catch(() => alert('Failed to copy'))
  }

  const downloadMarkdown = () => {
    const markdown = generateMarkdown()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pdf-summaries.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'idle': return 'Ready'
      case 'starting': return 'Starting...'
      case 'extracting': return 'Extracting text from PDF'
      case 'processing': return 'Processing with AI'
      case 'stopping': return 'Stopping...'
      case 'stopped': return 'Stopped'
      case 'completed': return 'Completed'
      default: return status
    }
  }


  return (
    <div className="app">
      <div className="app-container">
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
          
          {!sidebarCollapsed && (
            <>
              <header className="app-header">
                <img 
                  src="/pdf-to-sentence.png" 
                  alt="PDF to Sentence" 
                  className="header-image"
                />
                <h1>PDF: Paragraphs to sentences</h1>
              </header>
          
          <form onSubmit={handleSubmit} className="upload-form">
            <div className="file-input-container">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                id="pdf-input"
              />
              <label htmlFor="pdf-input">
                Choose PDF
              </label>
              {file && <p className="file-name">{file.name}</p>}
            </div>
            
            <div className="button-group">
              <button type="submit" disabled={loading || !file || stopping} className="btn-primary">
                {loading ? 'Processing...' : 'Process'}
              </button>
              {loading && (
                <button 
                  type="button" 
                  onClick={handleStop} 
                  disabled={stopping}
                  className="btn-secondary"
                >
                  Stop
                </button>
              )}
            </div>
          </form>

          {loading && (
            <div className="progress-section">
              <div className="progress-header">
                <h3>Progress</h3>
                <div className="status-text">{getStatusText(progress.current_status)}</div>
              </div>
              
              <div className="progress-details">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${progress.progress_percent}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {progress.total_paragraphs > 0 
                    ? `${progress.completed_paragraphs}/${progress.total_paragraphs}`
                    : 'Initializing...'
                  }
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        <div className="main-content">
          <div className="main-header">
            <h2>Results</h2>
            {results && (
              <div className="action-buttons">
                <button onClick={copyToClipboard} className="btn-primary">Copy</button>
                <button onClick={downloadMarkdown} className="btn-primary">Save</button>
              </div>
            )}
          </div>

          <div className="display-area">
            {loading && currentVideo && (
              <div className="video-section">
                <iframe
                  width="100%"
                  height="400"
                  src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&rel=0`}
                  title={currentVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                
                <div className="music-info">
                  <div className="album-art-small">🎵</div>
                  <div className="track-details">
                    <p className="track-title">
                      {currentVideo.title.split(' – ')[1]?.replace(/"/g, '') || currentVideo.title}
                    </p>
                    <p className="track-artist">
                      {currentVideo.title.split(' – ')[0]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="error-display">
                <div className="error">{error}</div>
                {(error.includes('stopped') || error.includes('Failed')) && (
                  <button onClick={resetState} className="btn-tertiary">
                    Reset
                  </button>
                )}
              </div>
            )}

            {results && (
              <div className="results-container">
                <div className="results-tabs">
                  <button 
                    className={`tab ${activeTab === 'detailed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detailed')}
                  >
                    Detailed View
                  </button>
                  <button 
                    className={`tab ${activeTab === 'sentences' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sentences')}
                  >
                    Sentences Only
                  </button>
                </div>

                <div className="results-display">
                  {activeTab === 'detailed' ? (
                    results.map((result, index) => (
                      <div key={index} className="result-item">
                        <h3>Paragraph {index + 1}</h3>
                        <div className="summary">
                          <strong>Summary:</strong> {result.summary}
                        </div>
                        <div className="original">
                          <strong>Original:</strong>
                          <details>
                            <summary>Show original text</summary>
                            <p>{result.original}</p>
                          </details>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="sentences-list">
                      {results.map((result, index) => (
                        <div key={index} className="sentence-item">
                          <span className="sentence-number">{index + 1}.</span>
                          <span className="sentence-text">{result.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!loading && !results && !error && (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>Display</h3>
                <p>Upload a PDF to see results here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App