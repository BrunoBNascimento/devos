# Start Workflow — Context Ingestion

> **Trigger:** `/devos.start`
> **Purpose:** Ingest raw context (tickets, transcripts, files, user descriptions) and produce a structured draft artifact for human review.

## Prerequisites

- The Orchestrator has completed its Boot Sequence.
- `config.yaml` has been read and validated.
- `.devosignore` patterns are loaded.

---

## Step 1: Gather Context

**Action:** Read `integrations` from `config.yaml` and actively pull context from all enabled sources before prompting the user.

### 1.1 — Automated Context Ingestion

For each integration where `enabled: true`, execute the corresponding ingestion routine:

#### Jira

Read `integrations.jira` from config. If enabled:

1. Connect via the auth method specified (`MCP`, `ENV`, or `TOKEN`).
2. Query each board listed under `boards` (by `id`).
3. Apply the configured `filters`:
   - Only tickets with `status` matching the configured list (e.g., "To Do", "In Progress", "In Review").
   - If `labels` is non-empty, restrict to those labels.
   - If `assignee` is `"current_user"`, filter to tickets assigned to the authenticated user.
4. Limit the time window to the last `lookback_days` (default: 14 days).
5. If `include_comments: true`, pull ticket comments alongside the description.
6. Cap results at `max_tickets` (default: 25).
7. Store ingested tickets in working memory with their key, title, status, and description.

#### Slack

Read `integrations.slack` from config. If enabled:

1. Connect via the auth method specified.
2. For each channel listed under `channels` (by `id`):
   - Pull messages from the last `lookback_days` (default: 7 days).
   - If `thread_depth` is `"full"`, include all thread replies. If `"top_only"`, only parent messages. If an integer, cap replies at that number.
   - Cap at `max_messages_per_channel` (default: 100) per channel.
3. Use the channel `purpose` field to weight relevance during later retrieval steps.
4. If `include_files: true`, parse file attachments shared in messages.
5. Store ingested messages with channel name, timestamp, author, and content.

#### Meeting Notes / Transcripts

Read `integrations.meeting_notes` from config. If enabled:

1. For each provider where `enabled: true`:
   - **google_meet / otter_ai**: Connect via MCP and pull transcripts from the last `lookback_days` (default: 30 days).
   - **manual**: Scan the `watch_path` directory (default: `.devos/memory/transcripts/`) for `.md` files.
2. Apply `filters.keywords` — if non-empty, only include transcripts containing at least one keyword.
3. Apply `filters.participants` — if non-empty, only include transcripts where at least one listed participant was present.
4. Cap at `max_transcripts` (default: 10).
5. Store ingested transcripts with date, participants, and content.

#### GitHub

Read `integrations.github` from config. If enabled:

1. Connect via MCP.
2. For each repository listed under `repositories` (by `owner/repo`):
   - If `sources.issues: true`, pull open and recently updated issues from the last `lookback_days` (default: 14 days).
   - If `sources.pull_requests: true`, pull open PRs and their review comments.
   - If `sources.discussions: true`, pull recent discussion threads.
3. Cap at `max_items_per_source` (default: 20) per source type per repository.
4. Store ingested items with type, title, body, and URL.

### 1.2 — Report Ingestion Results

After all automated ingestion completes, output a summary table:

```
Integration Ingestion Report:
| Source          | Status  | Items Pulled | Time Window        |
|-----------------|---------|--------------|---------------------|
| Jira            | OK / OFF | <count>     | last <N> days       |
| Slack           | OK / OFF | <count>     | last <N> days       |
| Meeting Notes   | OK / OFF | <count>     | last <N> days       |
| GitHub          | OK / OFF | <count>     | last <N> days       |
```

If any integration fails (auth error, timeout, etc.), mark it as `FAILED` and log the error, but do NOT halt the workflow. Continue with whatever context was successfully retrieved.

### 1.3 — User-Provided Context

After automated ingestion, prompt the user for any additional context:

| Format | Description |
|---|---|
| Free text | User describes the feature, bug, or task directly in chat. |
| File reference | User points to a file in the repository (e.g., a spec or design doc). |
| Clipboard paste | User pastes raw content not captured by integrations. |
| URL | User provides a link to an external resource (read if accessible). |
| "None" | User confirms all needed context has been ingested automatically. |

**Prompt the user:**
> "Context ingestion complete. I pulled data from the integrations above. Do you have any additional context to provide? You can describe the task, paste content, reference a file, or type 'none' if everything is covered."

---

## Step 2: Parse and Analyze

**Action:** Process the provided context and extract the following:

1. **Title**: A concise, descriptive title for the work item.
2. **Summary**: A 2-3 sentence summary of what needs to be done.
3. **Type**: Classify as one of: `feature`, `bugfix`, `refactor`, `chore`, `research`.
4. **Scope**: Identify which parts of the codebase are likely affected.
5. **Ambiguities**: List any unclear or underspecified requirements. These will be flagged for human clarification.
6. **Constraints**: Note any technical constraints, deadlines, or dependencies mentioned.

---

## Step 3: Consult Knowledge Bases (Retrieval Pipeline)

**Action:** Before generating the draft, execute the full knowledge retrieval pipeline defined in `config.yaml` under `knowledge_system`.

### 3.1 — Enumerate Knowledge Bases

Read `knowledge_system.knowledge_bases` from `config.yaml`. For each KB entry, note its `priority` weight. Higher priority KBs contribute more heavily to the final context.

Example from config:
| Knowledge Base | Priority | Interpretation |
|---|---|---|
| `business_rules` | 1.2 | Highest weight — domain invariants, never skip |
| `github` | 1.0 | Standard weight — repo-level knowledge |
| `jira` | 0.9 | Slightly lower — project management context |
| `kb_name_1` | 0.4 | Low weight — supplemental, only surfaces if highly relevant |

### 3.2 — Retrieve Chunks Per KB

For each knowledge base, scan its `path` directory and retrieve up to `retrieval.top_k_per_kb` (default: 15) chunks most relevant to the parsed context from Step 2.

Relevance is determined by semantic similarity between:
- The parsed **Title**, **Summary**, **Scope**, and **Type** from Step 2.
- The content of each file in the KB directory.

### 3.3 — Fusion (Weighted RRF)

Merge results from all KBs using the `fusion.algorithm` specified in config (default: `weighted_rrf` — Weighted Reciprocal Rank Fusion).

For each chunk, compute its fused score:
```
fused_score(chunk) = SUM over all KBs where chunk appears:
    kb.priority * (1 / (rank_in_kb + 60))
```

Sort all chunks by `fused_score` descending.

### 3.4 — Rerank

Apply the reranker model specified in `reranker.model` (default: `bge-reranker-large`) as a cross-encoder pass over the fused results. This refines ordering by evaluating each chunk against the full query context, not just keyword overlap.

### 3.5 — Select Final Context

Truncate to `context.final_chunks` (default: 12) chunks. These are the knowledge entries that will be injected into the draft.

### 3.6 — Output

- If relevant gotchas or traps are found, include them in the draft under a "[WARNING] Known Gotchas" section, annotated with the source KB and file.
- If no relevant knowledge is found across any KB, note: "No relevant entries found across configured knowledge bases."
- In the draft, add a `## Retrieval Metadata` section documenting which KBs were consulted and how many chunks each contributed.

---

## Step 4: Generate Draft Artifact

**Action:** Create a new file in `.devos/memory/state/` with the following naming convention:

```
draft_YYMMDD.md
```

Where `YYMMDD` is the current date (e.g., `draft_250725.md`).

**File Structure:**

```markdown
---
phase: draft
type: <feature|bugfix|refactor|chore|research>
title: "<Title>"
created: <YYYY-MM-DD HH:MM>
last_updated: <YYYY-MM-DD HH:MM>
author: devos-orchestrator
---

# <Title>

## Summary
<2-3 sentence summary>

## Scope
- <Affected area 1>
- <Affected area 2>

## Requirements
- <Requirement 1>
- <Requirement 2>

## Ambiguities / Open Questions
- [?] <Question 1>
- [?] <Question 2>

## Constraints
- <Constraint 1>

## [WARNING] Known Gotchas
- <Gotcha from brain_kb, if any>

## Raw Context
<Original input preserved verbatim for reference>
```

---

## Step 5: Human-in-the-Loop (HITL) Gate

**Action:** Present the generated draft to the user and STOP execution.

**Prompt the user:**
> "**Draft Generated:** `memory/state/draft_YYMMDD.md`
>
> Please review the draft above. You can:
> - [DONE] **Approve** — Type `/devos.develop` to proceed to the development workflow.
> - **Edit** — Tell me what to change and I will update the draft.
> - **Reject** — Tell me to discard and start over.
>
> I will not proceed until you give explicit approval."

[STOP] **STOP HERE. Do NOT proceed to any other workflow without human approval.**
