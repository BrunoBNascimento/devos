# Development Workflow — The Core Loop

> **Trigger:** `/devos.develop`
> **Purpose:** Execute the full development lifecycle from discovery to completion, with human gates at critical transitions.

## Prerequisites

- A draft artifact exists in `.devos/memory/state/` with `phase: draft` and has been **approved by the human**.
- The Orchestrator has completed its Boot Sequence.
- `config.yaml` is loaded and validated.

---

## Phase 1: Discovery

**Objective:** Understand the current state of the workspace and identify target areas for development.

### Actions:

1. Read `workspace.repo_directories` from `config.yaml`.
2. Recursively scan the listed directories, respecting `.devosignore` patterns.
3. Build a structural map of the workspace:
   - List all top-level directories and their purpose (inferred from names, READMEs, or package files).
   - Identify key configuration files (e.g., `package.json`, `pyproject.toml`, `Cargo.toml`).
   - Note the tech stack, frameworks, and languages detected.
4. Cross-reference the workspace map with the **Scope** defined in the active draft artifact.
5. Output a **Discovery Report** as a section appended to the state file:

```markdown
## Discovery Report
- **Workspace Root:** <path>
- **Repositories Found:** <count>
- **Tech Stack:** <detected technologies>
- **Target Directories:** <directories relevant to the scope>
- **Key Files:** <important files identified>
```

---

## Phase 2: Knowledge Router (Retrieval Pipeline)

**Objective:** Execute the structured knowledge retrieval pipeline defined in `config.yaml` to build an informed context for development.

### Actions:

#### 2.1 — Enumerate Knowledge Bases

Read `knowledge_system.knowledge_bases` from `config.yaml`. Build a ranked list of all configured KBs sorted by `priority` (descending). Higher priority KBs have greater influence on the final context.

| Config Key | What It Controls |
|---|---|
| `knowledge_bases.<name>.priority` | Weight applied during fusion. `business_rules` at 1.2 outranks `kb_name_1` at 0.4. |
| `retrieval.top_k_per_kb` | Max chunks retrieved per KB before fusion (default: 15). |
| `fusion.algorithm` | Merge strategy across KBs (default: `weighted_rrf`). |
| `reranker.model` | Cross-encoder model for post-fusion reranking (default: `bge-reranker-large`). |
| `context.final_chunks` | Max chunks in final working context (default: 12). |

#### 2.2 — Retrieve Per-KB Chunks

For each knowledge base, scan its `path` directory and retrieve up to `retrieval.top_k_per_kb` chunks most relevant to the current task context (derived from the draft artifact's Title, Summary, Scope, and Type).

Relevance criteria:
- **Semantic match** between task context and chunk content.
- **Recency** — more recent entries break ties.
- **Specificity** — chunks that mention the same tech stack, module, or domain detected in Phase 1 Discovery are preferred.

#### 2.3 — Fusion (Weighted RRF)

Merge all per-KB results using the `fusion.algorithm` from config.

For `weighted_rrf` (Weighted Reciprocal Rank Fusion), compute:

```
fused_score(chunk) = SUM over all KBs where chunk appears:
    kb.priority * (1 / (rank_in_kb + 60))
```

This ensures high-priority KBs (e.g., `business_rules` at 1.2) dominate the ranking, while low-priority KBs (e.g., `kb_name_1` at 0.4) only surface when their content is exceptionally relevant.

Sort all chunks by `fused_score` descending.

#### 2.4 — Rerank

Apply the cross-encoder reranker specified in `reranker.model` over the top fused results. The reranker evaluates each chunk against the full query context (not just keywords), producing a refined relevance score.

This step corrects cases where lexical overlap inflated a chunk's rank during retrieval.

#### 2.5 — Select Final Context

Truncate to `context.final_chunks` (default: 12). These chunks become the **Knowledge Brief** — the authoritative context for all downstream phases (Planning, Execution, Review).

#### 2.6 — Compile Knowledge Brief

Append the following to the state file:

```markdown
## Knowledge Brief

### Retrieval Pipeline Summary
- **KBs Consulted:** <list of KB names and their priorities>
- **Chunks Retrieved:** <total across all KBs>
- **Post-Fusion Candidates:** <count after RRF>
- **Final Context Chunks:** <count after reranking, capped at final_chunks>

### Applicable Gotchas:
- [TRAP] <Gotcha 1> (source: <kb_name>/<filename>, priority: <weight>)
- [TRAP] <Gotcha 2> (source: <kb_name>/<filename>, priority: <weight>)

### Conventions to Follow:
- <Convention 1> (source: <kb_name>/<filename>)
- <Convention 2> (source: <kb_name>/<filename>)

### Business Rules (Non-Negotiable):
- <Rule 1> (source: business_rules/<filename>)
- <Rule 2> (source: business_rules/<filename>)
```

If no relevant knowledge is found across any KB, note: "No relevant entries found across configured knowledge bases. Proceeding with general best practices."

---

## Phase 3: Planning

**Objective:** Create a detailed, phased implementation plan.

### Actions:

1. **Assume the Planner Agent persona** by reading `.devos/system_prompts/planner_agent.md`.
2. Using the Discovery Report and Knowledge Brief, decompose the task into Epics and Tasks.
3. Update the state file YAML frontmatter:

```yaml
---
phase: planning
last_updated: <YYYY-MM-DD HH:MM>
---
```

4. Write the full implementation plan to the state file following the Planner Agent's output format.
5. **Return to Orchestrator persona** after planning is complete.

### HITL Gate:
> "**Implementation Plan Ready.**
>
> Please review the plan above. You can:
> - [DONE] **Approve** — I will begin coding.
> - **Modify** — Tell me what to adjust.
> - **Reject** — I will re-plan from scratch."

[STOP] **STOP. Wait for human approval before proceeding to Phase 4.**

---

## Phase 4: Execution

**Objective:** Write the actual code, iteratively and incrementally.

### Actions:

1. Update the state file YAML frontmatter:

```yaml
---
phase: developing
last_updated: <YYYY-MM-DD HH:MM>
---
```

2. Work through each task defined in the plan, in dependency order.
3. For each task:
   a. Announce what you are about to do.
   b. Write the code / make the changes.
   c. Mark the task as `[x]` in the state file.
   d. If a gotcha from the Knowledge Brief is relevant, explicitly note how you addressed it.
4. After completing all tasks in an epic, provide a brief progress summary.
5. If you encounter an unexpected issue:
   - Document it in the state file under a `## Blockers` section.
   - STOP and ask the human for guidance.

### Iterative Development Rules:
- Write small, focused changes — not monolithic commits.
- After every significant change, verify it makes logical sense before moving on.
- If a task turns out to be more complex than planned, pause and update the plan.

---

## Phase 5: Review

**Objective:** Critically review all generated code before finalization.

### Actions:

1. **Assume the Reviewer Agent persona** by reading `.devos/system_prompts/reviewer_agent.md`.
2. Update the state file YAML frontmatter:

```yaml
---
phase: reviewing
last_updated: <YYYY-MM-DD HH:MM>
---
```

3. Execute the Reviewer Agent's full checklist against all code produced during Phase 4.
4. **Cross-reference with `.devos/memory/brain_kb/`** — this step is MANDATORY.
5. Issue a verdict: APPROVED, APPROVED WITH NOTES, CHANGES REQUESTED, or REJECTED.
6. If CHANGES REQUESTED or REJECTED:
   - List all issues with severity tags.
   - **Return to Orchestrator persona.**
   - Go back to Phase 4 to address the issues.
   - Then re-enter Phase 5 for another review cycle.
7. If APPROVED or APPROVED WITH NOTES:
   - **Return to Orchestrator persona.**
   - Proceed to Phase 6.

---

## Phase 6: Finalization — Brain Sync

**Objective:** Capture lessons learned and close the workflow.

### Actions:

1. Update the state file YAML frontmatter:

```yaml
---
phase: completed
last_updated: <YYYY-MM-DD HH:MM>
completed_at: <YYYY-MM-DD HH:MM>
---
```

### HITL Gate:
> "**Development Complete. Final Review Required.**
>
> All code has been written and reviewed. Before I close this workflow:
> - [DONE] **Approve** — I will finalize and sync to the Brain KB.
> - [IN PROGRESS] **Re-review** — I will run another review cycle.
> - **Reject** — I will revert to the Execution phase."

[STOP] **STOP. Wait for human approval before finalizing.**

2. Upon approval, create a new knowledge file in `.devos/memory/brain_kb/` with the naming convention:

```
learned_YYMMDD_<short-slug>.md
```

**Knowledge File Structure:**

```markdown
---
date: <YYYY-MM-DD>
source_task: "<draft title>"
tags: [<relevant tags>]
---

# Lessons Learned: <Title>

## Summary
<Brief description of what was built and any notable decisions.>

## Gotchas & Traps
- [TRAP] <Gotcha 1>: <Description of the trap and how it was resolved.>
- [TRAP] <Gotcha 2>: <Description.>

## Conventions Established
- <Any new patterns or standards that emerged from this work.>

## What Went Well
- [DONE] <Positive outcome 1>

## What Could Improve
- [IN PROGRESS] <Improvement suggestion 1>
```

3. Confirm to the user:
> "[DONE] **Workflow Complete.**
>
> - State file updated to `phase: completed`.
> - Lessons learned synced to `brain_kb/learned_YYMMDD_<slug>.md`.
> - The Brain KB now contains <N> total knowledge entries.
>
> Ready for the next task. Use `/devos.start` to begin a new session."
