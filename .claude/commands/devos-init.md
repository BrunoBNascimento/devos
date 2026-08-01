---
description: Initialize DevOS context — scan workspace, load knowledge bases, report status
---

Read and execute the DevOS init workflow at `.devos/workflows/init_workflow.md`.

This will:
1. Scan repositories in the configured `repositories_path`
2. Auto-fetch latest branches from remotes
3. Preload all knowledge from `.devos/memory/brain_kb/`
4. Report workspace status concisely

Do NOT ingest external sources (Jira, Slack, etc.) — use `/devos.start` for that.
