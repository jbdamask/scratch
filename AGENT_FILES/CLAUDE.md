## When building apps
- Always create a readme file. 
- In the case of simple, 1-page webapps (e.g. a single html file), the readme file should have the same name as the app but with a .md extension, e.g. myApp.html myApp.md
- In the case of an app that has it's own directory, use README.md

## When building python apps:
- Always be in a dedicated folder for the app
- Always be sure to work in a virtual environment
- If no virtual environment exists, run the terminal command: python3 -m venv .venv && source .venv/bin/activate
- If a virtual environment exists, it will be named .venv. Be sure to run the terminal command: source .venv/bin/activate

## When building complex webapps:
- Always create separate backend and frontend folders
- Always create the backend in Python
- Always use FastAPI or Flask for the backend
- Always use Vite for the frontend
- Always use shadcn components for UI
- Always use Tailwind css
- Always favor a clean, minimalist interface that is intuitive
- Always make a start.sh script that automatically starts the backend in its virtual environment and frontend
- ALWAYS use type-only imports for TypeScript interfaces: `import type { InterfaceName } from './types'`
- ALWAYS import HTTPException when using FastAPI error handling: `from fastapi import FastAPI, HTTPException`

## Tailwind CSS Configuration Fix:
- ALWAYS install Tailwind CSS v3.x (not v4) to avoid PostCSS plugin configuration errors
- Use: npm install -D tailwindcss@^3.4.0 postcss autoprefixer
- Tailwind v4 has breaking changes in PostCSS configuration that cause build failures

## Theme Selection
- ALWAYS ask the user which theme to use from available themes.
- ALWAYS determine the relative path to <repo-root>/THEMES dir from your working directory
- List available themes with brief descriptions
- Install the selected theme: npm install file:<relative-path>/THEMES/[theme-name]
- Install theme peer dependencies: npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot lucide-react
- Add theme preset to tailwind.config.js: const theme = require('@johnthemes/[theme-name]/tailwind.preset')
- Import base styles: @import '@johnthemes/[theme-name]/styles/globals.css'
- Use theme components: import { Button, Card } from '@johnthemes/[theme-name]'
- Apply theme classes: bg-background text-foreground
- NOTE: If symlink resolution issues occur, copy theme components to src/components/ui/ and create local utils.ts

## Tips about where Claude Code chats are stored
- If the user asks you about a prior chat, you can search json files in ~/.claude/projects to find it
- Within the projects folder, you'll find subfolders containing one or more .jsonl files. These files contain raw chats with the user.
- jsonl object example:
-- {"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/Users/johndamask/code/scratch","sessionId":"4b7589f6-d9f0-4ee5-b726-936a8ba180fb","version":"1.0.123","gitBranch":"main","type":"user","message":{"role":"user","content":"hey, do you remember how you created a UI theme called webapp-dark under the THEMES directory?"},"uuid":"0f96684f-d927-4aff-9f0b-a9091aee81c2","timestamp":"2025-10-11T22:16:00.786Z","thinkingMetadata":{"level":"none","disabled":false,"triggers":[]}}
- If you need to exercise cross-chat lookups, you now know where the information lives
- Don't be afraid to use jq to help parse information out of the jsonl files
- Make use of timestamps within the chats if you need to traverse time.

## Security
- When working with API keys or other sensitive credentials, NEVER print them in chat messages as this will risk exposure in logs.
