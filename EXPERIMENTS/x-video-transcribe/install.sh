#!/usr/bin/env bash
# Install x-video-transcribe into the current git repo.
#
# Usage (from inside your repo):
#   curl -fsSL https://raw.githubusercontent.com/jbdamask/scratch/main/EXPERIMENTS/x-video-transcribe/install.sh | bash
# or:
#   bash path/to/this/install.sh

set -euo pipefail

REPO_RAW="${X_VIDEO_TRANSCRIBE_SOURCE:-https://raw.githubusercontent.com/jbdamask/scratch/main}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "✗ Not inside a git working tree. cd to your repo root and re-run." >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo "→ Installing x-video-transcribe into $REPO_ROOT"

mkdir -p .claude/skills/x-video-transcribe
mkdir -p .github/workflows
mkdir -p EXPERIMENTS/x-video-transcribe

fetch() {
  local src="$1" dst="$2"
  echo "  · $dst"
  curl -fsSL "$REPO_RAW/$src" -o "$dst"
}

fetch ".claude/skills/x-video-transcribe/SKILL.md"      ".claude/skills/x-video-transcribe/SKILL.md"
fetch ".github/workflows/x-video-transcribe.yml"        ".github/workflows/x-video-transcribe.yml"
fetch "EXPERIMENTS/x-video-transcribe/transcribe.py"    "EXPERIMENTS/x-video-transcribe/transcribe.py"
fetch "EXPERIMENTS/x-video-transcribe/requirements.txt" "EXPERIMENTS/x-video-transcribe/requirements.txt"
fetch "EXPERIMENTS/x-video-transcribe/url.txt"          "EXPERIMENTS/x-video-transcribe/url.txt"
fetch "EXPERIMENTS/x-video-transcribe/README.md"        "EXPERIMENTS/x-video-transcribe/README.md"

# Ensure the skill ships with the repo even if .claude is gitignored.
if [ ! -f .gitignore ] || ! grep -qE '^\!\.claude/skills/' .gitignore; then
  {
    echo
    echo "# Allow Claude Code project skills to ship with the repo"
    echo ".claude/*"
    echo "!.claude/skills/"
    echo "!.claude/skills/**"
  } >> .gitignore
  echo "  · patched .gitignore (allow .claude/skills/ to be tracked)"
fi

cat <<'EOF'

✓ Installed.

Next steps:

  1. Enable issue posting from the workflow:
     Settings → Actions → General → Workflow permissions →
     "Read and write permissions"

  2. Commit and push:
       git add .claude/skills .github/workflows EXPERIMENTS/x-video-transcribe .gitignore
       git commit -m "Install x-video-transcribe"
       git push

  3. Open a Claude Code session rooted in this repo and say:
       transcribe this video: <url>

  Or trigger directly from GitHub:
     Actions → x-video-transcribe → Run workflow → paste URL.

EOF
