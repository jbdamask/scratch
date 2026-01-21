// API types and utilities for calling the Qwen3-VL API proxy

import type { ConversationTurn } from '../types/session';

export interface GenerateRequest {
  prompt: string;
  image?: {
    type: 'file' | 'url';
    data: string; // base64 for file, URL string for url type
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    imageUrl?: string | null;
  }>;
}

export interface GenerateResponse {
  id: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface APIError {
  error: {
    message: string;
    code?: string;
  };
}

export function isAPIError(response: unknown): response is APIError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as APIError).error === 'object' &&
    typeof (response as APIError).error.message === 'string'
  );
}

// Convert a File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Call the generate API endpoint
export async function generateCompletion(
  prompt: string,
  image?: { type: 'file'; file: File } | { type: 'url'; url: string },
  conversationHistory?: ConversationTurn[]
): Promise<GenerateResponse> {
  const body: GenerateRequest = { prompt };

  if (image) {
    if (image.type === 'file') {
      const base64 = await fileToBase64(image.file);
      body.image = { type: 'file', data: base64 };
    } else {
      body.image = { type: 'url', data: image.url };
    }
  }

  // Include conversation history for context continuity
  if (conversationHistory && conversationHistory.length > 0) {
    body.conversationHistory = conversationHistory.map(turn => ({
      role: turn.role,
      content: turn.content,
      imageUrl: turn.imageUrl,
    }));
  }

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: GenerateResponse | APIError = await response.json();

  if (isAPIError(data)) {
    throw new Error(data.error.message);
  }

  return data;
}
