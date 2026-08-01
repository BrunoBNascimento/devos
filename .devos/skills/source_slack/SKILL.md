---
name: source_slack
description: Ingest Slack messages for Daily Digest
type: source
parallel: true
requires_mcp: slack
---
# Skill: Source Slack

## Purpose
Ingest Slack messages for Daily Digest.

## Execution
1. Read `integrations.slack` configuration from `.devos/config.yaml` or `.devos/config.example.yaml`.
2. Connect to Slack via the `slack` MCP server.
3. Pull messages per configured channel.
4. Respect the `thread_depth` configuration (e.g. `full`, `top_only`, integer limit).
5. Cap the results at `max_messages_per_channel`.

## Rules
- Never halt on error. Return partial data.
- Respect configured limits.

## Output
Write the ingested Slack messages data to `.devos/memory/state/_source_slack.json`.
