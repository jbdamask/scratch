# x-video-transcribe

Get a clean text transcript from any video URL by typing one sentence at
Claude Code.

> transcribe this video: `https://x.com/ycombinator/status/2056908727400423481/video/1`

→ Claude pushes the URL, waits for GitHub Actions to do the heavy
work, and pastes the transcript back inline. ~4 minutes per clip.

## What this is

Three pieces that work together — none of them is useful alone:

| Piece | Path | Role |
| --- | --- | --- |
| **Skill** | [`.claude/skills/x-video-transcribe/SKILL.md`](https://github.com/jbdamask/scratch/blob/main/.claude/skills/x-video-transcribe/SKILL.md) | Tells Claude Code what to do when you ask for a transcript — write the URL to a tracked file, push, watch, read the result back. |
| **Pipeline** | [`EXPERIMENTS/x-video-transcribe/transcribe.py`](https://github.com/jbdamask/scratch/blob/main/EXPERIMENTS/x-video-transcribe/transcribe.py) + `requirements.txt` | The actual yt-dlp → ffmpeg → faster-whisper code. Runs on a GitHub Actions runner. |
| **Workflow** | [`.github/workflows/x-video-transcribe.yml`](https://github.com/jbdamask/scratch/blob/main/.github/workflows/x-video-transcribe.yml) | Triggers on a push to `url.txt`, runs the pipeline, opens a GitHub issue titled `Transcript: <url>` with the transcript as the body. |

The trigger file is [`url.txt`](https://github.com/jbdamask/scratch/blob/main/EXPERIMENTS/x-video-transcribe/url.txt) in this directory. Editing and pushing it kicks the workflow off.

## How to use it in this repo

The skill is already installed. In a Claude Code session whose cwd is
this repo, just say:

> transcribe this video: `<url>`

or invoke explicitly:

> `/x-video-transcribe <url>`

You can also fire it from the GitHub mobile app: **Actions →
x-video-transcribe → Run workflow → paste URL**. The transcript appears
as a new issue.

## How to use it in your own repo

Copy four things over, then change one identifier:

1. `.claude/skills/x-video-transcribe/` — the skill
2. `EXPERIMENTS/x-video-transcribe/` — the pipeline code (rename the
   parent directory if you like, just be consistent)
3. `.github/workflows/x-video-transcribe.yml` — the workflow
4. This `.gitignore` rule so the skill ships with the repo:
   ```gitignore
   .claude/*
   !.claude/skills/
   !.claude/skills/**
   ```

Then edit two things:

- **In `SKILL.md`**, replace `jbdamask/scratch` with `<your-owner>/<your-repo>` (the skill uses those when polling for the result issue).
- **If you renamed the experiment dir**, update the path in three places: `SKILL.md`, the workflow's `on.push.paths`, and the script paths inside the workflow steps.

Finally, in your repo: **Settings → Actions → General → Workflow
permissions** → enable "Read and write permissions" (or at minimum
ensure `issues: write` is granted to `GITHUB_TOKEN`). The workflow needs
this to post the result issue.

## Run the pipeline directly (no GitHub)

If your local environment can reach the video host (the Claude Code web
sandbox can't reach `x.com` or `youtube.com`, which is why we route
through Actions):

```bash
pip install -r requirements.txt
apt-get install -y ffmpeg          # or brew install ffmpeg, etc.
python transcribe.py "<video-url>"
```

Outputs `audio.wav`, `transcript.txt` (timestamped), and
`transcript-clean.txt` (single-paragraph) in the working directory.

## Why route through Actions at all?

Two reasons:

1. **Sandbox egress.** Claude Code on the web blocks outbound traffic to
   most hosts including `x.com` — the download step 403s locally. The
   GitHub Actions runner has open egress.
2. **Mobile-friendly delivery.** The workflow opens a GitHub issue with
   the transcript as the body. You can read it on the GitHub mobile app
   without needing to download an artifact or open the Actions log.

GitHub-hosted runner IPs are on YouTube's bot-detection list, so
YouTube URLs hit a "Sign in to confirm you're not a bot" wall on the
runner. X.com works reliably. For YouTube clips, supply an alternative
source (X mirror, direct mp4) or pass yt-dlp cookies via the workflow.
