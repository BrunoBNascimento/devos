---
name: source_local_repos
description: Scan local repos, auto-fetch branches, report project/branch status
type: source
parallel: true
requires_mcp: none
---
# Skill: Source Local Repos

## Purpose
Scan local repos, auto-fetch branches, and report project/branch status.

## Execution
1. Read `workspace.repositories_path` and `workspace.auto_fetch` from config.
2. Find git repositories in `repositories_path` up to 3 levels deep.
3. For each repository:
   - If `auto_fetch` is true, run `git fetch --all --prune`.
   - Detect current branch.
   - Compare with remote to detect ahead/behind status.
   - Detect dirty working directory state.
   - Detect tech stack (e.g. Node.js, Python, Java).
4. Generate a Repos Status Table showing:
   | Repo | Branch | Status | vs Remote | Stack |
5. Save the table and metadata as JSON.

## Rules
- NEVER auto-pull or auto-merge. Only fetch.
- If there is no network connection, continue with stale data and log a warning.

## Output
Write the output to `.devos/memory/state/_repos_status.json`.
