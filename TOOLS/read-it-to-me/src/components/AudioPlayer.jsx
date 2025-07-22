import React, { useRef, useState, useEffect } from 'react'

const AudioPlayer = ({ audioUrl }) => {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      audio.playbackRate = playbackSpeed
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl, playbackSpeed])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    audio.currentTime = pos * duration
  }

  const handleSpeedChange = () => {
    const speeds = [1, 1.5, 2]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setPlaybackSpeed(speeds[nextIndex])
  }

  const handleDownload = () => {
    if (!audioUrl) return
    
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = 'read-it-to-me-audio.mp3'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const skipBackward = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, audio.currentTime - 15)
  }

  const skipForward = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(duration, audio.currentTime + 15)
  }

  const restartAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
  }

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="spotify-player">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      
      <div className="player-main">
        <div className="track-info">
          <div className="track-title">Read It To Me</div>
          <div className="track-artist">AI Generated Audio</div>
        </div>
        
        <div className="player-controls">
          <div className="control-buttons">
            <button
              className="control-btn restart-btn"
              onClick={restartAudio}
              disabled={!audioUrl}
              title="Restart"
            >
              ⏮
            </button>
            
            <button
              className="control-btn skip-btn"
              onClick={skipBackward}
              disabled={!audioUrl}
              title="Skip back 15s"
            >
              ⏪
            </button>
            
            <button
              className="play-pause-btn"
              onClick={togglePlayPause}
              disabled={!audioUrl}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <button
              className="control-btn skip-btn"
              onClick={skipForward}
              disabled={!audioUrl}
              title="Skip forward 15s"
            >
              ⏩
            </button>
            
            <button
              className="control-btn download-btn"
              onClick={handleDownload}
              disabled={!audioUrl}
              title="Download Audio"
            >
              ⬇
            </button>
          </div>
          
          <div className="progress-section">
            <div className="time-display">
              {formatTime(currentTime)}
            </div>
            
            <div
              className="progress-bar"
              onClick={handleSeek}
            >
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="time-display">
              {formatTime(duration)}
            </div>
          </div>
        </div>
        
        <div className="player-extras">
          <button
            className="speed-btn"
            onClick={handleSpeedChange}
            disabled={!audioUrl}
            title={`Playback Speed: ${playbackSpeed}x`}
          >
            {playbackSpeed}×
          </button>
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer