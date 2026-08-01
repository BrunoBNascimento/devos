---
name: develop
description: Core coding skill - branch creation, iterative coding, atomic commits
type: lifecycle
parallel: false
requires_mcp: none
standalone: true
requires: [planning, verify, review]
---
# Skill: Develop

## Purpose
Core coding skill handling branch creation, iterative coding, atomic commits, and DAG-following.

## Execution
1. Read the plan and DAG from the state file.
2. Create a feature branch matching the configured naming convention.
3. Execute tasks layer by layer in the order defined by the DAG.
4. For each task, make required changes locally. **CRITICAL: LOCAL-FIRST — all file reads/writes target `repositories_path`.**
5. Make atomic commits for each completed task.
6. Mark tasks as done in the state file.

## Standalone Mode
If running in standalone mode: Accept task → invoke `planning` skill → execute DAG → invoke `verify` skill → invoke `review` skill → invoke `brain_sync` skill.

## Rules
- Make exactly one atomic commit per task.
- Reference the Jira key or issue ID in the commit message if applicable.
- Never commit generated AI files or intermediate scratch files to the main repo.
