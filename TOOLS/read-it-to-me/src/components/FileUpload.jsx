import React, { useCallback } from 'react'
import { extractTextFromFile } from '../utils/textExtractor'
import { generateSpeech } from '../utils/openaiClient'

const FileUpload = ({ onTextExtracted, onAudioGenerated, onFileInfo, isLoading, setIsLoading, loadingProgress, setLoadingProgress }) => {
  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsLoading(true)
    setLoadingProgress({ current: 0, total: 1, message: 'Extracting text...' })
    
    try {
      onFileInfo(file.name, file.type)
      
      const text = await extractTextFromFile(file)
      onTextExtracted(text)
      
      setLoadingProgress({ current: 0, total: 1, message: 'Generating audio...' })
      
      const audioUrl = await generateSpeech(text, (current, total, message) => {
        setLoadingProgress({ current, total, message })
      })
      onAudioGenerated(audioUrl)
    } catch (error) {
      console.error('Error processing file:', error)
      alert('Error processing file: ' + error.message)
    } finally {
      setIsLoading(false)
      setLoadingProgress({ current: 0, total: 1, message: '' })
    }
  }, [onTextExtracted, onAudioGenerated, onFileInfo, setIsLoading, setLoadingProgress])

  const acceptedTypes = '.pdf,.txt,.html,.htm'

  return (
    <div className="file-upload">
      <div className="upload-area">
        <input
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          disabled={isLoading}
          id="file-input"
          className="file-input"
        />
        <label htmlFor="file-input" className={`upload-label ${isLoading ? 'disabled' : ''}`}>
          {isLoading ? 'Processing...' : 'Choose File to Read'}
        </label>
        
        {isLoading && loadingProgress.message && (
          <div className="loading-progress">
            <div className="progress-message">{loadingProgress.message}</div>
            {loadingProgress.total > 1 && (
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
        
        <p className="upload-hint">
          Supported formats: PDF, TXT, HTML
        </p>
      </div>
    </div>
  )
}

export default FileUpload