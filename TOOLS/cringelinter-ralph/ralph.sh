#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <filename> [max_loops]"
    exit 1
fi

filename="$1"
loops=${2:-5}

if [ ! -f "$filename" ]; then
    echo "Error: File '$filename' not found"
    exit 1
fi

# Returns the next versioned filename:
#   myblog.md        -> myblog-v1.md
#   myblog-v1.md     -> myblog-v2.md
next_version() {
    local file="$1"
    local dir ext stem
    dir=$(dirname "$file")
    stem=$(basename "$file")
    ext="${stem##*.}"
    stem="${stem%.*}"

    if [[ "$stem" =~ ^(.*)-v([0-9]+)$ ]]; then
        echo "${dir}/${BASH_REMATCH[1]}-v$(( BASH_REMATCH[2] + 1 )).${ext}"
    else
        echo "${dir}/${stem}-v1.${ext}"
    fi
}

current_file="$filename"
count=0

while [ $count -lt $loops ]; do
    echo "Running iteration $((count + 1)) of $loops on: $current_file"

    BASENAME=$(basename "$current_file")
    OUTPUT=$({
        cat prompt.txt
        printf '\nThe file to process is: %s\n\n<file_content>\n' "$BASENAME"
        cat "$current_file"
        printf '\n</file_content>\n'
    } | claude -p --model claude-sonnet-4-6 --dangerously-skip-permissions)
    echo "$OUTPUT"
    count=$((count + 1))

    if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
        echo ""
        echo "Ralph completed all tasks!"
        echo "Completed at iteration $count of $loops"
        exit 0
    fi

    next_file=$(next_version "$current_file")
    if [ ! -f "$next_file" ]; then
        echo "Error: expected output file '$next_file' was not created"
        exit 1
    fi
    current_file="$next_file"

    echo "Iteration $count complete. Next file: $current_file"
    sleep 2
done

echo ""
echo "Ralph reached max iterations ($loops) without completing all tasks."
exit 1
