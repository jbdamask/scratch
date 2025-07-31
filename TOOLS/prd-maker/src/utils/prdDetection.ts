export interface DetectedPRD {
  title: string
  content: string
  isFullPRD: boolean
  chatDisplayContent: string // Modified content for chat display
}

/**
 * Detects if a message contains PRD content using XML tags and extracts it
 */
export function detectPRDContent(message: string): DetectedPRD | null {
  // Look for XML-style PRD tags: <prd-document>...</prd-document> or <markdown>...</markdown>
  const prdTagRegex = /<(?:prd-document|markdown)(?:\s+title="([^"]*)")?\s*>([\s\S]*?)<\/(?:prd-document|markdown)>/i
  const match = message.match(prdTagRegex)
  
  if (!match) {
    return null
  }

  const titleFromTag = match[1] // title attribute if present
  const content = match[2].trim() // content inside tags
  
  if (!content) {
    return null
  }

  // Extract title from tag attribute or content
  let title = titleFromTag || extractTitleFromContent(content) || 'Generated PRD Document'

  // Check if this looks like a complete PRD by looking for multiple sections
  const completePRDIndicators = [
    /## App Overview|## Overview/i,
    /## Target Audience|## Users/i,
    /## Core Features|## Features/i,
    /## Technical|## Tech Stack/i,
    /## Development|## Implementation/i,
    /## Requirements/i
  ]

  const isFullPRD = completePRDIndicators.filter(pattern => 
    pattern.test(content)
  ).length >= 3

  // Create modified content for chat display (replace XML tags with placeholder)
  const chatDisplayContent = message.replace(
    prdTagRegex,
    `📄 **Document "${title}" created and saved to PRD editor**\n\n*The PRD content has been automatically populated in the Edit tab and is visible in the Preview tab.*`
  )

  return {
    title,
    content,
    isFullPRD,
    chatDisplayContent
  }
}

/**
 * Helper function to extract title from markdown content
 */
function extractTitleFromContent(content: string): string | null {
  // Try to find title from various markdown patterns
  const titlePatterns = [
    /^# ([^#\n]+)/m, // First H1 heading
    /# Product Requirements Document: (.+)/i,
    /# PRD: (.+)/i,
    /# (.+?) PRD/i
  ]

  for (const pattern of titlePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      let title = match[1].trim()
      
      // Clean up the title
      title = title.replace(/^(PRD|Product Requirements Document):?\s*/i, '')
      title = title.replace(/\s+PRD$/i, '')
      
      if (title.length > 0 && title.length < 100) {
        return title
      }
    }
  }

  return null
}

/**
 * Extracts a clean title from PRD content (legacy function for compatibility)
 */
export function extractPRDTitle(content: string): string {
  return extractTitleFromContent(content) || 'Generated PRD Document'
}