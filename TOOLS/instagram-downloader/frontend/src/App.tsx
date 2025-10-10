import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Download, Folder, X } from 'lucide-react'
import './App.css'

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
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const openModal = (image: ImageInfo) => {
    setSelectedImage(image)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Instagram Video Downloader
        </h1>

        {/* URL Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex gap-4">
            <Input
              type="url"
              placeholder="Paste Instagram URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={downloadVideo}
              disabled={isLoading || !url.trim()}
              className="whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Folder Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Folder className="w-5 h-5 mr-2" />
                Downloads
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {folders.map((folder) => (
                  <button
                    key={folder.path}
                    onClick={() => loadFolderImages(folder)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedFolder === folder.path
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-sm font-medium">{folder.date}</div>
                    <div className="text-xs text-gray-500">{folder.timestamp}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {images.length > 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                {/* Current Image Display */}
                <div className="relative mb-6">
                  <img
                    src={`${API_BASE}${images[currentImageIndex]?.url}`}
                    alt={`Frame ${currentImageIndex + 1}`}
                    className="w-full max-h-96 object-contain rounded-lg cursor-pointer"
                    onClick={() => openModal(images[currentImageIndex])}
                  />

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  {/* Frame Counter */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div className="flex gap-2 overflow-x-auto pb-4">
                  {images.map((image, index) => (
                    <img
                      key={image.path}
                      src={`${API_BASE}${image.url}`}
                      alt={`Thumbnail ${index + 1}`}
                      className={`w-20 h-20 object-cover rounded cursor-pointer flex-shrink-0 ${
                        index === currentImageIndex
                          ? 'ring-2 ring-blue-500'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Download className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No images to display
                </h3>
                <p className="text-gray-500">
                  Download a video or select a folder to view frames
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Full-size Image Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogTitle className="sr-only">Full size image</DialogTitle>
            <div className="relative">
              <img
                src={selectedImage ? `${API_BASE}${selectedImage.url}` : ''}
                alt="Full size"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default App
