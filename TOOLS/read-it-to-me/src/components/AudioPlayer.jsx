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

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      
      <div className="player-controls">
        <button
          className="play-pause-btn"
          onClick={togglePlayPause}
          disabled={!audioUrl}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <div className="progress-container">
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
        
        <button
          className="speed-btn"
          onClick={handleSpeedChange}
          disabled={!audioUrl}
        >
          {playbackSpeed}x
        </button>
      </div>
    </div>
  )
}

export default AudioPlayer