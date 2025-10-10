When building python apps:
- Always be sure to work in a virtual environment
- If no virtual environment exists, run the terminal command: python3 -m venv .venv && source .venv/bin/activate
- If a virtual environment exists, it will be named .venv. Be sure to run the terminal command: source .venv/bin/activate

When building complex webapps:
- Always create separate backend and frontend folders
- Always create the backend in Python
- Always use FastAPI or Flask for the backend
- Always use Vite for the frontend
- Always use shadcn components for UI
- Always use Tailwind css
- Always favor a clean, minimalist interface that is intuitive
- Always make a start.sh script that automatically starts the backend in its virtual environment and frontend

Tailwind CSS Configuration Fix:
- ALWAYS install Tailwind CSS v3.x (not v4) to avoid PostCSS plugin configuration errors
- Use: npm install -D tailwindcss@^3.4.0 postcss autoprefixer
- Tailwind v4 has breaking changes in PostCSS configuration that cause build failures

