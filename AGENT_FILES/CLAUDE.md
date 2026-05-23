## Know the date
Do not assume today's date, always look it up or ask the user

## Skills
- Reusable skills are found under ~/.claude/skills.
- Project skills are found under <project>/.claude/skills

## Previous chat sessions
- All Claude Code chats are stored in subdirectories of ~/.claude/projects.
- Project subdirectories have the same name as the project path itself but with slashes replaced by hyphens. For example, /Users/barry/project1 would be -Users-barry-project1.
- Chat history is stored in JSONL files within the project's subdirectories.
- Chats are time-stamped, so you can use time as a map to find things.
- Chat session JSON-L files are sorted chronologically, so you can tail the last part of the JSON-L file to get back up to speed.

## Principles
These are the design and engineering principles that guide all work on this project. When a tradeoff arises, lean toward these defaults; document any deliberate exception in the PR or plan.

- **Prioritize intuitive user experience over implementation difficulty.** Always consider the user story when designing features or fixing bugs. If a v1 limitation would surprise or confuse a user (e.g. "you can edit X but not Y in the same paragraph"), pay the implementation cost instead of shipping the wart.
- **Build modular, extensible code.** Prefer small, single-responsibility modules with clear boundaries over monoliths. New behavior should slot in as an additional module or extension point, not as a special case scattered through unrelated files.
- **Favor composition over inheritance.** Compose behavior from small pieces (functions, components, helpers) rather than building tall class hierarchies. Mixins and deep inheritance trees are a smell.
- **Avoid code duplication. Consolidate as opportunities arise.** When the same logic, markup, or styling shows up in two places, extract it into a shared helper, component, or stylesheet. Don't tolerate copy-paste even when "it's just for now."
- **Create meaningful tests for all new code. Use the Testing Trophy philosophy.** Prioritize integration tests (the largest layer of the trophy) over unit tests; add unit tests where the logic is genuinely isolated; add a small number of end-to-end tests for the highest-value flows; rely on static analysis (typecheck, lint) as the foundation. Avoid trivial tests that just restate the implementation. (Reference: Kent C. Dodds, "The Testing Trophy.")
- **Maximize user experience testing using the Claude for Chrome extension.** For any change that touches a page a user can see, drive the browser via the `claude-in-chrome` MCP tools (or the `webapp-testing` skill) to exercise the actual flow, confirm renders, check for console errors, and capture evidence. Backend tests and typecheck verify code correctness; the browser verifies feature correctness.

## Instructions
### Python
- Always use a virtual environment when running or developing with python
- Always use the most recent stable version of python in new projects. Look up the latest stable version from https://www.python.org/downloads/
- If a virtual environment doesn't already exist, create one for new Python projects before installing any packages
- Always activate the virtual environment before installing packages

### Issue Tracking
- When asked to create an issue, this typically means creating a GitHub issue but it could mean Beads or other issue tracker. Ask the user if not obvious
- If the project is using Beads (check for .beads directory in project root), refer to resources/BEADS.md for instructions

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

### Mermaid Diagrams
- When asked to create Mermaid diagrams, always use a subagent (Explore agent) to investigate the codebase and write the syntax
- Return the Mermaid syntax to the user

### Security
- When working with API keys or other sensitive credentials, NEVER print them in chat messages as this will risk exposure in logs.

