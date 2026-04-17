#!/bin/bash

loops=${1:-5}

count=0
while [ $count -lt $loops ]; do
    echo "Running iteration $((count + 1)) of $loops..."
    cat prompt.txt | claude -p --model claude-sonnet-4-6 --dangerously-skip-permissions
    count=$((count + 1))
done

echo "Completed all $loops iterations."
