"""Extract audio from a video (X, YouTube, etc.) and transcribe it with faster-whisper."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def download_video(url: str, out_path: Path) -> Path:
    """Download the video using yt-dlp. Returns the path to the downloaded file."""
    template = str(out_path.with_suffix("")) + ".%(ext)s"
    cmd = [
        "yt-dlp",
        "--no-check-certificates",
        "-f", "bestvideo*+bestaudio/best",
        "--merge-output-format", "mp4",
        "-o", template,
        url,
    ]
    print(f"$ {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, check=True)
    matches = list(out_path.parent.glob(out_path.stem + ".*"))
    if not matches:
        raise FileNotFoundError("yt-dlp produced no output file")
    return matches[0]


def extract_audio(video_path: Path, audio_path: Path) -> Path:
    """Strip audio to 16 kHz mono WAV — Whisper's preferred input."""
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vn", "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le",
        str(audio_path),
    ]
    print(f"$ {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, check=True)
    return audio_path


def transcribe(audio_path: Path, model_size: str = "base") -> tuple[str, str]:
    """Run faster-whisper locally. Returns (timestamped, clean) transcripts."""
    from faster_whisper import WhisperModel

    print(f"Loading faster-whisper model: {model_size}", flush=True)
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(audio_path), beam_size=5)
    print(f"Detected language={info.language} (p={info.language_probability:.2f})", flush=True)

    timestamped: list[str] = []
    plain: list[str] = []
    for seg in segments:
        text = seg.text.strip()
        line = f"[{seg.start:7.2f} -> {seg.end:7.2f}] {text}"
        print(line, flush=True)
        timestamped.append(line)
        plain.append(text)
    return "\n".join(timestamped), " ".join(plain)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Video URL (X.com, YouTube, etc.)")
    parser.add_argument("--out-dir", default=".", help="Output directory")
    parser.add_argument("--model", default="base",
                        help="Whisper model size: tiny|base|small|medium|large-v3")
    args = parser.parse_args()

    for tool in ("yt-dlp", "ffmpeg"):
        if shutil.which(tool) is None:
            print(f"ERROR: {tool} not on PATH", file=sys.stderr)
            return 2

    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    video_stub = out_dir / "video"
    audio_path = out_dir / "audio.wav"
    transcript_path = out_dir / "transcript.txt"
    clean_path = out_dir / "transcript-clean.txt"

    video = download_video(args.url, video_stub)
    extract_audio(video, audio_path)
    timestamped, clean = transcribe(audio_path, model_size=args.model)
    transcript_path.write_text(timestamped + "\n", encoding="utf-8")
    clean_path.write_text(clean + "\n", encoding="utf-8")
    print(f"\nTranscript written to {transcript_path}")
    print(f"Clean transcript written to {clean_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
