#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import sys
import glob
from pathlib import Path
from typing import List, Dict, Any
import json

# Add parent directory to path to import the downloader
sys.path.append(str(Path(__file__).parent.parent))
from instagram_downloader import InstagramDownloader

app = FastAPI(title="Instagram Downloader API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Vite ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup downloads path
downloads_path = Path(__file__).parent.parent / "downloads"
downloads_path.mkdir(exist_ok=True)  # Ensure directory exists

class DownloadRequest(BaseModel):
    url: str
    extract_frames: bool = True

class FolderInfo(BaseModel):
    name: str
    path: str
    date: str
    timestamp: str
    video_filename: str = None

class ImageInfo(BaseModel):
    filename: str
    path: str
    url: str

@app.get("/")
async def root():
    return {"message": "Instagram Downloader API"}

@app.post("/download")
async def download_instagram(request: DownloadRequest):
    """Download Instagram video and extract frames"""
    try:
        # Validate Instagram URL
        if 'instagram.com' not in request.url:
            raise HTTPException(status_code=400, detail="Invalid Instagram URL")

        # Create downloader instance with absolute path
        downloader = InstagramDownloader(
            base_output_dir=str(downloads_path),
            extract_frames=request.extract_frames
        )

        # Download the video
        success = downloader.download_video(request.url)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to download video")

        # Ensure the directories were actually created
        if not downloader.timestamp_dir.exists():
            raise HTTPException(status_code=500, detail="Download failed - output directory not created")

        # Get the folder info - resolve paths to absolute before computing relative
        absolute_timestamp_dir = downloader.timestamp_dir.resolve()
        absolute_downloads_path = downloads_path.resolve()

        folder_info = {
            "date": downloader.date_dir.name,
            "timestamp": downloader.timestamp_dir.name,
            "path": str(absolute_timestamp_dir.relative_to(absolute_downloads_path))
        }

        # Get images if frames were extracted
        images = []
        if request.extract_frames and downloader.frames_dir.exists():
            for video_folder in downloader.frames_dir.iterdir():
                if video_folder.is_dir():
                    for img_path in sorted(video_folder.glob("*.jpg")):
                        # Ensure the path exists and is accessible
                        if img_path.exists():
                            absolute_img_path = img_path.resolve()
                            relative_path = str(absolute_img_path.relative_to(absolute_downloads_path))
                            images.append({
                                "filename": img_path.name,
                                "path": relative_path,
                                "url": f"/static/{relative_path}"
                            })
                        else:
                            print(f"Warning: Image file not found: {img_path}")

        return {
            "success": True,
            "folder": folder_info,
            "images": images,
            "message": f"Successfully downloaded and extracted {len(images)} frames"
        }

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in download_instagram: {error_details}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@app.get("/folders")
async def get_folders():
    """Get all download folders organized by date"""
    try:
        folders = []

        if not downloads_path.exists():
            return {"folders": []}

        absolute_downloads_path = downloads_path.resolve()
        for date_dir in sorted(downloads_path.iterdir(), reverse=True):
            if date_dir.is_dir() and not date_dir.name.startswith('.'):
                for timestamp_dir in sorted(date_dir.iterdir(), reverse=True):
                    if timestamp_dir.is_dir():
                        absolute_timestamp_dir = timestamp_dir.resolve()
                        folder_path = str(absolute_timestamp_dir.relative_to(absolute_downloads_path))

                        # Find the video file in this directory
                        video_filename = None
                        for file_path in timestamp_dir.glob("*.mp4"):
                            if file_path.is_file():
                                video_filename = file_path.name
                                break

                        folders.append({
                            "name": f"{date_dir.name} - {timestamp_dir.name}",
                            "path": folder_path,
                            "date": date_dir.name,
                            "timestamp": timestamp_dir.name,
                            "video_filename": video_filename
                        })

        return {"folders": folders}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/folders/{date}/{timestamp}/images")
async def get_folder_images(date: str, timestamp: str):
    """Get all images from a specific folder"""
    try:
        folder_path = downloads_path / date / timestamp / "frames"
        images = []

        if folder_path.exists():
            absolute_downloads_path = downloads_path.resolve()
            for video_folder in folder_path.iterdir():
                if video_folder.is_dir():
                    for img_path in sorted(video_folder.glob("*.jpg")):
                        absolute_img_path = img_path.resolve()
                        relative_path = str(absolute_img_path.relative_to(absolute_downloads_path))
                        images.append({
                            "filename": img_path.name,
                            "path": relative_path,
                            "url": f"/static/{relative_path}"
                        })

        return {"images": images}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/static/{file_path:path}")
async def serve_static_file(file_path: str):
    """Serve static files from downloads directory"""
    try:
        # Construct the full file path
        full_path = downloads_path / file_path

        # Security check: ensure the path is within downloads directory
        if not str(full_path.resolve()).startswith(str(downloads_path.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if file exists
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(
            path=str(full_path),
            media_type="image/jpeg"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")

@app.delete("/folders/{date}/{timestamp}")
async def delete_folder(date: str, timestamp: str):
    """Delete a download folder and all its contents"""
    try:
        import shutil

        folder_path = downloads_path / date / timestamp

        # Security check: ensure the path is within downloads directory
        if not str(folder_path.resolve()).startswith(str(downloads_path.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if folder exists
        if not folder_path.exists():
            raise HTTPException(status_code=404, detail="Folder not found")

        # Delete the entire folder
        shutil.rmtree(folder_path)

        # Check if parent date directory is now empty and delete it too
        date_dir = downloads_path / date
        if date_dir.exists() and not any(date_dir.iterdir()):
            date_dir.rmdir()

        return {"success": True, "message": f"Deleted folder {date}/{timestamp}"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting folder: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)