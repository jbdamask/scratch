# NowIGetIt - Implementation Plan

> Transform scientific PDF articles into accessible, interactive single-page web apps for the layperson, powered by Claude.

## Architecture Overview

```
┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐    ┌──────────────┐
│  S3 Static Site  │    │  HTTP API Gateway     │    │  Lambda (process)  │    │ GitHub Gists │
│  index.html      │    │                       │    │  Claude Opus 4.6   │──▶│ (jbdamask)   │
│  config.js       │    │  POST /api/upload ────│──▶ Lambda (upload)     │    │ always public│
│                  │    │  GET  /api/status/ ───│──▶ Lambda (status)     │    └──────────────┘
└──────────────────┘    └──────────────────────┘    └────────┬───────────┘
                                                             │       ▲
                                                             ▼       │
                                                    ┌─────────────────────┐
                                                    │  ShareIt S3 Bucket  │
                                                    │  (public, existing) │
                                                    │  + DynamoDB Jobs    │
                                                    └─────────────────────┘
```

## How It Works

1. User uploads PDF via frontend
2. Upload Lambda: stores PDF in ShareIt S3 bucket (`nowigetit/{job_id}.pdf`), creates DynamoDB job (`status: processing`), invokes Process Lambda async, returns `job_id`
3. Frontend polls `GET /api/status/{job_id}` every 2 seconds
4. Process Lambda: builds public URL for the PDF → sends URL to Claude (document source type: `url`) → Claude fetches PDF directly → generates interactive HTML → publishes to GitHub Gist → updates DynamoDB (`status: complete`, `url: ...`) → deletes PDF from S3
5. Status Lambda returns job status from DynamoDB
6. Frontend displays the gistpreview URL

### Key Design Choice: URL-based PDF Ingestion

Claude receives the PDF as a URL pointing to the public ShareIt S3 bucket — not as base64-encoded bytes. This avoids 33% payload bloat and keeps the API request small. The PDF is uploaded to `share-it-amroja` (an existing public S3 bucket) and cleaned up after processing.

---

## Phase 1: Project Scaffolding [DONE]

- [x] `backend/` directory with FastAPI app, module files, requirements.txt
- [x] `backend/static/index.html` — vanilla HTML/CSS/JS frontend (no build step)
- [x] `.gitignore`, `.env.example`, `CLAUDE.md`, `start.sh`

---

## Phase 2: Backend - Core Processing Pipeline [DONE]

- [x] **`main.py`** — FastAPI app for local dev (in-memory jobs, uploads to ShareIt bucket)
- [x] **`generator.py`** — Sends PDF URL to Claude Opus 4.6, gets back interactive HTML
- [x] **`gist_publisher.py`** — Public GitHub Gist creation, returns gistpreview URL

---

## Phase 3: Frontend [DONE]

- [x] Branded landing page, drag-and-drop upload, processing spinner, result URL + copy button
- [x] `config.js` support — `window.API_BASE` for S3 deployment, absent for local dev

---

## Phase 4: AWS Infrastructure [DONE]

- [x] **`lambda_upload.py`** — Parses multipart PDF, stores in ShareIt S3 bucket, creates DynamoDB record, invokes processor async
- [x] **`lambda_process.py`** — Builds PDF URL, sends to Claude, publishes gist, updates DynamoDB, cleans up PDF
- [x] **`lambda_status.py`** — Reads job status from DynamoDB
- [x] **`aws/nowigetit.yaml`** — CloudFormation template:
  - S3 bucket for frontend (static website hosting, public read)
  - ShareIt S3 bucket (existing, public) for temporary PDF hosting
  - DynamoDB table with TTL
  - 3 Lambda functions (upload 30s/256MB, status 10s/128MB, process 120s/512MB)
  - HTTP API Gateway with CORS
  - Shared IAM role
- [x] **`deploy.sh`** — Packages Lambda code, uploads to S3, deploys stack, uploads frontend with generated `config.js`

---

## Phase 5: Integration & Polish

- [ ] End-to-end test: upload PDF → get working gistpreview URL
- [ ] Test with various paper types (short, long, figure-heavy)
- [ ] Write `README.md`
- [ ] Record AWS deployment gotchas

---

## Project Structure

```
EXPERIMENTS/NOWIGETIT/
├── backend/
│   ├── .venv/
│   ├── main.py              # FastAPI app (local dev)
│   ├── generator.py         # Send PDF URL to Claude, get HTML back
│   ├── gist_publisher.py    # GitHub Gist API (public gists)
│   ├── lambda_upload.py     # Lambda: receive PDF, store in ShareIt bucket, kick off processing
│   ├── lambda_process.py    # Lambda: URL → Claude → gist → update DynamoDB → cleanup
│   ├── lambda_status.py     # Lambda: return job status from DynamoDB
│   ├── requirements.txt
│   └── static/
│       └── index.html       # Vanilla HTML/CSS/JS frontend
├── aws/
│   └── nowigetit.yaml       # CloudFormation template
├── .env.example
├── .gitignore
├── CLAUDE.md
├── PLAN.md
├── deploy.sh                # Build, package, deploy to AWS
└── start.sh                 # Local dev server
```

---

## Deployment

```bash
# Local
./start.sh

# AWS (requires .env with ANTHROPIC_API_KEY and GITHUB_TOKEN)
./deploy.sh
```

---

## Open Questions

1. **Long papers** — Very long papers may exceed Claude's context. Consider a two-pass approach (summarize → generate) for papers over ~50 pages.
2. **PDF size limit** — Currently 10 MB. Adjust if needed.
