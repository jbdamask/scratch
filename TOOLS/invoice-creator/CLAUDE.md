# General Tips
- Do not assume the date. You should run `date()` in the terminal to get today's date before doing anything that relates to time (e.g. installing package versions)
- Do not change the existing csv parsing algorithm - it's located in the backend
- Do not run the project in your terminal session. Instead, tell the user when they should start, stop, or restart the server.

# Architecture
- Use the latest versions of Vite, React, and Shadcn
- Use FastAPI for backend
- Use sqlite3 for database
- Create separate folders for frontend and backend
- Write files to date-specific subfolders

# UI/UX
- Prefer a minimalist aesthetic

# Environment
- Anything having to do with python, execution, installing libraries, etc, will be done within a virtual envionrment. 
- Before creating a virtual environment, you should check if one exists. This would be in the backend/.venv.
- You can create the virtual environment with this command, python3 -m venv .venv && source .venv/bin/activate

