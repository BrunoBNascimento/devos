# Start Workflow -- Context Ingestion and Correlation Engine

> **Trigger:** `/devos.start`
> **Purpose:** Ingest raw context from all configured integrations, correlate signals across sources, run workspace discovery, and produce a comprehensive draft artifact ready for development.

## Prerequisites

- The Orchestrator has completed its Boot Sequence.
- `config.yaml` has been read and validated.
- `.devosignore` patterns are loaded.

---

## Step 1: Multi-Source Ingestion

**Action:** Read `integrations` from `config.yaml` and pull context from ALL enabled sources in parallel.

### 1.1 -- Jira

Read `integrations.jira` from config. If enabled:

1. Connect via the configured auth method (`MCP`, `ENV`, or `TOKEN`).
2. Query each board listed under `boards` (by `id`).
3. Apply filters: `status`, `labels`, `assignee`.
4. Time window: last `lookback_days` (default: 14 days).
5. If `include_comments: true`, pull ticket comments.
6. Cap at `max_tickets` (default: 25).
7. Store each ticket with: key, title, status, description, comments, labels, assignee, sprint.

### 1.2 -- Slack

Read `integrations.slack` from config. If enabled:

1. Connect via configured auth.
2. For each channel (by `id`):
   - Pull messages from last `lookback_days` (default: 7 days).
   - Respect `thread_depth` setting.
   - Cap at `max_messages_per_channel` (default: 100).
3. Store each message with: channel, timestamp, author, content, thread replies.

### 1.3 -- Meeting Notes / Transcripts

Read `integrations.meeting_notes` from config. If enabled:

1. For each provider where `enabled: true`:
   - **google_meet / otter_ai**: Pull transcripts from last `lookback_days` (default: 30 days) via MCP.
   - **manual**: Scan `watch_path` directory for `.md` files.
2. Apply `filters.keywords` and `filters.participants` if configured.
3. Cap at `max_transcripts` (default: 10).
4. Store each transcript with: date, participants, duration, content, action items (if detectable).

### 1.4 -- GitHub

Read `integrations.github` from config. If enabled:

1. Connect via MCP.
2. For each repository (by `owner/repo`), pull: issues, PRs, discussions (per `sources` config).
3. Time window: last `lookback_days` (default: 14 days).
4. Cap at `max_items_per_source` (default: 20).
5. Store each item with: type, title, body, URL, labels, assignees.

### 1.5 -- Ingestion Report

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

### 1.6 -- User-Provided Context

After automated ingestion, prompt:

> "Context ingestion complete. I pulled data from the sources above. Do you have additional context? You can describe the task, paste content, reference a file, or type 'none' if everything is covered."

---

## Step 2: Cross-Source Correlation

**Action:** This is the intelligence layer. Analyze ALL ingested data and identify correlated signals that point to the same work item.

### 2.1 -- Signal Extraction

From each source, extract semantic signals:

| Source | Signals Extracted |
|---|---|
| Jira | Ticket key, title keywords, description entities, labels, sprint goals |
| Slack | Topic keywords, mentioned ticket keys, user intents, decisions made, action items |
| Transcripts | Discussion topics, decisions, action items, assigned owners, mentioned ticket keys |
| GitHub | Issue titles, PR descriptions, linked tickets, technical terms |
| User input | Explicit task description, referenced files, keywords |

### 2.2 -- Correlation Matrix

Build a correlation matrix by matching signals across sources:

1. **Exact matches**: Jira key mentioned in Slack, transcript, or GitHub (e.g., "PROJ-123").
2. **Semantic matches**: Similar topic keywords across sources (e.g., "login" in transcript + "user authentication" in Jira + "auth flow" in Slack).
3. **Temporal matches**: Items discussed/created/updated within the same time window.
4. **Entity matches**: Same people mentioned or assigned across sources.

For each correlated cluster, compute a **confidence score** (0.0 to 1.0) based on the number and strength of matching signals.

### 2.3 -- Cluster Ranking

Rank correlated clusters by:
1. **Confidence score** (strongest correlations first).
2. **Recency** (more recent activity ranks higher).
3. **Urgency signals** (Jira priority, Slack channel purpose, explicit deadlines).

### 2.4 -- Correlation Report

Output the top correlated clusters:

```
Correlation Report:
| Rank | Topic          | Confidence | Sources                                      |
|------|----------------|------------|----------------------------------------------|
| 1    | Login Feature  | 0.92       | Jira:PROJ-45, Slack:#engineering, Transcript:refinement_0724 |
| 2    | API Migration  | 0.67       | Jira:PROJ-51, GitHub:issue#23                |
| 3    | ...            | ...        | ...                                          |
```

If only one cluster has high confidence (>0.8), auto-select it as the target task.
If multiple clusters have similar confidence, present them to the user and ask which to proceed with.
If no clusters are found, fall back to user-provided context only.

---

## Step 3: Workspace Discovery

**Action:** Scan the workspace to understand the codebase before drafting.

### 3.1 -- Structural Scan

1. Read `workspace.repo_directories` from `config.yaml`.
2. Recursively scan, respecting `.devosignore` patterns.
3. Build a structural map:
   - Top-level directories and their purpose.
   - Key config files (`package.json`, `pyproject.toml`, `Cargo.toml`, etc.).
   - Tech stack, frameworks, and languages detected.
   - Existing test structure and coverage tooling.
   - Documentation files (README, CONTRIBUTING, API docs).

### 3.2 -- Scope Mapping

Cross-reference the workspace map with the correlated task context:
- Identify which directories, modules, and files are likely affected.
- Flag any areas with high churn (recently modified files related to the scope).
- Note dependencies that may be impacted.

### 3.3 -- Discovery Report

```markdown
## Discovery Report
- **Workspace Root:** <path>
- **Tech Stack:** <detected technologies>
- **Target Directories:** <directories relevant to scope>
- **Key Files:** <important files identified>
- **Test Infrastructure:** <test runner, coverage tool, current coverage>
- **Documentation:** <existing docs that may need updating>
```

---

## Step 4: Knowledge Retrieval Pipeline

**Action:** Execute the full retrieval pipeline from `config.yaml > knowledge_system` against the correlated task context.

### 4.1 -- Enumerate and Retrieve

For each KB in `knowledge_system.knowledge_bases`, retrieve up to `retrieval.top_k_per_kb` chunks relevant to the correlated task.

### 4.2 -- Fusion (Weighted RRF)

Merge using `fusion.algorithm`:

```
fused_score(chunk) = SUM over KBs:
    kb.priority * (1 / (rank_in_kb + 60))
```

### 4.3 -- Rerank

Apply `reranker.model` cross-encoder pass.

### 4.4 -- Select Final Context

Truncate to `context.final_chunks` (default: 12).

### 4.5 -- Output

- Include relevant gotchas in the draft under "[WARNING] Known Gotchas".
- Add retrieval metadata documenting KBs consulted and chunks contributed.

---

## Step 5: Generate Draft Artifact

**Action:** Create a comprehensive draft in `.devos/memory/state/` combining ALL gathered intelligence.

**File naming:** `draft_YYMMDD.md` (e.g., `draft_250725.md`)

**File Structure:**

```markdown
---
phase: draft
type: <feature|bugfix|refactor|chore|research>
title: "<Title>"
jira_key: "<PROJ-XXX if correlated>"
correlation_confidence: <0.0-1.0>
sources_correlated: [<list of source:id pairs>]
created: <YYYY-MM-DD HH:MM>
last_updated: <YYYY-MM-DD HH:MM>
author: devos-orchestrator
---

# <Title>

## Summary
<2-3 sentence summary synthesized from ALL correlated sources>

## Correlated Context
### From Jira (<ticket_key>)
- **Status:** <status>
- **Description:** <ticket description>
- **Key Comments:** <relevant comments>

### From Slack (<#channel>)
- <Relevant messages and decisions>

### From Meeting Transcripts (<date>)
- <Relevant discussion points and action items>

### From GitHub (<issue/PR>)
- <Relevant context>

## Discovery Report
<Output from Step 3>

## Scope
- <Affected area 1>
- <Affected area 2>

## Requirements
- <Requirement 1 -- synthesized from all sources>
- <Requirement 2>

## Ambiguities / Open Questions
- [?] <Question 1 -- contradictions or gaps between sources>
- [?] <Question 2>

## Constraints
- <Constraint 1>

## [WARNING] Known Gotchas
- <Gotcha from brain_kb, with source reference>

## Retrieval Metadata
- **KBs Consulted:** <list>
- **Chunks Used:** <count>

## Raw Context
<Original user input preserved verbatim>
```

---

## Step 6: Human-in-the-Loop (HITL) Gate

**Action:** Present the draft to the user and STOP.

**Prompt:**
> "**Draft Generated:** `memory/state/draft_YYMMDD.md`
>
> I correlated signals from <N> sources with <confidence>% confidence.
> The primary task appears to be: **<title>** (linked to <jira_key>).
>
> Please review the draft. You can:
> - **Approve** -- Type `/devos.develop` to begin development.
> - **Edit** -- Tell me what to change.
> - **Reject** -- I will discard and start over.
>
> I will not proceed until you give explicit approval."

[STOP] **STOP HERE. Do NOT proceed without human approval.**
