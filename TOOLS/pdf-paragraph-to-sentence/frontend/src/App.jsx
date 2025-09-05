import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [stopping, setStopping] = useState(false)
  const [baseUrl, setBaseUrl] = useState(null)

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
    }
  }

  const resetState = () => {
    setFile(null)
    setResults(null)
    setError('')
    setLoading(false)
    setStopping(false)
    setBaseUrl(null)
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

    const formData = new FormData()
    formData.append('file', file)
    console.log('📦 FormData created with file:', file.name)

    try {
      console.log('🔍 Finding backend server...')
      const foundBaseUrl = await findBackendUrl()
      setBaseUrl(foundBaseUrl)
      console.log(`🚀 Uploading to: ${foundBaseUrl}/upload`)
      
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

      if (data.success) {
        console.log(`✅ Success! Received ${data.results.length} results`)
        setResults(data.results)
      } else {
        console.error('❌ Server returned error:', data.error || data.message)
        setError(data.error || data.message || 'An error occurred')
      }
    } catch (err) {
      console.error('💥 Request failed:', err)
      setError(`Failed to connect to server: ${err.message}`)
    } finally {
      setLoading(false)
    }
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