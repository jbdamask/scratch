# NowIGetIt - Implementation Plan

> Transform scientific PDF articles into accessible, interactive single-page web apps for the layperson, powered by Claude.

## Architecture Overview

```
┌─────────────────────┐       ┌──────────────────────────────┐       ┌─────────────────┐
│   Frontend (React)  │──────▶│   Backend (FastAPI + Claude) │──────▶│  GitHub Gists   │
│   PDF Upload Page   │  PDF  │   Anthropic Agent SDK        │  HTML │  (jbdamask)     │
│   Result Display    │◀──────│   Opus 4.6                   │◀──────│                 │
│                     │  URL  │                              │  URL  │                 │
└─────────────────────┘       └──────────────────────────────┘       └─────────────────┘
         ▲                                 ▲
         │                                 │
         └──── AWS CloudFormation ─────────┘
               S3 + Lambda + API Gateway
```

## User Flow

1. User visits branded landing page
2. Uploads a scientific PDF (file picker or drag-and-drop)
3. Backend extracts text from PDF
4. Claude Opus 4.6 generates an interactive single-page HTML
5. HTML is saved as a GitHub Gist (on jbdamask's account)
6. User receives a shareable gistpreview URL (e.g. `https://gistpreview.github.io/?<gist_id>`)

---

## Phase 1: Project Scaffolding

**Goal:** Set up folder structure, tooling, and configuration files following repo conventions.

### Tasks
- [ ] Create `backend/` and `frontend/` directories
- [ ] Initialize Python virtual environment (`backend/.venv`)
- [ ] Create `backend/requirements.txt` with initial dependencies
- [ ] Scaffold frontend with Vite + React 18 + TypeScript
- [ ] Install shadcn/ui + Tailwind CSS
- [ ] Create `.gitignore`, `CLAUDE.md`, `start.sh`
- [ ] Create `.env.example` documenting required env vars

### Key Dependencies
**Backend:**
- `fastapi` + `uvicorn` — API server
- `anthropic` — Agent SDK (Opus 4.6)
- `pdfplumber` — PDF text extraction
- `python-dotenv` — env config
- `requests` — GitHub Gist API calls

**Frontend:**
- Vite + React 18 + TypeScript
- shadcn/ui + Tailwind CSS
- Lucide React (icons)

### Env Vars Needed
```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...          # PAT with gist scope
```

---

## Phase 2: Backend - Core Processing Pipeline

**Goal:** Build the FastAPI server that accepts a PDF, runs it through Claude, and returns a gist preview URL.

### Tasks
- [ ] **`main.py`** — FastAPI app with CORS, health check, and upload endpoint
- [ ] **`pdf_processor.py`** — Extract text from uploaded PDF using pdfplumber
- [ ] **`generator.py`** — Send extracted text to Claude Opus 4.6 via Anthropic SDK
  - System prompt: *"make a really freaking cool-looking interactive single-page website that demonstrates the contents of this paper to a layperson"*
  - Include extracted text as user message
  - Parse HTML from Claude's response
- [ ] **`gist_publisher.py`** — Create a GitHub Gist via REST API
  - POST to `https://api.github.com/gists`
  - Use `GITHUB_TOKEN` for auth
  - Return gist ID
- [ ] **Upload endpoint** (`POST /api/upload`)
  - Accept PDF file upload
  - Pipeline: extract text → generate HTML → publish gist → return URL
  - Return `{ "url": "https://gistpreview.github.io/?<gist_id>" }`
- [ ] **Error handling** — Graceful failures for bad PDFs, API errors, rate limits

### API Contract
```
POST /api/upload
  Content-Type: multipart/form-data
  Body: file=<pdf>

Response 200:
  { "url": "https://gistpreview.github.io/?41a23034435ab0ab927a71c233411ee8" }

Response 4xx/5xx:
  { "error": "description of what went wrong" }
```

---

## Phase 3: Frontend - Landing Page & Upload UI

**Goal:** Build a branded, minimalist landing page with PDF upload and result display.

### Tasks
- [ ] **Landing page layout** — Clean header with "NowIGetIt" branding + tagline
- [ ] **Upload component** — File input + drag-and-drop zone (PDF only)
- [ ] **Processing state** — Loading indicator while Claude generates the page
- [ ] **Result display** — Show clickable gistpreview URL + copy-to-clipboard button
- [ ] **Error state** — User-friendly error messages
- [ ] **Responsive design** — Works on mobile and desktop

### UI Wireframe
```
┌──────────────────────────────────────────┐
│              NowIGetIt                   │
│  Scientific papers, actually explained.  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │     Drop your PDF here             │  │
│  │     or click to browse             │  │
│  │                                    │  │
│  │         [ 📄 icon ]               │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ✅ Your page is ready!            │  │
│  │  https://gistpreview.github.io/... │  │
│  │                        [ Copy 📋 ] │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Phase 4: AWS Infrastructure (CloudFormation)

**Goal:** Deploy the full stack to AWS via a single CloudFormation template.

### Tasks
- [ ] **`aws/nowigetit.yaml`** — CloudFormation template containing:
  - **S3 Bucket** — Host the built React frontend (static site)
  - **Lambda Function** — Run the Python backend (PDF processing + Claude + Gist)
  - **API Gateway (HTTP)** — Route `POST /api/upload` to Lambda
  - **IAM Roles** — Lambda execution role with necessary permissions
  - **CloudFront Distribution** — CDN for the S3-hosted frontend
  - **Parameters** — `AnthropicApiKey`, `GithubToken` (as SecureString)
  - **Outputs** — CloudFront URL, API endpoint

### Architecture Notes
- Lambda needs a layer or container image for `pdfplumber` (native deps)
- Consider Lambda timeout — Claude generation could take 30-60s
- API Gateway timeout max is 29s; may need async pattern:
  - Option A: Increase Lambda timeout, use Lambda function URL instead of API Gateway
  - Option B: Async flow — upload triggers Lambda, poll for result via second endpoint
- Store secrets in AWS Secrets Manager or SSM Parameter Store (referenced in CloudFormation)

### Async Pattern (Recommended)
```
POST /api/upload  →  Returns { "job_id": "abc123" }
                     (Lambda starts processing async)

GET /api/status/abc123  →  Returns { "status": "processing" }
                           or      { "status": "complete", "url": "..." }
```
This avoids API Gateway timeout issues and gives a better UX with progress polling.

---

## Phase 5: Integration & Polish

**Goal:** End-to-end testing, documentation, and final polish.

### Tasks
- [ ] End-to-end test: upload PDF → get working gistpreview URL
- [ ] Test with various paper types (short, long, heavy on figures/tables)
- [ ] Add PDF size limit validation (frontend + backend)
- [ ] Write `README.md` with setup instructions, architecture, usage
- [ ] Write `CLAUDE.md` with agent development guidelines
- [ ] Record any AWS deployment gotchas

---

## Project Structure (Target)

```
EXPERIMENTS/NOWIGETIT/
├── backend/
│   ├── .venv/
│   ├── main.py              # FastAPI app
│   ├── pdf_processor.py     # PDF text extraction
│   ├── generator.py         # Claude Agent SDK integration
│   ├── gist_publisher.py    # GitHub Gist API
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx
│   │   │   └── ResultDisplay.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── aws/
│   └── nowigetit.yaml       # CloudFormation template
├── .env.example
├── .gitignore
├── CLAUDE.md
├── README.md
├── PLAN.md                  # This file
└── start.sh
```

---

## Open Questions / Decisions

1. **Async vs sync processing?** Claude generation could take 30-60s. API Gateway has a 29s timeout. Recommend async pattern with job polling (see Phase 4).
2. **PDF size limit?** Suggest 10MB max to keep Lambda memory/time reasonable.
3. **Claude context window usage** — Very long papers may need chunking or summarization before HTML generation. Consider a two-pass approach: summarize → generate.
4. **Gist visibility** — Public or secret gists? Public means anyone with the URL can find it via search; secret means link-only access.
5. **Lambda packaging** — `pdfplumber` has native dependencies. Options: Lambda container image (Docker) or Lambda layer with pre-built binaries.

---

## Suggested Build Order

Start local, deploy later:

1. **Phase 1** → Scaffolding
2. **Phase 2** → Backend (test with `curl` / Postman)
3. **Phase 3** → Frontend (connect to local backend)
4. **Phase 5** → Integration test locally
5. **Phase 4** → AWS deployment (once it works end-to-end locally)
