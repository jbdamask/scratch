# CLAUDE.md

## Project Overview
NowIGetIt — upload a scientific PDF, get back a shareable interactive web page that explains it to a layperson. Backend uses Claude Opus 4.6 via the Anthropic SDK to generate HTML, which is published to the ShareIt S3 bucket and served via S3 website hosting.

## Architecture

### Local Development
- **Backend:** Python FastAPI in `backend/`. Serves the static frontend and exposes upload/status APIs.
- **Frontend:** Single `backend/static/index.html` file. Vanilla HTML/CSS/JS. No build step.
- **Job storage:** In-memory dict (local), DynamoDB (AWS).
- **PDF flow:** Upload → ShareIt S3 bucket → URL sent to Claude → cleanup after processing.
- **HTML publishing:** Generated HTML uploaded to `share-it-amroja/NOWIGETIT/{job_id}.html`, served via S3 website hosting.

### AWS Deployment
- **Domain:** `https://nowigetit.us` (www redirects to apex)
- **CDN:** CloudFront distribution fronting the S3 frontend bucket, with ACM TLS cert
- **DNS:** Route 53 hosted zone with A/AAAA alias records to CloudFront
- **Frontend:** S3 static website hosting (`index.html` + `config.js`) behind CloudFront
- **API:** HTTP API Gateway → Lambda functions
- **Processing flow:** Upload Lambda (stores PDF in ShareIt S3 bucket, writes DynamoDB, invokes Process Lambda async) → Process Lambda (sends PDF URL to Claude, publishes HTML to S3, updates DynamoDB, deletes PDF) → Status Lambda (reads DynamoDB)
- **S3 buckets:** Frontend bucket (created by CloudFormation) + ShareIt bucket (`share-it-amroja`, existing public bucket for PDF hosting and generated HTML pages)
- **Infrastructure:** Single CloudFormation template in `aws/nowigetit.yaml`

## AWS Profile
- Use `AdministratorAccess-277707111475` for deployments: `AWS_PROFILE=AdministratorAccess-277707111475`

## Development
- Python work happens in `backend/.venv`. Check if it exists before creating.
- Run locally: `./start.sh` or `cd backend && source .venv/bin/activate && uvicorn main:app --reload`
- Deploy to AWS: `./deploy.sh`
- Required env vars in `.env` at project root: `ANTHROPIC_API_KEY`

## Key Decisions
- PDFs are sent to Claude via URL (not base64). Uploaded to public ShareIt bucket, Claude fetches directly, PDF deleted after processing.
- Generated HTML is published to `share-it-amroja/NOWIGETIT/{job_id}.html` and served via S3 website hosting.
- Frontend is intentionally minimal — no React, no build tools.
- Processing can take 30-60s. Frontend polls `GET /api/status/{job_id}`.
- Async Lambda pattern avoids API Gateway 29s timeout limit.
- `config.js` sets `window.API_BASE` for S3-hosted frontend; absent for local dev (uses relative URLs).
