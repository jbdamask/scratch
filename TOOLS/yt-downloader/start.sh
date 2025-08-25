#!/bin/bash

# YouTube Downloader Startup Script

echo "📥 Starting YouTube Downloader..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies if needed
if [ ! -f "backend/.deps_installed" ]; then
    echo "Installing Python dependencies..."
    cd backend
    pip install -r requirements.txt
    touch .deps_installed
    cd ..
fi

# Start the server
echo "Starting Flask server..."
echo "The server will start on an available port"
echo "Check the output below for the URL to open in your browser"
echo ""

cd backend
python app.py