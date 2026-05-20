# x-audio-transcribe

Extract audio from a video URL (X.com, YouTube, anything yt-dlp can resolve)
and transcribe it to text.

## Pipeline

1. `yt-dlp` downloads the best video+audio stream.
2. `ffmpeg` strips audio to 16 kHz mono WAV (Whisper's preferred input).
3. `faster-whisper` (CTranslate2-backed Whisper, CPU + int8) transcribes
   locally — no API key needed. Outputs both:
   - `transcript.txt` — timestamped segments
   - `transcript-clean.txt` — single-paragraph plain text

## Running it from Claude (the easy way)

This repo ships a Claude Code skill at
`.claude/skills/x-video-transcribe/SKILL.md`. Claude picks up
project-level skills automatically when the current working directory is
this repo.

In a Claude Code session rooted in this repo, just say:

> transcribe this video: `<url>`

or invoke it explicitly:

> `/x-video-transcribe <url>`

Claude will write the URL to `EXPERIMENTS/x-audio-transcribe/url.txt`,
push, wait for the GitHub Actions run to finish, read the resulting
`Transcript: <url>` issue, and present the clean transcript inline.

### Installing the skill globally (optional)

If you want the skill available outside this repo, copy it into your
user-level skills directory:

```bash
mkdir -p ~/.claude/skills
cp -r .claude/skills/x-video-transcribe ~/.claude/skills/
```

Restart your Claude Code session so it re-scans skills. The skill's
procedure still targets `jbdamask/scratch` — clone or fork that repo to
keep the Actions workflow + issue posting available.

## Running it from the GitHub mobile app

Actions → **x-video-transcribe** → Run workflow → paste a URL. The
transcript shows up as a new issue titled `Transcript: <url>`.

## Running it locally (sandbox/network permitting)

```bash
pip install -r requirements.txt
# ffmpeg must be on PATH (e.g. apt-get install -y ffmpeg)
python transcribe.py "<video-url>"
```

Outputs `audio.wav`, `transcript.txt`, and `transcript-clean.txt` in the
working directory.

## Network notes

- The remote execution environment used by Claude Code on the web blocks
  `x.com` and `youtube.com`, so local runs from inside that sandbox will
  fail at the download step. Use the Actions path instead.
- GitHub-hosted Actions runners reach `x.com` fine but get the "Sign in
  to confirm you're not a bot" wall for YouTube. For YouTube content,
  provide an alternative source (X.com mirror, direct mp4, Vimeo) or pass
  cookies via yt-dlp arguments.
