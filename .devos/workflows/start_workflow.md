# Start Workflow — Daily Tactical Digest

> **Trigger:** `/devos.start`
> **Purpose:** Ingest raw context from all configured integrations, correlate signals across sources, consult the Brain KB, and produce a **Daily Tactical Digest** — a panoramic view of everything happening across your workspace.

## Prerequisites

- The Orchestrator has completed its Boot Sequence.
- `config.yaml` has been read and validated.
- `.devosignore` patterns are loaded.

---

## Step 1: Multi-Source Ingestion

**Action:** Read `integrations` from `config.yaml` and pull context from ALL enabled sources in parallel.

### 1.1 — Jira

Read `integrations.jira` from config. If enabled:

1. Connect via the configured auth method (`MCP`, `ENV`, or `TOKEN`).
2. Query each board listed under `boards` (by `id`).
3. Apply filters: `status`, `labels`, `assignee`.
4. Time window: last `lookback_days` (default: 14 days).
5. If `include_comments: true`, pull ticket comments.
6. Cap at `max_tickets` (default: 25).
7. Store each ticket with: key, title, status, description, comments, labels, assignee, sprint.

### 1.2 — Slack

Read `integrations.slack` from config. If enabled:

1. Connect via configured auth.
2. For each channel (by `id`):
   - Pull messages from last `lookback_days` (default: 7 days).
   - Respect `thread_depth` setting.
   - Cap at `max_messages_per_channel` (default: 100).
3. Store each message with: channel, timestamp, author, content, thread replies.

### 1.3 — Meeting Notes / Transcripts

Read `integrations.meeting_notes` from config. If enabled:

1. For each provider where `enabled: true`:
   - **google_meet / otter_ai**: Pull transcripts from last `lookback_days` (default: 30 days) via MCP.
   - **manual**: Scan `watch_path` directory for `.md` files.
2. Apply `filters.keywords` and `filters.participants` if configured.
3. Cap at `max_transcripts` (default: 10).
4. Store each transcript with: date, participants, duration, content, action items (if detectable).

### 1.4 — GitHub

Read `integrations.github` from config. If enabled:

1. Connect via MCP.
2. For each repository (by `owner/repo`), pull: issues, PRs, discussions (per `sources` config).
3. Time window: last `lookback_days` (default: 14 days).
4. Cap at `max_items_per_source` (default: 20).
5. Store each item with: type, title, body, URL, labels, assignees.

### 1.5 — Ingestion Report

Output a summary:

```
Ingestion Report:
| Source          | Status       | Items  | Time Window   |
|-----------------|--------------|--------|---------------|
| Jira            | OK/OFF/FAIL  | <N>    | last <N> days |
| Slack           | OK/OFF/FAIL  | <N>    | last <N> days |
| Meeting Notes   | OK/OFF/FAIL  | <N>    | last <N> days |
| GitHub          | OK/OFF/FAIL  | <N>    | last <N> days |
```

If any integration fails, log the error but do NOT halt. Continue with available data.

---

## Step 2: Cross-Source Correlation

**Action:** Analyze ALL ingested data and identify correlated signals that point to the same work items.

### 2.1 — Signal Extraction

From each source, extract semantic signals:

| Source | Signals Extracted |
|---|---|
| Jira | Ticket key, title keywords, description entities, labels, sprint goals |
| Slack | Topic keywords, mentioned ticket keys, user intents, decisions made, action items |
| Transcripts | Discussion topics, decisions, action items, assigned owners, mentioned ticket keys |
| GitHub | Issue titles, PR descriptions, linked tickets, technical terms |

### 2.2 — Correlation Matrix

Build a correlation matrix by matching signals across sources:

1. **Exact matches**: Jira key mentioned in Slack, transcript, or GitHub (e.g., "PROJ-123").
2. **Semantic matches**: Similar topic keywords across sources (e.g., "login" in transcript + "user authentication" in Jira + "auth flow" in Slack).
3. **Temporal matches**: Items discussed/created/updated within the same time window.
4. **Entity matches**: Same people mentioned or assigned across sources.

For each correlated cluster, compute a **confidence score** (0.0 to 1.0) based on the number and strength of matching signals.

### 2.3 — Cluster Ranking

Rank correlated clusters by:
1. **Confidence score** (strongest correlations first).
2. **Recency** (more recent activity ranks higher).
3. **Urgency signals** (Jira priority, Slack channel purpose, explicit deadlines).

---

## Step 3: Knowledge Extraction

**Action:** Scan `.devos/memory/brain_kb/` for recently added entries and identify new knowledge that emerged from the correlated context.

### 3.1 — New Knowledge Detection

Analyze the correlated clusters for:
- **Decisions made** in meetings or Slack that establish new conventions or rules.
- **Gotchas discovered** in PR reviews or GitHub issues that should be persisted.
- **Blockers identified** that require human action.

### 3.2 — Brain KB Cross-Reference

Check if any of the detected knowledge already exists in `brain_kb/`. Only surface entries that are new or have updated context.

---

## Step 4: Classify Active Items

**Action:** Categorize all correlated items by their development readiness.

### 4.1 — Status Classification

For each correlated cluster, determine its current status:

| Status | Criteria |
|---|---|
| **Ready for Development** | Has clear requirements, no blockers, assigned or unassigned |
| **Blocked** | Waiting on external input, missing credentials, dependency on another team |
| **In Progress** | Already has an active branch, open PR, or ongoing work |
| **Needs Clarification** | Contradictions between sources, ambiguous requirements |
| **Review Required** | Open PR waiting for your review, or code review requested |

### 4.2 — Action Items Extraction

Identify items that require **immediate human action**:
- PRs waiting for your review
- Blocked tickets that need you to unblock
- Decisions pending your input
- Failing CI/CD pipelines on your branches

---

## Step 5: Generate Daily Tactical Digest

**Action:** Create the digest file in `.devos/memory/state/`.

**File name:** `daily_digest.md`

> **Important:** This file is **overwritten** on each run (not date-suffixed). It always represents the latest state. The Desktop App reads this file to render the Daily Tactical Digest view.

**File Structure:**

```markdown
---
type: digest
title: "Daily Tactical Digest"
created: <YYYY-MM-DD HH:MM>
last_updated: <YYYY-MM-DD HH:MM>
author: devos-orchestrator
sources_consulted: [<list of source names>]
clusters_found: <N>
---

# Daily Tactical Digest

## Active Context (Merged)
- **[<JIRA_KEY>] <Title>:** <Status>. <Synthesized summary from all correlated sources for this item.>
- **[<JIRA_KEY>] <Title>:** <Status>. <Summary.>

## Action Required
- **[<Repo>] PR #<N>** <Title> — <What's needed from you> (Author: @<name>).
- **[<JIRA_KEY>] <Title>** — <Why it's blocked and what you need to do.>

## New Knowledge Extracted
- **<Topic>:** <What was learned and where it was saved in brain_kb/.>

## Ready for Development
- **[<JIRA_KEY>] <Title>** — <Brief scope>. Confidence: <0.0-1.0>. Sources: <list>.
- **[<JIRA_KEY>] <Title>** — <Brief scope>. Confidence: <0.0-1.0>. Sources: <list>.

## Needs Clarification
- **[<JIRA_KEY>] <Title>** — <What's ambiguous and which sources conflict.>
```

---

## Step 6: Present Digest

**Action:** Output the digest summary to the user.

**Prompt:**

> **Daily Tactical Digest generated:** `memory/state/daily_digest.md`
>
> I consulted <N> sources and identified <N> correlated work items.
>
> **Action Required:** <count> items need your attention.
> **Ready for Development:** <count> items are ready to go.
>
> To start working on a task, run `/devos.develop`.

**This workflow is complete.** No HITL gate is needed — the digest is purely informational. The user decides what to do next.
