#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting LangFuse Trace Annotator...${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file with your LangFuse credentials:"
    echo "  LANGFUSE_PUBLIC_KEY=pk-lf-..."
    echo "  LANGFUSE_SECRET_KEY=sk-lf-..."
    echo "  LANGFUSE_HOST=http://localhost:3000"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    python3 -m venv .venv
fi

# Activate virtual environment and install dependencies
echo -e "${BLUE}Activating virtual environment...${NC}"
source .venv/bin/activate

# Install dependencies if needed
echo -e "${BLUE}Installing dependencies...${NC}"
pip install -q python-fasthtml langfuse python-dotenv

# Start the FastHTML application
echo -e "\n${GREEN}Starting FastHTML server...${NC}"
echo -e "${GREEN}Open your browser at: http://localhost:5001${NC}\n"

python app.py
