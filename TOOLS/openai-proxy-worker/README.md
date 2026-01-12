# OpenAI Proxy Worker

A Cloudflare Worker that proxies requests to OpenAI's API, handling CORS for browser-based applications.

## Why?

Browser-based apps can't call OpenAI's API directly due to CORS restrictions. This worker acts as a proxy that:
- Forwards requests to OpenAI
- Adds proper CORS headers
- Has no timeout issues (unlike free CORS proxies)

## Deployment

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This opens a browser to authenticate with your Cloudflare account.

### 3. Deploy the Worker

```bash
cd openai-proxy-worker
wrangler deploy
```

### 4. Note Your Worker URL

After deployment, you'll see output like:
```
Published openai-proxy (x.xx sec)
  https://openai-proxy.YOUR_SUBDOMAIN.workers.dev
```

### 5. Update Your Apps

Update the `OPENAI_PROXY_URL` in `audio-transcriber.html` (line ~311) with your actual worker URL.

## Configuration

### Allowed Origins

Edit `index.js` and update `ALLOWED_ORIGINS` to include only your domains:

```javascript
const ALLOWED_ORIGINS = [
  'https://johndamask.com',
  'https://www.johndamask.com',
  // Add other domains as needed
];
```

## Usage

The proxy mirrors OpenAI's API paths. Instead of:
```
POST https://api.openai.com/v1/audio/transcriptions
```

Use:
```
POST https://openai-proxy.YOUR_SUBDOMAIN.workers.dev/v1/audio/transcriptions
```

All other aspects (headers, body, authentication) remain the same.

## Free Tier Limits

Cloudflare Workers free tier includes:
- 100,000 requests/day
- No credit card required
- Global edge deployment

## Security Notes

- The worker validates the Origin header against `ALLOWED_ORIGINS`
- Your OpenAI API key is passed through (not stored in the worker)
- Only POST requests are allowed
