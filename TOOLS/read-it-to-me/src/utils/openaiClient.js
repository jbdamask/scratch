const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export const generateSpeech = async (text) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment.')
  }

  try {
    // Split text into chunks if it's too long (OpenAI has a limit)
    const maxChunkSize = 4000 // Conservative limit
    const textChunks = text.length > maxChunkSize ? splitTextIntoChunks(text, maxChunkSize) : [text]
    
    if (textChunks.length === 1) {
      return await generateSingleAudio(textChunks[0])
    } else {
      // For multiple chunks, we'll generate audio for each and combine them
      // This is a simplified approach - in production you might want streaming
      const audioUrls = []
      for (const chunk of textChunks) {
        const audioUrl = await generateSingleAudio(chunk)
        audioUrls.push(audioUrl)
      }
      return audioUrls[0] // Return first chunk for now - you could combine them
    }
  } catch (error) {
    console.error('Error generating speech:', error)
    throw error
  }
}

const generateSingleAudio = async (text) => {
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

  const audioBlob = await response.blob()
  return URL.createObjectURL(audioBlob)
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