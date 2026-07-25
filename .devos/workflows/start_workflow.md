# Start Workflow — Context Ingestion

> **Trigger:** `/devos.start`
> **Purpose:** Ingest raw context (tickets, transcripts, files, user descriptions) and produce a structured draft artifact for human review.

## Prerequisites

- The Orchestrator has completed its Boot Sequence.
- `config.yaml` has been read and validated.
- `.devosignore` patterns are loaded.

---

## Step 1: Gather Context

**Action:** Ask the user to provide the input context. Accepted formats:

| Format | Description |
|---|---|
| Free text | User describes the feature, bug, or task directly in chat. |
| File reference | User points to a file in the repository (e.g., a ticket, spec, or transcript). |
| Clipboard paste | User pastes raw content (e.g., from Jira, Slack, email). |
| URL | User provides a link to an external resource (read if accessible). |

**Prompt the user:**
> "Please provide the context for this work session. You can describe the task, paste a ticket, reference a file, or share a link. I will process everything into a structured draft."

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
