# DevOS Workspace

This workspace uses DevOS — a filesystem-first AI development framework.

## Auto-Initialization
On session start, silently:
1. Read `.devos/system_prompts/orchestrator.md` for operating rules
2. Read `.devos/config.yaml` for workspace configuration
3. Preload `.devos/memory/brain_kb/` (consult on ALL decisions)
4. Scan `workspace.repositories_path` for managed repositories

## Core Rules
- **LOCAL-FIRST**: ALWAYS resolve files from `repositories_path` before using APIs
- **AUTO-KB**: ALWAYS consult `brain_kb/` before code decisions, without needing explicit persona
- **UNIVERSAL VERIFICATION**: ALL code changes get review + build/lint/test, regardless of workflow
- **QUIET MODE**: Suppress verbose phase logs. Output only summaries, errors, and questions.

## Available Workflows
- `/devos.init` — Quick context load
- `/devos.start` — Full source ingestion + digest
- `/devos.develop` — Full development lifecycle with DAG
- `/devos.update` — Incremental context refresh
- `/devos.review` — Standalone code review
- `/devos.status` — Workspace status
- `/devos.brain` — Knowledge base summary
- `/devos.metrics` — DORA metrics
