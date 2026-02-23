import os
import threading
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

import boto3
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from generator import generate_html
from s3_publisher import publish_html

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SHAREIT_BUCKET = os.environ.get("SHAREIT_BUCKET", "share-it-amroja")
SHAREIT_URL = os.environ.get("SHAREIT_URL", "http://share-it-amroja.s3-website-us-east-1.amazonaws.com")

s3 = boto3.client("s3")

# In-memory job store: job_id -> { status, progress_stage, url, error }
jobs: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    jobs.clear()


app = FastAPI(lifespan=lifespan)


def _process_job(job_id: str, contents: bytes, filename: str):
    """Run PDF processing in a background thread."""
    public_key = f"nowigetit/{job_id}.pdf"
    try:
        # Upload PDF to public ShareIt bucket
        jobs[job_id]["progress_stage"] = "uploading"
        s3.put_object(
            Bucket=SHAREIT_BUCKET,
            Key=public_key,
            Body=contents,
            ContentType="application/pdf",
        )
        pdf_url = f"{SHAREIT_URL}/{public_key}"

        # Send PDF URL to Claude
        jobs[job_id]["progress_stage"] = "reading"
        jobs[job_id]["progress_stage"] = "generating"
        html, usage = generate_html(pdf_url)

        # Publish HTML to S3
        jobs[job_id]["progress_stage"] = "publishing"
        url = publish_html(html, job_id)

        jobs[job_id] = {"status": "complete", "progress_stage": "complete", "url": url}
    except Exception as e:
        print(f"Error processing upload: {e}")
        jobs[job_id] = {"status": "error", "progress_stage": "error", "error": "Processing failed."}
    finally:
        # Clean up PDF from public bucket
        try:
            s3.delete_object(Bucket=SHAREIT_BUCKET, Key=public_key)
        except Exception as cleanup_err:
            print(f"Failed to clean up S3 object {public_key}: {cleanup_err}")


@app.post("/api/upload")
def upload_pdf(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = file.file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. 10 MB max.")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "processing", "progress_stage": "uploading"}

    thread = threading.Thread(target=_process_job, args=(job_id, contents, file.filename), daemon=True)
    thread.start()

    return {"job_id": job_id}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


# Serve static frontend
static_dir = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def index():
    return FileResponse(static_dir / "index.html")
