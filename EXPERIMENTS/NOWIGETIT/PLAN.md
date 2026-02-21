# NowIGetIt - Implementation Plan

> Transform scientific PDF articles into accessible, interactive single-page web apps for the layperson, powered by Claude.

## Architecture Overview

```
┌─────────────────────┐       ┌──────────────────────────────┐       ┌─────────────────┐
│  Frontend (vanilla)  │──────▶│   Backend (FastAPI + Claude) │──────▶│  GitHub Gists   │
│  static/index.html   │  PDF  │   Anthropic SDK (Opus 4.6)  │  HTML │  (jbdamask)     │
│  upload + result     │◀──────│   pdfplumber + requests      │◀──────│  always public  │
│                      │  URL  │                              │  URL  │                 │
└──────────────────────┘       └──────────────────────────────┘       └─────────────────┘
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
5. HTML is saved as a public GitHub Gist (on jbdamask's account)
6. User receives a shareable gistpreview URL (e.g. `https://gistpreview.github.io/?<gist_id>`)

---

## Phase 1: Project Scaffolding [DONE]

**Goal:** Set up folder structure, tooling, and configuration files.

### Completed
- [x] `backend/` directory with FastAPI app, module files, requirements.txt
- [x] `backend/static/index.html` — vanilla HTML/CSS/JS frontend (no build step)
- [x] `.gitignore`, `.env.example`, `CLAUDE.md`, `start.sh`

### Key Dependencies
**Backend:** fastapi, uvicorn, anthropic, pdfplumber, python-dotenv, requests, python-multipart

**Frontend:** None — single HTML file served by FastAPI.

### Env Vars
```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...          # PAT with gist scope
```

---

## Phase 2: Backend - Core Processing Pipeline [DONE]

All backend modules are implemented and ready for local testing:

- [x] **`main.py`** — FastAPI app, serves static frontend, `POST /api/upload`, `GET /api/status/{job_id}`
- [x] **`pdf_processor.py`** — Extract text from uploaded PDF using pdfplumber
- [x] **`generator.py`** — Send extracted text to Claude Opus 4.6, parse HTML from response
- [x] **`gist_publisher.py`** — Create public GitHub Gist, return gistpreview URL

### API Contract
```
POST /api/upload
  Content-Type: multipart/form-data
  Body: file=<pdf>
  Response: { "job_id": "uuid" }

GET /api/status/{job_id}
  Response: { "status": "processing" }
        or: { "status": "complete", "url": "https://gistpreview.github.io/?..." }
        or: { "status": "error", "error": "..." }
```

---

## Phase 3: Frontend [DONE]

Single `backend/static/index.html` — vanilla HTML/CSS/JS:
- [x] Branded landing page ("NowIGetIt — Scientific papers, actually explained.")
- [x] Drag-and-drop + file picker (PDF only)
- [x] Processing spinner while Claude generates
- [x] Result display with clickable URL + copy button
- [x] Error state display
- [x] Responsive

---

## Phase 4: AWS Infrastructure (CloudFormation)

**Goal:** Deploy via a single CloudFormation template.

### Tasks
- [ ] **`aws/nowigetit.yaml`** — CloudFormation template containing:
  - **S3 Bucket** — Host the static frontend (index.html)
  - **Lambda Function** — Run the Python backend (PDF → Claude → Gist)
  - **API Gateway (HTTP)** — Route `/api/*` to Lambda, serve frontend from S3
  - **IAM Roles** — Lambda execution role
  - **CloudFront Distribution** — CDN for S3 + API Gateway
  - **Parameters** — `AnthropicApiKey`, `GithubToken`
  - **Outputs** — CloudFront URL, API endpoint

### Architecture Notes
- Lambda needs a container image for `pdfplumber` (native deps)
- Lambda timeout should be 120s+ (Claude generation takes 30-60s)
- API Gateway timeout max is 29s → use Lambda function URL or async pattern
- Async pattern (current design): upload returns job_id, frontend polls status

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
│   ├── main.py              # FastAPI app + serves static frontend
│   ├── pdf_processor.py     # PDF text extraction
│   ├── generator.py         # Claude Opus 4.6 HTML generation
│   ├── gist_publisher.py    # GitHub Gist API (public gists)
│   ├── requirements.txt
│   └── static/
│       └── index.html       # Vanilla HTML/CSS/JS frontend
├── aws/
│   └── nowigetit.yaml       # CloudFormation template
├── .env.example
├── .gitignore
├── CLAUDE.md
├── PLAN.md
└── start.sh
```

---

## Open Questions

1. **Lambda packaging** — `pdfplumber` has native deps. Docker container image is likely the way to go.
2. **Long papers** — Very long papers may exceed Claude's context. Consider a two-pass approach (summarize → generate) for papers over ~50 pages.
3. **PDF size limit** — Currently 10 MB. Adjust if needed.
