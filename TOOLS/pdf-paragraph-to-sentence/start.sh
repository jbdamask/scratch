#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting PDF Paragraph to Sentence Application${NC}"

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Start backend
echo -e "${BLUE}📦 Starting backend server...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating .venv...${NC}"
    python3 -m venv .venv
fi

# Activate virtual environment and start backend
source .venv/bin/activate
python app.py &
BACKEND_PID=$!

cd ..

# Start frontend
echo -e "${BLUE}🌐 Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo -e "${GREEN}✅ Both services started!${NC}"
echo -e "${GREEN}📱 Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}🔧 Backend: http://localhost:5000${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop both services${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID