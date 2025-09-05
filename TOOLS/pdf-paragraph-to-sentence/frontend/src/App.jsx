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
      // Close SSE connection when stopping
      if (eventSource) {
        eventSource.close()
        setEventSource(null)
      }
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
        total_paragraphs: status.total_paragraphs,
        completed_paragraphs: status.completed_paragraphs,
        progress_percent: status.progress_percent
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
      <h1>PDF Paragraph Summarizer</h1>
      
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="file-input-container">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            id="pdf-input"
          />
          <label htmlFor="pdf-input">
            {file ? file.name : 'Choose PDF file...'}
          </label>
        </div>
        
        <div className="button-group">
          <button type="submit" disabled={loading || !file || stopping}>
            {loading ? 'Processing...' : 'Process PDF'}
          </button>
          {loading && (
            <button 
              type="button" 
              onClick={handleStop} 
              disabled={stopping}
              className="stop-button"
            >
              {stopping ? 'Stopping...' : 'Stop'}
            </button>
          )}
        </div>
      </form>

      {loading && (
        <div className="music-player-section">
          <div className="music-header">
            <h3>🎵 While You Wait...</h3>
            <p className="now-playing">{currentVideo ? currentVideo.title : 'Loading music...'}</p>
          </div>
          
          {currentVideo && (
            <div className="youtube-player">
              <iframe
                width="560"
                height="315"
                src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&rel=0`}
                title={currentVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}
          
          <div className="waiting-message">
            <p>🤖 Your PDF is being processed by 4 parallel Ollama instances...</p>
            <p>🎶 {currentVideo ? 'Enjoy some waiting music while the AI does its magic!' : 'Selecting a random waiting song...'}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="error-section">
          <div className="error">{error}</div>
          {(error.includes('stopped') || error.includes('Failed')) && (
            <button onClick={resetState} className="reset-button">
              Reset
            </button>
          )}
        </div>
      )}

      {results && (
        <div className="results">
          <div className="results-header">
            <h2>Results ({results.length} paragraphs)</h2>
            <div className="action-buttons">
              <button onClick={copyToClipboard}>Copy Markdown</button>
              <button onClick={downloadMarkdown}>Save as MD</button>
            </div>
          </div>
          
          <div className="results-content">
            {results.map((result, index) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App