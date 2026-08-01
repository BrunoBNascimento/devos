---
description: Ingest context from all sources and generate Daily Tactical Digest
---

Read and execute the DevOS start workflow at `.devos/workflows/start_workflow.md`.

This will:
1. Spawn parallel subagents for each configured source (Jira, Slack, GitHub, Meetings, Local Repos)
2. Correlate signals across sources
3. Generate a Daily Tactical Digest with historical tracking

Important: Read `.devos/config.yaml` first for source configuration.
