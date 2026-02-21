import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from pdf_processor import extract_text
from generator import generate_html
from gist_publisher import create_gist

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# In-memory job store: job_id -> { status, url, error }
jobs: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    jobs.clear()


app = FastAPI(lifespan=lifespan)


@app.post("/api/upload")
async def upload_pdf(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. 10 MB max.")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "processing"}

    # Run synchronously for now — move to background task in Phase 4 (Lambda)
    try:
        text = extract_text(contents)
        html = generate_html(text)
        gist_url = create_gist(html, file.filename)
        jobs[job_id] = {"status": "complete", "url": gist_url}
    except Exception as e:
        jobs[job_id] = {"status": "error", "error": str(e)}

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
