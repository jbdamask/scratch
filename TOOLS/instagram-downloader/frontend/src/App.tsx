import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, Folder, X, Play, Trash2 } from 'lucide-react'

interface ImageInfo {
  filename: string
  path: string
  url: string
}

interface FolderInfo {
  name: string
  path: string
  date: string
  timestamp: string
}

function App() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<ImageInfo[]>([])
  const [folders, setFolders] = useState<FolderInfo[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null)

  const API_BASE = 'http://localhost:8000'

  useEffect(() => {
    fetchFolders()
  }, [])

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (images.length === 0) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevImage()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextImage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [images.length])

  const fetchFolders = async () => {
    try {
      const response = await fetch(`${API_BASE}/folders`)
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders)
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }

  const downloadVideo = async () => {
    if (!url.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          extract_frames: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setImages(data.images)
        setCurrentImageIndex(0)
        await fetchFolders()
        setUrl('')
      } else {
        const error = await response.json()
        alert(`Error: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error downloading video:', error)
      alert('Failed to download video')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFolderImages = async (folder: FolderInfo) => {
    try {
      const response = await fetch(`${API_BASE}/folders/${folder.date}/${folder.timestamp}/images`)
      if (response.ok) {
        const data = await response.json()
        setImages(data.images)
        setCurrentImageIndex(0)
        setSelectedFolder(folder.path)
      }
    } catch (error) {
      console.error('Error loading folder images:', error)
    }
  }

  const nextImage = () => {
    console.log('Next image clicked, current index:', currentImageIndex)
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    console.log('Previous image clicked, current index:', currentImageIndex)
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const openModal = (image: ImageInfo) => {
    setSelectedImage(image)
    setIsModalOpen(true)
  }

  const deleteFolder = async (folder: FolderInfo, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the folder click

    if (!confirm(`Are you sure you want to delete the folder from ${folder.date}?`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/folders/${folder.date}/${folder.timestamp}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh the folders list
        await fetchFolders()

        // If this was the selected folder, clear the images
        if (selectedFolder === folder.path) {
          setSelectedFolder(null)
          setImages([])
        }
      } else {
        const error = await response.json()
        alert(`Error deleting folder: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
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
          <h1 style={{
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#34d399',
            letterSpacing: '0.1em',
            margin: '0 0 24px 0',
            textAlign: 'center'
          }}>
            ► INSTAGRAM VIDEO TO PIX
          </h1>

          {/* URL Input Section */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
              <input
                type="url"
                placeholder="Paste Instagram URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#34d399';
                  e.target.style.background = '#1e293b';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155';
                  e.target.style.background = '#0f172a';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading && url.trim()) {
                    downloadVideo();
                  }
                }}
              />
              <button
                onClick={downloadVideo}
                disabled={isLoading || !url.trim()}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #34d399',
                  color: isLoading || !url.trim() ? '#64748b' : '#34d399',
                  background: 'transparent',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: isLoading || !url.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && url.trim()) {
                    e.target.style.background = '#34d399';
                    e.target.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && url.trim()) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#34d399';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <div style={{display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px'}}>
          {/* Folder Navigation */}
          <div>
            <div style={{
              ...cardStyle,
              cursor: 'default'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#34d399',
                marginBottom: '16px',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Folder size={20} />
                ▼ DOWNLOAD HISTORY
              </h3>
              <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                {folders.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    No downloads yet
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {folders.map((folder) => (
                      <div
                        key={folder.path}
                        onClick={() => loadFolderImages(folder)}
                        style={{
                          ...cardStyle,
                          padding: '12px',
                          background: selectedFolder === folder.path ? '#334155' : '#1e293b',
                          borderColor: selectedFolder === folder.path ? '#34d399' : '#334155'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#34d399';
                          e.currentTarget.style.background = '#334155';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = selectedFolder === folder.path ? '#34d399' : '#334155';
                          e.currentTarget.style.background = selectedFolder === folder.path ? '#334155' : '#1e293b';
                        }}
                      >
                        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                          <div style={{flex: 1}}>
                            <div style={{fontSize: '14px', fontWeight: '500', color: '#e2e8f0', marginBottom: '4px'}}>
                              {folder.date}
                            </div>
                            <div style={{fontSize: '12px', color: '#64748b'}}>
                              {folder.timestamp}
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteFolder(folder, e)}
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '1px solid #dc2626',
                              color: '#dc2626',
                              background: 'transparent',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#dc2626';
                              e.target.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'transparent';
                              e.target.style.color = '#dc2626';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{minWidth: 0, overflow: 'hidden'}}>
            {images.length > 0 ? (
              <div style={{...cardStyle, cursor: 'default', width: '100%', maxWidth: '100%'}}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#34d399',
                    margin: 0,
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Play size={20} />
                    ▼ FRAME VIEWER ({images.length} frames)
                  </h3>
                  <div style={{
                    fontSize: '14px',
                    color: '#34d399',
                    fontWeight: '500',
                    fontFamily: 'inherit'
                  }}>
                    {images[currentImageIndex]?.filename || 'No image selected'}
                  </div>
                </div>

                {/* Current Image Display */}
                <div style={{position: 'relative', marginBottom: '16px'}}>
                  <img
                    src={`${API_BASE}${images[currentImageIndex]?.url}`}
                    alt={`Frame ${currentImageIndex + 1}`}
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: '#0f172a'
                    }}
                    onClick={() => openModal(images[currentImageIndex])}
                  />

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          prevImage()
                        }}
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          border: '1px solid #34d399',
                          color: '#34d399',
                          background: 'rgba(30, 41, 59, 0.9)',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#34d399';
                          e.target.style.color = '#0f172a';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(30, 41, 59, 0.9)';
                          e.target.style.color = '#34d399';
                        }}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          nextImage()
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          border: '1px solid #34d399',
                          color: '#34d399',
                          background: 'rgba(30, 41, 59, 0.9)',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#34d399';
                          e.target.style.color = '#0f172a';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(30, 41, 59, 0.9)';
                          e.target.style.color = '#34d399';
                        }}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}

                  {/* Frame Counter */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: '#34d399',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit'
                  }}>
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  background: '#0f172a',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid #334155'
                }}>
                  {images.map((image, index) => (
                    <img
                      key={image.path}
                      src={`${API_BASE}${image.url}`}
                      alt={`Thumbnail ${index + 1}`}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        border: index === currentImageIndex ? '2px solid #34d399' : '2px solid transparent',
                        opacity: index === currentImageIndex ? 1 : 0.7,
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setCurrentImageIndex(index)}
                      onMouseEnter={(e) => {
                        if (index !== currentImageIndex) {
                          e.target.style.opacity = '1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== currentImageIndex) {
                          e.target.style.opacity = '0.7';
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                ...cardStyle,
                cursor: 'default',
                textAlign: 'center',
                padding: '48px 24px'
              }}>
                <div style={{color: '#64748b', marginBottom: '16px'}}>
                  <Download size={64} style={{margin: '0 auto'}} />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#94a3b8',
                  marginBottom: '8px'
                }}>
                  ● Awaiting video download
                </h3>
                <p style={{color: '#64748b', fontSize: '14px'}}>
                  Paste an Instagram URL and download to extract frames
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Full-size Image Modal */}
        {isModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }} onClick={() => setIsModalOpen(false)}>
            <div style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#1e293b',
              border: '1px solid #34d399',
              borderRadius: '4px',
              overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedImage ? `${API_BASE}${selectedImage.url}` : ''}
                alt="Full size"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '32px',
                  height: '32px',
                  border: '1px solid #34d399',
                  color: '#34d399',
                  background: 'rgba(30, 41, 59, 0.9)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#34d399';
                  e.target.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(30, 41, 59, 0.9)';
                  e.target.style.color = '#34d399';
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
