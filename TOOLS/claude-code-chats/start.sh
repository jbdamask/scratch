#!/bin/bash

echo "🚀 Starting Claude Code Chat History Viewer..."

# Backend setup
echo "📡 Setting up backend..."
cd backend

# Check if virtual environment exists, if not create it
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# Check if requirements are installed, if not install them
if [ ! -f ".requirements_installed" ] || [ requirements.txt -nt .requirements_installed ]; then
    echo "📚 Installing Python dependencies..."
    pip install -r requirements.txt
    touch .requirements_installed
fi

echo "🚀 Starting backend API server..."
python main.py &
BACKEND_PID=$!
cd ..

# Frontend setup
echo "🌐 Setting up frontend..."
cd frontend

# Check if node_modules exists and package.json is newer than node_modules
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "🚀 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

echo ""
echo "✅ Application started successfully!"
echo "📡 Backend API: http://localhost:8000"
echo "🌐 Frontend: http://localhost:5173 or http://localhost:5174"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait