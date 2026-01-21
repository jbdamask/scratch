import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
}

interface GenerateRequestBody {
  prompt: string;
  image?: {
    type: 'file' | 'url';
    data: string; // base64 for file, URL string for url type
  };
  conversationHistory?: ConversationTurn[];
}

interface QwenMessage {
  role: 'user' | 'assistant' | 'system';
  content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

interface QwenAPIRequest {
  model: string;
  messages: QwenMessage[];
  max_tokens?: number;
}

interface QwenAPIResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}

// Validate the request body
function validateRequest(body: unknown): body is GenerateRequestBody {
  if (!body || typeof body !== 'object') return false;
  const req = body as Record<string, unknown>;

  if (typeof req.prompt !== 'string' || req.prompt.trim().length === 0) {
    return false;
  }

  if (req.image !== undefined) {
    if (typeof req.image !== 'object' || req.image === null) return false;
    const img = req.image as Record<string, unknown>;
    if (img.type !== 'file' && img.type !== 'url') return false;
    if (typeof img.data !== 'string' || img.data.trim().length === 0) return false;
  }

  return true;
}

// Build the messages array for Qwen API
function buildMessages(body: GenerateRequestBody): QwenMessage[] {
  const messages: QwenMessage[] = [];

  // Add conversation history if provided (for multi-turn context)
  if (body.conversationHistory && body.conversationHistory.length > 0) {
    for (const turn of body.conversationHistory) {
      const turnContent: QwenMessage['content'] = [];

      // Add image if it was part of the user's message
      if (turn.role === 'user' && turn.imageUrl) {
        turnContent.push({
          type: 'image_url',
          image_url: { url: turn.imageUrl },
        });
      }

      turnContent.push({
        type: 'text',
        text: turn.content,
      });

      messages.push({
        role: turn.role,
        content: turnContent,
      });
    }
  }

  // Add the current message
  const currentContent: QwenMessage['content'] = [];

  // Add image if provided
  if (body.image) {
    let imageUrl: string;
    if (body.image.type === 'url') {
      imageUrl = body.image.data;
    } else {
      // base64 encoded file - add data URI prefix if not present
      imageUrl = body.image.data.startsWith('data:')
        ? body.image.data
        : `data:image/jpeg;base64,${body.image.data}`;
    }
    currentContent.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }

  // Add text prompt
  currentContent.push({
    type: 'text',
    text: body.prompt,
  });

  messages.push({
    role: 'user',
    content: currentContent,
  });

  return messages;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      error: { message: 'Method not allowed. Use POST.' },
    } satisfies ErrorResponse);
    return;
  }

  // Validate request body
  if (!validateRequest(req.body)) {
    res.status(400).json({
      error: { message: 'Invalid request body. Required: prompt (string). Optional: image ({ type: "file" | "url", data: string }).' },
    } satisfies ErrorResponse);
    return;
  }

  // Check for API key
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: { message: 'Server configuration error: API key not configured.', code: 'CONFIG_ERROR' },
    } satisfies ErrorResponse);
    return;
  }

  // Build the API request
  const apiEndpoint = process.env.QWEN_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  const model = process.env.QWEN_MODEL || 'qwen-vl-max';

  const qwenRequest: QwenAPIRequest = {
    model,
    messages: buildMessages(req.body),
    max_tokens: 2048,
  };

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(qwenRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed with status ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Use the raw error text if JSON parsing fails
        if (errorText) {
          errorMessage = errorText;
        }
      }

      res.status(response.status >= 500 ? 502 : response.status).json({
        error: { message: errorMessage, code: 'API_ERROR' },
      } satisfies ErrorResponse);
      return;
    }

    const data = (await response.json()) as QwenAPIResponse;

    // Return the response
    res.status(200).json({
      id: data.id,
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      error: { message: `Failed to call Qwen API: ${message}`, code: 'NETWORK_ERROR' },
    } satisfies ErrorResponse);
  }
}
