# Architecture
Separate backend and frontend directories.
Backend is Python 3.12 and Flask.
Frontend is Vite and React.

# Backend
Always run in a virtual environment.
If a .venv virtual environment doesn't exist, create one using bash commands.
Secrets should always be stored and retrieved from a .env file.

# Frontend
Theme and color palette should be American Heartland
UI and UX should be intuitive by using common best practices for layouts and a minimalist design

# Bash commands
python3 -m venv .venv
source .venv/bin/activate

# Security & DevOps
Ensure there's a .gitignore file at the project root that includes standard files and folders to ignore from a project with this architecture.
Ensure .gitignore includes .env file
