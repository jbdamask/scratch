import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import AudioPlayer from './components/AudioPlayer'
import './App.css'

function App() {
  const [extractedText, setExtractedText] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Read It To Me</h1>
        <p>Upload documents and have them read aloud using AI</p>
      </header>
      
      <main className="app-main">
        <FileUpload 
          onTextExtracted={setExtractedText}
          onAudioGenerated={setAudioUrl}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
        
        {extractedText && (
          <div className="text-preview">
            <h3>Extracted Text:</h3>
            <div className="text-content">
              {extractedText.substring(0, 500)}
              {extractedText.length > 500 && '...'}
            </div>
          </div>
        )}
        
        {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
      </main>
    </div>
  )
}

export default App