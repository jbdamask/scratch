---
name: x-video-transcribe
description: Transcribe a video from any URL yt-dlp can resolve (X.com, YouTube, etc.) and return a clean, readable transcript. Use this whenever the user asks to "transcribe", "get the words from", or "give me the transcript of" a video link. Offloads the heavy work to a GitHub Actions runner in the current repo because Claude Code's sandbox blocks x.com — Actions on X.com works reliably.
---

# x-video-transcribe

Pipeline lives in this repo at canonical paths (don't move them — the
workflow trigger and skill both reference these paths):

- `EXPERIMENTS/x-video-transcribe/transcribe.py` — yt-dlp + ffmpeg + faster-whisper (CPU, int8). Writes `transcript.txt` (timestamped) and `transcript-clean.txt` (one paragraph).
- `.github/workflows/x-video-transcribe.yml` — runs the pipeline on `ubuntu-latest`, posts a GitHub issue titled `Transcript: <url>` with the clean transcript in the body and the timestamped version in a collapsed `<details>` block.
- `EXPERIMENTS/x-video-transcribe/url.txt` — pushing this file triggers the workflow. The first non-comment line is the URL.

## Pre-flight: discover the current repo

The procedure below polls GitHub for the result issue. Before starting,
determine the repo identifier so the polling targets the right place:

```bash
git remote get-url origin
```

Parse the output (e.g. `https://github.com/owner/repo.git` or
`git@github.com:owner/repo.git`) into `<OWNER>` and `<REPO>`. Use these
values wherever the procedure below says `<OWNER>` and `<REPO>` — do not
hardcode any specific repo.

## Procedure

When the user supplies a URL:

1. **Capture a baseline.** Record the highest current issue number via
   `mcp__github__list_issues` with `owner=<OWNER>`, `repo=<REPO>`,
   `state=OPEN`, `orderBy=CREATED_AT`, `direction=DESC`, `perPage=1`.
   If there are no issues yet, treat the baseline as `0`.

2. **Write the URL** to `EXPERIMENTS/x-video-transcribe/url.txt` (replace
   any existing URL line; keep the `#` comments). Commit and push to the
   current branch:
   ```
   git add EXPERIMENTS/x-video-transcribe/url.txt
   git commit -m "transcribe: <short description of the video>"
   git push -u origin HEAD
   ```

3. **Wait ~4 minutes** for the workflow. Use `Monitor` with
   `sleep 240 && echo checkpoint=run-done` (timeout `360000ms`). Don't
   poll faster — Actions runs typically take 3–4 minutes (apt install +
   pip install + faster-whisper base model download + transcription +
   issue post).

4. **Read the new issue.** Call `mcp__github__list_issues` again with
   the same `<OWNER>`/`<REPO>`; find the issue with `number > baseline`
   whose title starts `Transcript: `. Read its body (already in the
   list response, or via `mcp__github__issue_read`).

5. **Present the clean transcript** as markdown, broken into paragraphs.
   The issue body has the clean version followed by a `<details>` block
   with timestamps — surface only the clean version unless the user asks
   for timestamps.

   The clean version is one run-on paragraph. Insert paragraph breaks
   at natural boundaries to make it readable:

   - Speaker topic shifts ("So...", "And then...", "Now let's...").
   - Long pauses (visible as larger time gaps in the `<details>` block
     — use those as hints).
   - End of an extended thought or anecdote before the speaker pivots
     to the next.

   **Hard rules:**
   - Do **not** change, add, delete, paraphrase, summarize, or "correct"
     any words. The text between paragraph breaks must be byte-identical
     to a contiguous slice of `transcript-clean.txt`.
   - Do **not** introduce headings, bullets, bold, or other structure
     beyond paragraph breaks. Plain paragraphs only.
   - Don't merge words across breaks or drop trailing/leading spaces.
     A paragraph break is just `\n\n` between two existing space-
     separated word boundaries.

## Failure modes and what to do

- **YouTube video has no captions** (`TranscriptsDisabled` or
  `NoTranscriptFound`). The YouTube path uses YouTube's caption
  endpoint — it doesn't transcribe audio. If captions are off (creator
  disabled them, or it's a brand-new upload), tell the user the source
  has no captions and ask for an alternative (X.com mirror, direct mp4).
- **Non-YouTube `Run pipeline` fails with yt-dlp 403** on a private or
  geo-blocked source. Tell the user; consider a mirror.
- **Pipeline succeeds but `Post transcript as GitHub issue` fails.**
  Read the failed-run page via `WebFetch`. Most likely cause is the
  repo's "Workflow permissions" set to read-only — direct the user to
  *Settings → Actions → General → Workflow permissions* and enable
  "Read and write permissions". The transcript is still in the run's job
  summary and as an uploaded artifact.
- **Workflow doesn't trigger.** Verify the changed path is exactly
  `EXPERIMENTS/x-video-transcribe/url.txt`. The workflow's `on.push.paths`
  is narrow.
- **Multiple URLs in one session.** Repeat the procedure per URL — the
  workflow handles one URL per run.

## Notes

- Default model is `base` (~150 MB download on the runner; balanced
  quality/speed for short clips). For longer/higher-stakes clips, the
  user can pick `small` or `medium` via Actions UI → "Run workflow";
  the push-triggered path always uses `base`.
- `transcript-clean.txt` joins all segments with single spaces. The
  paragraph-break rules are spelled out in step 5 of the procedure
  above — follow them strictly. No word changes, ever.
- **YouTube path is different from everything else.** YouTube URLs use
  `youtube-transcript-api` to fetch YouTube's official captions (no
  audio download, no Whisper, no bot wall). All other URLs go through
  yt-dlp → ffmpeg → faster-whisper. The output format is identical, so
  the procedure above doesn't change.
- The pipeline runs locally too
  (`python EXPERIMENTS/x-video-transcribe/transcribe.py <url>`) when the
  environment can reach the source — but Claude Code's web sandbox
  blocks `x.com` and `youtube.com`, so prefer the Actions path there.
