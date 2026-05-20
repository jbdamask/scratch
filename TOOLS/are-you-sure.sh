#!/usr/bin/env bash
#
# are-you-sure.sh
#
# Sends an initial prompt to `claude -p --dangerously-skip-permissions`, then
# repeatedly asks Claude "are you sure?" (using --continue so conversation
# context is preserved) up to <max-loops> times. The loop exits early as soon
# as Claude returns a response wrapped in <FINISHED>...</FINISHED> tags.
#
# Usage:   ./are-you-sure.sh "<prompt>" [max-loops]
# Default: max-loops = 5
# Example: ./are-you-sure.sh "what is 2+2?" 3
#
# Exit codes:
#   0 - Claude returned <FINISHED>...</FINISHED> within the loop budget
#   1 - bad args, or max-loops exhausted without a <FINISHED> response

set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <prompt> [max-loops]" >&2
  exit 1
fi

PROMPT="$1"
MAX_LOOPS="${2:-5}"

if ! [[ "$MAX_LOOPS" =~ ^[0-9]+$ ]]; then
  echo "Error: max-loops must be a non-negative integer" >&2
  exit 1
fi

INTERNAL_PROMPT='are you sure? If so, give me the final response wrapped in <FINISHED> </FINISHED> xml tags'

echo "=== Initial prompt ==="
echo "$PROMPT"
echo
echo "=== Initial response ==="
RESPONSE="$(claude -p --dangerously-skip-permissions "$PROMPT")"
echo "$RESPONSE"
echo

if [[ "$RESPONSE" == *"<FINISHED>"*"</FINISHED>"* ]]; then
  echo "=== Finished on initial response ==="
  exit 0
fi

for ((i = 1; i <= MAX_LOOPS; i++)); do
  echo "=== Loop $i/$MAX_LOOPS ==="
  RESPONSE="$(claude -p --continue --dangerously-skip-permissions "$INTERNAL_PROMPT")"
  echo "$RESPONSE"
  echo

  if [[ "$RESPONSE" == *"<FINISHED>"*"</FINISHED>"* ]]; then
    echo "=== Finished after loop $i ==="
    exit 0
  fi
done

echo "=== Reached max-loops ($MAX_LOOPS) without <FINISHED> ==="
exit 1
