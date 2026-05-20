#!/usr/bin/env bash
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
