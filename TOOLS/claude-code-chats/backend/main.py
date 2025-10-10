from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from pathlib import Path
from typing import List, Dict, Any

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
    return {"message": "Claude Code Chat History Viewer API"}

@app.get("/projects")
async def list_projects():
    """List all Claude Code project directories"""
    try:
        if not CLAUDE_PROJECTS_PATH.exists():
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
        return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_name}/files")
async def list_project_files(project_name: str):
    """List JSONL files in a specific project directory"""
    try:
        project_path = CLAUDE_PROJECTS_PATH / project_name
        if not project_path.exists():
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
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_name}/files/{file_name}")
async def read_chat_file(project_name: str, file_name: str):
    """Read and parse a JSONL chat file"""
    try:
        file_path = CLAUDE_PROJECTS_PATH / project_name / file_name
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        messages = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        message_data = json.loads(line)
                        messages.append(message_data)
                    except json.JSONDecodeError:
                        continue

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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)