## Know the date
Do not assume today's date, always look it up or ask the user

## Skills
- Reusable skills are found under ~/.claude/skills.
- Project skills are found under <project>/.claude/skills

## Instructions
### Python
- Always use a virtual environment when running or developing with python
- Always use the most recent stable version of python in new projects. Look up the latest stable version from https://www.python.org/downloads/
- If a virtual environment doesn't already exist, create one for new Python projects before installing any packages
- Always activate the virtual environment before installing packages

## Important notes
### Claude Code
- When committing to GitHub, never attribute any of the code to Claude Code or Anthropic.
### AWS
- If the project involves AWS, always ask the user if a particular profile should be used and save it to the project's CLAUDE.md file.
- For persistent infrastructure, as opposed to transient where you are asked to create something temporarily like a spot instance, always write CloudFormation or CDK for infrastructure as code.
### Keeping current with APIs, packages, libraries, and anything related to code that changes over time
- Whenever planning or writing code, always check today's date and look up information that changes over time, such as package versions, API documentation, etc.
- Never assume your knowledge is current.
- Always assume the user wants up-to-date information, advice, and code
### Planning mode
- Always switch to your planning mode when planning projects
- After planning, always end with the path to the planning document

### GitHub
When asked to create an issue, this typically means creating a GitHub issue. Ask the user if this is what they want

### Mermaid Diagrams
- When asked to create Mermaid diagrams, always use a subagent (Explore agent) to investigate the codebase and write the syntax
- Return the Mermaid syntax to the user

### Security
- When working with API keys or other sensitive credentials, NEVER print them in chat messages as this will risk exposure in logs.
