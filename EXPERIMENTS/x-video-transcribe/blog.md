# Transcribing X.com videos from a sandboxed Claude Code session

I wanted text from an X.com clip. Asked Claude Code to write a quick
transcriber: yt-dlp to pull the video, ffmpeg to strip the audio,
faster-whisper to turn it into text. Maybe 40 lines of Python. It ran,
and yt-dlp came back with a 403.

Claude Code on the web runs in a sandbox with restricted egress. x.com
isn't on the allowlist. Same story from the mobile app — same sandbox.
The script was fine; the network it was running on couldn't reach the
source.

I told Claude to be creative.

What it came up with: don't run the pipeline in the sandbox at all.
Run it on a GitHub Actions runner, which has open egress.

Shape of it:

1. A skill writes the URL to a tracked file (`url.txt`) and commits it.
2. A workflow watches that path. Push the file, runner picks it up.
3. The runner does the work — yt-dlp, ffmpeg, faster-whisper — then
   opens a GitHub issue with the transcript in the body.
4. Back in the session, Claude polls for the issue and reads the
   transcript back inline.

What I like about it:

- No API keys, no paid services. Runner time is free on public repos
  and cheap on private ones.
- Works from anywhere I can talk to Claude Code — including the phone
  — because the sandbox isn't doing the work.
- Transcripts land as GitHub issues, which read fine on mobile. No
  workflow-log spelunking.
- The egress problem gets solved by moving the work, not by poking
  holes in the sandbox.

Round trip is about four minutes per clip. Most of that is
faster-whisper loading the model on a cold CPU runner.
