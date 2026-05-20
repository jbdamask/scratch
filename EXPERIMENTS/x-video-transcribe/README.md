# x-video-transcribe

Get a clean text transcript from any video URL by typing one sentence at
Claude Code.

> transcribe this video: `https://x.com/some-clip`

→ Claude pushes the URL to a tracked file, GitHub Actions does the heavy
work (download → audio extract → faster-whisper), and the transcript
lands as a new GitHub issue that Claude reads back inline. ~4 minutes
per clip. No API keys, no local Python install needed.

## Install in a dedicated repo (one command)

**Create a fresh, dedicated GitHub repo for this** — don't install it
into a working project. Two reasons:

- The workflow opens a new GitHub issue per transcript. In a real
  project repo those would clutter (or get lost in) your real issue
  tracker. A dedicated repo keeps your transcripts in their own clean
  issue list.
- The workflow triggers on every push that touches `url.txt`. Sharing a
  repo with active development means extra CI noise and possible race
  conditions with your other workflows.

Recommended setup:

1. On GitHub: create a new empty repo, e.g. `<you>/transcripts`. Don't
   add a README or license — leave it empty.
2. Clone it and `cd` in:
   ```bash
   git clone https://github.com/<you>/transcripts.git
   cd transcripts
   ```
3. Run the installer:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/jbdamask/scratch/main/EXPERIMENTS/x-video-transcribe/install.sh | bash
   ```

That copies three things into the repo:

| File | Purpose |
| --- | --- |
| `.claude/skills/x-video-transcribe/SKILL.md` | The procedure Claude follows when you ask for a transcript. Generic — discovers your repo at runtime, no hardcoded names. |
| `.github/workflows/x-video-transcribe.yml` | The Actions workflow. Uses `${{ github.repository }}`; portable. |
| `EXPERIMENTS/x-video-transcribe/` | The pipeline code (`transcribe.py`, `requirements.txt`, the `url.txt` trigger file, this README). |

The installer also patches `.gitignore` so `.claude/skills/` ships with
your repo even though `.claude/` is usually ignored.

After it runs:

1. **Settings → Actions → General → Workflow permissions** → enable
   *Read and write permissions*. The workflow needs this to post the
   result issue.
2. Commit and push the four staged paths the installer prints.
3. Open a Claude Code session in your repo and say
   `transcribe this video: <url>`.

(Don't trust curl-to-bash? Read the script first:
[install.sh](https://github.com/jbdamask/scratch/blob/main/EXPERIMENTS/x-video-transcribe/install.sh)
— ~50 lines, just `curl` + `mkdir`.)

## How the pieces fit together

```
You: "transcribe this video: <url>"
  └─ Claude Code reads .claude/skills/x-video-transcribe/SKILL.md
       └─ writes <url> to EXPERIMENTS/x-video-transcribe/url.txt
       └─ git push
            └─ GitHub Actions sees the url.txt change
                 └─ runs .github/workflows/x-video-transcribe.yml
                      └─ runs EXPERIMENTS/x-video-transcribe/transcribe.py
                           ├─ YouTube? fetch official captions
                           │            via youtube-transcript-api
                           └─ anything else?
                                ├─ yt-dlp downloads the video
                                ├─ ffmpeg strips audio (16 kHz mono WAV)
                                └─ faster-whisper transcribes (CPU, int8)
                      └─ opens a GitHub issue "Transcript: <url>"
  └─ Claude polls for the new issue, reads it, pastes the transcript back
```

The skill is portable — it asks `git remote get-url origin` at runtime
to figure out which repo to poll. The workflow is portable — it uses
`${{ github.repository }}`. So the same files work in any fork.

## Use it (after install)

In Claude Code, rooted in your repo:

> transcribe this video: `<url>`

or:

> `/x-video-transcribe <url>`

From the GitHub mobile app:

> Actions → **x-video-transcribe** → Run workflow → paste URL

Transcript appears as a new issue titled `Transcript: <url>`.

## Run the pipeline directly (no GitHub)

If your local environment can reach the video host:

```bash
pip install -r requirements.txt
apt-get install -y ffmpeg          # or brew install ffmpeg
python transcribe.py "<video-url>"
```

Outputs `transcript.txt` (timestamped) and `transcript-clean.txt`
(single paragraph).

## Why Actions instead of running it locally?

Two reasons:

1. **Sandbox egress.** Claude Code on the web blocks outbound traffic to
   `x.com` and most external hosts — the download step 403s locally.
   The GitHub Actions runner has open egress.
2. **Mobile-friendly delivery.** The result lands as a GitHub issue you
   can read on the GitHub mobile app — no artifact download, no
   Actions-log spelunking.

**YouTube uses a different path.** GitHub-hosted runner IPs are on
YouTube's bot-detection list, so audio download via yt-dlp hits a
"Sign in to confirm you're not a bot" wall. For YouTube URLs the
pipeline instead fetches YouTube's official auto-captions via
`youtube-transcript-api` (no audio download, no Whisper needed, no bot
wall). The output format is the same as the Whisper path. Caveat: if
the creator disabled captions on a video, this fails — there's no
fallback.

## Uninstall

```bash
rm -rf .claude/skills/x-video-transcribe \
       .github/workflows/x-video-transcribe.yml \
       EXPERIMENTS/x-video-transcribe
```

Optionally revert the `.gitignore` change.
