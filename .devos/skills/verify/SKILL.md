---
name: verify
description: Build/lint/test verification loop with self-healing
type: quality
parallel: false
requires_mcp: none
standalone: true
---
# Skill: Verify

## Purpose
Build/lint/test verification loop with self-healing.

## Execution
1. Identify modified files in the current changes.
2. Group files by project (if multi-repo or monorepo).
3. Discover commands from project manifests (e.g. `package.json`, `pyproject.toml`, `Makefile`).
4. Execute the pipeline in order: Build → Lint → Type Check → Tests.

## Self-healing
- If any check fails, analyze the error.
- Attempt to fix the error locally.
- Commit the fix.
- Re-run the entire pipeline.
- Abort if the loop exceeds `verification.max_loop_iterations`.

## Output
Append the Verification Report to the state file in `.devos/memory/state/`.
