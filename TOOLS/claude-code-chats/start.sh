#!/bin/bash

echo "🚀 Starting Claude Code Chat History Viewer..."

# Start backend
echo "📡 Starting backend API server..."
cd backend
source .venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "🌐 Starting frontend development server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Application started successfully!"
echo "📡 Backend API: http://localhost:8000"
echo "🌐 Frontend: http://localhost:5173 or http://localhost:5174"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait