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

## Step 3: Consult Knowledge Base

**Action:** Before generating the draft, scan `.devos/memory/brain_kb/` for any files that might be relevant to the parsed context.

- If relevant gotchas or traps are found, include them in the draft under a "[WARNING] Known Gotchas" section.
- If no relevant knowledge is found, note: "No relevant entries found in brain_kb."

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
