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

## Phase 2: Knowledge Router

**Objective:** Consult the knowledge system to inform development decisions.

### Actions:

1. Read `knowledge_system.domains` from `config.yaml`.
2. For each domain, read its `path` and scan for relevant files.
3. Based on the current task context (from the draft artifact), determine which knowledge domains are relevant.
4. Load relevant knowledge files and extract:
   - **Conventions**: Coding standards, naming rules, architectural patterns.
   - **Gotchas**: Known traps, common mistakes, edge cases.
   - **Lessons Learned**: Past decisions and their outcomes.
5. Compile a **Knowledge Brief** appended to the state file:

```markdown
## Knowledge Brief
### Relevant Domains:
- <Domain name>: <brief description of relevant content>

### Applicable Gotchas:
- 🪤 <Gotcha 1> (source: brain_kb/<filename>)
- 🪤 <Gotcha 2> (source: brain_kb/<filename>)

### Conventions to Follow:
- <Convention 1>
- <Convention 2>
```

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
> "📐 **Implementation Plan Ready.**
>
> Please review the plan above. You can:
> - ✅ **Approve** — I will begin coding.
> - ✏️ **Modify** — Tell me what to adjust.
> - ❌ **Reject** — I will re-plan from scratch."

🛑 **STOP. Wait for human approval before proceeding to Phase 4.**

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
> "🏁 **Development Complete. Final Review Required.**
>
> All code has been written and reviewed. Before I close this workflow:
> - ✅ **Approve** — I will finalize and sync to the Brain KB.
> - 🔄 **Re-review** — I will run another review cycle.
> - ❌ **Reject** — I will revert to the Execution phase."

🛑 **STOP. Wait for human approval before finalizing.**

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
- 🪤 <Gotcha 1>: <Description of the trap and how it was resolved.>
- 🪤 <Gotcha 2>: <Description.>

## Conventions Established
- <Any new patterns or standards that emerged from this work.>

## What Went Well
- ✅ <Positive outcome 1>

## What Could Improve
- 🔄 <Improvement suggestion 1>
```

3. Confirm to the user:
> "✅ **Workflow Complete.**
>
> - State file updated to `phase: completed`.
> - Lessons learned synced to `brain_kb/learned_YYMMDD_<slug>.md`.
> - The Brain KB now contains <N> total knowledge entries.
>
> Ready for the next task. Use `/devos.start` to begin a new session."
