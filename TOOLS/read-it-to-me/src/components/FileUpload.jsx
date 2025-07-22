import React, { useCallback } from 'react'
import { extractTextFromFile } from '../utils/textExtractor'
import { generateSpeech } from '../utils/openaiClient'

const FileUpload = ({ onTextExtracted, onAudioGenerated, isLoading, setIsLoading }) => {
  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsLoading(true)
    try {
      const text = await extractTextFromFile(file)
      onTextExtracted(text)
      
      const audioUrl = await generateSpeech(text)
      onAudioGenerated(audioUrl)
    } catch (error) {
      console.error('Error processing file:', error)
      alert('Error processing file: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }, [onTextExtracted, onAudioGenerated, setIsLoading])

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
        <p className="upload-hint">
          Supported formats: PDF, TXT, HTML
        </p>
      </div>
    </div>
  )
}

export default FileUpload