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
# Remove old port file if it exists
rm -f .backend_port
python main.py &
BACKEND_PID=$!

# Wait for backend to write the port file
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if [ -f ".backend_port" ]; then
        BACKEND_PORT=$(cat .backend_port)
        echo "✓ Backend started on port $BACKEND_PORT"
        break
    fi
    sleep 0.2
done

if [ ! -f ".backend_port" ]; then
    echo "⚠️  Warning: Could not detect backend port, assuming 8000"
    BACKEND_PORT=8000
fi

cd ..

# Frontend setup
echo "🌐 Setting up frontend..."
cd frontend

# Check if node_modules exists and package.json is newer than node_modules
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Create .env.local with the backend port
echo "🔧 Configuring frontend with backend URL..."
echo "VITE_API_BASE_URL=http://localhost:${BACKEND_PORT}" > .env.local

echo "🚀 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Application started successfully!"
echo "📡 Backend API: http://localhost:${BACKEND_PORT}"
echo "🌐 Frontend: Check the output above for the actual Vite dev server URL"
echo "   (Usually http://localhost:5173 or the next available port)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    # Clean up the port file and frontend env file
    rm -f backend/.backend_port
    rm -f frontend/.env.local
    exit
}

# Wait for user interrupt
trap cleanup INT
wait