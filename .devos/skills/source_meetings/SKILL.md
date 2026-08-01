---
name: source_meetings
description: Ingest meeting transcripts
type: source
parallel: true
requires_mcp: optional
---
# Skill: Source Meetings

## Purpose
Ingest meeting transcripts from providers or manual uploads.

## Execution
1. Check configured providers in `integrations.meeting_notes` (e.g. `google_meet`, `otter_ai`, `manual`).
2. Scan the configured `watch_path` for manual transcripts (e.g. `.md` files).
3. Extract relevant meeting context based on `lookback_days` and `filters`.

## Rules
- Do not halt on missing providers.
- Merge transcripts gracefully.

## Output
Write the processed transcripts to `.devos/memory/state/_source_meetings.json`.
