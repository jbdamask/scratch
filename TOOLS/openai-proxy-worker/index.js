/**
 * OpenAI API Proxy Worker
 *
 * A Cloudflare Worker that proxies requests to OpenAI's API,
 * handling CORS for browser-based applications.
 *
 * Usage: Deploy to Cloudflare Workers and update ALLOWED_ORIGINS
 */

// Origins allowed to use this proxy - update with your domains
const ALLOWED_ORIGINS = [
  'https://johndamask.com',
  'https://www.johndamask.com',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  // Add file:// origin for local development (be cautious with this in production)
  'null'  // file:// URLs send 'null' as origin
];

// OpenAI API base URL
const OPENAI_API_BASE = 'https://api.openai.com';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    // Check origin
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden: Origin not allowed', {
        status: 403,
        headers: getCORSHeaders(origin)
      });
    }

    // Only allow POST requests for API calls
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: getCORSHeaders(origin)
      });
    }

    try {
      // Get the path from the request URL
      const url = new URL(request.url);
      const apiPath = url.pathname;

      // Build the OpenAI API URL
      const openaiUrl = `${OPENAI_API_BASE}${apiPath}`;

      // Forward the request to OpenAI
      const openaiResponse = await fetch(openaiUrl, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization'),
          'Content-Type': request.headers.get('Content-Type')
        },
        body: request.body
      });

      // Create response with CORS headers
      const responseHeaders = new Headers(openaiResponse.headers);
      const corsHeaders = getCORSHeaders(origin);
      for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
      }

      return new Response(openaiResponse.body, {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders(origin)
        }
      });
    }
  }
};

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCORSHeaders(origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function handleCORS(request) {
  const origin = request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin)
  });
}
