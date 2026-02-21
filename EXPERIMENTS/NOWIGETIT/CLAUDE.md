# CLAUDE.md

## Project Overview
NowIGetIt — upload a scientific PDF, get back a shareable interactive web page that explains it to a layperson. Backend uses Claude Opus 4.6 via the Anthropic SDK to generate HTML, which is published as a public GitHub Gist on jbdamask's account.

## Architecture

### Local Development
- **Backend:** Python FastAPI in `backend/`. Serves the static frontend and exposes upload/status APIs.
- **Frontend:** Single `backend/static/index.html` file. Vanilla HTML/CSS/JS. No build step.
- **Job storage:** In-memory dict (local), DynamoDB (AWS).

### AWS Deployment
- **Frontend:** S3 static website hosting (`index.html` + `config.js`)
- **API:** HTTP API Gateway → Lambda functions
- **Processing flow:** Upload Lambda (stores PDF in S3, writes DynamoDB, invokes Process Lambda async) → Process Lambda (extracts text, calls Claude, creates gist, updates DynamoDB) → Status Lambda (reads DynamoDB)
- **Infrastructure:** Single CloudFormation template in `aws/nowigetit.yaml`

## Development
- Python work happens in `backend/.venv`. Check if it exists before creating.
- Run locally: `./start.sh` or `cd backend && source .venv/bin/activate && uvicorn main:app --reload`
- Deploy to AWS: `./deploy.sh`
- Required env vars in `.env` at project root: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`

## Key Decisions
- Gists are always **public**, always on the `jbdamask` account.
- Frontend is intentionally minimal — no React, no build tools.
- Processing can take 30-60s. Frontend polls `GET /api/status/{job_id}`.
- Async Lambda pattern avoids API Gateway 29s timeout limit.
- `config.js` sets `window.API_BASE` for S3-hosted frontend; absent for local dev (uses relative URLs).
