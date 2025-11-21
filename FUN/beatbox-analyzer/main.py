import os
import io
import base64
import uuid
from pathlib import Path
from typing import Optional, List, Dict

import librosa
import librosa.display
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import litellm

app = FastAPI(title="Audio Spectrogram Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}


def generate_spectrogram(audio_path: str) -> str:
    """
    Generate a high-resolution spectrogram from an audio file and return as base64 encoded PNG.
    """
    y, sr = librosa.load(audio_path, sr=None)

    D = librosa.stft(y, n_fft=4096, hop_length=256)
    S_db = librosa.amplitude_to_db(np.abs(D), ref=np.max)

    duration = len(y) / sr
    width_per_second = 200
    fig_width = max(20, duration * width_per_second / 100)
    fig_height = 12

    fig = plt.figure(figsize=(fig_width, fig_height))
    ax = fig.add_axes([0, 0, 1, 1])

    img = ax.imshow(S_db, aspect='auto', origin='lower', cmap='magma',
                    extent=[0, duration, 0, sr / 2], interpolation='bilinear')

    ax.set_xlim([0, duration])
    ax.set_ylim([0, sr / 2])
    ax.axis('off')

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', pad_inches=0)
    buf.seek(0)
    plt.close(fig)

    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    return img_base64


@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload an audio file and generate its spectrogram.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        spectrogram_base64 = generate_spectrogram(str(file_path))

        duration = librosa.get_duration(path=str(file_path))
        y, sr = librosa.load(str(file_path), sr=None)

        return JSONResponse({
            "success": True,
            "filename": file.filename,
            "audio_url": f"/audio/{unique_filename}",
            "spectrogram": f"data:image/png;base64,{spectrogram_base64}",
            "duration": round(duration, 2),
            "sample_rate": sr,
            "samples": len(y)
        })

    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")


@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """
    Serve an audio file.
    """
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path)


class ChatMessage(BaseModel):
    role: str
    content: str
    image: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat with LLM about spectrogram analysis with streaming.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    try:
        from fastapi.responses import StreamingResponse

        messages = []
        for msg in request.messages:
            if msg.image:
                print(f"Processing message with image. Image data length: {len(msg.image)}")
                # LiteLLM uses OpenAI format for images
                image_url = msg.image if msg.image.startswith("data:") else f"data:image/png;base64,{msg.image}"
                print(f"Image URL length: {len(image_url)}")
                messages.append({
                    "role": msg.role,
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        },
                        {
                            "type": "text",
                            "text": msg.content
                        }
                    ]
                })
            else:
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

        print(f"Sending {len(messages)} messages to LLM")

        async def generate():
            response = litellm.completion(
                model="gpt-5.1",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at audio analysis using spectrograms. Your particular discipline is analyzing spectrograms of beatboxers. Provide a concise analysis using beatboxer jargon and technical terms. Your analysis should consider the content of the spectral image, only."
                    }
                ] + messages,
                stream=True,
                max_tokens=1024
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        print(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.get("/")
async def root():
    """
    Serve the main HTML page.
    """
    return FileResponse("static/index.html")


app.mount("/static", StaticFiles(directory="static"), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
