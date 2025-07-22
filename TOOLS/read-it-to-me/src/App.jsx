import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import AudioPlayer from './components/AudioPlayer'
import DocumentViewer from './components/DocumentViewer'
import './App.css'

function App() {
  const [extractedText, setExtractedText] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState('')

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
          onFileInfo={(name, type) => { setFileName(name); setFileType(type); }}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
        
        {(extractedText || audioUrl) && (
          <div className="spotify-layout">
            <div className="sidebar">
              {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
            </div>
            
            <div className="main-content">
              <DocumentViewer 
                extractedText={extractedText}
                fileName={fileName}
                fileType={fileType}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App