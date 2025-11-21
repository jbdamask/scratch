#!/bin/bash

set -e

echo "🚀 Starting Audio Spectrogram Analyzer..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo "✅ Dependencies installed"

# Create necessary directories
mkdir -p uploads static

echo "🌐 Starting FastAPI server..."
echo "📍 Server will be available at: http://localhost:8001"
echo "🛑 Press CTRL+C to stop the server"
echo ""

# Start the application
python main.py
