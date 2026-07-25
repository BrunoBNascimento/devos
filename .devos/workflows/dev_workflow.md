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

## Phase 4: Execution

**Objective:** Write code iteratively on a dedicated feature branch with atomic commits.

### Actions:

#### 4.1 — Create Feature Branch

Read `git` config from `config.yaml`. Create a new branch from `git.base_branch` using the `git.branch_naming` template:

```
git checkout <git.base_branch>
git pull origin <git.base_branch>
git checkout -b <branch_name>
```

Branch name is derived from the draft artifact:
- `<type>` — from frontmatter `type` field (feature, bugfix, refactor, etc.)
- `<jira_key>` — from the linked Jira ticket (if available)
- `<short_slug>` — kebab-case of the first 4-5 words of the title

Example: `devos/feature/PROJ-123-user-auth-flow`

#### 4.2 — Iterative Development

1. Update the state file YAML frontmatter:

```yaml
---
phase: developing
branch: "<branch_name>"
last_updated: <YYYY-MM-DD HH:MM>
---
```

2. Work through each task defined in the plan, in dependency order.
3. For each task:
   a. Write the code / make the changes.
   b. If `git.auto_stage: true`, stage the changes immediately.
   c. Commit using the format specified in `git.commit_format`:
      - `conventional`: `<type>(<scope>): <description>` (e.g., `feat(PROJ-123): add login endpoint`)
      - `angular`: `<type>(<scope>): <subject>` with body and footer
      - `freeform`: descriptive message, no enforced format
   d. Mark the task as `[x]` in the state file.
   e. If a gotcha from the Knowledge Brief is relevant, note how it was addressed.
4. After completing all tasks in an epic, provide a brief progress summary.
5. If you encounter an unexpected blocker:
   - Document it in the state file under a `## Blockers` section.
   - STOP and escalate to the human.

#### 4.3 — Development Rules

- One commit per task. Small, focused, atomic changes.
- Commit messages must reference the Jira key if `git.commit_scope_from` is set.
- Never commit generated files, build artifacts, or files matching `.devosignore`.
- If a task is more complex than planned, update the plan in the state file before continuing.

---

## Phase 5: Verification Loop

**Objective:** Run build, lint, tests, and type checks in an automated self-healing loop until all pass or the max iteration limit is reached.

### Actions:

#### 5.1 — Update State

```yaml
---
phase: verifying
verification_iteration: 1
last_updated: <YYYY-MM-DD HH:MM>
---
```

#### 5.2 — Execute Verification Pipeline

Read `verification` from `config.yaml`. For each enabled check, execute in this order:

| Step | Config Key | Action |
|---|---|---|
| 1. Build | `verification.build` | Run `build.command`. If it fails, attempt to fix the build error and retry up to `build.max_retries` times. |
| 2. Lint | `verification.lint` | Run `lint.command`. If `lint.auto_fix: true`, run `lint.auto_fix_command` first, then re-check. If `lint.fail_on_warnings: true`, treat warnings as errors. |
| 3. Type Check | `verification.type_check` | Run `type_check.command` (if enabled). Fix type errors in-place. |
| 4. Tests | `verification.tests` | Run `tests.command`. If `tests.coverage.enabled: true`, also run `tests.coverage.command` and compare against `tests.coverage.threshold`. |

#### 5.3 — Self-Healing Loop

If ANY check fails:

1. Analyze the error output.
2. Identify the root cause in the code written during Phase 4.
3. Apply the fix.
4. Commit the fix: `fix(<scope>): <description of what was fixed>`
5. Increment `verification_iteration` in the state file.
6. Re-run the ENTIRE verification pipeline from Step 1 (Build).

**Loop termination conditions:**
- **All checks pass** — proceed to Phase 6.
- **`verification_iteration` exceeds `verification.max_loop_iterations`** (default: 5) — STOP and escalate to the human with a full diagnostic report.

#### 5.4 — Verification Report

Append to the state file:

```markdown
## Verification Report
- **Iterations:** <count>
- **Build:** PASS / FAIL (exit code, duration)
- **Lint:** PASS / FAIL (errors: <N>, warnings: <N>)
- **Type Check:** PASS / FAIL / SKIPPED
- **Tests:** PASS / FAIL (passed: <N>, failed: <N>, skipped: <N>)
- **Coverage:** <N>% (threshold: <threshold>%) — PASS / FAIL / SKIPPED
```

---

## Phase 6: Self-Review + Instrumentation Audit

**Objective:** Assume the Reviewer persona and perform a full code review including instrumentation compliance. This is an autonomous loop — no human gate. If issues are found, loop back to fix and re-verify.

### Actions:

#### 6.1 — Update State

```yaml
---
phase: reviewing
review_iteration: 1
last_updated: <YYYY-MM-DD HH:MM>
---
```

#### 6.2 — Code Review (Reviewer Agent)

1. **Assume the Reviewer Agent persona** by reading `.devos/system_prompts/reviewer_agent.md`.
2. Review all code changes on the current branch (diff against `git.base_branch`).
3. Execute the Reviewer Agent's full checklist (correctness, security, performance, maintainability, architecture).
4. **Cross-reference with `.devos/memory/brain_kb/`** — MANDATORY.

#### 6.3 — Instrumentation Audit

Read `verification.instrumentation.checks` from `config.yaml`. For each enabled check:

1. Scan all modified files on the branch.
2. Evaluate the code against the check's `rule`.
3. Report compliance status for each check:

```markdown
## Instrumentation Audit
| Check           | Status      | Details                                    |
|-----------------|-------------|--------------------------------------------|
| logging         | PASS / FAIL | <specifics>                                |
| error_handling  | PASS / FAIL | <specifics>                                |
| metrics         | PASS / FAIL | <specifics>                                |
| tracing         | PASS / FAIL | <specifics>                                |
| security        | PASS / FAIL | <specifics>                                |
```

#### 6.4 — Verdict and Loop

Issue a verdict based on the combined code review and instrumentation audit:

- **APPROVED** — All checks pass. Proceed to Phase 7.
- **CHANGES REQUESTED** — Issues found. Apply fixes autonomously:
  1. **Return to Orchestrator persona.**
  2. Fix all issues flagged by the review.
  3. Commit fixes: `refactor(<scope>): address review findings — <summary>`
  4. Increment `review_iteration` in state file.
  5. **Go back to Phase 5** (re-run full verification pipeline).
  6. Then re-enter Phase 6 for another review cycle.

**Loop termination:** If `review_iteration` exceeds 3, STOP and escalate to the human. Provide the full review log and remaining issues.

After APPROVED:
- **Return to Orchestrator persona.**
- Append the review verdict and instrumentation audit to the state file.

---

## Phase 7: PR Delivery + Brain Sync

**Objective:** Create the pull request, link external systems, persist lessons learned, and deliver the finished work to the human for final review on GitHub.

### Actions:

#### 7.1 — Update State

```yaml
---
phase: delivering
last_updated: <YYYY-MM-DD HH:MM>
---
```

#### 7.2 — Push Branch

```
git push origin <branch_name>
```

#### 7.3 — Generate PR Body

Read `pull_request.body_sections` from `config.yaml`. For each section, extract content from the state file and compose the PR body:

| Section | Source |
|---|---|
| `summary` | Draft artifact `## Summary` section |
| `changes_made` | `git diff --stat` against base branch, with per-file descriptions from the plan |
| `implementation_plan` | Condensed version of Phase 3 plan (epics and tasks with status) |
| `testing_done` | Verification Report from Phase 5 (build, lint, tests, coverage) |
| `instrumentation_checklist` | Instrumentation Audit table from Phase 6 |
| `knowledge_brief_excerpt` | Gotchas, conventions, and business rules that were applied |
| `jira_link` | Link to the source Jira ticket: `<jira.base_url>/browse/<jira_key>` |

#### 7.4 — Create Pull Request

Read `pull_request` config and execute:

```
gh pr create \
  --base <pull_request.base_branch> \
  --head <branch_name> \
  --title "<rendered title_template>" \
  --body "<generated PR body>" \
  --reviewer <reviewers> \
  --label <labels> \
  [--draft if pull_request.draft: true]
```

Capture the PR URL from the output.

#### 7.5 — Link External Systems

If `pull_request.link_jira: true` and Jira integration is enabled:
1. Add a comment to the Jira ticket with the PR URL.
2. Transition the ticket status to `pull_request.jira_transition_on_pr` (default: "In Review").

#### 7.6 — Brain Sync

Create a new knowledge file in `.devos/memory/brain_kb/`:

```
learned_YYMMDD_<short-slug>.md
```

**Knowledge File Structure:**

```markdown
---
date: <YYYY-MM-DD>
source_task: "<draft title>"
jira_key: "<jira_key>"
pr_url: "<PR URL>"
tags: [<relevant tags>]
---

# Lessons Learned: <Title>

## Summary
<Brief description of what was built and any notable decisions.>

## Gotchas & Traps
- [TRAP] <Gotcha 1>: <Description and resolution.>

## Conventions Established
- <Any new patterns or standards that emerged.>

## Verification Notes
- Build: <any build issues encountered and how they were resolved>
- Tests: <test coverage achieved, any flaky tests noted>
- Instrumentation: <any instrumentation gaps found and fixed>

## What Went Well
- <Positive outcome 1>

## What Could Improve
- <Improvement suggestion 1>
```

#### 7.7 — Update State and Deliver

```yaml
---
phase: completed
pr_url: "<PR URL>"
branch: "<branch_name>"
completed_at: <YYYY-MM-DD HH:MM>
last_updated: <YYYY-MM-DD HH:MM>
---
```

**Final output to the human:**

> **Workflow Complete. PR Delivered.**
>
> - **PR:** <PR URL>
> - **Branch:** `<branch_name>` -> `<base_branch>`
> - **Commits:** <count> commits
> - **Verification:** Build PASS, Lint PASS, Tests PASS (<N> passed), Coverage <N>%
> - **Review:** APPROVED (iteration <N>)
> - **Instrumentation:** All checks passed
> - **Jira:** <jira_key> transitioned to "In Review"
> - **Brain KB:** Lessons synced to `brain_kb/learned_YYMMDD_<slug>.md`
>
> Ready for the next task. Use `/devos.start` to begin a new session.

