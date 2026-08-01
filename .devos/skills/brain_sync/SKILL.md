---
name: brain_sync
description: Extract knowledge from work session, persist to brain_kb
type: lifecycle
parallel: false
requires_mcp: none
standalone: true
---
# Skill: Brain Sync

## Purpose
Extract knowledge, gotchas, and conventions from the work session and persist them to `brain_kb`.

## Execution
1. Analyze the work done during the current session (tasks, commits, errors encountered, fixes).
2. Identify significant gotchas, traps, conventions, or lessons learned.
3. Check if this knowledge already exists in `brain_kb` to avoid duplication.
4. Create a new entry with YAML frontmatter including `date`, `source_task`, and `tags`.

## Output
Write a new file to `.devos/memory/brain_kb/learned_YYMMDD_<slug>.md`.
