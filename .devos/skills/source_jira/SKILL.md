---
name: source_jira
description: Ingest Jira tickets for Daily Digest
type: source
parallel: true
requires_mcp: jira
---
# Skill: Source Jira

## Purpose
Ingest Jira tickets for Daily Digest.

## Execution
1. Read `integrations.jira` configuration from `.devos/config.yaml` or `.devos/config.example.yaml`.
2. Connect to Jira via the `jira` MCP server.
3. Query configured boards with specified filters.
4. Respect `lookback_days` setting to only fetch recent tickets.
5. Cap the results at `max_tickets`.

## Rules
- Never halt on error. If an error occurs, catch it and continue.
- Return partial data if some queries fail.
- Respect configured limits (`lookback_days`, `max_tickets`).

## Output
Write the ingested Jira data (JSON format) to `.devos/memory/state/_source_jira.json`.
