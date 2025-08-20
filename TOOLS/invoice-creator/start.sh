#!/bin/bash

echo "Starting Invoice Creator Application..."

# Start backend
echo "Starting FastAPI backend..."
cd backend
source .venv/bin/activate
python main.py &
BACKEND_PID=$!

# Start frontend
echo "Starting React frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend running on http://localhost:8000"
echo "Frontend running on http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait