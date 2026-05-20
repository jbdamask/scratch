# x-audio-transcribe

Extract audio from an X (Twitter) video clip and transcribe it to text.

## Pipeline

1. `yt-dlp` downloads the best video+audio stream from the X.com status URL.
2. `ffmpeg` strips the audio to a 16 kHz mono WAV (Whisper's preferred input).
3. `faster-whisper` (CTranslate2-backed Whisper) transcribes it locally — no API key needed.

## Usage

```bash
pip install -r requirements.txt
# ffmpeg must be on PATH (apt-get install -y ffmpeg)
python transcribe.py "https://x.com/ycombinator/status/2056908727400423481/video/1"
```

Outputs `audio.wav` and `transcript.txt` in the working directory.

## Network requirement

The remote execution environment must allow egress to `x.com` / `twimg.com`.
In this sandbox those hosts are blocked (HTTP 403), so the download step
fails — see `run.log`.
