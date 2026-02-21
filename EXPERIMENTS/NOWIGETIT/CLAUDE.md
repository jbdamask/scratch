# CLAUDE.md

## Project Overview
NowIGetIt — upload a scientific PDF, get back a shareable interactive web page that explains it to a layperson. Backend uses Claude Opus 4.6 via the Anthropic SDK to generate HTML, which is published as a public GitHub Gist.

## Architecture
- **Backend:** Python FastAPI in `backend/`. Serves the static frontend and exposes an upload API.
- **Frontend:** Single `backend/static/index.html` file. Vanilla HTML/CSS/JS. No build step.
- **No database.** Stateless — each upload is independent.

## Development
- Python work happens in `backend/.venv`. Check if it exists before creating.
- Run with: `cd backend && source .venv/bin/activate && uvicorn main:app --reload`
- Required env vars in `.env` at project root: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`

## Key Decisions
- Gists are always **public**, always on the `jbdamask` account.
- Frontend is intentionally minimal — no React, no build tools.
- Processing can take 30-60s. Frontend polls `GET /api/status/{job_id}` for progress.
