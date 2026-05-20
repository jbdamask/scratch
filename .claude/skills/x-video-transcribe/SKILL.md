---
name: x-video-transcribe
description: Transcribe a video from any URL yt-dlp can resolve (X.com, YouTube, etc.) and return a clean, readable transcript. Use this whenever the user asks to "transcribe", "get the words from", or "give me the transcript of" a video link. Offloads the heavy work to a GitHub Actions runner in `jbdamask/scratch` because the sandbox blocks x.com and YouTube's bot wall blocks the runner only partially — Actions on X.com works reliably.
---

# x-video-transcribe

Pipeline lives in this repo:
- `EXPERIMENTS/x-video-transcribe/transcribe.py` — yt-dlp + ffmpeg + faster-whisper (CPU, int8). Writes both `transcript.txt` (timestamped) and `transcript-clean.txt` (one paragraph).
- `.github/workflows/x-video-transcribe.yml` — runs the pipeline on `ubuntu-latest`, posts a GitHub issue titled `Transcript: <url>` with the clean transcript in the body and the timestamped version in a collapsed `<details>` block.
- `EXPERIMENTS/x-video-transcribe/url.txt` — pushing this file triggers the workflow. The first non-comment line is the URL.

## Procedure

When the user supplies a URL, do this:

1. **Capture a baseline ref** so step 4 can detect the new issue:
   ```bash
   git log -1 --format=%H
   ```
   and record the current highest issue number via `mcp__github__list_issues` (owner `jbdamask`, repo `scratch`, state `OPEN`, orderBy `CREATED_AT`, direction `DESC`, perPage 1).

2. **Write the URL** to `EXPERIMENTS/x-video-transcribe/url.txt` (replace any existing URL line; keep the `#` comments). Then commit and push to the current branch:
   ```
   git add EXPERIMENTS/x-video-transcribe/url.txt
   git commit -m "transcribe: <short description of the video>"
   git push -u origin HEAD
   ```

3. **Wait ~4 minutes** for the workflow. Use `Monitor` with `sleep 240 && echo checkpoint=run-done` (timeout 360000ms). Do not poll faster — Actions runs typically take 3–4 minutes (apt install + pip install + faster-whisper base model download + transcription + issue post).

4. **Read the new issue.** Call `mcp__github__list_issues` again; find the issue with number > the baseline whose title starts `Transcript: `. Then `mcp__github__issue_read` (or read it from the list response if the body is included) to get the transcript.

5. **Present the clean transcript** to the user as markdown. The issue body already contains the clean version followed by a `<details>` block — surface the clean version, drop the details block unless the user asks for timestamps.

## Failure modes and what to do

- **`Run pipeline` step fails with yt-dlp error for YouTube** ("Sign in to confirm you're not a bot"). The runner IP is on YouTube's blocklist. Ask the user for an alternative source (X.com mirror, direct mp4, Vimeo). Do **not** silently fall back — tell them why.
- **`Run pipeline` succeeds, `Post transcript as GitHub issue` fails.** Read the failed-run page via `WebFetch` to confirm; common cause is repo-level `issues: write` being denied. Fall back to writing the transcript to the job summary only and report the run URL to the user.
- **Workflow doesn't trigger after push.** Verify the changed path matches `EXPERIMENTS/x-video-transcribe/url.txt` exactly — the workflow's `on.push.paths` is narrow. If pushed to a non-default branch, that's still fine (no branch filter), but the path must match.
- **Multiple URLs requested in one session.** Repeat the procedure once per URL. Don't batch — the workflow handles one URL per run, and the issue title encodes provenance.

## Notes

- Default model is `base` (~150 MB download on the runner, balanced quality/speed for short clips). For longer or higher-stakes clips, the user can pass `model: small` via the Actions UI; the push-triggered path always uses `base`.
- `transcript-clean.txt` joins all segments with single spaces — no paragraph breaks. When presenting to the user, you may insert paragraph breaks at natural pauses to improve readability, but **do not paraphrase or correct** the words.
- The pipeline runs locally too (`python EXPERIMENTS/x-video-transcribe/transcribe.py <url>`) when the sandbox can reach the source — but in this remote environment x.com and youtube.com are blocked, so always prefer the Actions path.
