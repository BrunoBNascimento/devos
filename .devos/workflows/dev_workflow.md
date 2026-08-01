# Development Workflow — The Core Loop

> **Trigger:** `/devos.develop`
> **Purpose:** Select a task, plan via DAG, execute, verify, review, and deliver. Uses skills for modular execution.

## Phase 0: Task Selection (Wizard)
- Check `.devos/memory/state/daily_digest.md` for candidates.
- **Wizard Prompt:** Present a single block asking the user to select a task from the digest OR provide ad-hoc context, and immediately generate a draft artifact.
- Create `draft_YYMMDD.md` in `.devos/memory/state/`.
- Pause for explicit **HITL Gate** (Approve / Edit / Reject).

## Phase 1: Discovery
- Invoke the `source_local_repos` skill.
- Scan the paths defined in `config.yaml` (`workspace.repositories_path`).
- Map the workspace structure relevant to the draft scope silently.

## Phase 2: Knowledge Router (Silent)
- Retrieve relevant context from `.devos/memory/brain_kb/` based on the draft artifact.
- Perform fusion and reranking silently.
- Append a concise Knowledge Brief to the state file without verbose pipeline logging.

## Phase 3: Planning (DAG Generation)
- Invoke the `planning` skill (which assumes the Planner Agent persona).
- Generate Epics, Tasks, and a **Directed Acyclic Graph (DAG)** of the execution flow.
- Append the DAG and Layer Summary to the state file.
- **HITL Gate:** Present the DAG and wait for approval before execution.

## Phase 4: Execution
- Execute tasks strictly layer by layer according to the generated DAG.
- Invoke the `develop` skill for each task/layer.
- Commit atomically as configured.
- If blockers arise, escalate to the human.

## Phase 5: Verification
- Invoke the `verify` skill.
- The skill handles the autonomous self-healing loop for build, lint, type checks, and tests.
- Only report final pass/fail status or escalate if the loop limit is reached.

## Phase 6: Code Review & Audit
- Invoke the `review` skill (assumes the Reviewer Agent persona).
- Perform code review, cross-reference with Brain KB, and check instrumentation/documentation.
- If changes are requested, apply fixes and re-invoke the `verify` skill.
- Loop until approved.

## Phase 7: PR Delivery + Brain Sync
- Invoke the `brain_sync` skill to extract and persist lessons learned to `brain_kb/`.
- Use the configured pull request strategy to create a PR.
- Link external systems (e.g., transition Jira ticket).
- Output a **concise final summary** with PR URL, build status, and synced KB files.
