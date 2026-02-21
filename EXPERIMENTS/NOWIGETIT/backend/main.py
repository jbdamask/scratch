import os
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

import boto3
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from generator import generate_html
from gist_publisher import create_gist

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SHAREIT_BUCKET = os.environ.get("SHAREIT_BUCKET", "share-it-amroja")
SHAREIT_URL = os.environ.get("SHAREIT_URL", "http://share-it-amroja.s3-website-us-east-1.amazonaws.com")

s3 = boto3.client("s3")

# In-memory job store: job_id -> { status, url, error }
jobs: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    jobs.clear()


app = FastAPI(lifespan=lifespan)


@app.post("/api/upload")
def upload_pdf(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = file.file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. 10 MB max.")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "processing"}
    public_key = f"nowigetit/{job_id}.pdf"

    try:
        # Upload PDF to public ShareIt bucket
        s3.put_object(
            Bucket=SHAREIT_BUCKET,
            Key=public_key,
            Body=contents,
            ContentType="application/pdf",
        )
        pdf_url = f"{SHAREIT_URL}/{public_key}"

        html = generate_html(pdf_url)
        gist_url = create_gist(html, file.filename)
        jobs[job_id] = {"status": "complete", "url": gist_url}
    except Exception as e:
        print(f"Error processing upload: {e}")
        jobs[job_id] = {"status": "error", "error": "Processing failed."}
    finally:
        # Clean up PDF from public bucket
        try:
            s3.delete_object(Bucket=SHAREIT_BUCKET, Key=public_key)
        except Exception as cleanup_err:
            print(f"Failed to clean up S3 object {public_key}: {cleanup_err}")

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
