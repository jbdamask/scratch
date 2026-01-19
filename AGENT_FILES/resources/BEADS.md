## Task Tracking

Use 'bd' for task tracking.

### Beads (bd)

Task management CLI for tracking work and dependencies.

### Commands

- bd init - Initialize beads in repo (use --stealth for local-only)
- bd ready - Show tasks with no blockers
- bd create "Title" -p <priority> - Create task (-p 0 = highest)
- bd dep add <child> <parent> - Link dependencies
- bd show <id> - View task details

### Best Practices
- bd doctor - Diagnoses and auto-fixes issues, handles migrations, git hooks, and config. Run daily.
- bd cleanup - Deletes issues older than N days (Steve uses 2 days). Run every few days; start cleaning at >200 issues, never exceed 500.
- bd sync - Syncs database and pushes to git. Run after cleanup.
- bd upgrade - Upgrades Beads to latest version. Run weekly or biweekly.

