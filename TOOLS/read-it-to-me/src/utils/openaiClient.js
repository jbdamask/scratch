const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export const generateSpeech = async (text, onProgress) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment.')
  }

  try {
    // OpenAI TTS API has a hard limit of 4096 characters
    const maxChunkSize = 4090 // Leave some buffer for safety
    const textChunks = text.length > maxChunkSize ? splitTextIntoChunks(text, maxChunkSize) : [text]
    
    if (textChunks.length === 1) {
      if (onProgress) onProgress(0, 1, 'Generating audio...')
      const audioUrl = await generateSingleAudio(textChunks[0])
      if (onProgress) onProgress(1, 1, 'Complete!')
      return audioUrl
    } else {
      // Generate audio for each chunk and combine them
      const audioBlobs = []
      
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i]
        if (onProgress) onProgress(i, textChunks.length, `Generating audio chunk ${i + 1} of ${textChunks.length}...`)
        
        const audioBlob = await generateSingleAudioBlob(chunk)
        audioBlobs.push(audioBlob)
      }
      
      if (onProgress) onProgress(textChunks.length, textChunks.length, 'Combining audio chunks...')
      
      // Combine all audio blobs into a single audio file
      const combinedBlob = await combineAudioBlobs(audioBlobs)
      const combinedUrl = URL.createObjectURL(combinedBlob)
      
      if (onProgress) onProgress(textChunks.length, textChunks.length, 'Complete!')
      return combinedUrl
    }
  } catch (error) {
    console.error('Error generating speech:', error)
    throw error
  }
}

const generateSingleAudio = async (text) => {
  const audioBlob = await generateSingleAudioBlob(text)
  return URL.createObjectURL(audioBlob)
}

const generateSingleAudioBlob = async (text) => {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'alloy',
      response_format: 'mp3'
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`)
  }

  return await response.blob()
}

const combineAudioBlobs = async (audioBlobs) => {
  // For MP3 files, we can simply concatenate them at the binary level
  // This works because MP3 is a streaming format that supports concatenation
  const combinedArrayBuffers = []
  
  for (const blob of audioBlobs) {
    const arrayBuffer = await blob.arrayBuffer()
    combinedArrayBuffers.push(new Uint8Array(arrayBuffer))
  }
  
  // Calculate total length
  const totalLength = combinedArrayBuffers.reduce((sum, arr) => sum + arr.length, 0)
  
  // Create combined array
  const combined = new Uint8Array(totalLength)
  let offset = 0
  
  for (const arr of combinedArrayBuffers) {
    combined.set(arr, offset)
    offset += arr.length
  }
  
  return new Blob([combined], { type: 'audio/mpeg' })
}

const splitTextIntoChunks = (text, maxSize) => {
  const chunks = []
  const sentences = text.split(/[.!?]+\s+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      if (sentence.length > maxSize) {
        // If a single sentence is too long, split it by words
        const words = sentence.split(' ')
        for (const word of words) {
          if (currentChunk.length + word.length > maxSize) {
            if (currentChunk) {
              chunks.push(currentChunk.trim())
              currentChunk = ''
            }
          }
          currentChunk += (currentChunk ? ' ' : '') + word
        }
      } else {
        currentChunk = sentence
      }
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}