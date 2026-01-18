#!/bin/bash

count=0
while [ $count -lt 5 ]; do
    echo "Running iteration $((count + 1)) of 5..."
    cat prompt.md | claude -p --model claude-haiku-4-5 --output-format=stream-json --verbose --dangerously-skip-permissions | tee -a claude_output.jsonl
    count=$((count + 1))
done

echo "Completed all 5 iterations."
