from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLAUDE_PROJECTS_PATH = Path.home() / ".claude" / "projects"

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Claude Code Chat History Viewer API"}

@app.get("/projects")
async def list_projects():
    """List all Claude Code project directories"""
    logger.info("Listing projects from path: %s", CLAUDE_PROJECTS_PATH)
    try:
        if not CLAUDE_PROJECTS_PATH.exists():
            logger.warning("Claude projects path does not exist: %s", CLAUDE_PROJECTS_PATH)
            return {"projects": []}

        projects = []
        for item in CLAUDE_PROJECTS_PATH.iterdir():
            if item.is_dir():
                projects.append({
                    "name": item.name,
                    "path": str(item),
                    "created": item.stat().st_ctime
                })

        projects.sort(key=lambda x: x["created"], reverse=True)
        logger.info("Found %d projects", len(projects))
        return {"projects": projects}
    except Exception as e:
        logger.error("Error listing projects: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_name}/files")
async def list_project_files(project_name: str):
    """List JSONL files in a specific project directory"""
    logger.info("Listing files for project: %s", project_name)
    try:
        project_path = CLAUDE_PROJECTS_PATH / project_name
        if not project_path.exists():
            logger.error("Project not found: %s", project_name)
            raise HTTPException(status_code=404, detail="Project not found")

        files = []
        for item in project_path.iterdir():
            if item.is_file() and item.suffix == ".jsonl":
                files.append({
                    "name": item.name,
                    "path": str(item),
                    "size": item.stat().st_size,
                    "modified": item.stat().st_mtime
                })

        files.sort(key=lambda x: x["modified"], reverse=True)
        logger.info("Found %d JSONL files in project %s", len(files), project_name)
        return {"files": files}
    except Exception as e:
        logger.error("Error listing files for project %s: %s", project_name, str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_name}/files/{file_name}")
async def read_chat_file(project_name: str, file_name: str):
    """Read and parse a JSONL chat file"""
    logger.info("Reading chat file: %s from project: %s", file_name, project_name)
    try:
        file_path = CLAUDE_PROJECTS_PATH / project_name / file_name
        if not file_path.exists():
            logger.error("File not found: %s in project %s", file_name, project_name)
            raise HTTPException(status_code=404, detail="File not found")

        messages = []
        json_decode_errors = 0
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if line:
                    try:
                        message_data = json.loads(line)
                        messages.append(message_data)
                    except json.JSONDecodeError as e:
                        json_decode_errors += 1
                        logger.warning("JSON decode error on line %d in file %s: %s", line_num, file_name, str(e))
                        continue

        if json_decode_errors > 0:
            logger.warning("Encountered %d JSON decode errors in file %s", json_decode_errors, file_name)

        logger.info("Successfully parsed %d messages from file %s", len(messages), file_name)
        return {
            "messages": messages,
            "count": len(messages),
            "file_info": {
                "name": file_name,
                "size": file_path.stat().st_size,
                "modified": file_path.stat().st_mtime
            }
        }
    except Exception as e:
        logger.error("Error reading chat file %s from project %s: %s", file_name, project_name, str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Claude Code Chat History Viewer API server on host 0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)