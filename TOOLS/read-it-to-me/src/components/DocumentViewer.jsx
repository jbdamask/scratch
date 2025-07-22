import React, { useState } from 'react'

const DocumentViewer = ({ extractedText, fileName, fileType }) => {
  const [zoomLevel, setZoomLevel] = useState(100)

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50))
  }

  const handleZoomReset = () => {
    setZoomLevel(100)
  }

  if (!extractedText) return null

  const fontSize = `${zoomLevel}%`

  return (
    <div className="document-viewer">
      <div className="document-header">
        <h3>{fileName || 'Document'}</h3>
        <div className="zoom-controls">
          <button 
            className="zoom-btn" 
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50}
            title="Zoom Out"
          >
            🔍-
          </button>
          <button 
            className="zoom-btn zoom-reset" 
            onClick={handleZoomReset}
            title="Reset Zoom"
          >
            {zoomLevel}%
          </button>
          <button 
            className="zoom-btn" 
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            title="Zoom In"
          >
            🔍+
          </button>
        </div>
      </div>
      
      <div className="document-content" style={{ fontSize }}>
        <div className="document-text">
          {extractedText.split('\n').map((paragraph, index) => (
            paragraph.trim() ? (
              <p key={index}>{paragraph}</p>
            ) : (
              <br key={index} />
            )
          ))}
        </div>
      </div>
    </div>
  )
}

export default DocumentViewer