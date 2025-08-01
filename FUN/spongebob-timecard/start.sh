#!/bin/bash

echo "Starting SpongeBob Time Cards Generator..."

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is taken
    else
        return 0  # Port is available
    fi
}

# Try ports 8000-8010
PORT=8000
while [ $PORT -le 8010 ]; do
    if check_port $PORT; then
        echo "Server will be available at: http://localhost:$PORT"
        echo "Press Ctrl+C to stop the server"
        echo ""
        break
    else
        echo "Port $PORT is taken, trying next port..."
        PORT=$((PORT + 1))
    fi
done

if [ $PORT -gt 8010 ]; then
    echo "Error: No available ports found between 8000-8010"
    exit 1
fi

# Check if Python 3 is available, fallback to Python 2
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "Error: Python is not installed or not in PATH"
    exit 1
fi