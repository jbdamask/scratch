@echo off

echo 📥 Starting YouTube Downloader...

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate

REM Install dependencies if needed
if not exist "backend\.deps_installed" (
    echo Installing Python dependencies...
    cd backend
    pip install -r requirements.txt
    echo. > .deps_installed
    cd ..
)

REM Start the server
echo Starting Flask server...
echo The server will start on an available port
echo Check the output below for the URL to open in your browser
echo.

cd backend
python app.py