---
name: source_github
description: Ingest GitHub PRs/issues/discussions.
type: source
parallel: true
requires_mcp: github
---
# Skill: Source GitHub

## Purpose
Ingest GitHub PRs, issues, and discussions. LOCAL-FIRST.

## Execution
1. Read `integrations.github` configuration from `.devos/config.yaml` or `.devos/config.example.yaml`.
2. For reading file contents of local repositories, you MUST use `repositories_path` FIRST. Use `git` commands (e.g. `git log`, `git diff`) to query information for local repos.
3. Use MCP for issues, PR data, and discussions according to configured lookback days and limits.

## Rules
- **CRITICAL RULE**: ALWAYS look for files in `repositories_path` FIRST. NEVER use GitHub API to read file contents when the repository is cloned locally.

## Output
Write the ingested GitHub data to `.devos/memory/state/_source_github.json`.
