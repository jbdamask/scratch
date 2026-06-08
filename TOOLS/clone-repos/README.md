# clone-repos

A small, dependency-free Bash script that clones a set of git repositories into a
single root directory. Point it at a destination folder, hand it a list of repo
URLs, and it lays each one out as a subdirectory beneath the root.

## What it's for

Bulk-cloning the repos that make up a project or an engineering estate so they all
live side by side under one folder — handy as the first step when you need to read,
document, or analyze an entire codebase at once (e.g. building an architecture
overview across many repos).

## Usage

```
clone-repos.sh [-n NUM] [-f FILE] ROOT_DIR [REPO_URL ...]
```

| Argument / option | Meaning |
|-------------------|---------|
| `ROOT_DIR`        | **Required.** Repos are cloned as subdirectories beneath it. Created if it doesn't exist. |
| `REPO_URL ...`    | Zero or more git URLs to clone. |
| `-f FILE`         | Read additional repo URLs from `FILE`, one per line. Blank lines and `#` comments are ignored. |
| `-n NUM`          | Clone at most `NUM` repos. **Default: 5.** Can also be set via the `CLONE_REPO_LIMIT` environment variable. |
| `-h`              | Show help. |

URLs from the command line and from `-f FILE` are combined, and the `-n` limit is
applied to the total.

## Examples

Clone a single repo into `~/clients/acme`:

```bash
./clone-repos.sh ~/clients/acme https://github.com/acme/api.git
```

Clone up to 10 repos listed in a file:

```bash
./clone-repos.sh -n 10 ~/clients/acme -f repos.txt
```

Use the environment variable instead of `-n`:

```bash
CLONE_REPO_LIMIT=3 ./clone-repos.sh ~/clients/acme -f repos.txt
```

Example `repos.txt`:

```
# Core services
https://github.com/acme/api.git
https://github.com/acme/web.git

# Shared libraries
https://github.com/acme/common.git
```

## Behavior notes

- **Default limit is 5**, configurable with `-n` or `CLONE_REPO_LIMIT`. If more URLs
  are supplied than the limit, the extras are reported and skipped.
- **Idempotent** — a repo that's already cloned (its destination has a `.git`
  directory) is skipped, so the script is safe to re-run.
- **Summary line** at the end reports `cloned`, `skipped`, and `failed` counts.
- **Exit status** is non-zero if any clone failed, so it composes cleanly in larger
  scripts and CI.
- Requires `git` on the `PATH`; uses only standard Bash and core utilities.

## Install

```bash
chmod +x clone-repos.sh
```

Run it in place, or drop it somewhere on your `PATH` (e.g. `~/bin/clone-repos`).
